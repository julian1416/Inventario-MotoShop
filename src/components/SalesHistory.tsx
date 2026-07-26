/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { InventoryLog } from '../types';
import { 
  ShoppingBag, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  Layers, 
  Clock, 
  ArrowUpRight, 
  Filter, 
  Sparkles,
  TrendingUp,
  Receipt,
  RotateCcw
} from 'lucide-react';

interface SalesHistoryProps {
  logs: InventoryLog[];
}

type DateRangeFilter = 'today' | 'week' | 'month' | 'custom' | 'all';

export default function SalesHistory({ logs }: SalesHistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Filter only sales/exits
  const salesLogs = useMemo(() => {
    return logs.filter(l => l.type === 'exit' || (l.type as string) === 'salida' || (l.type as string) === 'venda');
  }, [logs]);

  // Filter by search, date range, and category
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return salesLogs.filter(log => {
      // 1. Search filter
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchesName = log.productName.toLowerCase().includes(q);
        const matchesBrand = log.brand.toLowerCase().includes(q);
        const matchesOperator = log.operator.toLowerCase().includes(q);
        const matchesCode = log.internalCode ? log.internalCode.toLowerCase().includes(q) : false;
        const matchesSize = log.size ? log.size.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesBrand && !matchesOperator && !matchesCode && !matchesSize) {
          return false;
        }
      }

      // 2. Category filter
      if (selectedCategory !== 'Todos' && log.category !== selectedCategory) {
        return false;
      }

      // 3. Date range filter
      const logDate = new Date(log.timestamp);
      if (isNaN(logDate.getTime())) return true;

      if (dateRange === 'today') {
        return logDate >= startOfToday;
      }
      if (dateRange === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return logDate >= sevenDaysAgo;
      }
      if (dateRange === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return logDate >= thirtyDaysAgo;
      }
      if (dateRange === 'custom') {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          if (logDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (logDate > e) return false;
        }
      }

      return true;
    });
  }, [salesLogs, searchTerm, dateRange, startDate, endDate, selectedCategory]);

  // Statistics calculation
  const totalItemsSold = useMemo(() => {
    return filteredSales.reduce((acc, l) => acc + (l.quantity || 0), 0);
  }, [filteredSales]);

  const totalTransactions = filteredSales.length;

  // Most sold item in this filtered list
  const topSoldItem = useMemo(() => {
    if (filteredSales.length === 0) return null;
    const map: Record<string, number> = {};
    filteredSales.forEach(l => {
      map[l.productName] = (map[l.productName] || 0) + (l.quantity || 0);
    });
    let topName = '';
    let topQty = 0;
    Object.entries(map).forEach(([name, qty]) => {
      if (qty > topQty) {
        topQty = qty;
        topName = name;
      }
    });
    return { name: topName, quantity: topQty };
  }, [filteredSales]);

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16 w-full max-w-lg mx-auto" id="sales-history-view">
      {/* Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-slate-150 sticky top-0 z-10 shadow-3xs space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5.5 h-5.5 text-orange-500" />
              Historial de Ventas
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Registro de salidas y mercancía vendida</p>
          </div>
          <span className="text-xs font-mono font-bold bg-orange-100 text-orange-800 px-2.5 py-1 rounded-full">
            {totalTransactions} ventas
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por producto, código, vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-slate-800 placeholder-slate-400 font-medium transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hoy' },
            { id: 'week', label: '7 días' },
            { id: 'month', label: '30 días' },
            { id: 'custom', label: 'Fecha' },
            { id: 'all', label: 'Todo' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id as DateRangeFilter)}
              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                dateRange === item.id 
                  ? 'bg-white text-slate-900 shadow-3xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Custom date range selector if 'custom' selected */}
        {dateRange === 'custom' && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 animate-in fade-in duration-200">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Desde:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">Hasta:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Total Sales Summary Banner */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl shadow-md space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-orange-400 uppercase tracking-wider block">
                Total Artículos Vendidos
              </span>
              <p className="text-3xl font-black font-mono mt-0.5 text-white">
                {totalItemsSold} <span className="text-sm font-normal text-slate-300">unidades</span>
              </p>
            </div>
            <div className="p-2.5 bg-white/10 backdrop-blur-xs rounded-xl border border-white/10 text-orange-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          {topSoldItem && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">Producto más vendido:</span>
              <span className="font-bold text-orange-300 truncate max-w-[180px]">
                {topSoldItem.name} ({topSoldItem.quantity} unds)
              </span>
            </div>
          )}
        </div>

        {/* Sales Log List */}
        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-sm font-bold text-slate-700">Sin ventas registradas</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              No se encontraron registros de salidas o ventas en el rango de fechas o filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex justify-between items-center px-1 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Listado de salidas</span>
              <span>{filteredSales.length} registros</span>
            </div>

            {filteredSales.map((log) => (
              <div 
                key={log.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-3xs flex items-center justify-between gap-3 hover:border-slate-200 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Exit Icon */}
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0 mt-0.5 border border-rose-100">
                    <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {log.internalCode && (
                        <span className="text-[10px] bg-slate-900 text-white font-mono font-extrabold px-2 py-0.5 rounded shadow-2xs">
                          {log.internalCode}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-slate-900 truncate leading-tight">
                        {log.productName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap font-medium">
                      <span className="flex items-center gap-0.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        {log.category}
                      </span>

                      {log.size && (
                        <span className="bg-orange-50 text-orange-700 font-mono font-bold px-1.5 py-0.2 rounded border border-orange-100">
                          Talla {log.size}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.operator}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantity and stock shift */}
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-rose-600 font-mono block">
                    -{log.quantity} und.
                  </span>
                  <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                    {log.previousQuantity} → {log.newQuantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
