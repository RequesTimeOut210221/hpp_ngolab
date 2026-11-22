import React, { useState, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Layers, 
  Coffee, 
  ChevronRight, 
  Search, 
  Info, 
  Clock, 
  Boxes, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Recipe } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface RecipesTabProps {
  recipes: Recipe[];
  isLoading: boolean;
  searchTerm: string;
}

export default function RecipesTab({ recipes, isLoading, searchTerm }: RecipesTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(recipes[0] || null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => { if (r.category) set.add(r.category); });
    return ['Semua', ...Array.from(set)];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchCat = selectedCategory === 'Semua' || r.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        r.menu_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [recipes, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Title & Architectural Architecture Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Katalog Resep Bertingkat (3-Tier BOM)</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar 41 resep standar outlet Ngolab dengan struktur bertingkat (Menu Akhir &rarr; Bahan Olahan &rarr; Bahan Baku Mentah).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold font-mono">
            41 Standar SOP Resep
          </span>
        </div>
      </div>

      {/* 3-Tier Architecture Explanation Card */}
      <div className="bg-gradient-to-r from-orange-50/70 via-white to-indigo-50/70 p-5 rounded-2xl border border-slate-200/80 shadow-premium">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              L1
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Level 1: Menu Saji Akhir</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Item yang dipesan pelanggan di kasir POS (contoh: Kopi Susu Gula Aren, Matcha Oat).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              L2
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Level 2: Bahan Olahan (Prep)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bahan setengah jadi hasil proses dapur (contoh: Sirup Pandan Simple, Espresso Shot, Cold Brew).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              L3
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Level 3: Bahan Mentah &amp; Cup</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bahan dasar belanja vendor (contoh: Biji Kopi Blend, Fresh Milk 1L, Gula Aren, Cup 16oz).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recipe List & Detail Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Recipe Cards Grid */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List of recipes */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRecipes.map((recipe) => {
              const isSelected = selectedRecipe?.id === recipe.id;
              const margin = recipe.selling_price > 0
                ? (((recipe.selling_price - recipe.calculated_hpp) / recipe.selling_price) * 100).toFixed(0)
                : 0;

              return (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between",
                    isSelected
                      ? "bg-orange-50/60 border-orange-300 shadow-sm"
                      : "bg-slate-50/40 border-slate-200/70 hover:bg-white hover:border-slate-300"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                        {recipe.menu_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-500">
                        {recipe.category}
                      </span>
                      <span>{recipe.ingredients.length} Bahan</span>
                      <span>&bull;</span>
                      <span>HPP: <strong className="font-mono text-slate-700">{formatRupiah(recipe.calculated_hpp)}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-900 block">
                      {formatRupiah(recipe.selling_price)}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                      Number(margin) >= 60 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    )}>
                      {margin}% Laba
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Recipe Detail & Tree Breakdown */}
        {selectedRecipe ? (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-6 space-y-6">
            <div className="flex items-start justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                    {selectedRecipe.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">ID: {selectedRecipe.id}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedRecipe.menu_name}</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Spesifikasi Takaran Saji Standar Operasional Ngolab
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total HPP Satuan</span>
                <span className="text-xl font-mono font-black text-orange-600">
                  {formatRupiah(selectedRecipe.calculated_hpp)}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Harga Jual POS: <strong className="font-mono text-slate-700">{formatRupiah(selectedRecipe.selling_price)}</strong>
                </span>
              </div>
            </div>

            {/* Visual Recipe Hierarchy Card */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                Struktur Komposisi &amp; Takaran Bahan
              </h4>

              <div className="space-y-2">
                {selectedRecipe.ingredients.map((item, idx) => {
                  const isKemasan = (item.ingredient_category || '').toLowerCase() === 'kemasan';
                  return (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                          isKemasan ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                        )}>
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.ingredient_name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span>{item.ingredient_category || 'Bahan Baku'}</span>
                            <span>&bull;</span>
                            <span className="font-mono text-slate-600 font-semibold">{item.quantity_needed} {item.unit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-slate-900 block">
                          {formatRupiah(item.subtotal_cost)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          @{formatRupiah(item.cost_per_unit)}/{item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preparation / SOP Note */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 text-xs">
              <h5 className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                Standar Kualitas &amp; Takaran
              </h5>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Pastikan kalibrasi grinder espresso dan jigger takaran sirup sesuai dengan resep di atas untuk menjaga konsistensi rasa dan mencegah pembengkakan HPP aktual di lapangan.
              </p>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-12 text-center text-slate-400">
            Pilih resep di sebelah kiri untuk melihat rincian komposisi.
          </div>
        )}
      </div>
    </div>
  );
}
