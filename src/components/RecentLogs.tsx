/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryLog } from '../types';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  User, 
  Tag, 
  Calendar, 
  AlertCircle,
  Clock,
  Activity,
  Layers
} from 'lucide-react';

interface RecentLogsProps {
  logs: InventoryLog[];
}

export default function RecentLogs({ logs }: RecentLogsProps) {
  const [logSearch, setLogSearch] = useState<string>('');

  const filteredLogs = logs.filter(log => {
    const q = logSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      log.productName.toLowerCase().includes(q) ||
      log.brand.toLowerCase().includes(q) ||
      log.category.toLowerCase().includes(q) ||
      log.operator.toLowerCase().includes(q) ||
      (log.size && log.size.toLowerCase().includes(q))
    );
  });

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12 w-full max-w-lg mx-auto" id="recent-logs-view">
      {/* Page Header */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-slate-150">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-orange-500" />
          <h1 className="text-xl font-bold text-slate-900">Bitácora de Bodega</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Historial reciente de entradas y salidas de mercancía.</p>
        
        {/* Log Search input */}
        <div className="relative mt-3.5">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por producto, marca o responsable..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none placeholder-slate-400"
          />
        </div>
      </div>

      <div className="p-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
            <h3 className="text-sm font-bold text-slate-700">Sin movimientos</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              No se encontraron registros de inventario coincidentes con tu búsqueda.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((log) => {
              const isEntry = log.type === 'entry';
              
              return (
                <div 
                  key={log.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-100 shadow-3xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Operation Icon Badge */}
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      isEntry ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {isEntry ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>

                    {/* Log Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">
                          {log.productName}
                        </h4>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded">
                          {log.brand}
                        </span>
                      </div>

                      {/* Variant metadata */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap font-medium">
                        <span className="flex items-center gap-0.5">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {log.category}
                        </span>

                        {log.size && (
                          <span className="flex items-center gap-0.5 bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded font-mono">
                            <Layers className="w-3 h-3" />
                            Talla {log.size}
                          </span>
                        )}
                      </div>

                      {/* Author metadata */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {log.operator}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Badge */}
                  <div className="text-right shrink-0">
                    <p className={`text-base font-extrabold ${isEntry ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isEntry ? '+' : '-'}{log.quantity}
                    </p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">
                      Stock: {log.previousQuantity} → {log.newQuantity}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
