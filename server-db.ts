/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, InventoryLog, ProductCategory } from './src/types.js';

// In-memory database fallback (no fs or disk writing for Vercel/Serverless compatibility)
let inMemoryProducts: Product[] = getStarterProducts();
let inMemoryLogs: InventoryLog[] = getStarterLogs();

// Clean environment variable values (strip surrounding quotes or extra spaces)
function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const cleaned = val.trim().replace(/^["']|["']$/g, '');
  return cleaned || undefined;
}

// Initialize Supabase Client if credentials exist
let supabase: SupabaseClient | null = null;
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

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

/**
 * Uploads a base64 image or Buffer to the public Supabase Storage bucket 'inventory-photos'.
 * Returns the public URL of the uploaded image, or null if upload failed/unavailable.
 */
export async function uploadImageToSupabaseStorage(
  imageInput: string | Buffer,
  filename?: string,
  folder: string = 'products'
): Promise<string | null> {
  if (!supabase) {
    console.warn("Supabase client not available for storage upload");
    return null;
  }

  try {
    const bucketName = 'inventory-photos';
    let buffer: Buffer;
    let contentType = 'image/jpeg';
    let ext = 'jpg';

    if (typeof imageInput === 'string') {
      // Check if it's already an http/https public URL
      if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        return imageInput;
      }

      // Handle base64 Data URL
      const matches = imageInput.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1];
        ext = contentType.split('/')[1] || 'jpg';
        if (ext === 'jpeg') ext = 'jpg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        // Plain base64 string
        buffer = Buffer.from(imageInput, 'base64');
      }
    } else {
      buffer = imageInput;
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanFilename = filename 
      ? filename.replace(/[^a-zA-Z0-9._-]/g, '_')
      : `photo-${uniqueId}.${ext}`;

    const filePath = `${folder}/${cleanFilename}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error("Supabase Storage upload error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error("Exception uploading image to Supabase Storage:", err.message);
    return null;
  }
}

// Internal code prefix mapping
export function getPrefixForCategory(category: ProductCategory): string {
  switch (category) {
    case 'Cascos Adultos':
    case 'Cascos Niños':
      return 'C';
    case 'Llantas':
      return 'L';
    case 'Maleteros':
      return 'M';
    case 'Parrillas':
      return 'P';
    case 'Accesorios':
    case 'Lujos':
    case 'Otros':
    default:
      return 'A';
  }
}

// Global high-watermark counter to ensure deleted codes are never reused
const codeCounters: Record<string, number> = {
  C: 4,
  L: 2,
  M: 1,
  P: 1,
  A: 2,
};

export function generateNextInternalCode(
  category: ProductCategory, 
  allProducts: Product[] = inMemoryProducts, 
  allLogs: InventoryLog[] = inMemoryLogs
): string {
  const prefix = getPrefixForCategory(category);
  const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  
  let maxNumber = codeCounters[prefix] || 0;

  // Scan existing products
  for (const p of allProducts) {
    if (p.internalCode) {
      const match = p.internalCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    }
    if (p.variants) {
      for (const v of p.variants) {
        if (v.internalCode) {
          const match = v.internalCode.match(regex);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNumber) maxNumber = num;
          }
        }
      }
    }
  }

  // Scan existing inventory logs
  for (const l of allLogs) {
    if (l.internalCode) {
      const match = l.internalCode.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) maxNumber = num;
      }
    }
  }

  const nextNum = maxNumber + 1;
  codeCounters[prefix] = nextNum;

  const padded = String(nextNum).padStart(3, '0');
  return `${prefix}${padded}`;
}
function parseBooleanValue(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 't';
  }
  return false;
}

// Map database row to Product (handles snake_case from SQL and camelCase)
function mapProductFromRow(row: any): Product {
  if (!row) return row;

  let variants = row.variants;
  if (typeof variants === 'string') {
    try {
      variants = JSON.parse(variants);
    } catch (e) {
      variants = undefined;
    }
  }
  if (!Array.isArray(variants)) {
    variants = undefined;
  }

  const rawHasVars = row.hasVariants ?? row.has_variants ?? row.hasvariants;
  const hasVariants = parseBooleanValue(rawHasVars);

  const rawSingleQty = row.singleQuantity ?? row.single_quantity ?? row.singlequantity;
  const singleQuantity = (rawSingleQty !== undefined && rawSingleQty !== null) 
    ? Number(rawSingleQty) 
    : undefined;

  const rawPrice = row.price ?? row.precio;
  const price = (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') 
    ? Number(rawPrice) 
    : undefined;

  const internalCode = row.internalCode || row.internal_code || row.codigo_interno || row.codigointerno || undefined;

  return {
    id: String(row.id ?? ''),
    internalCode,
    name: String(row.name || row.nombre || ''),
    brand: String(row.brand || row.marca || ''),
    category: row.category || row.categoria || 'Otros',
    price,
    type: row.type || row.tipo || undefined,
    measure: row.measure || row.medida || undefined,
    hasVariants,
    singleQuantity,
    image: row.image || row.imagen || undefined,
    thumbnail: row.thumbnail || row.miniatura || undefined,
    variants,
    createdAt: row.createdAt || row.created_at || row.createdat || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || row.updatedat || new Date().toISOString()
  };
}

// Map database row to InventoryLog (handles both snake_case from SQL and camelCase)
function mapLogFromRow(row: any): InventoryLog {
  if (!row) return row;

  const rawPrev = row.previousQuantity ?? row.previous_quantity ?? row.previousquantity ?? 0;
  const rawNew = row.newQuantity ?? row.new_quantity ?? row.newquantity ?? 0;
  const internalCode = row.internalCode || row.internal_code || row.codigo_interno || row.codigointerno || undefined;

  return {
    id: String(row.id ?? ''),
    productId: String(row.productId || row.product_id || row.productid || ''),
    internalCode,
    productName: String(row.productName || row.product_name || row.productname || ''),
    brand: String(row.brand || row.marca || ''),
    category: row.category || row.categoria || 'Otros',
    type: (row.type === 'exit' || row.type === 'salida') ? 'exit' : 'entry',
    variantId: row.variantId || row.variant_id || row.variantid || undefined,
    size: row.size || undefined,
    quantity: Number(row.quantity || 0),
    previousQuantity: Number(rawPrev),
    newQuantity: Number(rawNew),
    timestamp: row.timestamp || row.created_at || row.createdat || new Date().toISOString(),
    operator: row.operator || row.operador || 'Sistema'
  };
}

// Async API for Supabase with in-memory fallback
export async function getProductsAsync(): Promise<Product[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (!error && data) {
        // If table was newly created/dropped and is empty, seed initial starter products into Supabase
        if (data.length === 0 && inMemoryProducts.length > 0) {
          console.log("La tabla 'products' en Supabase está vacía. Poblando productos iniciales...");
          for (const prod of inMemoryProducts) {
            await saveProductAsync(prod).catch(e => console.warn("Aviso al sembrar producto inicial:", e?.message || e));
          }
          const { data: seededData, error: seedErr } = await supabase.from('products').select('*');
          if (!seedErr && seededData && seededData.length > 0) {
            return seededData.map(mapProductFromRow);
          }
        }
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
  // Convert any base64 images to Supabase Storage public URLs if Supabase is connected
  if (supabase) {
    try {
      if (product.image && product.image.startsWith('data:')) {
        const uploadedUrl = await uploadImageToSupabaseStorage(product.image, `${product.id}-main.jpg`);
        if (uploadedUrl) product.image = uploadedUrl;
      }
      if (product.thumbnail && product.thumbnail.startsWith('data:')) {
        const uploadedUrl = await uploadImageToSupabaseStorage(product.thumbnail, `${product.id}-thumb.jpg`);
        if (uploadedUrl) product.thumbnail = uploadedUrl;
      }
      if (product.hasVariants && product.variants) {
        for (let i = 0; i < product.variants.length; i++) {
          const v = product.variants[i];
          if (v.image && v.image.startsWith('data:')) {
            const url = await uploadImageToSupabaseStorage(v.image, `${product.id}-v${i}-main.jpg`);
            if (url) v.image = url;
          }
          if (v.thumbnail && v.thumbnail.startsWith('data:')) {
            const url = await uploadImageToSupabaseStorage(v.thumbnail, `${product.id}-v${i}-thumb.jpg`);
            if (url) v.thumbnail = url;
          }
        }
      }
    } catch (err: any) {
      console.warn("Notice converting base64 images to Supabase Storage:", err.message);
    }
  }

  // Update in-memory state FIRST so local reads work instantly and never fail user action
  const existingIdx = inMemoryProducts.findIndex(p => p.id === product.id);
  if (existingIdx >= 0) {
    inMemoryProducts[existingIdx] = product;
  } else {
    inMemoryProducts.push(product);
  }

  // Save to Supabase 'products' table WITH MULTI-STAGE FALLBACK & NON-BLOCKING GRACEFUL HANDLING
  if (supabase) {
    try {
      // 1. Standard snake_case row matching full Supabase PostgreSQL schema
      const productRow: Record<string, any> = {
        id: product.id,
        internal_code: product.internalCode || null,
        name: product.name,
        brand: product.brand || 'N/A',
        category: product.category,
        price: product.price ?? null,
        type: product.type || null,
        measure: product.measure || null,
        description: (product as any).description || null,
        has_variants: Boolean(product.hasVariants),
        single_quantity: product.singleQuantity ?? null,
        image: product.image || null,
        thumbnail: product.thumbnail || null,
        variants: product.variants || null,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      };

      const { error } = await supabase
        .from('products')
        .upsert(productRow);

      if (error) {
        console.warn("Supabase upsert product initial attempt notice:", error.message);

        // 2. Retry using camelCase column names
        const camelRow: Record<string, any> = {
          id: product.id,
          internalCode: product.internalCode || null,
          name: product.name,
          brand: product.brand || 'N/A',
          category: product.category,
          price: product.price ?? null,
          precio: product.price ?? null,
          type: product.type || null,
          measure: product.measure || null,
          description: (product as any).description || null,
          hasVariants: Boolean(product.hasVariants),
          singleQuantity: product.singleQuantity ?? null,
          image: product.image || null,
          thumbnail: product.thumbnail || null,
          variants: product.variants || null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        };

        const { error: camelErr } = await supabase
          .from('products')
          .upsert(camelRow);

        if (camelErr) {
          console.warn("Supabase camelCase retry notice:", camelErr.message);

          // 3. Retry with core legacy columns only (in case new columns like internal_code/price don't exist yet in user's DB)
          const baseRow: Record<string, any> = {
            id: product.id,
            name: product.name,
            brand: product.brand || 'N/A',
            category: product.category,
            has_variants: Boolean(product.hasVariants),
            single_quantity: product.singleQuantity ?? null,
            image: product.image || null,
            thumbnail: product.thumbnail || null,
            variants: product.variants || null,
            created_at: product.createdAt,
            updated_at: product.updatedAt
          };

          const { error: baseErr } = await supabase
            .from('products')
            .upsert(baseRow);

          if (baseErr) {
            console.error("Supabase fallback base upsert notice:", baseErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error("Supabase saveProductAsync connection exception:", err.message || err);
      // Do NOT rethrow or crash request; product remains safe in memory state
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
        internal_code: log.internalCode || null,
        product_name: log.productName,
        brand: log.brand || 'N/A',
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
          internalCode: log.internalCode || null,
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
          const baseSnakeRow = {
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
          const { error: err3 } = await supabase.from('logs').upsert(baseSnakeRow);
          if (err3) {
            try {
              await supabase.from('inventory_logs').upsert(snakeRow);
            } catch (e) {
              // Ignore fallback error
            }
          }
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
          internalCode: "C001",
          sizes: [
            { size: "S", quantity: 3 },
            { size: "M", quantity: 5 },
            { size: "L", quantity: 8 },
            { size: "XL", quantity: 2 }
          ]
        },
        {
          id: "var-1-2",
          internalCode: "C002",
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
          internalCode: "C003",
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
      internalCode: "L001",
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
      internalCode: "L002",
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
          internalCode: "C004",
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
      internalCode: "M001",
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
      internalCode: "P001",
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
      internalCode: "A001",
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
      internalCode: "A002",
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
