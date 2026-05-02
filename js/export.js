/**
 * Export Functions - Stock Tracker Pro
 * Requires: SheetJS (xlsx) library loaded via CDN
 */

// === EXPORT DAFTAR BARANG ===
function exportToExcel() {
  if (!appData?.barang?.length) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }
  
  const data = appData.barang.map(b => {
    const { masuk, keluar, jual, pakai, akhir } = calculateStokDetail(b.kode);
    const f = calculateFinance(b.kode);
    return {
      'Kode': b.kode,
      'Nama Barang': b.nama,
      'Satuan': b.satuan,
      'Stok Awal': b.stok_awal,
      'Stok Akhir': akhir,
      'Harga Beli': b.harga_beli,
      'Harga Jual': b.harga_jual || '-',
      'Total Masuk': masuk,
      'Total Terjual': jual,
      'Total Dipakai': pakai,
      'Nilai Aset': f.nilaiAset,
      'Revenue': f.revenue,
      'Profit': f.profit,
      'Status': akhir < CONFIG.MIN_STOK_WARNING ? '⚠️ Rendah' : '✅ Aman'
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 25 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Barang');
  
  const filename = `Stock_Barang_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`📥 "${filename}" berhasil diunduh!`, 'success');
}

// === EXPORT RIWAYAT ===
function exportHistoryToExcel() {
  if (!appData?.history?.length) {
    showToast('Tidak ada riwayat untuk diexport', 'warning');
    return;
  }
  
  const data = appData.history
    .sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal))
    .map(h => {
      const barang = appData.barang.find(b => b.kode === h.id_barang);
      return {
        'Tanggal': formatDate(h.tanggal),
        'Kode': h.id_barang,
        'Barang': barang ? barang.nama : '-',
        'Jenis': h.jenis === 'masuk' ? 'Masuk' : (h.jenis === 'keluar_jual' ? '💰 Jual' : '📦 Pakai'),
        'Jumlah': h.jumlah,
        'Harga Satuan': h.harga_satuan,
        'Total': h.total,
        'Keterangan': h.keterangan || '-'
      };
    });
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat');
  
  const filename = `Stock_History_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`📥 "${filename}" berhasil diunduh!`, 'success');
}

// === EXPORT LAPORAN KEUANGAN LENGKAP ===
function exportFinanceReport() {
  if (!appData?.barang?.length) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }
  
  const total = calculateTotalFinance();
  const margin = total.totalRevenue > 0 ? ((total.totalProfit / total.totalRevenue) * 100).toFixed(2) : 0;
  
  // Sheet 1: Ringkasan
  const summary = [
    ['📊 LAPORAN KEUANGAN - STOCK TRACKER PRO'],
    ['Generated', new Date().toLocaleString('id-ID')],
    [],
    ['RINGKASAN'],
    ['Total Barang', appData.barang.length],
    ['Total Transaksi', appData.history.length],
    ['Nilai Aset (Inventory)', formatRupiah(total.totalAset)],
    ['Total Revenue', formatRupiah(total.totalRevenue)],
    ['Total Modal (COGS)', formatRupiah(total.totalCogs)],
    ['NET PROFIT', formatRupiah(total.totalProfit)],
    ['Profit Margin', `${margin}%`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 25 }];
  
  // Sheet 2: Detail per Barang
  const details = appData.barang.map(b => {
    const f = calculateFinance(b.kode);
    const { jual, akhir } = calculateStokDetail(b.kode);
    const m = f.revenue > 0 ? ((f.profit / f.revenue) * 100).toFixed(1) : 0;
    return {
      'Kode': b.kode,
      'Nama Barang': b.nama,
      'Satuan': b.satuan,
      'Harga Beli': b.harga_beli,
      'Harga Jual': b.harga_jual || '-',
      'Stok Awal': b.stok_awal,
      'Stok Akhir': akhir,
      'Terjual': jual,
      'Revenue': f.revenue,
      'Modal (COGS)': f.cogs,
      'Profit': f.profit,
      'Margin %': m + '%',
      'Nilai Aset': f.nilaiAset
    };
  });
  const wsDetails = XLSX.utils.json_to_sheet(details);
  wsDetails['!cols'] = [
    { wch: 10 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }
  ];
  
  // Sheet 3: Riwayat Transaksi
  const history = appData.history
    .sort((a,b) => new Date(a.tanggal) - new Date(b.tanggal))
    .map(h => {
      const barang = appData.barang.find(b => b.kode === h.id_barang);
      return {
        'Tanggal': formatDate(h.tanggal),
        'Kode': h.id_barang,
        'Barang': barang ? barang.nama : '-',
        'Jenis': h.jenis === 'masuk' ? 'Masuk' : (h.jenis === 'keluar_jual' ? '💰 Jual' : '📦 Pakai'),
        'Jumlah': h.jumlah,
        'Harga Satuan': h.harga_satuan,
        'Total': h.total,
        'Keterangan': h.keterangan || '-'
      };
    });
  const wsHistory = XLSX.utils.json_to_sheet(history);
  wsHistory['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 12 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }
  ];
  
  // Gabungkan semua sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Ringkasan');
  XLSX.utils.book_append_sheet(wb, wsDetails, '📦 Detail Barang');
  XLSX.utils.book_append_sheet(wb, wsHistory, '📜 Riwayat');
  
  const filename = `Laporan_Keuangan_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`📥 "${filename}" berhasil diunduh!`, 'success');
}
