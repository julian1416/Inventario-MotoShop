/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, VisualVariant, SizeStock } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  User, 
  Tag, 
  AlertCircle, 
  CheckCircle, 
  Maximize2, 
  Grid, 
  Clock, 
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
  onTransactionSuccess: (updatedProduct: Product) => void;
}

export default function ProductDetails({ product, onBack, onTransactionSuccess }: ProductDetailsProps) {
  // Variant states for cascos
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  
  // Modal viewer for images
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Transaction states
  const [actionType, setActionType] = useState<'entry' | 'exit' | null>(null);
  const [qtyValue, setQtyValue] = useState<number>(1);
  const [operatorName, setOperatorName] = useState<string>(() => {
    return localStorage.getItem('default_operator_name') || 'Bodega Móvil';
  });
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-set first size if product has variants
  useEffect(() => {
    if (product.hasVariants && product.variants && product.variants[selectedVariantIdx]) {
      const sizes = product.variants[selectedVariantIdx].sizes;
      if (sizes.length > 0) {
        // Find first size that has stock, or just select the first one
        const firstWithStock = sizes.find(s => s.quantity > 0);
        setSelectedSize(firstWithStock ? firstWithStock.size : sizes[0].size);
      } else {
        setSelectedSize('');
      }
    } else {
      setSelectedSize('');
    }
    // Reset transaction actions
    setActionType(null);
    setQtyValue(1);
    setErrorMsg('');
    setSuccessMsg('');
  }, [product, selectedVariantIdx]);

  // Keep track of local storage operator name
  const handleOperatorChange = (name: string) => {
    setOperatorName(name);
    localStorage.setItem('default_operator_name', name);
  };

  // Quick quantity buttons
  const handleQtyAdjust = (amount: number) => {
    setQtyValue(prev => Math.max(1, prev + amount));
  };

  const activeVariant: VisualVariant | undefined = product.hasVariants && product.variants 
    ? product.variants[selectedVariantIdx] 
    : undefined;

  // Active stock levels
  const getActiveStock = (): number => {
    if (!product.hasVariants) {
      return product.singleQuantity || 0;
    }
    if (activeVariant && selectedSize) {
      const stockItem = activeVariant.sizes.find(s => s.size === selectedSize);
      return stockItem ? stockItem.quantity : 0;
    }
    return 0;
  };

  const currentStock = getActiveStock();

  // Handle submit transaction
  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (qtyValue <= 0) {
      setErrorMsg('La cantidad debe ser mayor que cero');
      setIsSubmitting(false);
      return;
    }

    if (actionType === 'exit' && currentStock < qtyValue) {
      setErrorMsg(`Inventario insuficiente. No puedes retirar ${qtyValue} unidades si solo quedan ${currentStock} disponibles.`);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      productId: product.id,
      type: actionType,
      variantId: product.hasVariants ? activeVariant?.id : undefined,
      size: product.hasVariants ? selectedSize : undefined,
      quantity: qtyValue,
      operator: operatorName.trim() || 'Bodega Móvil'
    };

    try {
      const response = await fetch('/api/inventory/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Ocurrió un error al procesar el movimiento');
      }

      setSuccessMsg(`¡Movimiento registrado con éxito!`);
      // Notify parent to update general state
      onTransactionSuccess(result.product);
      
      // Auto close action block and reset
      setTimeout(() => {
        setActionType(null);
        setSuccessMsg('');
        setQtyValue(1);
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la conexión con el servidor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12 w-full max-w-lg mx-auto" id="product-detail-view">
      {/* Dynamic Header */}
      <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10 shadow-xs">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium py-1.5"
          id="btn-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Regresar</span>
        </button>
        <span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded-full text-slate-500 font-bold">
          ID: {product.id}
        </span>
      </div>

      <div className="p-4 space-y-5">
        {/* Main Product Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 mb-2">
                {product.category}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{product.name}</h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">Marca: <span className="text-slate-800 font-semibold">{product.brand}</span></p>
            </div>
            {product.measure && (
              <div className="text-right">
                <span className="inline-block px-3 py-1 text-xs font-mono bg-orange-50 text-orange-700 font-bold rounded-lg border border-orange-100">
                  {product.measure}
                </span>
              </div>
            )}
          </div>

          {product.type && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Grid className="w-3.5 h-3.5" />
              <span>Tipo: <strong className="text-slate-700 font-medium">{product.type}</strong></span>
            </div>
          )}

          {product.description && (
            <p className="text-xs text-slate-600 mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed italic">
              "{product.description}"
            </p>
          )}
        </div>

        {/* Visual Variants / Images for Cascos */}
        {product.hasVariants && product.variants && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 px-1">
              <Layers className="w-4 h-4 text-slate-500" />
              Variantes de Diseño / Color
            </h2>

            {/* Quick variant selectors */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 px-1">
              {product.variants.map((v, idx) => {
                const isSelected = selectedVariantIdx === idx;
                const totalStock = v.sizes.reduce((acc, curr) => acc + curr.quantity, 0);
                
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIdx(idx)}
                    className={`flex-shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {v.thumbnail ? (
                      <img 
                        src={v.thumbnail} 
                        alt={`Diseño ${idx + 1}`} 
                        className="w-10 h-10 object-cover rounded-md border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-400">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                    <div className="text-left leading-tight">
                      <p className="text-xs font-bold text-slate-700">Diseño {idx + 1}</p>
                      <p className={`text-[10px] font-bold ${totalStock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {totalStock} disp.
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected variant full viewer */}
            {activeVariant && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col items-center">
                <div className="relative w-full aspect-square max-w-[280px] bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                  {activeVariant.image ? (
                    <>
                      <img 
                        src={activeVariant.image} 
                        alt="Vista de Variante" 
                        className="w-full h-full object-contain cursor-zoom-in"
                        onClick={() => setFullscreenImage(activeVariant.image || null)}
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => setFullscreenImage(activeVariant.image || null)}
                        className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors"
                        title="Ampliar Imagen"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
                      <Package className="w-16 h-16 stroke-1" />
                      <p className="text-xs font-medium text-slate-400">Sin fotografía disponible</p>
                    </div>
                  )}
                </div>

                {/* Size Grid */}
                <div className="w-full mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 mb-2">Tallas Disponibles:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {activeVariant.sizes.map((s) => {
                      const isSelected = selectedSize === s.size;
                      const hasStock = s.quantity > 0;
                      
                      return (
                        <button
                          key={s.size}
                          onClick={() => setSelectedSize(s.size)}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105' 
                              : hasStock
                                ? 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                                : 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60'
                          }`}
                        >
                          <span className="text-xs font-bold font-mono">{s.size}</span>
                          <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-orange-100' : hasStock ? 'text-slate-500' : 'text-slate-400'}`}>
                            {s.quantity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product view without variants */}
        {!product.hasVariants && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col items-center">
            <div className="relative w-full aspect-square max-w-[280px] bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
              {product.image ? (
                <>
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setFullscreenImage(product.image || null)}
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setFullscreenImage(product.image || null)}
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
                  <Package className="w-16 h-16 stroke-1" />
                  <p className="text-xs font-medium text-slate-400">Sin fotografía disponible</p>
                </div>
              )}
            </div>

            <div className="w-full mt-4 border-t border-slate-100 pt-4 flex justify-between items-center px-2">
              <div>
                <p className="text-xs font-bold text-slate-500">Cantidad disponible en bodega</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Unidades listas para entrega</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-center border font-bold text-xl ${
                (product.singleQuantity || 0) > 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-rose-50 text-rose-700 border-rose-100'
              }`}>
                {product.singleQuantity || 0}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Action Operations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {/* Tabs for fast choice */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            <button
              onClick={() => {
                setActionType('entry');
                setQtyValue(1);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-3.5 text-center font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                actionType === 'entry' 
                  ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' 
                  : 'text-slate-600 hover:bg-slate-50/50'
              }`}
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              Registrar Entrada
            </button>
            <button
              onClick={() => {
                setActionType('exit');
                setQtyValue(1);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-3.5 text-center font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                actionType === 'exit' 
                  ? 'bg-rose-50 text-rose-800 border-b-2 border-rose-600' 
                  : 'text-slate-600 hover:bg-slate-50/50'
              }`}
            >
              <Minus className="w-4 h-4 text-rose-600" />
              Registrar Salida
            </button>
          </div>

          <AnimatePresence mode="wait">
            {actionType ? (
              <motion.form
                key={actionType}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleTransaction}
                className="p-4 space-y-4"
              >
                {/* Specific context summary */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex items-center justify-between text-xs font-medium text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${actionType === 'entry' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span>
                      {actionType === 'entry' ? 'Ingresando mercancía a' : 'Retirando mercancía de'}:
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {product.hasVariants ? `Talla ${selectedSize}` : 'Stock General'}
                  </span>
                </div>

                {/* Tactile Dialer Selector */}
                <div className="flex flex-col items-center space-y-2">
                  <label className="text-xs font-bold text-slate-500">Cantidad a registrar</label>
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(-1)}
                      className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    
                    <input
                      type="number"
                      value={qtyValue}
                      onChange={(e) => setQtyValue(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 text-center text-3xl font-extrabold text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2 focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      min="1"
                    />

                    <button
                      type="button"
                      onClick={() => handleQtyAdjust(1)}
                      className="w-12 h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full flex items-center justify-center font-bold text-xl active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>

                  {/* Increment Shortcuts */}
                  <div className="flex gap-2.5 mt-2">
                    {[1, 2, 5, 10].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setQtyValue(inc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          qtyValue === inc 
                            ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-2xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operator Name Field (persists in localStorage) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Responsable de la operación
                  </label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => handleOperatorChange(e.target.value)}
                    placeholder="Tu nombre (se guardará en este celular)"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                    required
                  />
                </div>

                {/* Feedback notifications */}
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold flex items-start gap-2 animate-pulse">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-bold flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Submitting Actions */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-99 transition-all ${
                    actionType === 'entry'
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-100'
                      : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-100'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Registrando...</span>
                  ) : (
                    <>
                      <span>Confirmar {actionType === 'entry' ? 'Entrada' : 'Salida'}</span>
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                <p className="font-medium">Selecciona "Registrar Entrada" o "Registrar Salida" para modificar el inventario.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Fullscreen Image Viewer Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
            onClick={() => setFullscreenImage(null)}
          >
            <div className="absolute top-4 right-4 text-white text-xs font-mono bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md cursor-pointer">
              Cerrar [×]
            </div>
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={fullscreenImage} 
              alt="Ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
            <p className="text-slate-400 text-xs text-center mt-4 max-w-xs leading-relaxed">
              Toca cualquier parte de la pantalla para regresar a la aplicación.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
