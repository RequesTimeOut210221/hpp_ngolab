import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { formatRupiah, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface VarianceData {
  summary: {
    total_revenue: number;
    theoretical_food_cost: number;
    actual_cash_spent: number;
    variance_amount: number;
    variance_percent: number;
    status: string;
    realized_gross_profit: number;
    theoretical_gross_profit: number;
  };
  sales_breakdown: Array<{
    menu_id: string;
    menu_name: string;
    total_sold: number;
    unit_hpp: number;
    total_theoretical_cost: number;
    total_revenue: number;
    theoretical_gross_profit: number;
    theoretical_margin_pct: number;
  }>;
}

export default function VarianceReportTab() {
  const [data, setData] = useState<VarianceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadVariance = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/reports/variance');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat laporan varians:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVariance();
  }, []);

  const summary = data?.summary || {
    total_revenue: 1656000,
    theoretical_food_cost: 621819,
    actual_cash_spent: 2521000,
    variance_amount: 1899181,
    variance_percent: 305.4,
    status: 'Overbudget / Perlu Audit Dapur',
    realized_gross_profit: -865000,
    theoretical_gross_profit: 1034181
  };

  const sales = data?.sales_breakdown || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Rekonsiliasi Varians &amp; Realisasi Laba Kotor
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Membandingkan Penjualan Riil POS Kasir vs HPP Teoretis vs Arus Kas Belanja Lapangan.
          </p>
        </div>
        <button
          onClick={loadVariance}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isLoading && "animate-spin text-orange-500")} />
          Segarkan Data POS
        </button>
      </div>

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Penjualan POS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
              POS Riil
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Omset Penjualan POS</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{formatRupiah(summary.total_revenue)}</h3>
          </div>
        </div>

        {/* Teoretis Food Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
              Standar Resep
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teoretis HPP Terjual</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{formatRupiah(summary.theoretical_food_cost)}</h3>
          </div>
        </div>

        {/* Belanja Kas Riil */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 font-mono">
              Buku Kas
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Belanja Riil Lapangan</p>
            <h3 className="text-xl font-bold font-mono text-rose-600">{formatRupiah(summary.actual_cash_spent)}</h3>
          </div>
        </div>

        {/* Laba Kotor Teoretis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100 font-mono">
              Margin Target
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Teoretis Laba Kotor</p>
            <h3 className="text-xl font-bold font-mono text-orange-600">{formatRupiah(summary.theoretical_gross_profit)}</h3>
          </div>
        </div>
      </div>

      {/* Variance Analysis Insight Banner */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-900">
              Analisis Selisih Arus Kas (Food Cost Variance: {summary.variance_percent}%)
            </h4>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              Belanja kas riil ({formatRupiah(summary.actual_cash_spent)}) melampaui HPP teoretis menu terjual ({formatRupiah(summary.theoretical_food_cost)}) sebesar <strong className="font-mono">{formatRupiah(summary.variance_amount)}</strong>. Hal ini wajar terjadi karena pembelian stok awal grosir (seperti restock Fresh Milk 12L &amp; Cup 20 Slop) yang persediaannya masih tersimpan di gudang (*Stock on Hand*).
            </p>
          </div>
        </div>
      </div>

      {/* Sales & Recipe Theoretical Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Rincian Penjualan POS &amp; Beban HPP per Menu</h3>
            <p className="text-[11px] text-slate-400 font-medium">Berdasarkan data transaksi selesai di sistem Kasir backend_ngolab</p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {sales.length} Menu Terjual
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                <th className="px-6 py-3.5">Nama Menu POS</th>
                <th className="px-6 py-3.5 text-center">Qty Terjual</th>
                <th className="px-6 py-3.5 text-right">HPP Satuan</th>
                <th className="px-6 py-3.5 text-right">Total HPP Teoretis</th>
                <th className="px-6 py-3.5 text-right">Total Omset POS</th>
                <th className="px-6 py-3.5 text-right">Laba Kotor</th>
                <th className="px-6 py-3.5 text-center">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Memuat data agregasi transaksi...
                  </td>
                </tr>
              ) : (
                sales.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.menu_name}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                      {item.total_sold} porsi
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">
                      {formatRupiah(item.unit_hpp)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-rose-600">
                      {formatRupiah(item.total_theoretical_cost)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.total_revenue)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                      {formatRupiah(item.theoretical_gross_profit)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {item.theoretical_margin_pct}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
