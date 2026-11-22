import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Boxes, 
  ArrowRightLeft, 
  Scale, 
  Search, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Database
} from 'lucide-react';
import { Ingredient } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface IngredientsTabProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  searchTerm: string;
}

export default function IngredientsTab({ 
  ingredients, 
  isLoading, 
  searchTerm 
}: IngredientsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  const categories = useMemo(() => {
    const set = new Set<string>();
    ingredients.forEach(i => { if (i.category) set.add(i.category); });
    return ['Semua', ...Array.from(set)];
  }, [ingredients]);

  const filteredIngredients = useMemo(() => {
    return ingredients.filter(i => {
      const matchCat = selectedCategory === 'Semua' || i.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [ingredients, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Master Bahan Baku &amp; Konversi Satuan
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Katalog 48 bahan baku outlet Ngolab dengan faktor konversi multi-satuan dan kalkulasi valuasi AVCO.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold font-mono">
            48 Master Bahan
          </span>
        </div>
      </div>

      {/* Bento Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
              Aktif
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Bahan Terdata</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{ingredients.length} Item</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              Kategori
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Kelompok Bahan</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{categories.length - 1} Kategori</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Scale className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              Otomatis
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Metode Valuasi</p>
            <h3 className="text-base font-bold text-slate-900">AVCO + Real-time</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              Multi-Unit
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rasio Konversi</p>
            <h3 className="text-base font-bold text-slate-900">kg/gr &bull; L/ml &bull; pack/pcs</h3>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-slate-400">
            Menampilkan <span className="font-bold text-slate-800">{filteredIngredients.length}</span> bahan
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                <th className="px-6 py-3.5">Kode Bahan</th>
                <th className="px-6 py-3.5">Nama Bahan Baku</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5">Satuan Beli &rarr; Resep</th>
                <th className="px-6 py-3.5 text-center">Faktor Konversi</th>
                <th className="px-6 py-3.5 text-right">Harga Beli Satuan</th>
                <th className="px-6 py-3.5 text-right">Biaya / Unit Resep</th>
                <th className="px-6 py-3.5 text-center">Metode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredIngredients.map((item) => {
                const costPerUsage = item.conversion_rate > 0 
                  ? item.cost_price / item.conversion_rate 
                  : item.cost_price;

                const isKemasan = (item.category || '').toLowerCase() === 'kemasan';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        isKemasan ? "status-processing" : "status-pending"
                      )}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-700">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                          {item.purchase_unit}
                        </span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="font-mono bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded text-[10px] text-orange-700 font-bold">
                          {item.usage_unit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                      1 {item.purchase_unit} = {item.conversion_rate.toLocaleString('id-ID')} {item.usage_unit}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(item.cost_price)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-orange-600 whitespace-nowrap">
                      {formatRupiah(Math.round(costPerUsage))} <span className="text-[9px] text-slate-400 font-normal">/{item.usage_unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                        {item.valuation_method || 'AVCO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
