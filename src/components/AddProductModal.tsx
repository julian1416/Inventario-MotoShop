/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { ProductCategory, Product, VisualVariant, SizeStock } from '../types';
import { 
  X, 
  Camera, 
  Plus, 
  Minus, 
  Package, 
  Tag, 
  Layers, 
  ChevronRight, 
  AlertCircle,
  TrendingUp,
  Grid
} from 'lucide-react';
import { compressAndResizeImage } from './ImageCompressor';

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: (newProduct: Product) => void;
}

export default function AddProductModal({ onClose, onSuccess }: AddProductModalProps) {
  // Main form fields
  const [name, setName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [category, setCategory] = useState<ProductCategory>('Cascos Adultos');
  const [type, setType] = useState<string>('');
  const [measure, setMeasure] = useState<string>('');
  const [hasVariants, setHasVariants] = useState<boolean>(true);

  // Single product image and stock (if no variants)
  const [singleQuantity, setSingleQuantity] = useState<number>(0);
  const [singleImage, setSingleImage] = useState<string | null>(null);
  const [singleThumbnail, setSingleThumbnail] = useState<string | null>(null);

  // Helper to get size templates according to category
  const getInitialSizesForCategory = (cat: ProductCategory): SizeStock[] => {
    if (cat === 'Cascos Niños') {
      return [
        { size: 'XS', quantity: 0 },
        { size: 'Talla Única', quantity: 0 }
      ];
    }
    // Cascos Adultos or default helmet category
    return [
      { size: 'S', quantity: 0 },
      { size: 'M', quantity: 0 },
      { size: 'L', quantity: 0 },
      { size: 'XL', quantity: 0 }
    ];
  };

  // Helmet variants list (if has variants)
  const [variants, setVariants] = useState<Array<{
    image: string | null;
    thumbnail: string | null;
    sizes: SizeStock[];
  }>>([
    {
      image: null,
      thumbnail: null,
      sizes: [
        { size: 'S', quantity: 0 },
        { size: 'M', quantity: 0 },
        { size: 'L', quantity: 0 },
        { size: 'XL', quantity: 0 }
      ]
    }
  ]);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // File inputs references
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const variantFileInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Auto-switch 'hasVariants' and reset sizes when category changes
  const handleCategoryChange = (cat: ProductCategory) => {
    setCategory(cat);
    const isHelmet = cat.includes('Cascos');
    setHasVariants(isHelmet);

    if (isHelmet) {
      const defaultSizes = getInitialSizesForCategory(cat);
      setVariants(prev => prev.map(v => ({
        ...v,
        sizes: defaultSizes.map(s => ({ size: s.size, quantity: 0 }))
      })));
    }
  };

  // Process single product image upload
  const handleSingleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg('');
      const compressed = await compressAndResizeImage(file);
      setSingleImage(compressed.medium);
      setSingleThumbnail(compressed.thumbnail);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al procesar la imagen. Intenta con otra.');
    }
  };

  // Process variant image upload
  const handleVariantImageUpload = async (variantIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg('');
      const compressed = await compressAndResizeImage(file);
      const updatedVariants = [...variants];
      updatedVariants[variantIdx].image = compressed.medium;
      updatedVariants[variantIdx].thumbnail = compressed.thumbnail;
      setVariants(updatedVariants);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al procesar la imagen de la variante.');
    }
  };

  // Add a new visual variant block for cascos
  const addVariantBlock = () => {
    const defaultSizes = getInitialSizesForCategory(category);
    setVariants([
      ...variants,
      {
        image: null,
        thumbnail: null,
        sizes: defaultSizes.map(s => ({ size: s.size, quantity: 0 }))
      }
    ]);
  };

  // Remove a visual variant block
  const removeVariantBlock = (idx: number) => {
    if (variants.length <= 1) return;
    const updated = [...variants];
    updated.splice(idx, 1);
    setVariants(updated);
  };

  // Adjust variant stock sizes
  const handleVariantSizeStockChange = (vIdx: number, sizeCode: string, value: number) => {
    const updated = [...variants];
    const sizeObj = updated[vIdx].sizes.find(s => s.size === sizeCode);
    if (sizeObj) {
      sizeObj.quantity = Math.max(0, value);
    }
    setVariants(updated);
  };

  // Submit product creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('El nombre o referencia es obligatorio');
      return;
    }
    if (!brand.trim()) {
      setErrorMsg('La marca es obligatoria');
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      type: type.trim() || undefined,
      measure: measure.trim() || undefined,
      hasVariants,
    };

    if (hasVariants) {
      payload.variants = variants.map(v => ({
        image: v.image,
        thumbnail: v.thumbnail,
        sizes: v.sizes
      }));
    } else {
      payload.singleQuantity = singleQuantity;
      payload.image = singleImage;
      payload.thumbnail = singleThumbnail;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al guardar el producto');
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Registrar Nuevo Producto</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Bodega de Accesorios y Lujos</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Categoría del Producto
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Cascos Adultos', 'Cascos Niños', 
                  'Llantas', 'Parrillas', 
                  'Maleteros', 'Accesorios', 
                  'Lujos', 'Otros'
                ].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat as ProductCategory)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-colors ${
                      category === cat
                        ? 'border-orange-500 bg-orange-50 text-orange-850'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Referencia / Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: ICH 501, E300N2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Marca *</label>
                <input
                  type="text"
                  placeholder="Ej: ICH, Shaft, Givi"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Conditional fields for tires */}
            {category === 'Llantas' && (
              <div className="grid grid-cols-2 gap-3 bg-orange-50/40 p-3.5 rounded-xl border border-orange-100/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-800">Medida de Llanta</label>
                  <input
                    type="text"
                    placeholder="Ej: 130/70-17"
                    value={measure}
                    onChange={(e) => setMeasure(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-orange-800">Tipo de Llanta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="">-- Seleccionar --</option>
                    <option value="Doble propósito">Doble propósito</option>
                    <option value="Pistera">Pistera</option>
                    <option value="En tacos">En tacos</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
            )}

            {/* HELMETS SECTION (with multiple visual variants and sizes) */}
            {hasVariants ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Diseños Visuales y Tallas
                  </h3>
                  <button
                    type="button"
                    onClick={addVariantBlock}
                    className="text-[10px] font-bold text-orange-600 flex items-center gap-1 px-2 py-1 bg-orange-50 hover:bg-orange-100 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Otro Diseño
                  </button>
                </div>

                {variants.map((v, vIdx) => (
                  <div 
                    key={vIdx} 
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 relative"
                  >
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVariantBlock(vIdx)}
                        className="absolute top-3 right-3 text-rose-500 hover:text-rose-700 text-xs font-bold bg-rose-50 px-2 py-1 rounded-md"
                      >
                        Eliminar Diseño
                      </button>
                    )}

                    <h4 className="text-xs font-bold text-slate-800">Diseño #{vIdx + 1}</h4>

                    {/* Image selector */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                        {v.thumbnail ? (
                          <img 
                            src={v.thumbnail} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => variantFileInputRefs.current[vIdx]?.click()}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Subir / Tomar Foto
                        </button>
                        <p className="text-[10px] text-slate-400">Captura o sube la foto de este color</p>
                        <input
                          type="file"
                          accept="image/*"
                          ref={el => { variantFileInputRefs.current[vIdx] = el; }}
                          onChange={(e) => handleVariantImageUpload(vIdx, e)}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Sizes stock matrix */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500">Unidades Iniciales por Talla:</p>
                      <div className="grid grid-cols-5 gap-2">
                        {v.sizes.map((s) => (
                          <div 
                            key={s.size} 
                            className="flex flex-col items-center p-2 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5"
                          >
                            <span className="text-xs font-extrabold font-mono text-slate-600">{s.size}</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleVariantSizeStockChange(vIdx, s.size, s.quantity - 1)}
                                className="w-4 h-4 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 active:scale-90"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold font-mono text-slate-800 min-w-[12px] text-center">
                                {s.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleVariantSizeStockChange(vIdx, s.size, s.quantity + 1)}
                                className="w-4 h-4 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 active:scale-90"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* SIMPLE PRODUCT SECTION (Single quantity and image) */
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  Inventario y Foto del Producto
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Image picker */}
                  <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 cursor-pointer relative"
                       onClick={() => singleFileInputRef.current?.click()}>
                    {singleThumbnail ? (
                      <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-100">
                        <img 
                          src={singleThumbnail} 
                          alt="Thumbnail" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 py-3">
                        <Camera className="w-7 h-7 stroke-1" />
                        <span className="text-[10px] font-bold">Subir Foto</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      ref={singleFileInputRef}
                      onChange={handleSingleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Stock quantity dialer */}
                  <div className="flex flex-col justify-center space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase">Cantidad Inicial</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSingleQuantity(q => Math.max(0, q - 1))}
                        className="w-8 h-8 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center text-sm active:scale-95"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={singleQuantity}
                        onChange={(e) => setSingleQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-12 text-center text-sm font-bold bg-white border border-slate-200 rounded-lg py-1 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setSingleQuantity(q => q + 1)}
                        className="w-8 h-8 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center text-sm active:scale-95"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-400 leading-none mt-1">Unidades físicas reales</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error messaging */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit operations */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-99 transition-all shrink-0"
            >
              {isSubmitting ? (
                <span>Guardando Producto...</span>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Guardar Producto en Bodega</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
