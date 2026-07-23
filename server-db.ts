/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, InventoryLog } from './src/types.js';

// In-memory database fallback (no fs or disk writing for Vercel/Serverless compatibility)
let inMemoryProducts: Product[] = getStarterProducts();
let inMemoryLogs: InventoryLog[] = getStarterLogs();

// Initialize Supabase Client if credentials exist
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'MY_SUPABASE_URL') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client successfully initialized.");
  } catch (err: any) {
    console.warn("Failed to initialize Supabase client:", err.message);
  }
}

// Synchronous local getDb (in-memory state)
export function getDb(): { products: Product[]; logs: InventoryLog[] } {
  return {
    products: inMemoryProducts,
    logs: inMemoryLogs
  };
}

// Synchronous local saveDb (in-memory state update)
export function saveDb(data: { products: Product[]; logs: InventoryLog[] }) {
  inMemoryProducts = data.products;
  inMemoryLogs = data.logs;
}

// Map database row to Product (handles both snake_case from SQL and camelCase)
function mapProductFromRow(row: any): Product {
  return {
    id: String(row.id),
    name: row.name,
    brand: row.brand,
    category: row.category,
    type: row.type || undefined,
    measure: row.measure || undefined,
    hasVariants: row.hasVariants ?? row.has_variants ?? false,
    singleQuantity: row.singleQuantity ?? row.single_quantity ?? undefined,
    image: row.image || undefined,
    thumbnail: row.thumbnail || undefined,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || undefined),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString()
  };
}

// Map database row to InventoryLog (handles both snake_case from SQL and camelCase)
function mapLogFromRow(row: any): InventoryLog {
  return {
    id: String(row.id),
    productId: String(row.productId || row.product_id),
    productName: row.productName || row.product_name,
    brand: row.brand,
    category: row.category,
    type: row.type,
    variantId: row.variantId || row.variant_id || undefined,
    size: row.size || undefined,
    quantity: Number(row.quantity),
    previousQuantity: Number(row.previousQuantity ?? row.previous_quantity ?? 0),
    newQuantity: Number(row.newQuantity ?? row.new_quantity ?? 0),
    timestamp: row.timestamp || row.created_at || row.timestamp || new Date().toISOString(),
    operator: row.operator
  };
}

// Async API for Supabase with in-memory fallback
export async function getProductsAsync(): Promise<Product[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) {
        return data.map(mapProductFromRow);
      }
      console.warn("Supabase fetch products notice:", error?.message);
    } catch (err: any) {
      console.warn("Supabase products exception:", err.message);
    }
  }
  return inMemoryProducts;
}

export async function saveProductAsync(product: Product): Promise<void> {
  // Update in-memory state
  const idx = inMemoryProducts.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    inMemoryProducts[idx] = product;
  } else {
    inMemoryProducts.push(product);
  }

  if (supabase) {
    try {
      // Primary: snake_case for standard PostgreSQL / Supabase schemas
      const snakeRow = {
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        type: product.type || null,
        measure: product.measure || null,
        has_variants: product.hasVariants,
        single_quantity: product.singleQuantity ?? null,
        image: product.image || null,
        thumbnail: product.thumbnail || null,
        variants: product.variants || null,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      };

      const { error: err1 } = await supabase.from('products').upsert(snakeRow);
      if (err1) {
        // Secondary fallback: camelCase
        const camelRow = {
          id: product.id,
          name: product.name,
          brand: product.brand,
          category: product.category,
          type: product.type || null,
          measure: product.measure || null,
          hasVariants: product.hasVariants,
          singleQuantity: product.singleQuantity ?? null,
          image: product.image || null,
          thumbnail: product.thumbnail || null,
          variants: product.variants || null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };
        const { error: err2 } = await supabase.from('products').upsert(camelRow);
        if (err2) {
          console.error("Supabase upsert product error:", err2.message);
        }
      }
    } catch (err: any) {
      console.error("Supabase save product exception:", err.message);
    }
  }
}

export async function deleteProductAsync(id: string): Promise<void> {
  inMemoryProducts = inMemoryProducts.filter(p => p.id !== id);

  if (supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        console.error("Supabase delete product error:", error.message);
      }
    } catch (err: any) {
      console.error("Supabase delete product exception:", err.message);
    }
  }
}

export async function getLogsAsync(): Promise<InventoryLog[]> {
  if (supabase) {
    try {
      let { data, error } = await supabase.from('logs').select('*');
      if (error) {
        const res2 = await supabase.from('inventory_logs').select('*');
        data = res2.data;
        error = res2.error;
      }
      if (!error && data) {
        return data.map(mapLogFromRow);
      }
      console.warn("Supabase fetch logs notice:", error?.message);
    } catch (err: any) {
      console.warn("Supabase logs exception:", err.message);
    }
  }
  return inMemoryLogs;
}

