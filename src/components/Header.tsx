import React from 'react';
import { 
  Search, 
  HelpCircle, 
  RefreshCw, 
  Database, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  onRefresh: () => void;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  cashflow: {
    title: 'Buku Kas Belanja Harian',
    subtitle: 'Pencatatan real-time kas operasional, belanja bahan, dan pengeluaran shift'
  },
  variance: {
    title: 'Rekonsiliasi Varians & Laba Kotor',
    subtitle: 'Analisis retrospektif perbandingan penjualan riil POS, HPP teoretis, dan pengeluaran kas lapangan'
  },
  pricing: {
    title: 'Simulator Margin & Pricing POS',
    subtitle: 'Kalkulasi HPP 3-tier, target margin keuntungan, dan integrasi sinkronisasi harga jual menu'
  },
  planner: {
    title: 'Rencana Produksi & Belanja Pasar Gabungan',
    subtitle: 'Perencanaan batch menu porsi besar, kalkulasi kebutuhan bahan baku, dan pembuatan daftar belanja pasar'
  },
  recipes: {
    title: 'Resep Bertingkat (3-Tier Recipe BOM)',
    subtitle: 'Hierarki Menu Akhir (Level 1) → Bahan Olahan (Level 2) → Bahan Baku Mentah (Level 3)'
  },
  ingredients: {
    title: 'Master Bahan & Konversi Satuan',
    subtitle: 'Katalog inventori 48 bahan, metode penilaian AVCO vs Harga Pasar, dan faktor konversi'
  }
};

export default function Header({ 
  activeTab, 
  onRefresh, 
  isLoading, 
  searchTerm, 
  setSearchTerm 
}: HeaderProps) {
  const current = tabTitles[activeTab] || { title: activeTab, subtitle: 'Sistem Finansial & HPP' };

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 shrink-0 z-10">
      {/* Title & Context */}
      <div className="flex items-center gap-4 min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {current.title}
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100">
              <Sparkles className="w-2.5 h-2.5 text-orange-500" />
              Micro-Frontend
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate hidden md:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-5">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari transaksi, menu, bahan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        {/* Database & System Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-mono text-[10px] font-bold text-slate-700">ngola_geasture_adm</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-orange-500 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
          title="Segarkan Data Real-time"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
        </button>
      </div>
    </header>
  );
}
