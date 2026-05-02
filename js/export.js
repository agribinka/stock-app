/**
 * Export Functions - SheetJS (xlsx)
 * https://sheetjs.com/
 */

// === EXPORT DAFTAR BARANG ===
function exportToExcel() {
  if (appData.barang.length === 0) {
    showToast('Tidak ada data untuk diexport', 'warning');
    return;
  }
  
  // Prepare data
  const data = appData.barang.map(b => {
    const { masuk, keluar, akhir } = calculateStokDetail(b.kode);
    return {
      'Kode': b.kode,
      'Nama Barang': b.nama,
      'Satuan': b.satuan,
      'Stok Awal': b.stok_awal,
      'Total Masuk': masuk,
      'Total Keluar': keluar,
      'Stok Akhir': akhir,
      'Status': akhir < CONFIG.MIN_STOK_WARNING ? '⚠️ Rendah' : '✅ Aman',
      'Dibuat': formatDate(b.created)
    };
  });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
  ];
  
  // Header styling (via cell properties)
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "4CAF50" } },
      alignment: { horizontal: "center" }
    };
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Barang');
  
  // Add summary sheet
  const summaryData = [
    ['📊 RINGKASAN STOK'],
    ['Total Barang', appData.barang.length],
    ['Total Transaksi', appData.history.length],
    ['Stok Menipis', appData.barang.filter(b => calculateStok(b.kode) < CONFIG.MIN_STOK_WARNING).length],
    [],
    ['Terakhir Update', new Date().toLocaleString('id-ID')]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
  
  // Download
  const filename = `Stock_Report_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  
  showToast(`📥 "${filename}" berhasil diunduh!`, 'success');
}

// === EXPORT RIWAYAT TRANSAKSI ===
function exportHistoryToExcel() {
  if (appData.history.length === 0) {
    showToast('Tidak ada riwayat untuk diexport', 'warning');
    return;
  }
  
  // Prepare data
  const data = appData.history
    .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
    .map(h => {
      const barang = appData.barang.find(b => b.kode === h.id_barang);
      return {
        'Tanggal': formatDate(h.tanggal),
        'Kode Barang': h.id_barang,
        'Nama Barang': barang ? barang.nama : '-',
        'Jenis': h.jenis === 'masuk' ? '➕ Masuk' : '➖ Keluar',
        'Jumlah': h.jumlah,
        'Keterangan': h.keterangan || '-',
        'Stok Setelah': calculateStok(h.id_barang)
      };
    });
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 10 },
    { wch: 8 }, { wch: 20 }, { wch: 12 }
  ];
  
  // Header styling
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, sz: 11 },
      fill: { fgColor: { rgb: "2196F3" } },
      alignment: { horizontal: "center" }
    };
  }
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Transaksi');
  
  // Download
  const filename = `Stock_History_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
  
  showToast(`📥 "${filename}" berhasil diunduh!`, 'success');
}

// === SETUP EXPORT BUTTONS ===
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnExport')?.addEventListener('click', exportToExcel);
  document.getElementById('btnExportHistory')?.addEventListener('click', exportHistoryToExcel);
});
