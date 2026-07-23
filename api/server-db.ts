import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function getProductsAsync() {
  const { data, error } = await supabase.from('products').select('*');
  if (error) throw error;
  return data || [];
}

export async function getLogsAsync() {
  const { data, error } = await supabase.from('inventory_logs').select('*').order('timestamp', { ascending: false });
  if (error) throw error;
  return data || [];
}