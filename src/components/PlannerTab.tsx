import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  RotateCcw, 
  Copy, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  Edit3, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  UtensilsCrossed, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  Info,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { Recipe, ProductionPlan, ProductionPlanItem, AggregatedMaterial, AuthUser } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { ExportService } from '../services/exportService';
import { motion, AnimatePresence } from 'motion/react';

interface PlannerTabProps {
  recipes: Recipe[];
  onRefresh?: () => void;
  currentUser?: AuthUser | null;
}

export default function PlannerTab({ recipes, onRefresh, currentUser }: PlannerTabProps) {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<ProductionPlan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isShoppingModalOpen, setIsShoppingModalOpen] = useState(false);
  const [currentShoppingList, setCurrentShoppingList] = useState<AggregatedMaterial[]>([]);
  const [isFetchingShoppingList, setIsFetchingShoppingList] = useState(false);
  const [copyStatusMessage, setCopyStatusMessage] = useState<string | null>(null);

  // Editor Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState('');
  const [formGlobalMargin, setFormGlobalMargin] = useState<number>(50);
  const [formGlobalFeeType, setFormGlobalFeeType] = useState<'percent' | 'flat'>('percent');
  const [formGlobalFeeValue, setFormGlobalFeeValue] = useState<number>(20);
  const [formItems, setFormItems] = useState<ProductionPlanItem[]>([]);

  // Load plans from API
  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat rencana produksi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Fetch shopping list for a specific plan
  const fetchShoppingListForPlan = async (plan: ProductionPlan) => {
    setIsFetchingShoppingList(true);
    try {
      const res = await fetch(`/api/plans/${plan.id}/shopping-list`);
      const data = await res.json();
      if (data.success) {
        setCurrentShoppingList(data.shopping_list || []);
      }
    } catch (err) {
      console.error('Gagal memuat daftar belanja:', err);
    } finally {
      setIsFetchingShoppingList(false);
    }
  };

  // Open modal for new plan
  const handleCreateNew = () => {
    setFormId(null);
    setFormTitle('Batch Prep ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }));
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNotes('');
    setFormGlobalMargin(50);
    setFormGlobalFeeType('percent');
    setFormGlobalFeeValue(20);
    
    // Default with first 2 recipes
    const defaultItems: ProductionPlanItem[] = (recipes.slice(0, 2)).map(r => {
      const hpp = r.calculated_hpp || 10000;
      const targetMargin = 50;
      const dineInPrice = Math.round(hpp / (1 - (targetMargin / 100)));
      const onlinePrice = Math.round(dineInPrice / (1 - 0.20));
      return {
        recipe_id: r.id,
        recipe_name: r.menu_name,
        recipe_category: r.category,
        quantity: 20,
        margin_percent: targetMargin,
        fee_type: 'percent',
        fee_value: 20,
        cost_per_unit: hpp,
        total_cost: hpp * 20,
        suggested_price: onlinePrice,
        total_revenue: onlinePrice * 20
      };
    });

    setFormItems(defaultItems);
    setIsEditorOpen(true);
  };

  // Open modal for editing existing plan
  const handleEditPlan = async (plan: ProductionPlan) => {
    setFormId(plan.id);
    setFormTitle(plan.title);
    setFormDate(plan.plan_date ? plan.plan_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setFormNotes(plan.notes || '');
    setFormGlobalMargin(plan.global_margin || 50);
    setFormGlobalFeeType(plan.global_fee_type || 'percent');
    setFormGlobalFeeValue(plan.global_fee_value || 0);
    setFormItems(plan.items || []);
    setIsEditorOpen(true);
  };

  // Add Item Row to Editor
  const handleAddItemRow = () => {
    if (recipes.length === 0) return;
    const firstRec = recipes[0];
    const hpp = firstRec.calculated_hpp || 10000;
    const margin = formGlobalMargin;
    const dineIn = Math.round(hpp / (1 - (margin / 100)));
    const online = formGlobalFeeType === 'percent' 
      ? Math.round(dineIn / (1 - (formGlobalFeeValue / 100))) 
      : dineIn + formGlobalFeeValue;

    const newItem: ProductionPlanItem = {
      recipe_id: firstRec.id,
      recipe_name: firstRec.menu_name,
      recipe_category: firstRec.category,
      quantity: 10,
      margin_percent: margin,
      fee_type: formGlobalFeeType,
      fee_value: formGlobalFeeValue,
      cost_per_unit: hpp,
      total_cost: hpp * 10,
      suggested_price: online,
      total_revenue: online * 10
    };
    setFormItems([...formItems, newItem]);
  };

  // Update Item Row
  const handleUpdateItemRow = (index: number, field: keyof ProductionPlanItem, val: any) => {
    const updated = [...formItems];
    const item = { ...updated[index], [field]: val };

    if (field === 'recipe_id') {
      const rec = recipes.find(r => r.id === val);
      if (rec) {
        item.recipe_name = rec.menu_name;
        item.recipe_category = rec.category;
        item.cost_per_unit = rec.calculated_hpp || 10000;
      }
    }

    // Recalculate financial metrics for this item
    const qty = Number(item.quantity || 0);
    const unitHpp = Number(item.cost_per_unit || 0);
    item.total_cost = unitHpp * qty;

    const marginRate = Number(item.margin_percent || 50) / 100;
    const dineInPrice = marginRate < 1 ? (unitHpp / (1 - marginRate)) : (unitHpp * 2);
    let finalPrice = dineInPrice;
    if (item.fee_type === 'percent') {
      const feeRate = Number(item.fee_value || 0) / 100;
      finalPrice = feeRate < 1 ? (dineInPrice / (1 - feeRate)) : dineInPrice;
    } else {
      finalPrice = dineInPrice + Number(item.fee_value || 0);
    }
    item.suggested_price = Math.ceil(finalPrice / 500) * 500;
    item.total_revenue = item.suggested_price * qty;

    updated[index] = item;
    setFormItems(updated);
  };

  // Remove Item Row
  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Apply Global Settings to All Rows
  const handleApplyGlobalSettings = () => {
    const updated = formItems.map(item => {
      const unitHpp = Number(item.cost_per_unit || 0);
      const qty = Number(item.quantity || 0);
      const marginRate = formGlobalMargin / 100;
      const dineInPrice = marginRate < 1 ? (unitHpp / (1 - marginRate)) : (unitHpp * 2);
      let finalPrice = dineInPrice;
      if (formGlobalFeeType === 'percent') {
        const feeRate = formGlobalFeeValue / 100;
        finalPrice = feeRate < 1 ? (dineInPrice / (1 - feeRate)) : dineInPrice;
      } else {
        finalPrice = dineInPrice + formGlobalFeeValue;
      }
      const roundedPrice = Math.ceil(finalPrice / 500) * 500;

      return {
        ...item,
        margin_percent: formGlobalMargin,
        fee_type: formGlobalFeeType,
        fee_value: formGlobalFeeValue,
        suggested_price: roundedPrice,
        total_revenue: roundedPrice * qty
      };
    });
    setFormItems(updated);
  };

  // Save Plan
  const handleSavePlan = async () => {
    if (!formTitle.trim()) {
      alert('Judul rencana wajib diisi.');
      return;
    }
    if (formItems.length === 0) {
      alert('Minimal masukkan 1 item menu yang akan diproduksi.');
      return;
    }

    try {
      const payload = {
        title: formTitle,
        plan_date: formDate,
        global_margin: formGlobalMargin,
        global_fee_type: formGlobalFeeType,
        global_fee_value: formGlobalFeeValue,
        notes: formNotes,
        created_by: currentUser?.name || 'Admin Tangolab',
        items: formItems
      };

      const url = formId ? `/api/plans/${formId}` : '/api/plans';
      const method = formId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsEditorOpen(false);
        fetchPlans();
        if (onRefresh) onRefresh();
      } else {
        alert('Gagal menyimpan: ' + data.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  // Toggle Plan Status (Execute <-> Undo with stock adjustment)
  const handleToggleStatus = async (plan: ProductionPlan) => {
    const isExecuting = plan.status !== 'completed';
    const action = isExecuting ? 'Tandai TERLAKSANA' : 'Batalkan Pelaksanaan (Undo)';
    const confirmMsg = isExecuting
      ? `Tandai rencana "${plan.title}" sebagai TERLAKSANA?\n\nStok bahan baku di gudang akan otomatis dikurangi sesuai kebutuhan batch ini.`
      : `Batalkan pelaksanaan rencana "${plan.title}"?\n\nStok bahan baku akan dikembalikan seperti semula.`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/plans/${plan.id}/toggle-status`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCopyStatusMessage(data.message);
        setTimeout(() => setCopyStatusMessage(null), 5000);
        fetchPlans();
        if (onRefresh) onRefresh();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rencana produksi ini?')) return;
    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  // Copy to Cashflow
  const handleCopyToCashflow = async (plan: ProductionPlan) => {
    if (!confirm(`Salin seluruh estimasi belanja bahan rencana "${plan.title}" ke Buku Kas Belanja Harian?`)) return;

    try {
      const res = await fetch(`/api/plans/${plan.id}/copy-to-cashflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pic_name: currentUser?.name || 'Admin Tangolab' })
      });
      const data = await res.json();
      if (data.success) {
        setCopyStatusMessage(data.message);
        setTimeout(() => setCopyStatusMessage(null), 6000);
        if (onRefresh) onRefresh();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  // Open Shopping List Modal
  const handleOpenShoppingListModal = async (plan: ProductionPlan) => {
    setActivePlan(plan);
    setIsShoppingModalOpen(true);
    await fetchShoppingListForPlan(plan);
  };

  // Summary Totals for Editor Form
  const formTotals = useMemo(() => {
    const totalCost = formItems.reduce((sum, it) => sum + (it.total_cost || 0), 0);
    const totalRevenue = formItems.reduce((sum, it) => sum + (it.total_revenue || 0), 0);
    const grossProfit = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const totalPortions = formItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);

    return {
      totalCost,
      totalRevenue,
      grossProfit,
      marginPct,
      totalPortions
    };
  }, [formItems]);

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      <AnimatePresence>
        {copyStatusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copyStatusMessage}</span>
            </div>
            <button onClick={() => setCopyStatusMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Rencana Batch Produksi &amp; Daftar Belanja Pasar
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rencanakan porsi menu harian, simulasikan margin &amp; fee online (GoFood/GrabFood), agregasi kebutuhan belanja bahan, dan salin ke buku kas.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Buat Rencana Batch Baru</span>
        </button>
      </div>

      {/* Plans List Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Memuat daftar rencana produksi...</div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <UtensilsCrossed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Belum Ada Rencana Produksi</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Buat rencana batch pertama Anda untuk menghitung otomatis total bahan baku yang perlu dibeli di pasar hari ini.
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold"
          >
            <Plus size={14} /> Buat Rencana Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map(plan => {
            const isCompleted = plan.status === 'completed';
            const totalPortions = (plan.items || []).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
            const totalProfit = Number(plan.total_revenue || 0) - Number(plan.total_cost || 0);

            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Status & Date */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <Calendar size={13} className="text-slate-400" />
                      {new Date(plan.plan_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>

                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isCompleted ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                    )}>
                      {isCompleted ? '✓ Terlaksana' : '● Draft'}
                    </span>
                  </div>

                  {/* Title & Notes */}
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {plan.title}
                  </h3>
                  {plan.notes && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 italic">
                      "{plan.notes}"
                    </p>
                  )}

                  {/* Key Metrics Bento */}
                  <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Total Menu / Porsi</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {(plan.items || []).length} Menu • {totalPortions} Porsi
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Est. Belanja HPP</span>
                      <span className="text-xs font-bold text-rose-600 font-mono">
                        {formatRupiah(plan.total_cost || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Target Omzet</span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">
                        {formatRupiah(plan.total_revenue || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Proyeksi Laba</span>
                      <span className="text-xs font-bold text-indigo-600 font-mono">
                        {formatRupiah(totalProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenShoppingListModal(plan)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                      title="Lihat Daftar Belanja Bahan"
                    >
                      <ShoppingCart size={13} />
                      <span>Daftar Belanja</span>
                    </button>

                    <button
                      onClick={() => handleEditPlan(plan)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Edit Rencana"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Hapus Rencana"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    {/* Toggle Status */}
                    <button
                      onClick={() => handleToggleStatus(plan)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer",
                        isCompleted
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      )}
                    >
                      {isCompleted ? (
                        <>
                          <RotateCcw size={12} />
                          <span>Undo Status</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Tandai Selesai</span>
                        </>
                      )}
                    </button>

                    {/* Copy to Cashflow */}
                    <button
                      onClick={() => handleCopyToCashflow(plan)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                      title="Salin Otomatis Bahan ke Buku Kas Belanja"
                    >
                      <Copy size={12} />
                      <span>Ke Kasir</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: PLAN EDITOR / CREATOR */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {formId ? 'Edit Rencana Produksi' : 'Racik Rencana Batch Baru'}
                    </h3>
                    <p className="text-xs text-slate-500">Tentukan target porsi menu, skema margin &amp; fee online.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Judul Rencana Produksi
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Contoh: Batch Prep Shift Pagi (Katering)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Tanggal Produksi
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* 2. Global Parameter Bar (Preset Helper) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/70 to-indigo-50/70 border border-orange-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="grid grid-cols-3 gap-3 flex-1 w-full">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Target Margin (%)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="90"
                        value={formGlobalMargin}
                        onChange={(e) => setFormGlobalMargin(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Tipe Fee Online
                      </label>
                      <select
                        value={formGlobalFeeType}
                        onChange={(e) => setFormGlobalFeeType(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        <option value="percent">Persentase (%)</option>
                        <option value="flat">Nominal Flat (Rp)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Nilai Fee (Ojol/Titip)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formGlobalFeeValue}
                        onChange={(e) => setFormGlobalFeeValue(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyGlobalSettings}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Terapkan ke Semua Menu
                  </button>
                </div>

                {/* 3. Dynamic Menu Rows */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <UtensilsCrossed size={14} className="text-orange-500" />
                      Daftar Menu &amp; Target Porsi
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Plus size={13} /> Tambah Menu
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {formItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                      >
                        <div className="md:col-span-4">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Pilih Menu</label>
                          <select
                            value={item.recipe_id}
                            onChange={(e) => handleUpdateItemRow(idx, 'recipe_id', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 truncate"
                          >
                            {recipes.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.menu_name} ({r.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Porsi Target</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItemRow(idx, 'quantity', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-800"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">HPP Satuan</label>
                          <span className="text-xs font-mono font-semibold text-slate-700 block py-1.5">
                            {formatRupiah(item.cost_per_unit || 0)}
                          </span>
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Harga Rekomendasi</label>
                          <span className="text-xs font-mono font-bold text-emerald-600 block py-1.5">
                            {formatRupiah(item.suggested_price || 0)}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (Omzet: {formatRupiah(item.total_revenue || 0)})
                            </span>
                          </span>
                        </div>

                        <div className="md:col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Financial Summary Card */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Porsi</span>
                    <span className="text-base font-bold font-mono text-white">{formTotals.totalPortions} Porsi</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Belanja HPP</span>
                    <span className="text-base font-bold font-mono text-rose-400">{formatRupiah(formTotals.totalCost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Omzet</span>
                    <span className="text-base font-bold font-mono text-emerald-400">{formatRupiah(formTotals.totalRevenue)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Proyeksi Laba</span>
                    <span className="text-base font-bold font-mono text-orange-400">
                      {formatRupiah(formTotals.grossProfit)} ({Math.round(formTotals.marginPct)}%)
                    </span>
                  </div>
                </div>

                {/* 5. Notes Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Catatan Rencana (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Contoh: Belanja bahan di pasar jam 05.00 pagi, persiapan pesanan katering makan siang."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  {formId ? 'Perbarui Rencana' : 'Simpan Rencana Produksi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SHOPPING LIST & EXPORT VIEWER */}
      <AnimatePresence>
        {isShoppingModalOpen && activePlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Daftar Belanja Pasar Gabungan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rencana: <span className="font-semibold text-slate-700">{activePlan.title}</span> • {activePlan.plan_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => ExportService.exportPlanToPDF(activePlan, currentShoppingList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
                    title="Cetak Lembar Kerja PDF"
                  >
                    <Printer size={13} className="text-orange-500" />
                    <span>PDF</span>
                  </button>

                  <button
                    onClick={() => ExportService.exportPlanToExcel(activePlan, currentShoppingList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 shadow-xs cursor-pointer"
                    title="Unduh Lembar Kerja Excel"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => setIsShoppingModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 ml-2"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body: Shopping List Table */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                {isFetchingShoppingList ? (
                  <div className="py-12 text-center text-xs text-slate-400">Menghitung akumulasi kebutuhan bahan pasar...</div>
                ) : currentShoppingList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">Tidak ada rincian bahan belanja.</div>
                ) : (
                  <>
                    <div className="p-4 bg-orange-50/60 border border-orange-100 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-orange-900">Total Kebutuhan Belanja Teragregasi</p>
                          <p className="text-[11px] text-orange-700">
                            Mencakup seluruh komposisi menu &amp; bahan olahan subassembly untuk {currentShoppingList.length} jenis bahan baku.
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider block">Estimasi Total Kas</span>
                        <span className="text-base font-extrabold text-orange-600 font-mono">
                          {formatRupiah(currentShoppingList.reduce((sum, item) => sum + item.estimated_cost, 0))}
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-4">Nama Bahan</th>
                            <th className="py-3 px-3">Kategori</th>
                            <th className="py-3 px-3 text-right">Kebutuhan Resep</th>
                            <th className="py-3 px-3 text-right">Qty Beli Pasar</th>
                            <th className="py-3 px-3 text-right">Harga Beli</th>
                            <th className="py-3 px-4 text-right">Subtotal Belanja</th>
                            <th className="py-3 px-4">Toko / Pasar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {currentShoppingList.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {item.name}
                              </td>
                              <td className="py-3 px-3 text-slate-500">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-semibold">
                                  {item.category}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-600">
                                {item.total_usage_qty.toLocaleString('id-ID')} {item.usage_unit}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-orange-600">
                                {item.purchase_qty} {item.purchase_unit}
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-slate-500">
                                {formatRupiah(item.unit_price)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                {formatRupiah(item.estimated_cost)}
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-[140px]">
                                {item.source_link || 'Pasar Tradisional'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Dapat langsung disalin ke catatan kas operasional.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsShoppingModalOpen(false);
                      handleCopyToCashflow(activePlan);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Copy size={13} />
                    <span>Salin ke Buku Kas Belanja</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
