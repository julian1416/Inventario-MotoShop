/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { Package, Grid, AlertTriangle, Minus, Tag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: () => void;
  onQuickOutput?: (product: Product) => void;
}

export default function ProductCard({ product, onSelect, onQuickOutput }: ProductCardProps) {
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
        {/* Internal Code Tag, Category & Brand Header */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Internal Code Badge */}
          {product.hasVariants && product.variants ? (
            <div className="flex gap-1 flex-wrap">
              {product.variants.map((v, i) => (
                v.internalCode ? (
                  <span key={v.id || i} className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono font-extrabold shadow-3xs">
                    {v.internalCode}
                  </span>
                ) : null
              ))}
            </div>
          ) : product.internalCode ? (
            <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-extrabold shadow-3xs">
              {product.internalCode}
            </span>
          ) : null}

          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
            {product.category}
          </span>
        </div>

        {/* PROMINENT MARCA BADGE - Clean & readable */}
        {product.brand && product.brand !== 'Genérico' && product.brand !== 'N/A' && (
          <div className="pt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-orange-900 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded-md">
              <Tag className="w-3 h-3 text-orange-600 shrink-0" />
              <span>Marca: {product.brand}</span>
            </span>
          </div>
        )}

        {/* Product Name / Referencia */}
        <h3 className="text-xs font-semibold text-slate-800 truncate leading-snug">
          {product.name}
        </h3>

        {/* Price & Tire type */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {product.price !== undefined && product.price > 0 && (
            <span className="text-[11px] font-extrabold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              ${product.price.toLocaleString('es-CO')}
            </span>
          )}
          {product.type && (
            <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-2 py-0.5 rounded-md">
              {product.type}
            </span>
          )}
          {product.measure && (
            <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {product.measure}
            </span>
          )}
        </div>

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

      {/* Stock Level Badge & Quick Actions */}
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

        {/* Direct Quick Output / Quantity Decrease Button on Card */}
        {onQuickOutput && totalStock > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickOutput(product);
            }}
            className="mt-1 px-2.5 py-1 text-orange-700 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 rounded-xl transition-all border border-orange-200 flex items-center gap-1 text-[10px] font-black shadow-2xs cursor-pointer"
            title="Disminuir cantidad / Salida rápida"
          >
            <Minus className="w-3 h-3 stroke-[3]" />
            <span>Salida</span>
          </button>
        )}
      </div>
    </div>
  );
}
