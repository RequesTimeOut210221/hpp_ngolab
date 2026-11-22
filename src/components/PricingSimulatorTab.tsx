import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Percent, 
  Coffee, 
  Package, 
  Layers, 
  UtensilsCrossed, 
  Info, 
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Recipe, RecipeIngredient } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PricingSimulatorTabProps {
  recipes: Recipe[];
  onSyncPOS: (menuId: string | number, newPrice: number, costPrice: number) => Promise<void>;
  isLoading: boolean;
  searchTerm: string;
}

export default function PricingSimulatorTab({
  recipes,
  onSyncPOS,
  isLoading,
  searchTerm
}: PricingSimulatorTabProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || '');
  const [targetMargin, setTargetMargin] = useState<number>(65); // default 65% target margin
  const [overheadPercentage, setOverheadPercentage] = useState<number>(10); // default 10% operational overhead
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => {
      const matchCategory = selectedCategory === 'Semua' || r.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        r.menu_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [recipes, selectedCategory, searchTerm]);

  // Current selected recipe
  const currentRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId) || recipes[0] || null;
  }, [recipes, selectedRecipeId]);

  // Pricing calculations
  const simulation = useMemo(() => {
    if (!currentRecipe) return null;

    const rawIngredientCost = currentRecipe.ingredients
      .filter(i => (i.ingredient_category || '').toLowerCase() !== 'kemasan')
      .reduce((sum, i) => sum + (Number(i.subtotal_cost) || 0), 0);

    const packagingCost = currentRecipe.ingredients
      .filter(i => (i.ingredient_category || '').toLowerCase() === 'kemasan')
      .reduce((sum, i) => sum + (Number(i.subtotal_cost) || 0), 0);

    const subtotalDirectCost = rawIngredientCost + packagingCost;
    const overheadCost = subtotalDirectCost * (overheadPercentage / 100);
    const totalHpp = subtotalDirectCost + overheadCost;

    // Target margin calculation: Suggested Price = Total Cost / (1 - Target Margin Rate)
    const marginRate = targetMargin / 100;
    const rawSuggestedPrice = marginRate < 1 ? totalHpp / (1 - marginRate) : totalHpp * 2;
    // Round to nearest 500 or 1000 IDR for neat cafe pricing
    const roundedSuggestedPrice = Math.ceil(rawSuggestedPrice / 500) * 500;

    const currentPosPrice = Number(currentRecipe.selling_price) || 0;
    const currentGrossProfit = currentPosPrice - totalHpp;
    const currentMarginPct = currentPosPrice > 0 ? (currentGrossProfit / currentPosPrice) * 100 : 0;

    const simGrossProfit = roundedSuggestedPrice - totalHpp;
    const simMarginPct = roundedSuggestedPrice > 0 ? (simGrossProfit / roundedSuggestedPrice) * 100 : 0;
    const foodCostPct = roundedSuggestedPrice > 0 ? (rawIngredientCost / roundedSuggestedPrice) * 100 : 0;
    const packagingCostPct = roundedSuggestedPrice > 0 ? (packagingCost / roundedSuggestedPrice) * 100 : 0;
    const overheadCostPct = roundedSuggestedPrice > 0 ? (overheadCost / roundedSuggestedPrice) * 100 : 0;

    return {
      rawIngredientCost,
      packagingCost,
      overheadCost,
      totalHpp,
      currentPosPrice,
      currentGrossProfit,
      currentMarginPct,
      suggestedPrice: roundedSuggestedPrice,
      simGrossProfit,
      simMarginPct,
      foodCostPct,
      packagingCostPct,
      overheadCostPct
    };
  }, [currentRecipe, targetMargin, overheadPercentage]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach(r => { if (r.category) set.add(r.category); });
    return ['Semua', ...Array.from(set)];
  }, [recipes]);

  const handleExecuteSync = async () => {
    if (!currentRecipe || !simulation) return;
    try {
      setIsSyncing(true);
      await onSyncPOS(
        currentRecipe.id,
        simulation.suggestedPrice,
        Math.round(simulation.totalHpp)
      );
      setSyncSuccessMessage(`Harga ${currentRecipe.menu_name} berhasil diperbarui di POS: ${formatRupiah(simulation.suggestedPrice)}!`);
      setIsSyncModalOpen(false);
      setTimeout(() => setSyncSuccessMessage(''), 5000);
    } catch (err: any) {
      alert(`Gagal sinkronisasi POS: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Success Message */}
      <AnimatePresence>
        {syncSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{syncSuccessMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Menu Selector (Left) vs Simulator Workbench (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Menu Item List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Katalog Resep &amp; Menu</h3>
              <p className="text-[11px] text-slate-400 font-medium">Pilih menu untuk mensimulasikan HPP</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredRecipes.length} Menu
            </span>
          </div>

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

          {/* Menu Items List */}
          <div className="space-y-1.5 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
            {filteredRecipes.map(recipe => {
              const isSelected = recipe.id === currentRecipe?.id;
              const margin = recipe.selling_price > 0 
                ? (((recipe.selling_price - recipe.calculated_hpp) / recipe.selling_price) * 100).toFixed(0)
                : 0;

              return (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipeId(recipe.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all duration-150 border flex items-center justify-between group",
                    isSelected
                      ? "bg-orange-50/50 border-orange-300 shadow-sm"
                      : "bg-slate-50/40 border-slate-200/60 hover:bg-white hover:border-slate-300"
                  )}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                        {recipe.menu_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-500">
                        {recipe.category}
                      </span>
                      <span>HPP: <strong className="font-mono text-slate-600">{formatRupiah(recipe.calculated_hpp)}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-slate-900">
                      {formatRupiah(recipe.selling_price)}
                    </p>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                      Number(margin) >= 60 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                        : "bg-amber-50 text-amber-700 border border-amber-100"
                    )}>
                      {margin}% Mgn
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Simulator Workbench */}
        {currentRecipe && simulation && (
          <div className="lg:col-span-8 space-y-5">
            {/* Active Menu Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                      {currentRecipe.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {currentRecipe.menu_id ? `POS ID: ${currentRecipe.menu_id}` : 'Subassembly / Dapur'}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    {currentRecipe.menu_name}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Harga POS Aktif</p>
                    <p className="text-lg font-mono font-bold text-slate-900">{formatRupiah(simulation.currentPosPrice)}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!currentRecipe.menu_id) {
                        alert(`Menu "${currentRecipe.menu_name}" belum di-mapping ke katalog POS.`);
                        return;
                      }
                      setIsSyncModalOpen(true);
                    }}
                    disabled={!currentRecipe.menu_id}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95",
                      currentRecipe.menu_id
                        ? "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    )}
                  >
                    <Sparkles size={14} />
                    {currentRecipe.menu_id ? 'Sinkronkan ke POS' : 'Produk Antara (Non-POS)'}
                  </button>
                </div>
              </div>

              {/* Live Margin Slider & Controls */}
              <div className="py-6 border-b border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-orange-500" />
                    Target Margin Keuntungan Kotor (Gross Profit Margin)
                  </label>
                  <span className="text-base font-mono font-black text-orange-600 px-3 py-1 bg-orange-50 rounded-xl border border-orange-200">
                    {targetMargin}%
                  </span>
                </div>

                <input
                  type="range"
                  min="20"
                  max="85"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-400 font-semibold px-1">
                  <span>20% (Konservatif)</span>
                  <span>45% (Standar F&amp;B)</span>
                  <span className="text-orange-600 font-bold">65% (Rekomendasi Ngolab)</span>
                  <span>85% (High Margin)</span>
                </div>
              </div>

              {/* Simulation Comparison Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                {/* Total HPP Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Total HPP Dasar + Overhead
                  </p>
                  <p className="text-lg font-mono font-bold text-slate-900">
                    {formatRupiah(simulation.totalHpp)}
                  </p>
                  <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Bahan Baku:</span>
                      <span className="font-mono font-semibold">{formatRupiah(simulation.rawIngredientCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kemasan:</span>
                      <span className="font-mono font-semibold">{formatRupiah(simulation.packagingCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overhead ({overheadPercentage}%):</span>
                      <span className="font-mono font-semibold">{formatRupiah(simulation.overheadCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Suggested Selling Price Card */}
                <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-700 mb-1">
                    Rekomendasi Harga Jual Baru
                  </p>
                  <p className="text-xl font-mono font-black text-orange-600">
                    {formatRupiah(simulation.suggestedPrice)}
                  </p>
                  <div className="mt-2 text-[10px] text-orange-800 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Laba Kotor (Rp):</span>
                      <span className="font-mono font-bold">{formatRupiah(simulation.simGrossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Realisasi Margin:</span>
                      <span className="font-mono font-bold">{simulation.simMarginPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Food Cost %:</span>
                      <span className="font-mono font-semibold">{simulation.foodCostPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Margin Delta Comparison Card */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1">
                    Perbandingan dengan POS Saat Ini
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-lg font-mono font-bold text-slate-900">
                      {simulation.simMarginPct > simulation.currentMarginPct ? '+' : ''}
                      {(simulation.simMarginPct - simulation.currentMarginPct).toFixed(1)}%
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">margin delta</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Harga POS Sekarang:</span>
                      <span className="font-mono font-semibold">{formatRupiah(simulation.currentPosPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Margin POS Sekarang:</span>
                      <span className="font-mono font-semibold">{simulation.currentMarginPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laba Bersih Tambahan:</span>
                      <span className="font-mono font-bold text-indigo-600">
                        {formatRupiah(simulation.suggestedPrice - simulation.currentPosPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipe Composition & Cost Breakdown Table (Tier 1 & Tier 2) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rincian Komposisi Bahan &amp; Biaya (BOM)</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Bahan baku mentah, sub-resep, dan kemasan per 1 porsi saji</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {currentRecipe.ingredients.length} Komponen
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                      <th className="px-6 py-3.5">Nama Komponen Bahan</th>
                      <th className="px-6 py-3.5">Kategori</th>
                      <th className="px-6 py-3.5 text-center">Takaran Saji</th>
                      <th className="px-6 py-3.5 text-right">Harga Satuan (AVCO)</th>
                      <th className="px-6 py-3.5 text-right">Subtotal Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {currentRecipe.ingredients.map((ing, idx) => {
                      const isPackaging = (ing.ingredient_category || '').toLowerCase() === 'kemasan';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-slate-800">
                            {ing.ingredient_name}
                          </td>
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                              isPackaging 
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            )}>
                              {ing.ingredient_category || 'Bahan'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center font-mono font-semibold text-slate-700">
                            {ing.quantity_needed} {ing.unit}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono text-slate-500">
                            {formatRupiah(ing.cost_per_unit)} / {ing.unit}
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(ing.subtotal_cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 text-xs font-bold text-slate-800">
                      <td colSpan={4} className="px-6 py-3 text-right uppercase tracking-wider text-[10px] text-slate-500">
                        Subtotal Bahan + Kemasan Langsung:
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-slate-900 font-black">
                        {formatRupiah(simulation.rawIngredientCost + simulation.packagingCost)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/60 text-xs font-medium text-slate-600">
                      <td colSpan={4} className="px-6 py-2.5 text-right text-[10px] text-slate-500">
                        Alokasi Overhead Operasional ({overheadPercentage}% Es Batu, Listrik, Prep):
                      </td>
                      <td className="px-6 py-2.5 text-right font-mono text-slate-700 font-bold">
                        {formatRupiah(simulation.overheadCost)}
                      </td>
                    </tr>
                    <tr className="bg-orange-50/50 text-xs font-bold text-orange-950 border-t border-orange-200">
                      <td colSpan={4} className="px-6 py-3 text-right uppercase tracking-wider text-[10px] text-orange-800">
                        Total HPP Saji Komprehensif:
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-orange-600 font-black text-sm">
                        {formatRupiah(simulation.totalHpp)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POS Synchronization Confirmation Modal */}
      <AnimatePresence>
        {isSyncModalOpen && currentRecipe && simulation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSyncModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-100"
            >
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-3">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Konfirmasi Sinkronisasi POS</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Perbarui harga jual menu di master database <span className="font-mono text-slate-700 font-bold">menus</span>
                </p>
              </div>

              <div className="py-5 space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Menu Item</span>
                    <span className="font-bold text-slate-800">{currentRecipe.menu_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">HPP Terkalkulasi</span>
                    <span className="font-mono font-bold text-slate-700">{formatRupiah(simulation.totalHpp)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">Harga POS Lama</span>
                    <span className="font-mono font-semibold text-slate-500 line-through">
                      {formatRupiah(simulation.currentPosPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-orange-700 font-bold text-[10px] uppercase">Harga Rekomendasi Baru</span>
                    <span className="font-mono font-black text-orange-600 text-sm">
                      {formatRupiah(simulation.suggestedPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-[10px] text-slate-500">
                    <span>Target Margin Keuntungan:</span>
                    <span className="font-mono font-bold text-emerald-600">{simulation.simMarginPct.toFixed(1)}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Perubahan ini akan langsung berdampak pada sistem Kasir POS (<code className="text-slate-600">backend_ngolab</code> &amp; <code className="text-slate-600">PointLab</code>).
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleExecuteSync}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50"
                >
                  {isSyncing ? 'Menyinkronkan...' : 'Ya, Perbarui di POS'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
