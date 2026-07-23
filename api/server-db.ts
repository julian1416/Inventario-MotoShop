import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, InventoryLog } from '../src/types.js'; // Importación local ahora que lo movimos

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Mapeo de datos (mantenemos tu lógica de conversión)
function mapProductFromRow(row: any): Product {
  return {
    id: String(row.id),
    name: row.name,
    brand: row.brand,
    category: row.category,
    type: row.type || undefined,
    measure: row.measure || undefined,
    description: row.description || undefined,
    hasVariants: row.has_variants ?? false,
    singleQuantity: row.single_quantity ?? undefined,
    image: row.image || undefined,
    thumbnail: row.thumbnail || undefined,
    variants: typeof row.variants === 'string' ? JSON.parse(row.variants) : (row.variants || []),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getProductsAsync(): Promise<Product[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return (data || []).map(mapProductFromRow);
}

export async function saveProductAsync(product: Product): Promise<void> {
  if (!supabase) return;
  const row = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    type: product.type || null,
    measure: product.measure || null,
    description: product.description || null,
    has_variants: product.hasVariants,
    single_quantity: product.singleQuantity ?? null,
    image: product.image || null,
    thumbnail: product.thumbnail || null,
    variants: product.variants || [],
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('products').upsert(row);
  if (error) throw error;
}

export async function deleteProductAsync(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function getLogsAsync(): Promise<InventoryLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveLogAsync(log: any): Promise<void> {
  if (!supabase) return;
  const row = {
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
    timestamp: log.timestamp,
    operator: log.operator || 'Bodega'
  };
  const { error } = await supabase.from('inventory_logs').upsert(row);
  if (error) throw error;
}