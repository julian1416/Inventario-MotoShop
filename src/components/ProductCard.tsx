/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { Package, Grid, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: () => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  // Calculate total stock
  const getTotalStock = (): number => {
    if (!product.hasVariants) {
      return product.singleQuantity || 0;
    }
    if (!product.variants) return 0;
    return product.variants.reduce((sum, v) => {
      return sum + v.sizes.reduce((sizeSum, s) => sizeSum + s.quantity, 0);
    }, 0);
  };

  const totalStock = getTotalStock();

  // Get display image/thumbnail
  const getDisplayThumbnail = (): string | null => {
    if (!product.hasVariants) {
      return product.thumbnail || product.image || null;
    }
    if (product.variants && product.variants.length > 0) {
      // Find first variant that has a thumbnail or image
      const firstWithImage = product.variants.find(v => v.thumbnail || v.image);
      return firstWithImage ? (firstWithImage.thumbnail || firstWithImage.image || null) : null;
    }
    return null;
  };

  const thumbnail = getDisplayThumbnail();

  // Color code for stock
  const getStockBadgeClass = () => {
    if (totalStock === 0) return 'bg-rose-50 text-rose-700 border-rose-100';
    if (totalStock <= 3) return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  // Get active sizes in stock (helpful quick scan for cascos)
  const getActiveSizes = (): string[] => {
    if (!product.hasVariants || !product.variants) return [];
    const sizesSet = new Set<string>();
    product.variants.forEach(v => {
      v.sizes.forEach(s => {
        if (s.quantity > 0) sizesSet.add(s.size);
      });
    });
    return Array.from(sizesSet);
  };

  const activeSizes = getActiveSizes();

  return (
    <div 
      onClick={onSelect}
      className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all active:scale-98 cursor-pointer flex gap-3.5 items-center relative overflow-hidden"
      id={`product-card-${product.id}`}
    >
      {/* Product Image Thumbnail */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-100 shrink-0 flex items-center justify-center overflow-hidden relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={product.name} 
            className="w-full h-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Package className="w-8 h-8 text-slate-300 stroke-1" />
        )}
        
        {/* Design count badge for cascos */}
        {product.hasVariants && product.variants && product.variants.length > 1 && (
          <span className="absolute bottom-1 right-1 bg-slate-900/70 backdrop-blur-xs text-[8px] text-white font-extrabold px-1.5 py-0.5 rounded font-sans uppercase">
            {product.variants.length} Colores
          </span>
        )}
      </div>

      {/* Product Info Block */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Category & Brand Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
            {product.category}
          </span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">
            • {product.brand}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="text-sm font-bold text-slate-800 truncate leading-snug">
          {product.name}
        </h3>

        {/* Measure, Tire Type, or Specific Metadata */}
        {product.measure && (
          <p className="text-[11px] font-mono font-bold text-orange-600 bg-orange-50/50 px-2 py-0.5 rounded-md inline-block">
            {product.measure} {product.type ? `(${product.type})` : ''}
          </p>
        )}

        {/* Helmet Quick-Scan Sizes */}
        {product.hasVariants && activeSizes.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Tallas:</span>
            <div className="flex gap-1 flex-wrap">
              {activeSizes.map(sz => (
                <span 
                  key={sz} 
                  className="text-[9px] bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-150"
                >
                  {sz}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stock Level Badge */}
      <div className="shrink-0 flex flex-col items-end gap-1 pl-1">
        <div className={`px-2.5 py-1 rounded-2xl text-center border font-extrabold text-xs flex flex-col justify-center items-center ${getStockBadgeClass()}`}>
          <span className="text-[13px]">{totalStock}</span>
          <span className="text-[8px] tracking-wide font-medium uppercase text-slate-500 mt-0.2">disp.</span>
        </div>
        {totalStock === 0 && (
          <span className="text-[9px] font-bold text-rose-500 flex items-center gap-0.5 uppercase tracking-wide">
            <AlertTriangle className="w-2.5 h-2.5" />
            Agotado
          </span>
        )}
      </div>
    </div>
  );
}
