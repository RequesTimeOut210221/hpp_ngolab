import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Calculator,
  ChefHat,
  Package,
  TrendingUp,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Store,
  DollarSign,
  Filter
} from 'lucide-react';
import { MasterIngredient, Recipe, CashflowEntry, MenuCategory } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'pricing' | 'recipes' | 'ingredients'>('cashflow');
  
  // Data state
  const [cashflow, setCashflow] = useState<CashflowEntry[]>([]);
  const [cashSummary, setCashSummary] = useState({ total_cash_in: 0, total_cash_out: 0, balance: 0 });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<MasterIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter state for pricing simulator
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [targetMargin, setTargetMargin] = useState<number>(50);
  const [costBasis, setCostBasis] = useState<'latest' | 'avco'>('latest');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [syncModalData, setSyncModalData] = useState<{ recipe: Recipe; newPrice: number } | null>(null);

  // Form state
  const [expenseForm, setExpenseForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    ingredient_id: '',
    quantity: '',
    unit_price: '',
    total_amount: ''
  });

  const [incomeForm, setIncomeForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: 'Penambahan Modal Kasir/Dapur',
    total_amount: ''
  });

  // Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [cfRes, recRes, ingRes] = await Promise.all([
        fetch('/api/cashflow').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/recipes').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/ingredients').then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (cfRes.success) {
        setCashflow(cfRes.data || []);
        setCashSummary(cfRes.summary || { total_cash_in: 0, total_cash_out: 0, balance: 0 });
      }
      if (recRes.success) setRecipes(recRes.data || []);
      if (ingRes.success) setIngredients(ingRes.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Handle add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(expenseForm.total_amount) || (parseFloat(expenseForm.quantity) * parseFloat(expenseForm.unit_price));
    if (!total || total <= 0) return showNotification('error', 'Nominal belanja harus lebih dari 0');

    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: expenseForm.entry_date,
          type: 'cash_out',
          description: expenseForm.description,
          ingredient_id: expenseForm.ingredient_id || null,
          quantity: parseFloat(expenseForm.quantity) || null,
          unit_price: parseFloat(expenseForm.unit_price) || null,
          total_amount: total,
          created_by: 'Owner/Kasir'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Belanja bahan berhasil dicatat!');
        setShowExpenseModal(false);
        setExpenseForm({
          entry_date: new Date().toISOString().split('T')[0],
          description: '',
          ingredient_id: '',
          quantity: '',
          unit_price: '',
          total_amount: ''
        });
        fetchData();
      } else {
        showNotification('error', data.message || 'Gagal menyimpan transaksi');
      }
    } catch {
      showNotification('error', 'Koneksi server gagal');
    }
  };

  // Handle add income
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(incomeForm.total_amount);
    if (!total || total <= 0) return showNotification('error', 'Nominal modal harus lebih dari 0');

    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: incomeForm.entry_date,
          type: 'cash_in',
          description: incomeForm.description,
          total_amount: total,
          created_by: 'Owner/Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Penambahan modal kas berhasil dicatat!');
        setShowIncomeModal(false);
        setIncomeForm({
          entry_date: new Date().toISOString().split('T')[0],
          description: 'Penambahan Modal Kasir/Dapur',
          total_amount: ''
        });
        fetchData();
      } else {
        showNotification('error', data.message || 'Gagal menyimpan transaksi');
      }
    } catch {
      showNotification('error', 'Koneksi server gagal');
    }
  };

  // Handle sync price to POS
  const handleSyncToPOS = async () => {
    if (!syncModalData || !syncModalData.recipe.menu_id) {
      return showNotification('error', 'Menu ini belum terhubung ke ID POS.');
    }

    try {
      const res = await fetch('/api/pricing/sync-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: syncModalData.recipe.menu_id,
          new_price: syncModalData.newPrice,
          applied_margin_percent: targetMargin,
          synced_by: 'Admin Finansial'
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('success', data.message);
        setSyncModalData(null);
        fetchData();
      } else {
        showNotification('error', data.message || 'Gagal memperbarui harga POS');
      }
    } catch {
      showNotification('error', 'Koneksi server backend gagal');
    }
  };

  // Calculate recommended price
  const calcRecommendedPrice = (hpp: number, marginPercent: number): number => {
    if (marginPercent >= 100) return hpp;
    const raw = hpp / (1 - marginPercent / 100);
    // Bulatkan ke atas ke kelipatan 500 rupiah terdekat
    return Math.ceil(raw / 500) * 500;
  };

  // Filtered recipes
  const filteredRecipes = recipes.filter(r => {
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                Ng
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">hpp_ngolab</h1>
                <p className="text-xs text-slate-500">Finance, 3-Tier HPP & Target Margin Engine</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('cashflow')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'cashflow'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Buku Kas Belanja</span>
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'pricing'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Simulator Pricing & POS</span>
              </button>

              <button
                onClick={() => setActiveTab('recipes')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'recipes'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span>Resep 3-Tier ({recipes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('ingredients')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'ingredients'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Master Bahan ({ingredients.length})</span>
              </button>
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Port 5177
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* ========================================================================= */}
        {/* TAB 1: BUKU KAS & BELANJA HARIAN (DEFAULT LANDING VIEW)                    */}
        {/* ========================================================================= */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Modal Masuk</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    Rp {cashSummary.total_cash_in.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Suntikan modal operasional kasir & dapur</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Belanja Bahan</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-rose-700">
                    Rp {cashSummary.total_cash_out.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Pengeluaran bahan baku, bumbu, & operasional</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sisa Saldo Kas</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-bold ${cashSummary.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    Rp {cashSummary.balance.toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Saldo berjalan kas belanja operasional</p>
              </div>
            </div>

            {/* Action Bar & Transaction Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Buku Kas & Riwayat Belanja Harian</h2>
                  <p className="text-xs text-slate-500">Pencatatan real-time pembelian pasar yang meng-update nilai AVCO dan harga terbaru</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowIncomeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Modal</span>
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Catat Belanja Bahan</span>
                  </button>
                </div>
              </div>

              {/* Cashflow Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Tanggal</th>
                      <th className="px-5 py-3.5">Deskripsi Belanja / Transaksi</th>
                      <th className="px-5 py-3.5 text-right">Jumlah</th>
                      <th className="px-5 py-3.5 text-right">Harga Satuan</th>
                      <th className="px-5 py-3.5 text-right">Cash In (Rp)</th>
                      <th className="px-5 py-3.5 text-right">Cash Out (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashflow.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                          Belum ada catatan transaksi kas. Klik tombol di atas untuk menambah.
                        </td>
                      </tr>
                    ) : (
                      cashflow.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-slate-500">
                            {item.entry_date}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-900">
                            {item.description}
                            {item.ingredient_name && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-medium bg-amber-100 text-amber-800">
                                {item.ingredient_name}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap text-xs text-slate-600">
                            {item.quantity ? `${item.quantity}` : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap text-xs text-slate-600">
                            {item.unit_price ? `Rp ${Number(item.unit_price).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-emerald-600">
                            {item.type === 'cash_in' ? `Rp ${Number(item.total_amount).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap font-medium text-rose-600">
                            {item.type === 'cash_out' ? `Rp ${Number(item.total_amount).toLocaleString('id-ID')}` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SIMULATOR MARGIN & PENETAPAN HARGA POS                             */}
        {/* ========================================================================= */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            {/* Simulator Controls & Filter Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Simulator Margin & Penetapan Harga Menu</h2>
                  <p className="text-xs text-slate-500">
                    Geser slider margin untuk melihat rekomendasi harga jual, lalu terapkan langsung ke Kasir POS.
                  </p>
                </div>
                
                {/* Cost Basis Switcher */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setCostBasis('latest')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      costBasis === 'latest' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Harga Beli Terkini (Spot)
                  </button>
                  <button
                    onClick={() => setCostBasis('avco')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      costBasis === 'avco' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rata-Rata AVCO
                  </button>
                </div>
              </div>

              {/* Margin Slider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Target Gross Margin: <span className="text-amber-600 text-sm font-bold">{targetMargin}%</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    Food Cost Ratio Target: <span className="font-semibold text-slate-800">{100 - targetMargin}%</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="65"
                  step="1"
                  value={targetMargin}
                  onChange={e => setTargetMargin(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="flex justify-between text-3xs text-slate-400 mt-1 font-mono">
                  <span>30% (Kantin / Hemat)</span>
                  <span>45% (Standar Café)</span>
                  <span>55% (Spesial)</span>
                  <span>65% (Tinggi)</span>
                </div>
              </div>

              {/* Category Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Kategori:
                  </span>
                  {[
                    { id: 'all', label: 'Semua Menu' },
                    { id: 'makanan_berat', label: 'Makanan Berat' },
                    { id: 'camilan', label: 'Camilan / Snack' },
                    { id: 'minuman', label: 'Minuman' },
                    { id: 'bakso_mie', label: 'Bakso & Mie' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        categoryFilter === cat.id
                          ? 'bg-amber-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari menu..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-full sm:w-48"
                  />
                </div>
              </div>
            </div>

            {/* Menu Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRecipes.map(recipe => {
                const totalHpp = recipe.total_hpp || 0;
                const recPrice = calcRecommendedPrice(totalHpp, targetMargin);
                const currentPosPrice = recipe.pos_price || 0;
                const currentMargin = currentPosPrice > 0 ? Math.round(((currentPosPrice - totalHpp) / currentPosPrice) * 100) : 0;
                const projectedMargin = recPrice > 0 ? Math.round(((recPrice - totalHpp) / recPrice) * 100) : 0;
                const profitPerPortion = recPrice - totalHpp;

                return (
                  <div
                    key={recipe.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-semibold bg-slate-100 text-slate-600 mb-1">
                            {recipe.category.replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{recipe.name}</h3>
                        </div>
                        {recipe.is_subassembly && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold bg-purple-100 text-purple-800">
                            WIP Semi-Finished
                          </span>
                        )}
                      </div>

                      {/* HPP Breakdown 3-Tier */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Bahan Baku & Bumbu:</span>
                          <span className="font-mono font-medium text-slate-700">Rp {recipe.total_raw_cost?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Kemasan & Penyajian:</span>
                          <span className="font-mono font-medium text-slate-700">Rp {Number(recipe.packaging_cost || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Gas & Utilitas:</span>
                          <span className="font-mono font-medium text-slate-700">Rp {Number(recipe.cooking_gas_cost || 0).toLocaleString('id-ID')}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-200 flex justify-between font-semibold text-slate-900">
                          <span>TOTAL HPP:</span>
                          <span className="font-mono text-amber-700">Rp {totalHpp.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {/* Pricing Comparison */}
                      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-100/60 border border-slate-200/50">
                          <span className="text-3xs font-medium text-slate-500 block">Harga POS Saat Ini</span>
                          <span className="text-sm font-bold text-slate-800 font-mono">
                            {currentPosPrice > 0 ? `Rp ${currentPosPrice.toLocaleString('id-ID')}` : 'Belum di-set'}
                          </span>
                          <span className="text-3xs block mt-0.5 text-slate-500">
                            Margin: <strong className={currentMargin < 35 ? 'text-rose-600' : 'text-slate-700'}>{currentMargin}%</strong>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                          <span className="text-3xs font-medium text-amber-700 block">Rekomendasi ({targetMargin}%)</span>
                          <span className="text-sm font-bold text-amber-900 font-mono">
                            Rp {recPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-3xs block mt-0.5 text-emerald-700 font-medium">
                            Untung: +Rp {profitPerPortion.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-3xs text-slate-400">
                        Food Cost: <strong className="text-slate-600">{Math.round((totalHpp / (recPrice || 1)) * 100)}%</strong>
                      </span>
                      <button
                        onClick={() => setSyncModalData({ recipe, newPrice: recPrice })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors shadow-2xs"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Terapkan ke POS</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: RESEP & STRUKTUR 3-TIER                                           */}
        {/* ========================================================================= */}
        {activeTab === 'recipes' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Katalog Resep Manufaktur 3-Tier (41 Menu)</h2>
              <p className="text-xs text-slate-500">Daftar komposisi bahan baku pokok, bumbu, kemasan, dan energi per porsi produk</p>
            </div>

            <div className="space-y-4">
              {recipes.map(recipe => (
                <div key={recipe.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{recipe.name}</h3>
                        <span className="px-2 py-0.5 rounded-md text-3xs font-semibold bg-slate-100 text-slate-600">
                          {recipe.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Kapasitas hasil: {recipe.portion_yield} porsi</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Total HPP per Porsi</span>
                      <span className="text-base font-bold text-amber-700 font-mono">
                        Rp {recipe.total_hpp?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Ingredients Table */}
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-600">
                      <thead className="text-slate-400 font-semibold uppercase tracking-wider text-3xs">
                        <tr>
                          <th className="py-1.5">Bahan / Komponen</th>
                          <th className="py-1.5 text-right">Takaran</th>
                          <th className="py-1.5 text-right">Biaya / Satuan</th>
                          <th className="py-1.5 text-right">Subtotal Biaya</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(recipe.ingredients || []).map((ing, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 font-medium text-slate-800">{ing.ingredient_name || ing.notes || 'Bahan'}</td>
                            <td className="py-1.5 text-right font-mono">{ing.quantity} {ing.unit}</td>
                            <td className="py-1.5 text-right font-mono">Rp {ing.cost_per_unit?.toLocaleString('id-ID')}</td>
                            <td className="py-1.5 text-right font-mono font-medium text-slate-900">
                              Rp {ing.subtotal_cost?.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MASTER 48 BAHAN BAKU & HARGA PASAR                                */}
        {/* ========================================================================= */}
        {activeTab === 'ingredients' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Master Data 48 Bahan Baku & Konversi Satuan</h2>
              <p className="text-xs text-slate-500">Pemetaan satuan beli grosir ke satuan pakai dapur lengkap dengan harga beli dan AVCO</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-3xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Nama Bahan</th>
                    <th className="px-5 py-3">Satuan Beli</th>
                    <th className="px-5 py-3 text-right">Harga Beli Terkini</th>
                    <th className="px-5 py-3">Satuan Pakai</th>
                    <th className="px-5 py-3 text-right">Biaya / Satuan Pakai</th>
                    <th className="px-5 py-3 text-right">Nilai AVCO</th>
                    <th className="px-5 py-3 text-center">Yield (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-slate-900">{ing.name}</td>
                      <td className="px-5 py-2.5">{ing.purchase_unit}</td>
                      <td className="px-5 py-2.5 text-right font-mono font-semibold text-slate-800">
                        Rp {Number(ing.purchase_price).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-2.5">{ing.usage_unit}</td>
                      <td className="px-5 py-2.5 text-right font-mono text-amber-700">
                        Rp {Number(ing.cost_per_usage_unit).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono text-slate-600">
                        Rp {Number(ing.avco_price).toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-2.5 text-center font-mono">{ing.yield_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CATAT BELANJA BAHAN (EXPENSE)                                    */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Catat Belanja Bahan Baku / Pasar</h3>
            <p className="text-xs text-slate-500 mb-4">Transaksi ini otomatis memperbarui nilai harga beli terkini dan AVCO</p>
            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal Belanja</label>
                <input
                  type="date"
                  required
                  value={expenseForm.entry_date}
                  onChange={e => setExpenseForm({ ...expenseForm, entry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pilih Bahan Baku (Opsional)</label>
                <select
                  value={expenseForm.ingredient_id}
                  onChange={e => {
                    const selId = e.target.value;
                    const found = ingredients.find(i => i.id === selId);
                    setExpenseForm({
                      ...expenseForm,
                      ingredient_id: selId,
                      description: found ? found.name : expenseForm.description,
                      unit_price: found ? found.purchase_price.toString() : expenseForm.unit_price
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">-- Pilih bahan dari master --</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.purchase_unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Deskripsi Belanja</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Cabe Merah Keriting 1kg"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Kuantitas</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1"
                    value={expenseForm.quantity}
                    onChange={e => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="45000"
                    value={expenseForm.unit_price}
                    onChange={e => setExpenseForm({ ...expenseForm, unit_price: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Total Nominal Belanja (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="45000"
                  value={expenseForm.total_amount || (parseFloat(expenseForm.quantity || '0') * parseFloat(expenseForm.unit_price || '0')) || ''}
                  onChange={e => setExpenseForm({ ...expenseForm, total_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 shadow-xs"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH MODAL KASIR (INCOME)                                      */}
      {/* ========================================================================= */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Tambah Modal Kasir / Operasional</h3>
            <p className="text-xs text-slate-500 mb-4">Suntikan dana tunai untuk operasional belanja outlet</p>
            <form onSubmit={handleAddIncome} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={incomeForm.entry_date}
                  onChange={e => setIncomeForm({ ...incomeForm, entry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  required
                  value={incomeForm.description}
                  onChange={e => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Nominal Tambah Modal (Rp)</label>
                <input
                  type="number"
                  required
                  placeholder="500000"
                  value={incomeForm.total_amount}
                  onChange={e => setIncomeForm({ ...incomeForm, total_amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs"
                >
                  Tambah Modal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KONFIRMASI SINKRONISASI HARGA KE POS                             */}
      {/* ========================================================================= */}
      {syncModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <Store className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Perbarui Harga Kasir POS & PointLab</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Anda akan memperbarui harga menu <strong>"{syncModalData.recipe.name}"</strong> secara langsung pada database kasir POS dan katalog member PointLab:
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs mb-5">
              <div className="flex justify-between text-slate-500">
                <span>Harga POS Saat Ini:</span>
                <span className="font-mono text-slate-800 line-through">
                  Rp {syncModalData.recipe.pos_price?.toLocaleString('id-ID') || 0}
                </span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                <span>Harga Baru Terpilih:</span>
                <span className="font-mono text-amber-700">
                  Rp {syncModalData.newPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between text-3xs text-emerald-700 font-medium">
                <span>Target Gross Margin:</span>
                <span>{targetMargin}%</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSyncModalData(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSyncToPOS}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-amber-600 transition-colors shadow-xs text-xs"
              >
                Konfirmasi & Update POS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
