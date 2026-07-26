import React, { useState, useEffect } from 'react';
import { Product, VisualVariant, ProductCategory } from '../types';
import { 
  Zap, 
  Search, 
  X, 
  Check, 
  AlertCircle, 
  Minus, 
  Plus, 
  ArrowUpRight, 
  Package, 
  Layers, 
  Tag, 
  Loader2 
} from 'lucide-react';

interface QuickOutputModalProps {
  products: Product[];
  onClose: () => void;
  onTransactionSuccess: () => void;
}

export default function QuickOutputModal({
  products,
  onClose,
  onTransactionSuccess
}: QuickOutputModalProps) {
  const [codeQuery, setCodeQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VisualVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [operator, setOperator] = useState<string>('Mostrador / Bodega');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-lookup matching item whenever query changes
  useEffect(() => {
    const q = codeQuery.toUpperCase().trim();
    if (!q) {
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedSize('');
      setErrorMessage(null);
      return;
    }

    let foundProd: Product | null = null;
    let foundVar: VisualVariant | null = null;

    // First exact match on internal code
    for (const p of products) {
      if (p.hasVariants && p.variants) {
        for (const v of p.variants) {
          if (v.internalCode && v.internalCode.toUpperCase() === q) {
            foundProd = p;
            foundVar = v;
            break;
          }
        }
      } else if (p.internalCode && p.internalCode.toUpperCase() === q) {
        foundProd = p;
        break;
      }
      if (foundProd) break;
    }

    // If no exact match, try prefix/partial match
    if (!foundProd && q.length >= 2) {
      for (const p of products) {
        if (p.hasVariants && p.variants) {
          for (const v of p.variants) {
            if (v.internalCode && v.internalCode.toUpperCase().startsWith(q)) {
              foundProd = p;
              foundVar = v;
              break;
            }
          }
        } else if (p.internalCode && p.internalCode.toUpperCase().startsWith(q)) {
          foundProd = p;
          break;
        }
        if (foundProd) break;
      }
    }

    if (foundProd) {
      setSelectedProduct(foundProd);
      setSelectedVariant(foundVar);
      setQuantity(1);
      setErrorMessage(null);

      // Auto-select first size with available stock if variants exist
      if (foundVar && foundVar.sizes.length > 0) {
        const available = foundVar.sizes.find(s => s.quantity > 0) || foundVar.sizes[0];
        setSelectedSize(available ? available.size : '');
      } else {
        setSelectedSize('');
      }
    } else {
      setSelectedProduct(null);
      setSelectedVariant(null);
      setSelectedSize('');
    }
  }, [codeQuery, products]);

  // Handle stock exit execution
  const handleConfirmExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (selectedProduct.hasVariants) {
      if (!selectedVariant) {
        setErrorMessage("Por favor selecciona la variante correspondiente.");
        return;
      }
      if (!selectedSize) {
        setErrorMessage("Por favor selecciona la talla a descontar.");
        return;
      }

      const sizeObj = selectedVariant.sizes.find(s => s.size === selectedSize);
      const stockAvailable = sizeObj ? sizeObj.quantity : 0;
      if (stockAvailable < quantity) {
        setErrorMessage(`Inventario insuficiente en talla ${selectedSize}. Solo quedan ${stockAvailable} disponibles.`);
        return;
      }
    } else {
      const stockAvailable = selectedProduct.singleQuantity || 0;
      if (stockAvailable < quantity) {
        setErrorMessage(`Inventario insuficiente. Solo quedan ${stockAvailable} unidades disponibles.`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/inventory/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          type: 'exit',
          variantId: selectedVariant?.id,
          size: selectedSize || undefined,
          quantity,
          operator: operator.trim() || 'Bodega Móvil'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la salida");
      }

      const codeUsed = selectedVariant?.internalCode || selectedProduct.internalCode || 'código';
      setSuccessMessage(`¡Salida registrada! -${quantity} unidad(es) de ${selectedProduct.name} [${codeUsed}]`);
      
      // Trigger update to parent state
      onTransactionSuccess();

      // Reset for next quick scan after short delay
      setTimeout(() => {
        setCodeQuery('');
        setSelectedProduct(null);
        setSelectedVariant(null);
        setSelectedSize('');
        setQuantity(1);
        setSuccessMessage(null);
      }, 1800);

    } catch (err: any) {
      console.error("Quick exit error:", err);
      setErrorMessage(err.message || "No se pudo realizar la salida");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency helpers
  const formatPrice = (p?: number) => {
    if (p === undefined || p === null) return null;
    return new Intl.NumberFormat('es-CO').format(p);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in" id="quick-output-modal">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-orange-500 p-2 rounded-xl text-white shadow-sm shadow-orange-500/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Salida Rápida de Inventario</h2>
              <p className="text-[11px] text-slate-300">Digita el código interno (ej: C001, L001)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {/* Quick Code Search Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Escribe el Código Interno
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-orange-500" />
              </span>
              <input
                type="text"
                placeholder="ej. C001, C002, L001, M001..."
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value.toUpperCase())}
                autoFocus
                className="w-full pl-11 pr-10 py-3.5 bg-slate-50 focus:bg-white border-2 border-orange-400 focus:border-orange-500 rounded-xl font-mono text-lg font-black tracking-wider text-slate-900 placeholder-slate-300 outline-none transition-all shadow-inner uppercase"
              />
              {codeQuery && (
                <button
                  onClick={() => setCodeQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 font-mono"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Quick Code Suggestions Chips */}
          {!selectedProduct && !codeQuery && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Ejemplos de códigos registrados:</p>
              <div className="flex flex-wrap gap-1.5">
                {products.flatMap(p => {
                  if (p.hasVariants && p.variants) {
                    return p.variants.map(v => ({ code: v.internalCode, name: p.name }));
                  }
                  return [{ code: p.internalCode, name: p.name }];
                })
                .filter(item => Boolean(item.code))
                .slice(0, 6)
                .map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCodeQuery(item.code || '')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-800 text-slate-700 rounded-lg text-xs font-mono font-bold transition-all border border-slate-200 flex items-center gap-1 active:scale-95"
                  >
                    <span className="text-orange-600 font-black">[{item.code}]</span>
                    <span className="truncate max-w-[120px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success Notification */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-bounce-short">
              <div className="p-1.5 bg-emerald-500 text-white rounded-lg shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <p>{successMessage}</p>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Selected Product Card Match */}
          {selectedProduct ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
              
              {/* Product Header & Code Tag */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-slate-900 text-white font-mono text-xs font-black px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-orange-400" />
                      {selectedVariant?.internalCode || selectedProduct.internalCode || 'S/N'}
                    </span>
                    <span className="text-[11px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                      {selectedProduct.category}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1.5 leading-tight">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.price && (
                    <p className="text-sm font-black text-orange-600 mt-0.5">
                      ${formatPrice(selectedProduct.price)}
                    </p>
                  )}
                </div>

                {/* Thumbnail image if available */}
                {(selectedVariant?.thumbnail || selectedVariant?.image || selectedProduct.thumbnail || selectedProduct.image) && (
                  <img 
                    src={selectedVariant?.thumbnail || selectedVariant?.image || selectedProduct.thumbnail || selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-2xs shrink-0"
                  />
                )}
              </div>

              {/* Helmet Variants Selection (If helmet has multiple visual designs) */}
              {selectedProduct.hasVariants && selectedProduct.variants && selectedProduct.variants.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
                    Diseños Visuales Disponibles:
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedProduct.variants.map((v, idx) => {
                      const isSelected = selectedVariant?.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(v);
                            const avail = v.sizes.find(s => s.quantity > 0) || v.sizes[0];
                            setSelectedSize(avail ? avail.size : '');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border shrink-0 transition-all ${
                            isSelected 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {v.internalCode ? `[${v.internalCode}]` : `Diseño #${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes Selection (For Helmets / Variants) */}
              {selectedProduct.hasVariants && selectedVariant && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase flex justify-between">
                    <span>Selecciona la Talla a Descontar:</span>
                    <span className="text-slate-400 text-[10px]">Tallas disponibles</span>
                  </label>
                  
                  <div className="grid grid-cols-4 gap-1.5">
                    {selectedVariant.sizes.map((s) => {
                      const isSelected = selectedSize === s.size;
                      const hasStock = s.quantity > 0;

                      return (
                        <button
                          key={s.size}
                          type="button"
                          disabled={!hasStock}
                          onClick={() => setSelectedSize(s.size)}
                          className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center justify-center ${
                            isSelected 
                              ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 ring-2 ring-orange-300' 
                              : hasStock
                                ? 'bg-white text-slate-800 border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                                : 'bg-slate-100 text-slate-400 border-slate-100 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <span className="text-xs font-extrabold">{s.size}</span>
                          <span className={`text-[10px] font-mono mt-0.5 font-bold ${
                            isSelected ? 'text-white/90' : hasStock ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {s.quantity} und
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Single Product Stock Level */}
              {!selectedProduct.hasVariants && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Stock Actual en Bodega:</span>
                  </div>
                  <span className={`text-sm font-extrabold font-mono px-2.5 py-0.5 rounded-lg ${
                    (selectedProduct.singleQuantity || 0) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedProduct.singleQuantity || 0} unidades
                  </span>
                </div>
              )}

              {/* Quantity Stepper & Responsable */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Cantidad a Descontar:
                  </label>
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="flex-1 text-center font-mono font-black text-sm text-slate-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Responsable / Operador:
                  </label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    placeholder="Nombre"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Action Submit Button */}
              <button
                type="button"
                onClick={handleConfirmExit}
                disabled={isSubmitting}
                className="w-full mt-2 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando Salida...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    <span>Confirmar Salida (-{quantity} {quantity === 1 ? 'unidad' : 'unidades'})</span>
                  </>
                )}
              </button>

            </div>
          ) : codeQuery ? (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No se encontró el código "{codeQuery}"</h4>
              <p className="text-xs text-slate-400">
                Verifica que el código corresponda a un producto o variante registrada en el sistema.
              </p>
            </div>
          ) : null}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
          <p className="text-[10px] text-slate-400 font-medium">
            💡 Las salidas disminuyen el inventario de bodega y quedan grabadas en el historial sin eliminar el producto.
          </p>
        </div>

      </div>
    </div>
  );
}