export async function saveLogAsync(log: InventoryLog): Promise<void> {
  inMemoryLogs.push(log);

  if (supabase) {
    try {
      const snakeRow = {
        id: log.id,
        product_id: log.productId,
        product_name: log.productName,
        brand: log.brand,
        category: log.category,
        type: log.type,
        variant_id: log.variantId || null,
        size: log.size || null,
        quantity: log.quantity,
        previous_quantity: log.previousQuantity,
        new_quantity: log.newQuantity,
        created_at: log.timestamp,
        timestamp: log.timestamp,
        operator: log.operator || null
      };

      let { error } = await supabase.from('logs').upsert(snakeRow);
      if (error) {
        const camelRow = {
          id: log.id,
          productId: log.productId,
          productName: log.productName,
          brand: log.brand,
          category: log.category,
          type: log.type,
          variantId: log.variantId || null,
          size: log.size || null,
          quantity: log.quantity,
          previousQuantity: log.previousQuantity,
          newQuantity: log.newQuantity,
          timestamp: log.timestamp,
          operator: log.operator || null
        };
        const { error: err2 } = await supabase.from('logs').upsert(camelRow);
        if (err2) {
          await supabase.from('inventory_logs').upsert(snakeRow);
        }
      }
    } catch (err: any) {
      console.error("Supabase save log exception:", err.message);
    }
  }
}

// Starter products to populate the warehouse database
function getStarterProducts(): Product[] {
  const now = new Date().toISOString();
  return [
    {
      id: "prod-1",
      name: "ICH 501 Solid",
      brand: "ICH",
      category: "Cascos Adultos",
      hasVariants: true,
      variants: [
        {
          id: "var-1-1",
          // Base64 placeholder values representing distinct visual helmets
          sizes: [
            { size: "S", quantity: 3 },
            { size: "M", quantity: 5 },
            { size: "L", quantity: 8 },
            { size: "XL", quantity: 2 }
          ]
        },
        {
          id: "var-1-2",
          sizes: [
            { size: "S", quantity: 0 },
            { size: "M", quantity: 4 },
            { size: "L", quantity: 6 },
            { size: "XL", quantity: 3 }
          ]
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-kid-1",
      name: "ICH Junior 303 Kids",
      brand: "ICH",
      category: "Cascos Niños",
      hasVariants: true,
      variants: [
        {
          id: "var-kid-1",
          sizes: [
            { size: "XS", quantity: 4 },
            { size: "Talla Única", quantity: 6 }
          ]
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-2",
      name: "Pilot Road 5",
      brand: "Michelin",
      category: "Llantas",
      type: "Pistera",
      measure: "130/70-17",
      hasVariants: false,
      singleQuantity: 12,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-3",
      name: "Anakee Adventure",
      brand: "Michelin",
      category: "Llantas",
      type: "Doble propósito",
      measure: "110/80-R19",
      hasVariants: false,
      singleQuantity: 7,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-4",
      name: "Shaft 569 Solid",
      brand: "Shaft",
      category: "Cascos Adultos",
      hasVariants: true,
      variants: [
        {
          id: "var-4-1",
          sizes: [
            { size: "M", quantity: 2 },
            { size: "L", quantity: 5 },
            { size: "XL", quantity: 4 }
          ]
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-5",
      name: "Maletero E300N2 Monolock",
      brand: "Givi",
      category: "Maleteros",
      hasVariants: false,
      singleQuantity: 5,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-6",
      name: "Parrilla de Carga Pulsar NS 200",
      brand: "Promecol",
      category: "Parrillas",
      hasVariants: false,
      singleQuantity: 10,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-7",
      name: "Slider de Motor NS200 Carbono",
      brand: "Fire Parts",
      category: "Lujos",
      hasVariants: false,
      singleQuantity: 15,
      createdAt: now,
      updatedAt: now
    },
    {
      id: "prod-8",
      name: "Intercomunicador V6 Pro",
      brand: "Vnetphone",
      category: "Accesorios",
      hasVariants: false,
      singleQuantity: 9,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function getStarterLogs(): InventoryLog[] {
  const now = new Date();
  const makePastTime = (minutesAgo: number) => {
    return new Date(now.getTime() - minutesAgo * 60 * 1000).toISOString();
  };
  
  return [
    {
      id: "log-1",
      productId: "prod-2",
      productName: "Pilot Road 5",
      brand: "Michelin",
      category: "Llantas",
      type: "entry",
      quantity: 10,
      previousQuantity: 2,
      newQuantity: 12,
      timestamp: makePastTime(120),
      operator: "Bodega General"
    },
    {
      id: "log-2",
      productId: "prod-5",
      productName: "Maletero E300N2 Monolock",
      brand: "Givi",
      category: "Maleteros",
      type: "exit",
      quantity: 2,
      previousQuantity: 7,
      newQuantity: 5,
      timestamp: makePastTime(60),
      operator: "Vendedor Almacén"
    },
    {
      id: "log-3",
      productId: "prod-1",
      productName: "ICH 501 Solid",
      brand: "ICH",
      category: "Cascos Adultos",
      type: "entry",
      variantId: "var-1-1",
      size: "L",
      quantity: 5,
      previousQuantity: 3,
      newQuantity: 8,
      timestamp: makePastTime(30),
      operator: "Recepción Cajas"
    }
  ];
}
