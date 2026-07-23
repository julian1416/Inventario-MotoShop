/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, InventoryLog, ProductCategory } from './types';
import { 
  Search, 
  Plus, 
  Activity, 
  Package, 
  Grid, 
  RotateCw, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FileText,
  BadgeAlert,
  Sliders,
  Check
} from 'lucide-react';
import ProductCard from './components/ProductCard';
import ProductDetails from './components/ProductDetails';
import RecentLogs from './components/RecentLogs';
import AddProductModal from './components/AddProductModal';

export default function App() {
  // Database States
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Search & Navigation States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'inventario' | 'bitacora'>('inventario');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Advanced Quick Filters
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const [stockFilter, setStockFilter] = useState<'todos' | 'disponibles' | 'agotados'>('todos');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Synchronize data from server DB
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [productsRes, logsRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/logs')
      ]);

      if (!productsRes.ok || !logsRes.ok) {
        throw new Error('No se pudieron recuperar los datos de la bodega');
      }

      const productsData = await productsRes.json();
      const logsData = await logsRes.json();

      setProducts(productsData);
      setLogs(logsData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error al conectar con el servidor. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync details if the active detail view product was modified during transaction
  const handleTransactionSuccess = (updatedProduct: Product) => {
    // Update local products list
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    // Update currently selected product state to update detail sheet
    setSelectedProduct(updatedProduct);
    // Refresh transaction logs asynchronously
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error("Error refreshing logs:", err));
  };

  const handleProductAdded = (newProduct: Product) => {
    // Refresh full state
    fetchData();
  };

  // Filter products based on search query, category, and stock status
  const filteredProducts = products.filter(p => {
    // 1. Search Query
    const q = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (q) {
      const nameMatch = p.name.toLowerCase().includes(q);
      const brandMatch = p.brand.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);
      const typeMatch = p.type ? p.type.toLowerCase().includes(q) : false;
      const measureMatch = p.measure ? p.measure.toLowerCase().includes(q) : false;
      const descMatch = p.description ? p.description.toLowerCase().includes(q) : false;
      matchesSearch = nameMatch || brandMatch || catMatch || typeMatch || measureMatch || descMatch;
    }

    // 2. Category Filter
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;

    // 3. Stock Level Filter
    const totalStock = !p.hasVariants 
      ? (p.singleQuantity || 0) 
      : (p.variants || []).reduce((sum, v) => sum + v.sizes.reduce((acc, curr) => acc + curr.quantity, 0), 0);
      
    let matchesStock = true;
    if (stockFilter === 'disponibles') {
      matchesStock = totalStock > 0;
    } else if (stockFilter === 'agotados') {
      matchesStock = totalStock === 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans select-none antialiased max-w-lg mx-auto border-x border-slate-100 shadow-xl" id="pwa-container">
      
      {/* 1. Main View Layout */}
      {!selectedProduct ? (
        <>
          {/* iOS Style Custom Header */}
          <header className="bg-white px-4 pt-5 pb-4 border-b border-slate-150 sticky top-0 z-20 shadow-xs shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Package className="w-5.5 h-5.5 text-orange-500" />
                  Bodega Móvil
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Control de Inventario de Accesorios</p>
              </div>

              {/* Sync Actions */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={fetchData}
                  className="p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors active:rotate-45 duration-300"
                  title="Recargar inventario"
                  id="btn-sync"
                >
                  <RotateCw className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-1.5 active:scale-95 transition-all"
                  id="btn-add-product"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Nuevo</span>
                </button>
              </div>
            </div>

            {/* Global Sticky Search (Priority #1) */}
            {activeTab === 'inventario' && (
              <div className="mt-4 space-y-2.5">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="h-4.5 w-4.5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar casco, llanta, marca, medida..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none placeholder-slate-400 transition-all font-medium text-slate-800"
                    id="global-search"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 font-mono"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Filters Capsule Actions Bar */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-[80%]">
                    {['Todos', 'Cascos Adultos', 'Llantas', 'Maleteros', 'Lujos', 'Accesorios'].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat as any)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold border shrink-0 transition-colors ${
                            isSelected 
                              ? 'bg-orange-500 border-orange-500 text-white shadow-sm shadow-orange-500/20' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat === 'Todos' ? '💡 Todos' : cat}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                    className={`p-2 rounded-xl border transition-colors flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide ${
                      showFiltersPanel 
                        ? 'bg-slate-800 border-slate-800 text-white' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filtros</span>
                  </button>
                </div>

                {/* Expanded Filters Drawer */}
                {showFiltersPanel && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Estado de Existencias
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'todos', label: 'Todos' },
                          { key: 'disponibles', label: '✅ Disponibles' },
                          { key: 'agotados', label: '❌ Agotados' }
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setStockFilter(item.key as any)}
                            className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold transition-colors ${
                              stockFilter === item.key
                                ? 'bg-white text-slate-950 border-slate-400 shadow-3xs'
                                : 'bg-slate-100/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Otras Categorías
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {['Cascos Niños', 'Parrillas', 'Otros'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat as any)}
                            className={`py-1 px-2.5 rounded-lg border text-xs font-semibold ${
                              selectedCategory === cat
                                ? 'bg-white text-slate-950 border-slate-400'
                                : 'bg-slate-100/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Primary View Router */}
          <main className="flex-1 overflow-y-auto" id="main-scroller">
            {activeTab === 'inventario' ? (
              /* TAB 1: Inventory Products list */
              <div className="p-4 space-y-3">
                {isLoading ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-slate-400">Consultando stock disponible...</p>
                  </div>
                ) : errorMsg ? (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-xs font-bold text-rose-800">{errorMsg}</p>
                    <button 
                      onClick={fetchData}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold"
                    >
                      Reintentar conexión
                    </button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-3">
                    <BadgeAlert className="w-14 h-14 text-slate-300 mx-auto stroke-1" />
                    <h3 className="text-sm font-extrabold text-slate-700">Sin coincidencias</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      No encontramos ningún accesorio o producto que coincida con tus filtros actuales. Intenta limpiar la búsqueda.
                    </p>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs rounded-xl border border-orange-100"
                      >
                        Limpiar Búsqueda
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Header with products count */}
                    <div className="flex justify-between items-center px-1 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <span>Lista de mercancía</span>
                      <span>{filteredProducts.length} items</span>
                    </div>

                    {filteredProducts.map((p) => (
                      <ProductCard 
                        key={p.id}
                        product={p}
                        onSelect={() => setSelectedProduct(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: Historical Movement Logs */
              <RecentLogs logs={logs} />
            )}
          </main>

          {/* iOS Style Floating Bottom Tab Bar */}
          <nav className="bg-white border-t border-slate-150 py-2.5 px-6 flex justify-around sticky bottom-0 z-20 shadow-lg shrink-0">
            <button
              onClick={() => setActiveTab('inventario')}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
                activeTab === 'inventario' ? 'text-orange-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              id="tab-inventory"
            >
              <Package className="w-5 h-5 stroke-[2.2]" />
              <span className="text-[10px] tracking-wide uppercase font-bold">Bodega</span>
            </button>
            <button
              onClick={() => setActiveTab('bitacora')}
              className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
                activeTab === 'bitacora' ? 'text-orange-500 scale-105 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
              id="tab-logs"
            >
              <Activity className="w-5 h-5 stroke-[2.2]" />
              <span className="text-[10px] tracking-wide uppercase font-bold">Bitácora</span>
            </button>
          </nav>
        </>
      ) : (
        /* 2. Detail Sheet View */
        <ProductDetails 
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
          onTransactionSuccess={handleTransactionSuccess}
        />
      )}

      {/* 3. Add Product Form Drawer */}
      {showAddModal && (
        <AddProductModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={handleProductAdded}
        />
      )}
    </div>
  );
}
