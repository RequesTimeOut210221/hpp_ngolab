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
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
  Percent,
  FileDown,
  Gauge
} from 'lucide-react';
import { Recipe, Ingredient, RecipeIngredient, KitchenCapacityItem } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ExportService } from '../services/exportService';

interface RecipesTabProps {
  recipes: Recipe[];
  ingredients?: Ingredient[];
  isLoading: boolean;
  searchTerm: string;
  onRefresh?: () => Promise<void>;
}

interface BuilderIngredientRow {
  ingredient_id: string;
  subassembly_recipe_id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  subtotal: number;
}

export default function RecipesTab({ 
  recipes, 
  ingredients = [], 
  isLoading, 
  searchTerm,
  onRefresh 
}: RecipesTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(recipes[0] || null);

  // Modal Builder state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Kitchen Capacity list state
  const [capacityList, setCapacityList] = useState<KitchenCapacityItem[]>([]);

  React.useEffect(() => {
    const fetchCapacity = async () => {
      try {
        const res = await fetch('/api/kitchen-capacity');
        const data = await res.json();
        if (data.success && Array.isArray(data.capacity_list)) {
          setCapacityList(data.capacity_list);
        }
      } catch (e) {
        console.warn('Gagal memuat kapasitas dapur:', e);
      }
    };
    fetchCapacity();
  }, [recipes]);

  const selectedCapacity = useMemo(() => {
    if (!selectedRecipe) return null;
    return capacityList.find(c => 
      c.recipe_id === selectedRecipe.id || 
      c.recipe_name.toLowerCase() === selectedRecipe.menu_name.toLowerCase()
    ) || null;
  }, [capacityList, selectedRecipe]);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Espresso Based');
  const [formIsSubassembly, setFormIsSubassembly] = useState(false);
  const [formPortionYield, setFormPortionYield] = useState<number>(1);
  const [formPackagingCost, setFormPackagingCost] = useState<number>(1170);
  const [formCookingGasCost, setFormCookingGasCost] = useState<number>(0);
  const [formLaborCost, setFormLaborCost] = useState<number>(500);
  const [formIngredients, setFormIngredients] = useState<BuilderIngredientRow[]>([]);

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

  // Open Builder for New Recipe
  const handleOpenNewBuilder = () => {
    setFormName('');
    setFormCategory('Espresso Based');
    setFormIsSubassembly(false);
    setFormPortionYield(1);
    setFormPackagingCost(1170);
    setFormCookingGasCost(0);
    setFormLaborCost(500);
    setFormIngredients([]);
    setEditingRecipeId(null);
    setIsBuilderOpen(true);
  };

  // Open Builder for Editing Recipe
  const handleOpenEditBuilder = (r: Recipe) => {
    setFormName(r.menu_name);
    setFormCategory(r.category);
    setFormIsSubassembly(Boolean(r.is_subassembly));
    setFormPortionYield(r.portion_yield || 1);
    setFormPackagingCost(r.packaging_cost || 0);
    setFormCookingGasCost(r.cooking_gas_cost || 0);
    setFormLaborCost(r.labor_cost || 0);

    const rows: BuilderIngredientRow[] = (r.ingredients || []).map(i => ({
      ingredient_id: i.ingredient_id || '',
      name: i.ingredient_name,
      category: i.ingredient_category || 'Bahan',
      quantity: Number(i.quantity_needed || 0),
      unit: i.unit || 'satuan',
      unit_cost: Number(i.cost_per_unit || 0),
      subtotal: Number(i.subtotal_cost || 0)
    }));

    setFormIngredients(rows);
    setEditingRecipeId(r.id);
    setIsBuilderOpen(true);
  };

  // Add row to recipe builder
  const handleAddIngredientRow = () => {
    const defaultIng = ingredients[0];
    const unitCost = defaultIng ? (defaultIng.conversion_rate > 0 ? defaultIng.cost_price / defaultIng.conversion_rate : defaultIng.cost_price) : 0;
    
    setFormIngredients(prev => [
      ...prev,
      {
        ingredient_id: defaultIng?.id || '',
        name: defaultIng?.name || 'Pilih Bahan',
        category: defaultIng?.category || 'Bahan',
        quantity: 1,
        unit: defaultIng?.usage_unit || 'satuan',
        unit_cost: unitCost,
        subtotal: unitCost * 1
      }
    ]);
  };

  // Update row
  const handleUpdateIngredientRow = (index: number, field: string, value: any) => {
    setFormIngredients(prev => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (field === 'ingredient_id') {
        const found = ingredients.find(i => i.id === value);
        if (found) {
          target.ingredient_id = found.id;
          target.name = found.name;
          target.category = found.category;
          target.unit = found.usage_unit;
          const cost = found.conversion_rate > 0 ? (found.cost_price / found.conversion_rate) : found.cost_price;
          target.unit_cost = cost;
          target.subtotal = cost * target.quantity;
        }
      } else if (field === 'quantity') {
        const qty = Number(value) || 0;
        target.quantity = qty;
        target.subtotal = qty * target.unit_cost;
      }

      copy[index] = target;
      return copy;
    });
  };

  // Remove row
  const handleRemoveIngredientRow = (index: number) => {
    setFormIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Live builder totals
  const builderRawCost = useMemo(() => {
    return formIngredients.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  }, [formIngredients]);

  const builderTotalCost = builderRawCost + formPackagingCost + formCookingGasCost + formLaborCost;
  const builderCostPerPortion = formPortionYield > 0 ? Math.round(builderTotalCost / formPortionYield) : builderTotalCost;

  // Submit Recipe (POST or PUT)
  const handleSubmitRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama resep wajib diisi.');
      return;
    }
    if (formIngredients.length === 0) {
      alert('Resep harus memiliki minimal 1 komponen bahan.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const payload = {
      name: formName,
      category: formCategory,
      is_subassembly: formIsSubassembly,
      portion_yield: formPortionYield,
      packaging_cost: formPackagingCost,
      cooking_gas_cost: formCookingGasCost,
      labor_cost: formLaborCost,
      ingredients: formIngredients.map(item => ({
        ingredient_id: item.ingredient_id,
        subassembly_recipe_id: item.subassembly_recipe_id || null,
        quantity: item.quantity,
        unit: item.unit
      }))
    };

    try {
      if (editingRecipeId) {
        // PUT
        const res = await fetch(`/api/recipes/${editingRecipeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memperbarui resep.');
        setStatusMessage({ type: 'success', text: `Resep "${formName}" berhasil diperbarui!` });
      } else {
        // POST
        const res = await fetch('/api/recipes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal membuat resep baru.');
        setStatusMessage({ type: 'success', text: `Resep baru "${formName}" berhasil diracik dan disimpan!` });
      }

      setIsBuilderOpen(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Recipe
  const handleDeleteRecipe = async (r: Recipe) => {
    if (!confirm(`Hapus resep "${r.menu_name}"? Komposisi bahan akan dihapus dari database.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/recipes/${r.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || 'Gagal menghapus resep.');
        return;
      }
      setStatusMessage({ type: 'success', text: `Resep "${r.menu_name}" berhasil dihapus.` });
      if (selectedRecipe?.id === r.id) setSelectedRecipe(null);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Architectural Architecture Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Katalog Resep &amp; Recipe Builder (3-Tier BOM)</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar resep standar SOP dapur Ngolab. Buat resep baru, susun takaran bahan secara dinamis, dan kalkulasi HPP otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all shadow-sm cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin text-orange-500")} />
            </button>
          )}
          <button
            onClick={handleOpenNewBuilder}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Racik Resep Baru</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={cn(
          "p-3.5 rounded-xl text-xs flex items-center justify-between animate-fadeIn",
          statusMessage.type === 'success' 
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-rose-50 text-rose-800 border border-rose-200"
        )}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                Item yang dipesan pelanggan di kasir POS (contoh: Kopi Susu Gula Aren, Nasi Bento Katsu).
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
                Bahan setengah jadi hasil dapur / subassembly (contoh: Batch Katsu 24 potong, Sirup Pandan Simple).
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
                Bahan dasar belanja pasar/vendor (contoh: Dada Ayam Fillet, Biji Kopi Blend, Cup 16oz).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
              selectedCategory === cat
                ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recipe Catalog */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-4 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">Daftar Resep Aktif</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {filteredRecipes.length} SOP Resep
            </span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredRecipes.map((r) => {
              const isSelected = selectedRecipe?.id === r.id;
              const margin = r.selling_price > 0 
                ? Math.round(((r.selling_price - r.calculated_hpp) / r.selling_price) * 100) 
                : 0;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between group",
                    isSelected
                      ? "bg-orange-50/50 border-orange-300 shadow-sm"
                      : "bg-slate-50/40 border-slate-200/60 hover:bg-white hover:border-slate-300"
                  )}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">
                        {r.menu_name}
                      </span>
                      {r.is_subassembly && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          Subassembly
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-500">
                        {r.category}
                      </span>
                      <span>HPP: <strong className="font-mono text-slate-700">{formatRupiah(r.calculated_hpp)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold text-slate-900">{formatRupiah(r.selling_price)}</p>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mt-0.5",
                        margin >= 60 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      )}>
                        {margin}% Mgn
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEditBuilder(r); }}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Edit Resep"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(r); }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Resep"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recipe Detail BOM Breakdown */}
        {selectedRecipe ? (
          <div className="lg:col-span-7 space-y-5">
            {/* Header Detail Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium p-6">
              <div className="flex items-start justify-between pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200">
                      {selectedRecipe.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ID: {selectedRecipe.id}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {selectedRecipe.menu_name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => ExportService.exportRecipeToPDF(selectedRecipe)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Unduh Lembar SOP Resep Dapur dalam format PDF"
                  >
                    <FileDown className="w-3.5 h-3.5 text-orange-600" />
                    <span>Ekspor SOP (PDF)</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditBuilder(selectedRecipe)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Resep</span>
                  </button>
                </div>
              </div>

              {/* Kitchen Capacity Alert for Selected Recipe */}
              {selectedCapacity && (
                <div className={cn(
                  "mt-3.5 p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs",
                  selectedCapacity.max_possible === 0
                    ? "bg-rose-50/70 border-rose-200 text-rose-800"
                    : selectedCapacity.max_possible < 15
                    ? "bg-amber-50/70 border-amber-200 text-amber-800"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-800"
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Gauge className={cn(
                      "w-4 h-4 shrink-0",
                      selectedCapacity.max_possible === 0 ? "text-rose-600" : selectedCapacity.max_possible < 15 ? "text-amber-600" : "text-emerald-600"
                    )} />
                    <span className="font-bold truncate">
                      Kapasitas Dapur: {selectedCapacity.max_possible} Porsi Siap Saji
                    </span>
                    <span className="text-[11px] opacity-80 hidden md:inline truncate">
                      (Bahan Kritis: <strong>{selectedCapacity.bottleneck_ingredient}</strong> sisa {selectedCapacity.bottleneck_stock} {selectedCapacity.bottleneck_unit})
                    </span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shrink-0 w-fit",
                    selectedCapacity.max_possible === 0 ? "bg-rose-200 text-rose-900" : selectedCapacity.max_possible < 15 ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"
                  )}>
                    {selectedCapacity.max_possible === 0 ? 'Stok Habis' : selectedCapacity.max_possible < 15 ? 'Perlu Restock' : 'Stok Aman'}
                  </span>
                </div>
              )}

              {/* HPP Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total HPP per Porsi</span>
                  <span className="text-lg font-mono font-bold text-slate-900">{formatRupiah(selectedRecipe.calculated_hpp)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Harga POS Saat Ini</span>
                  <span className="text-lg font-mono font-bold text-slate-900">{formatRupiah(selectedRecipe.selling_price)}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block mb-1">Laba Kotor per Porsi</span>
                  <span className="text-lg font-mono font-bold text-orange-700">
                    {formatRupiah(selectedRecipe.selling_price - selectedRecipe.calculated_hpp)}
                  </span>
                </div>
              </div>
            </div>

            {/* BOM Ingredients List Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium p-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center justify-between">
                <span>Rincian Bahan Baku Pembentuk HPP (BOM)</span>
                <span className="font-mono text-slate-400 font-semibold">{selectedRecipe.ingredients?.length || 0} Komponen</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="py-2.5 px-3">Bahan</th>
                      <th className="py-2.5 px-3">Takaran Resep</th>
                      <th className="py-2.5 px-3 text-right">Biaya / Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRecipe.ingredients || []).map((ing, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {ing.ingredient_name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {ing.quantity_needed} {ing.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          Rp {ing.cost_per_unit >= 10 ? Math.round(ing.cost_per_unit).toLocaleString('id-ID') : ing.cost_per_unit.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(ing.subtotal_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Operational Surcharge Breakdown */}
              <div className="mt-5 pt-4 border-t border-slate-100 text-xs space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Alokasi Biaya Kemasan (Cup, Lid, Sedotan):</span>
                  <span className="font-mono font-bold">{formatRupiah(selectedRecipe.packaging_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Alokasi Biaya Gas &amp; Listrik Dapur:</span>
                  <span className="font-mono font-bold">{formatRupiah(selectedRecipe.cooking_gas_cost || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Alokasi Tenaga Kerja (Labor Cost):</span>
                  <span className="font-mono font-bold">{formatRupiah(selectedRecipe.labor_cost || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-premium p-12 text-center text-slate-400">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold">Pilih resep di sebelah kiri untuk melihat rincian komposisi HPP.</p>
          </div>
        )}
      </div>

      {/* MODAL RECIPE BUILDER (ADD / EDIT) */}
      <AnimatePresence>
        {isBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRecipeId ? 'Edit Komposisi Resep (Recipe Builder)' : 'Racik Resep Baru (Recipe Builder)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Susun takaran bahan baku gramatur SOP dan alokasi biaya operasional
                  </p>
                </div>
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body Scrollable */}
              <form onSubmit={handleSubmitRecipe} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Resep / Menu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Kopi Susu Aren Spesial"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori Menu
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Espresso Based">Espresso Based</option>
                      <option value="Non-Coffee">Non-Coffee</option>
                      <option value="Signature">Signature</option>
                      <option value="Makanan Berat">Makanan Berat</option>
                      <option value="Camilan">Camilan</option>
                      <option value="Bakso & Mie">Bakso &amp; Mie</option>
                      <option value="Subassembly / Dapur">Subassembly / Dapur</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tipe Resep
                    </label>
                    <select
                      value={formIsSubassembly ? '1' : '0'}
                      onChange={(e) => setFormIsSubassembly(e.target.value === '1')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                    >
                      <option value="0">Level 1: Menu Saji Akhir</option>
                      <option value="1">Level 2: Subassembly Dapur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Porsi Hasil / Yield
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formPortionYield}
                      onChange={(e) => setFormPortionYield(Number(e.target.value))}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alokasi Kemasan (Rp)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formPackagingCost}
                      onChange={(e) => setFormPackagingCost(Number(e.target.value))}
                      placeholder="1170"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Dynamic Ingredients List */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">
                      Komposisi Bahan Baku (BOM) <span className="text-rose-500">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Bahan</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formIngredients.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        {/* Ingredient Selector */}
                        <div className="flex-1 min-w-0">
                          <select
                            value={row.ingredient_id}
                            onChange={(e) => handleUpdateIngredientRow(idx, 'ingredient_id', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-orange-500 truncate"
                          >
                            {ingredients.map(ing => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.usage_unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity input */}
                        <div className="w-24 shrink-0 flex items-center gap-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => handleUpdateIngredientRow(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-[11px] font-mono text-slate-500 shrink-0">{row.unit}</span>
                        </div>

                        {/* Subtotal cost display */}
                        <div className="w-28 text-right font-mono font-bold text-xs text-orange-700 shrink-0">
                          {formatRupiah(row.subtotal)}
                        </div>

                        {/* Delete row */}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {formIngredients.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                        Belum ada bahan baku yang dimasukkan. Klik "+ Tambah Bahan" di atas.
                      </p>
                    )}
                  </div>
                </div>

                {/* Live Real-time HPP Preview Bento Card */}
                <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Biaya Bahan Pokok:</span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(builderRawCost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Biaya Operasional (Kemasan + Gas + Labor):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatRupiah(formPackagingCost + formCookingGasCost + formLaborCost)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-orange-200 flex justify-between items-center">
                    <div>
                      <span className="font-black uppercase tracking-wider text-orange-700 block">Total HPP per Porsi</span>
                      <span className="text-[10px] text-orange-600">(Total Biaya / {formPortionYield} porsi)</span>
                    </div>
                    <span className="text-xl font-mono font-black text-orange-700">
                      {formatRupiah(builderCostPerPortion)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsBuilderOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Menyimpan...' : (editingRecipeId ? 'Perbarui Resep' : 'Simpan Resep Baru')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
