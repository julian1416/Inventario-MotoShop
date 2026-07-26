/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Product, InventoryLog } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  PieChart as PieChartIcon, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface AnalyticsDashboardProps {
  products: Product[];
  logs: InventoryLog[];
  onSelectProduct?: (product: Product) => void;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

const CATEGORY_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308', '#64748b'];

export default function AnalyticsDashboard({ products, logs, onSelectProduct }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>('all');

  // Filter logs by selected date period
  const filteredLogs = useMemo(() => {
    if (period === 'all') return logs;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      if (isNaN(logDate.getTime())) return true;

      if (period === 'today') {
        return logDate >= startOfToday;
      }
      if (period === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= sevenDaysAgo;
      }
      if (period === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return logDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [logs, period]);

  // 1. Calculate global KPIs
  const totalProducts = products.length;

  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => {
      if (!p.hasVariants) {
        return acc + (p.singleQuantity || 0);
      }
      const varStock = (p.variants || []).reduce((sum, v) => {
        return sum + (v.sizes || []).reduce((sSum, s) => sSum + (s.quantity || 0), 0);
      }, 0);
      return acc + varStock;
    }, 0);
  }, [products]);

  const totalEntries = useMemo(() => {
    return filteredLogs
      .filter(l => l.type === 'entry')
      .reduce((sum, l) => sum + (l.quantity || 0), 0);
  }, [filteredLogs]);

  const totalExits = useMemo(() => {
    return filteredLogs
      .filter(l => l.type === 'exit')
      .reduce((sum, l) => sum + (l.quantity || 0), 0);
  }, [filteredLogs]);

  // 2. Low Stock Alerts (< 3 units or 0 units)
  const lowStockProducts = useMemo(() => {
    return products.map(p => {
      let stock = 0;
      if (!p.hasVariants) {
        stock = p.singleQuantity || 0;
      } else {
        stock = (p.variants || []).reduce((sum, v) => {
          return sum + (v.sizes || []).reduce((sSum, s) => sSum + (s.quantity || 0), 0);
        }, 0);
      }
      return { product: p, stock };
    })
    .filter(item => item.stock <= 3)
    .sort((a, b) => a.stock - b.stock);
  }, [products]);

  // 3. Category Stock Breakdown (Categories con más stock)
  const categoryStockData = useMemo(() => {
    const map: Record<string, number> = {};

    products.forEach(p => {
      const cat = p.category || 'Otros';
      let stock = 0;
      if (!p.hasVariants) {
        stock = p.singleQuantity || 0;
      } else {
        stock = (p.variants || []).reduce((sum, v) => {
          return sum + (v.sizes || []).reduce((sSum, s) => sSum + (s.quantity || 0), 0);
        }, 0);
      }
      map[cat] = (map[cat] || 0) + stock;
    });

    return Object.keys(map).map(catName => ({
      name: catName,
      value: map[catName]
    })).sort((a, b) => b.value - a.value);
  }, [products]);

  // 4. Most active products (Entradas vs Salidas por producto)
  const productMovementData = useMemo(() => {
    const movementMap: Record<string, { name: string; entradas: number; salidas: number }> = {};

    filteredLogs.forEach(log => {
      const key = log.productName || 'Producto';
      if (!movementMap[key]) {
        movementMap[key] = { name: key.length > 14 ? key.substring(0, 14) + '...' : key, entradas: 0, salidas: 0 };
      }
      if (log.type === 'entry') {
        movementMap[key].entradas += log.quantity || 0;
      } else {
        movementMap[key].salidas += log.quantity || 0;
      }
    });

    const items = Object.values(movementMap);
    // Sort by total movement volume
    return items
      .sort((a, b) => (b.entradas + b.salidas) - (a.entradas + a.salidas))
      .slice(0, 6);
  }, [filteredLogs]);

  return (
    <div className="bg-slate-50 min-h-screen pb-16 w-full max-w-lg mx-auto space-y-4" id="analytics-dashboard">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-slate-150 sticky top-0 z-10 shadow-3xs">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5.5 h-5.5 text-orange-500" />
              Análisis y Métricas
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Estadísticas en tiempo real de bodega y flujo de mercancía</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 mt-3.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: '7 días' },
            { id: 'month', label: '30 días' },
            { id: 'all', label: 'Todo' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as PeriodFilter)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                period === item.id 
                  ? 'bg-white text-slate-900 shadow-3xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI Summary Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Unidades en Bodega</span>
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{totalStockUnits}</p>
            <p className="text-[10px] text-slate-400 font-semibold">{totalProducts} referencias activas</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Salidas / Ventas</span>
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600 font-mono tracking-tight">{totalExits}</p>
            <p className="text-[10px] text-rose-500 font-semibold">unidades despachadas</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Entradas / Reabastecimiento</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">{totalEntries}</p>
            <p className="text-[10px] text-emerald-600 font-semibold">unidades ingresadas</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-3xs space-y-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Bajo Stock</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 font-mono tracking-tight">{lowStockProducts.length}</p>
            <p className="text-[10px] text-amber-600 font-semibold">requieren atención</p>
          </div>
        </div>

        {/* Chart 1: Productos con más movimiento (Entradas vs Salidas) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Flujo de Movimiento por Producto
              </h3>
              <p className="text-[10px] text-slate-400">Comparativa de Entradas (+) vs Salidas (-)</p>
            </div>
          </div>

          {productMovementData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay registros de movimientos en este período.
            </div>
          ) : (
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productMovementData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 9, fill: '#64748b' }} 
                    interval={0} 
                    angle={-20} 
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salidas" name="Salidas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Alert 2: Alerta visual de productos con bajo stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Alerta de Bajo Stock</h3>
                <p className="text-[10px] text-slate-400">Productos con 3 o menos unidades en inventario</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {lowStockProducts.length}
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-800">¡Inventario óptimo!</p>
              <p className="text-[10px] text-emerald-600">Todos tus productos tienen stock suficiente.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {lowStockProducts.map(({ product, stock }) => {
                const isOut = stock === 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectProduct && onSelectProduct(product)}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOut ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {product.category} {product.internalCode ? `• ${product.internalCode}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded-lg ${
                        isOut ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isOut ? 'Agotado (0)' : `${stock} und.`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart 3: Categorías con más stock / más llenas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-500" />
              Distribución de Stock por Categoría
            </h3>
            <p className="text-[10px] text-slate-400">Total de unidades almacenadas por cada categoría</p>
          </div>

          {categoryStockData.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">No hay categorías registradas.</div>
          ) : (
            <div className="space-y-3">
              <div className="h-48 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStockData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryStockData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                      formatter={(value: any) => [`${value} unidades`, 'Stock']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend list */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                {categoryStockData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                      />
                      <span className="text-slate-600 truncate font-medium">{cat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
