import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Receipt, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  CreditCard, 
  Tag, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  X,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  FileSpreadsheet
} from 'lucide-react';
import { CashflowEntry } from '../types';
import { formatRupiah, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ExportService } from '../services/exportService';

interface CashflowTabProps {
  entries: CashflowEntry[];
  onAddEntry: (entry: Omit<CashflowEntry, 'id'>) => Promise<void>;
  isLoading: boolean;
  searchTerm: string;
}

export default function CashflowTab({ 
  entries, 
  onAddEntry, 
  isLoading,
  searchTerm 
}: CashflowTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CashflowEntry | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'income' | 'expense',
    category: 'Bahan Baku',
    description: '',
    amount: '',
    payment_method: 'Tunai Kasir',
    pic_name: 'Kasir Shift Pagi',
    receipt_url: '',
    notes: ''
  });

  // Calculate summary metrics
  const metrics = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let ingredientExpense = 0;
    let packagingExpense = 0;
    let operationalExpense = 0;

    entries.forEach(e => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'expense') {
        totalExpense += amt;
        if (e.category === 'Bahan Baku') ingredientExpense += amt;
        else if (e.category === 'Kemasan') packagingExpense += amt;
        else operationalExpense += amt;
      } else {
        totalIncome += amt;
      }
    });

    return {
      totalExpense,
      totalIncome,
      ingredientExpense,
      packagingExpense,
      operationalExpense,
      count: entries.length
    };
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchCategory = selectedCategory === 'Semua' || e.category === selectedCategory;
      const matchSearch = searchTerm === '' || 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.pic_name && e.pic_name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [entries, selectedCategory, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) {
      alert('Mohon isi deskripsi transaksi dan nominal.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddEntry({
        date: formData.date,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        pic_name: formData.pic_name,
        receipt_url: formData.receipt_url || undefined,
        notes: formData.notes || undefined
      });
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'Bahan Baku',
        description: '',
        amount: '',
        payment_method: 'Tunai Kasir',
        pic_name: 'Kasir Shift Pagi',
        receipt_url: '',
        notes: ''
      });
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['Semua', 'Bahan Baku', 'Kemasan', 'Operasional', 'Pemasukan'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Buku Kas &amp; Belanja Operasional</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Mencatat seluruh arus keluar belanja bahan baku, kemasan, dan pengeluaran shift harian outlet Ngolab.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              ExportService.exportCashflowToExcel(filteredEntries, {
                total_cash_in: metrics.totalIncome,
                total_cash_out: metrics.totalExpense,
                balance: metrics.totalIncome - metrics.totalExpense
              });
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
            title="Ekspor Seluruh Buku Kas ke Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Ekspor Excel</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-orange-500/20 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Catat Belanja Baru
          </button>
        </div>
      </div>

      {/* Summary Bento Cards (Matching backend_ngolab Dashboard.tsx) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowDownRight size={12} />
              Belanja Bahan
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Belanja Bahan Baku</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{formatRupiah(metrics.ingredientExpense)}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Tag className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              Packaging
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Biaya Kemasan &amp; Cup</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{formatRupiah(metrics.packagingExpense)}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
              Overhead
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Operasional Shift &amp; Es</p>
            <h3 className="text-xl font-bold font-mono text-slate-900">{formatRupiah(metrics.operationalExpense)}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-mono">
              {metrics.count} Transaksi
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Kas Keluar (Bulan Ini)</p>
            <h3 className="text-xl font-bold font-mono text-orange-600">{formatRupiah(metrics.totalExpense)}</h3>
          </div>
        </motion.div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-slate-400">
            Menampilkan <span className="font-bold text-slate-800">{filteredEntries.length}</span> dari {entries.length} entri
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-200/60">
                <th className="px-6 py-3.5">Tanggal &amp; Waktu</th>
                <th className="px-6 py-3.5">Deskripsi Transaksi</th>
                <th className="px-6 py-3.5">Kategori</th>
                <th className="px-6 py-3.5">PIC / Kasir</th>
                <th className="px-6 py-3.5">Metode Bayar</th>
                <th className="px-6 py-3.5 text-right">Nominal</th>
                <th className="px-6 py-3.5 text-center">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-600">Belum ada catatan belanja</p>
                    <p className="text-xs mt-0.5">Gunakan tombol "Catat Belanja Baru" untuk memasukkan data kas belanja.</p>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isExp = entry.type === 'expense';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                            {entry.description}
                          </span>
                          {entry.notes && (
                            <span className="text-[10px] text-slate-400 mt-0.5">{entry.notes}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          entry.category === 'Bahan Baku' ? "status-danger" :
                          entry.category === 'Kemasan' ? "status-processing" :
                          entry.category === 'Operasional' ? "status-paid" : "status-pending"
                        )}>
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <span className="font-semibold">{entry.pic_name || 'Admin'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                          {entry.payment_method || 'Tunai'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isExp ? "text-rose-600" : "text-emerald-600"}>
                          {isExp ? '-' : '+'} {formatRupiah(entry.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {entry.receipt_url ? (
                          <button
                            onClick={() => setSelectedReceipt(entry)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <FileText size={12} />
                            Lihat
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Belanja Baru (matching backend_ngolab modal style) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Catat Belanja Kas Baru</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Input faktur / nota kas keluar untuk logistik dan HPP</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="modal-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Kategori
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="modal-input bg-slate-50"
                    >
                      <option value="Bahan Baku">Bahan Baku (Kopi/Susu/Sirup)</option>
                      <option value="Kemasan">Kemasan &amp; Cup (Packaging)</option>
                      <option value="Operasional">Operasional (Es Batu/Gas/ATK)</option>
                      <option value="Pemasukan">Pemasukan Kas Shift</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                    Deskripsi / Nama Barang
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Beli Fresh Milk Diamond 6L, Es Kristal 2 Karung"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="modal-input"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Nominal Total (Rp)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 125000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="modal-input font-mono font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Metode Pembayaran
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                      className="modal-input bg-slate-50"
                    >
                      <option value="Tunai Kasir">Kas Tunai Kasir</option>
                      <option value="Transfer Mandiri">Transfer Bank</option>
                      <option value="QRIS Keluar">QRIS Kas Keluar</option>
                      <option value="Petty Cash">Kas Kecil (Petty Cash)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      PIC / Penanggung Jawab
                    </label>
                    <input
                      type="text"
                      placeholder="Nama Kasir / Staff"
                      value={formData.pic_name}
                      onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                      Link Bukti / Foto Nota
                    </label>
                    <input
                      type="text"
                      placeholder="URL / Nomor Bukti"
                      value={formData.receipt_url}
                      onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                      className="modal-input"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm shadow-orange-500/20 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi Kas'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal View Receipt */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setSelectedReceipt(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-1">Bukti Nota Transaksi</h3>
              <p className="text-xs text-slate-400 font-mono mb-4">{selectedReceipt.id} &bull; {selectedReceipt.date}</p>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Deskripsi</span>
                  <span className="font-bold text-slate-800 text-right">{selectedReceipt.description}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Nominal</span>
                  <span className="font-bold font-mono text-rose-600">{formatRupiah(selectedReceipt.amount)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">PIC</span>
                  <span className="font-medium text-slate-700">{selectedReceipt.pic_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Metode</span>
                  <span className="font-medium text-slate-700">{selectedReceipt.payment_method}</span>
                </div>
              </div>

              {selectedReceipt.receipt_url && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-xs mb-4 break-all">
                  <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1">URL File Nota:</p>
                  <a href={selectedReceipt.receipt_url} target="_blank" rel="noreferrer" className="underline font-mono">
                    {selectedReceipt.receipt_url}
                  </a>
                </div>
              )}

              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
