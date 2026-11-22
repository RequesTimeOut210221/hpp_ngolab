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
  Plus,
  Pencil,
  Trash2,
  X,
  Sparkles,
  TrendingUp,
  Database,
  RefreshCw
} from 'lucide-react';
import { Ingredient } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface IngredientsTabProps {
  ingredients: Ingredient[];
  isLoading: boolean;
  searchTerm: string;
  onRefresh?: () => Promise<void>;
}

export default function IngredientsTab({ 
  ingredients, 
  isLoading, 
  searchTerm,
  onRefresh
}: IngredientsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Bahan Baku');
  const [formPurchaseUnit, setFormPurchaseUnit] = useState('kg');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number>(0);
  const [formUsageUnit, setFormUsageUnit] = useState('gr');
  const [formConversionRatio, setFormConversionRatio] = useState<number>(1000);
  const [formYieldPercentage, setFormYieldPercentage] = useState<number>(100);

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

  // Open modal for add
  const handleOpenAdd = () => {
    setFormName('');
    setFormCategory('Bahan Baku');
    setFormPurchaseUnit('kg');
    setFormPurchasePrice(0);
    setFormUsageUnit('gr');
    setFormConversionRatio(1000);
    setFormYieldPercentage(100);
    setEditingIngredient(null);
    setIsAddModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (ing: Ingredient) => {
    setFormName(ing.name);
    setFormCategory(ing.category);
    setFormPurchaseUnit(ing.purchase_unit);
    setFormPurchasePrice(ing.cost_price);
    setFormUsageUnit(ing.usage_unit);
    setFormConversionRatio(ing.conversion_rate || 1);
    setFormYieldPercentage(100);
    setEditingIngredient(ing);
    setIsAddModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      if (editingIngredient) {
        // Edit existing
        const res = await fetch(`/api/ingredients/${editingIngredient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            category: formCategory,
            purchase_price: formPurchasePrice,
            conversion_ratio: formConversionRatio,
            yield_percentage: formYieldPercentage
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal memperbarui bahan.');
        setStatusMessage({ type: 'success', text: `Bahan "${formName}" berhasil diperbarui!` });
      } else {
        // Add new
        const res = await fetch('/api/ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `ING-${Date.now()}`,
            name: formName,
            category: formCategory,
            purchase_unit: formPurchaseUnit,
            purchase_price: formPurchasePrice,
            usage_unit: formUsageUnit,
            conversion_ratio: formConversionRatio,
            yield_percentage: formYieldPercentage
          })
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'Gagal menambah bahan.');
        setStatusMessage({ type: 'success', text: `Bahan baru "${formName}" berhasil ditambahkan!` });
      }

      setIsAddModalOpen(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete ingredient
  const handleDeleteIngredient = async (ing: Ingredient) => {
    if (!confirm(`Hapus bahan baku "${ing.name}"? Aksi ini akan dibatalkan jika bahan masih digunakan dalam komposisi resep.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ingredients/${ing.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.message || 'Gagal menghapus bahan.');
        return;
      }
      setStatusMessage({ type: 'success', text: `Bahan "${ing.name}" berhasil dihapus.` });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const calculatedCostPerUsage = formConversionRatio > 0 ? (formPurchasePrice / formConversionRatio) : formPurchasePrice;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Master Bahan Baku &amp; Konversi Satuan
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola inventori bahan baku, atur rasio konversi unit (kg &rarr; gr, L &rarr; ml), dan pantau harga AVCO bergerak.
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
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan Baku</span>
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
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Multi-Satuan Konversi</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">100% Terstandar</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              Dual Basis
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Metode Valuasi</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">AVCO &amp; Spot</h3>
          </div>
        </div>
      </div>

      {/* Category Filters */}
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

      {/* Ingredients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-800">Daftar Bahan Baku</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
              {filteredIngredients.length} item
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Bahan Baku</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Satuan Beli</th>
                <th className="py-3 px-4 text-right">Harga Beli Spot</th>
                <th className="py-3 px-4 text-center">Rasio Konversi</th>
                <th className="py-3 px-4">Satuan Resep</th>
                <th className="py-3 px-4 text-right">Biaya / Satuan Resep</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIngredients.map((ing) => {
                const ratio = ing.conversion_rate || 1;
                const costPerUsage = ratio > 0 ? (ing.cost_price / ratio) : ing.cost_price;

                return (
                  <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                        {ing.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        ID: {ing.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {ing.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      1 {ing.purchase_unit}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(ing.cost_price)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-xs text-slate-500">
                        1 {ing.purchase_unit} = {ratio.toLocaleString('id-ID')} {ing.usage_unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600">
                      {ing.usage_unit}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-orange-600">
                        Rp {costPerUsage >= 10 ? Math.round(costPerUsage).toLocaleString('id-ID') : costPerUsage.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        per {ing.usage_unit}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(ing)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                          title="Edit Bahan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ing)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Hapus Bahan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog: Add / Edit Ingredient */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingIngredient ? `ID: ${editingIngredient.id}` : 'Daftarkan bahan baku baru ke master database Ngolab'}
                  </p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Bahan Baku <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Susu Greenfield UHT 1L"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kategori
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Bahan Baku">Bahan Baku</option>
                      <option value="Kopi & Bubuk">Kopi &amp; Bubuk</option>
                      <option value="Susu & Dairy">Susu &amp; Dairy</option>
                      <option value="Sirup & Pemanis">Sirup &amp; Pemanis</option>
                      <option value="Teh & Buah">Teh &amp; Buah</option>
                      <option value="Kemasan">Kemasan</option>
                      <option value="Operasional">Operasional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Satuan Beli Pasar <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formPurchaseUnit}
                      onChange={(e) => setFormPurchaseUnit(e.target.value)}
                      placeholder="kg, L, slop, btl, pack"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Harga Beli per Satuan Beli (Rp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formPurchasePrice || ''}
                      onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                      placeholder="Contoh: 25000"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Satuan Pakai Resep <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formUsageUnit}
                      onChange={(e) => setFormUsageUnit(e.target.value)}
                      placeholder="gr, ml, pcs"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Faktor Konversi (1 {formPurchaseUnit || 'Beli'} = ? {formUsageUnit || 'Resep'}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formConversionRatio || ''}
                    onChange={(e) => setFormConversionRatio(Number(e.target.value))}
                    placeholder="Contoh: 1000 (jika 1 kg = 1000 gr)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Live Preview Calculation */}
                <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-orange-950 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wider text-orange-700 block">Kalkulasi Otomatis</span>
                    <span className="text-xs">Biaya per 1 {formUsageUnit || 'satuan resep'}:</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-mono font-bold text-orange-700">
                      Rp {calculatedCostPerUsage >= 10 ? Math.round(calculatedCostPerUsage).toLocaleString('id-ID') : calculatedCostPerUsage.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Menyimpan...' : (editingIngredient ? 'Perbarui Bahan' : 'Simpan Bahan Baru')}
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
