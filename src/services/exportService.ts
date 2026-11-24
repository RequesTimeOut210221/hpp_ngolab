import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Recipe, ProductionPlan, AggregatedMaterial, CashflowEntry, CashflowSummary } from '../types';

export const ExportService = {
  // 1. Ekspor SOP Resep Dapur ke PDF
  exportRecipeToPDF: (recipe: Recipe) => {
    const doc = new jsPDF();

    // Brand Header
    doc.setFontSize(18);
    doc.setTextColor(234, 88, 12); // Orange-600
    doc.text('GEASTEATS • NGOLAB', 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('STANDAR OPERASIONAL PROSEDUR (SOP) & FORMULA RESEP', 14, 26);

    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(14, 30, 196, 30);

    // Metadata Menu
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(recipe.menu_name || 'Resep Menu', 14, 39);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    doc.text(`ID Resep: ${recipe.id} | Kategori: ${recipe.category.toUpperCase()} | Kapasitas: ${recipe.portion_yield || 1} Porsi`, 14, 45);

    // Tabel Rincian Biaya Overhead
    const overheadData = [
      ['Biaya Kemasan (Packaging)', `Rp ${(recipe.packaging_cost || 0).toLocaleString('id-ID')}`],
      ['Biaya Gas & Utilitas', `Rp ${(recipe.cooking_gas_cost || 0).toLocaleString('id-ID')}`],
      ['Biaya Tenaga Kerja (Labor)', `Rp ${(recipe.labor_cost || 0).toLocaleString('id-ID')}`],
      ['Total HPP Teoretis per Porsi', `Rp ${(recipe.calculated_hpp || 0).toLocaleString('id-ID')}`],
      ['Harga Jual POS Saat Ini', `Rp ${(recipe.selling_price || 0).toLocaleString('id-ID')}`]
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Komponen Overhead & HPP', 'Nominal']],
      body: overheadData,
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 62, halign: 'right', fontStyle: 'bold' } }
    });

    // Tabel Komposisi Bahan Baku (BOM)
    const ingredientRows = (recipe.ingredients || []).map((ing, idx) => [
      idx + 1,
      ing.ingredient_name || ing.ingredient_id || '-',
      `${ing.quantity_needed} ${ing.unit}`,
      `Rp ${Math.round(ing.cost_per_unit || 0).toLocaleString('id-ID')}`,
      `Rp ${Math.round(ing.subtotal_cost || 0).toLocaleString('id-ID')}`
    ]);

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Komposisi Bahan Baku (Bill of Materials):', 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['No', 'Nama Bahan Baku', 'Takaran Resep', 'Biaya / Satuan', 'Subtotal']],
      body: ingredientRows,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 }, // Indigo-600
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 80 },
        2: { cellWidth: 32, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
      }
    });

    // Footer Dokumen
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Dicetak dari GeastEats Finansial Engine pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} • Halaman ${i} dari ${pageCount}`,
        14,
        287
      );
    }

    doc.save(`SOP_Resep_${(recipe.menu_name || 'menu').replace(/\s+/g, '_')}.pdf`);
  },

  // 2. Ekspor Rencana Batch Produksi & Daftar Belanja Pasar ke Excel (.xlsx) Multi-Sheet
  exportPlanToExcel: (plan: ProductionPlan, shoppingList: AggregatedMaterial[]) => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Rencana Menu & Target Harga
    const menuRows = (plan.items || []).map((it, idx) => ({
      'No': idx + 1,
      'Nama Menu': it.recipe_name || it.recipe_id,
      'Kategori': it.recipe_category || '-',
      'Kuantitas Target': it.quantity,
      'HPP Satuan (Rp)': it.cost_per_unit,
      'Total HPP (Rp)': it.total_cost,
      'Target Margin (%)': `${it.margin_percent}%`,
      'Fee Ojol / Konsinyasi': it.fee_type === 'percent' ? `${it.fee_value}%` : `Rp ${it.fee_value}`,
      'Harga Jual Rekomendasi (Rp)': it.suggested_price,
      'Target Omzet (Rp)': it.total_revenue
    }));
    const wsMenu = XLSX.utils.json_to_sheet(menuRows);
    XLSX.utils.book_append_sheet(wb, wsMenu, 'Rencana Menu');

    // Sheet 2: Daftar Belanja Pasar Gabungan
    const shopRows = shoppingList.map((mat, idx) => ({
      'No': idx + 1,
      'Nama Bahan Baku': mat.name,
      'Kategori': mat.category,
      'Total Kebutuhan Resep': `${mat.total_usage_qty} ${mat.usage_unit}`,
      'Jumlah Beli Pasar': mat.purchase_qty,
      'Satuan Beli': mat.purchase_unit,
      'Harga Beli Satuan (Rp)': mat.unit_price,
      'Estimasi Biaya Belanja (Rp)': mat.estimated_cost,
      'Stok Gudang Saat Ini': mat.current_stock !== undefined ? `${mat.current_stock} ${mat.purchase_unit}` : '-',
      'Rekomendasi Toko / Pasar': mat.source_link || 'Pasar Tradisional / Supplier'
    }));
    const wsShop = XLSX.utils.json_to_sheet(shopRows);
    XLSX.utils.book_append_sheet(wb, wsShop, 'Daftar Belanja Pasar');

    // Sheet 3: Ringkasan Finansial Eksekutif
    const totalProfit = plan.total_revenue - plan.total_cost;
    const effectiveMargin = plan.total_revenue > 0 ? ((totalProfit / plan.total_revenue) * 100).toFixed(1) : '0';
    const summaryRows = [
      { 'Parameter': 'Judul Rencana Produksi', 'Keterangan': plan.title },
      { 'Parameter': 'Tanggal Target', 'Keterangan': plan.plan_date },
      { 'Parameter': 'Status Pelaksanaan', 'Keterangan': plan.status === 'completed' ? 'TERLAKSANA' : 'DRAFT' },
      { 'Parameter': 'Dibuat Oleh', 'Keterangan': plan.created_by || 'Admin' },
      { 'Parameter': '', 'Keterangan': '' },
      { 'Parameter': 'RINGKASAN KEUANGAN BATCH', 'Keterangan': '' },
      { 'Parameter': 'Total Target Omzet Penjualan', 'Keterangan': `Rp ${plan.total_revenue.toLocaleString('id-ID')}` },
      { 'Parameter': 'Total Estimasi Belanja Bahan (HPP)', 'Keterangan': `Rp ${plan.total_cost.toLocaleString('id-ID')}` },
      { 'Parameter': 'Proyeksi Laba Kotor (Gross Profit)', 'Keterangan': `Rp ${totalProfit.toLocaleString('id-ID')}` },
      { 'Parameter': 'Persentase Margin Efektif', 'Keterangan': `${effectiveMargin}%` },
      { 'Parameter': 'Catatan Tambahan', 'Keterangan': plan.notes || '-' }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Batch');

    XLSX.writeFile(wb, `Rencana_Produksi_${plan.title.replace(/\s+/g, '_')}_${plan.plan_date}.xlsx`);
  },

  // 3. Ekspor Rencana Batch Produksi & Belanja ke PDF
  exportPlanToPDF: (plan: ProductionPlan, shoppingList: AggregatedMaterial[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(234, 88, 12);
    doc.text('GEASTEATS • NGOLAB', 14, 18);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`LEMBAR KERJA RENCANA PRODUKSI & DAFTAR BELANJA PASAR`, 14, 25);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Judul: ${plan.title} | Tanggal: ${plan.plan_date} | Status: ${plan.status.toUpperCase()}`, 14, 31);
    doc.line(14, 34, 196, 34);

    // Summary Box Table
    const totalProfit = plan.total_revenue - plan.total_cost;
    const summaryData = [
      [
        `Target Omzet:\nRp ${plan.total_revenue.toLocaleString('id-ID')}`,
        `Total Belanja (HPP):\nRp ${plan.total_cost.toLocaleString('id-ID')}`,
        `Proyeksi Laba Kotor:\nRp ${totalProfit.toLocaleString('id-ID')}`
      ]
    ];
    autoTable(doc, {
      startY: 38,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 10, fontStyle: 'bold', halign: 'center', cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fillColor: [239, 246, 255] }, // blue-50
        1: { fillColor: [255, 247, 237] }, // orange-50
        2: { fillColor: [240, 253, 244] }  // green-50
      }
    });

    // Tabel Target Porsi Menu
    const menuRows = (plan.items || []).map((it, idx) => [
      idx + 1,
      it.recipe_name || it.recipe_id,
      `${it.quantity} Porsi`,
      `Rp ${(it.cost_per_unit || 0).toLocaleString('id-ID')}`,
      `Rp ${(it.suggested_price || 0).toLocaleString('id-ID')}`,
      `Rp ${(it.total_revenue || 0).toLocaleString('id-ID')}`
    ]);

    const finalY1 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Target Produksi Menu:', 14, finalY1);

    autoTable(doc, {
      startY: finalY1 + 3,
      head: [['No', 'Menu', 'Target', 'HPP / Porsi', 'Harga Rekomendasi', 'Target Omzet']],
      body: menuRows,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right' },
        5: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
      }
    });

    // Tabel Daftar Belanja Pasar Gabungan
    const shopRows = shoppingList.map((mat, idx) => [
      idx + 1,
      mat.name,
      mat.category,
      `${mat.purchase_qty} ${mat.purchase_unit}`,
      `Rp ${mat.unit_price.toLocaleString('id-ID')}`,
      `Rp ${mat.estimated_cost.toLocaleString('id-ID')}`,
      mat.source_link || '-'
    ]);

    const finalY2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Daftar Belanja Pasar Gabungan (Shopping List):', 14, finalY2);

    autoTable(doc, {
      startY: finalY2 + 3,
      head: [['No', 'Bahan Baku', 'Kategori', 'Qty Beli Pasar', 'Harga Beli', 'Subtotal', 'Supplier/Toko']],
      body: shopRows,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 26 },
        3: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 24 }
      }
    });

    doc.save(`Rencana_Belanja_${plan.title.replace(/\s+/g, '_')}.pdf`);
  },

  // 4. Ekspor Buku Kas Harian ke Excel
  exportCashflowToExcel: (cashflowList: CashflowEntry[], summary: CashflowSummary) => {
    const wb = XLSX.utils.book_new();

    const rows = cashflowList.map((entry, idx) => ({
      'No': idx + 1,
      'Tanggal': entry.date,
      'Tipe Kas': entry.type === 'income' ? 'KAS MASUK (MODAL)' : 'KAS KELUAR (BELANJA)',
      'Kategori': entry.category,
      'Keterangan Transaksi': entry.description,
      'Nominal (Rp)': entry.amount,
      'Metode Pembayaran': entry.payment_method || 'Kas Operasional',
      'PIC / Penanggung Jawab': entry.pic_name || 'Admin',
      'Catatan': entry.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Kas Belanja');

    // Ringkasan
    const summaryRows = [
      { 'Metrik Kas': 'Total Kas Masuk (Modal)', 'Nominal': summary.total_cash_in },
      { 'Metrik Kas': 'Total Kas Keluar (Belanja)', 'Nominal': summary.total_cash_out },
      { 'Metrik Kas': 'Saldo Kas Berjalan', 'Nominal': summary.balance }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Kas');

    XLSX.writeFile(wb, `Buku_Kas_GeastEats_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};
