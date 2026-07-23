//src/types.ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductCategory = 
  | 'Cascos Adultos' 
  | 'Cascos Niños' 
  | 'Llantas' 
  | 'Parrillas' 
  | 'Maleteros' 
  | 'Accesorios' 
  | 'Lujos' 
  | 'Otros';

export type TireType = 
  | 'Doble propósito' 
  | 'Pistera' 
  | 'En tacos' 
  | 'Otro';

export interface SizeStock {
  size: string; // S, M, L, XL, 2XL, 3XL, etc.
  quantity: number;
}

export interface VisualVariant {
  id: string; // Unique ID for this visual variant (e.g. design or color)
  image?: string; // Medium size compressed base64 (e.g. max 500px width) for detail
  thumbnail?: string; // High-performance small thumbnail (e.g. max 100px width) for search list
  sizes: SizeStock[]; // Stock levels per size
}

export interface Product {
  id: string;
  name: string; // e.g., "ICH 501" or "Maletero 30L"
  brand: string; // e.g., "ICH", "Michelin", "Shaft", "Givi"
  category: ProductCategory;
  type?: string; // Specific type (e.g. "Doble propósito", "Pistera" for tires)
  measure?: string; // Specific measure (e.g. "130/70-17" for tires, or dimensions for other products)
  description?: string;
  hasVariants: boolean; // True if it has visual design variants and sizes (e.g., Helmets)
  
  // Fields for products WITHOUT variants
  singleQuantity?: number;
  image?: string; // Medium size compressed base64
  thumbnail?: string; // High-performance small thumbnail
  
  // Fields for products WITH variants
  variants?: VisualVariant[];
  
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  type: 'entry' | 'exit'; // Operation type
  variantId?: string; // If it's a casco variant
  size?: string; // If it has sizes
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  timestamp: string;
  operator: string;
}
