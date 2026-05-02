/**
 * Stock Tracker Pro - Client Side Only + Financial Features
 * Data stored in localStorage
 * Features: Harga Beli/Jual, Profit Calculation, Financial Reports
 */

// === KONFIGURASI ===
const CONFIG = {
  DB_KEY: 'stock_app_pro_v1',      // Updated key for Pro version
  DB_KEY_OLD: 'stock_app_data_v1', // For migration
  MIN_STOK_WARNING: 5,
  TOAST_DURATION: 3000,
  CURRENCY: 'IDR'
};

// === STATE GLOBAL ===
let appData = {
  barang: [],    // {kode, nama, satuan, stok_awal, harga_beli, harga_jual, created}
  history: []    // {id, id_barang, jenis, jumlah, harga_satuan, total, keterangan, tanggal}
};

// === HELPER: FORMAT CURRENCY ===
function formatRupiah(angka, prefix = 'Rp ') {
  if (angka === null || angka === undefined || isNaN(angka)) return '-';
  const num = Math.abs(parseInt(angka));
  const negative = angka < 0 ? '-' : '';
  return negative + prefix + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseRupiah(str) {
  if (!str) return 0;
  return parseInt(str.toString().replace(/[^0-9-]/g, '')) || 0;
}

// === INISIALISASI ===
document.addEventListener('DOMContentLoaded', () => {
  // Auto-migrate old data if exists
  migrateOldData();
  
  loadData();
  renderAll();
  setupEventListeners();
});

// === MIGRATION: Old → Pro ===
function migrateOldData() {
  const oldRaw = localStorage.getItem(CONFIG.DB_KEY_OLD);
  const newRaw = localStorage.getItem(CONFIG.DB_KEY);
  
  // Jika sudah ada data Pro, skip migrasi
  if (newRaw) return;
  
  if (oldRaw) {
    try {
      const old = JSON.parse(oldRaw);
      if (old?.barang) {
        // Tambah field harga default
        const newBarang = old.barang.map(b => ({
          ...b,
          harga_beli: b.harga_beli || 0,
          harga_jual: b.harga_jual || 0
        }));
        
        // Update history dengan field total
        const newHistory = (old.history || []).map(h => ({
          ...h,
          harga_satuan: h.harga_satuan || 0,
          total: h.total || 0
        }));
        
        // Simpan ke key baru
        localStorage.setItem(CONFIG.DB_KEY, JSON.stringify({
          barang: newBarang,
          history: newHistory
        }));
        
        // Hapus old key (opsional)
        // localStorage.removeItem(CONFIG.DB_KEY_OLD);
        
        console.log('✅ Data lama berhasil dimigrasi ke versi Pro');
      }
    } catch (e) {
      console.error('❌ Gagal migrasi data:', e);
    }
  }
}

// === LOCALSTORAGE FUNCTIONS ===
function loadData() {
  try {
    const raw = localStorage.getItem(CONFIG.DB_KEY);
    appData = raw ? JSON.parse(raw) : { barang: [], history: [] };
  } catch (e) {
    console.error('Gagal load data:', e);
    showToast('⚠️ Gagal memuat data', 'error');
    appData = { barang: [], history: [] };
  }
}

function saveData() {
  try {
    localStorage.setItem(CONFIG.DB_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('Gagal simpan data:', e);
    showToast('⚠️ Gagal menyimpan! Storage penuh?', 'error');
  }
}

function clearAllData() {
  localStorage.removeItem(CONFIG.DB_KEY);
  appData = { barang: [], history: [] };
}

// === CALCULATION: STOK ===
function calculateStok(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return 0;
  return calculateStokDetail(kode).akhir;
}

function calculateStokDetail(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return { masuk: 0, keluar: 0, jual: 0, pakai: 0, akhir: 0 };
  
  const masuk = appData.history
    .filter(h => h.id_barang === kode && h.jenis === 'masuk')
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  const keluar = appData.history
    .filter(h => h.id_barang === kode && h.jenis.startsWith('keluar'))
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  const jual = appData.history
    .filter(h => h.id_barang === kode && h.jenis === 'keluar_jual')
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  const pakai = appData.history
    .filter(h => h.id_barang === kode && h.jenis === 'keluar_pakai')
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  return {
    masuk, keluar, jual, pakai,
    akhir: barang.stok_awal + masuk - keluar
  };
}

// === CALCULATION: FINANCE ===
function calculateFinance(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return { nilaiAset: 0, revenue: 0, cogs: 0, profit: 0, stokAkhir: 0, jual: 0 };
  
  const { jual, pakai, akhir } = calculateStokDetail(kode);
  const hargaBeli = barang.harga_beli || 0;
  const hargaJual = barang.harga_jual || 0;
  
  // Nilai aset = stok akhir × harga beli
  const nilaiAset = akhir * hargaBeli;
  
  // Revenue = terjual × harga jual
  const revenue = jual * hargaJual;
  
  // COGS = terjual × harga beli
  const cogs = jual * hargaBeli;
  
  // Profit = revenue - cogs
  const profit = revenue - cogs;
  
  return { nilaiAset, revenue, cogs, profit, stokAkhir: akhir, jual };
}

function calculateTotalFinance() {
  let totalAset = 0, totalRevenue = 0, totalCogs = 0, totalProfit = 0;
  
  appData.barang.forEach(b => {
    const f = calculateFinance(b.kode);
    totalAset += f.nilaiAset;
    totalRevenue += f.revenue;
    totalCogs += f.cogs;
    totalProfit += f.profit;
  });
  
  return { totalAset, totalRevenue, totalCogs, totalProfit };
}

// === RENDER: SUMMARY CARDS ===
function renderSummary() {
  const container = document.getElementById('summaryCards');
  if (!container) return;
  
  const finance = calculateTotalFinance();
  const totalBarang = appData.barang.length;
  const totalTransaksi = appData.history.length;
  
  const stokRendah = appData.barang.filter(b => {
    const stok = calculateStok(b.kode);
    return stok < CONFIG.MIN_STOK_WARNING;
  }).length;
  
  const profitClass = finance.totalProfit >= 0 ? 'text-success' : 'text-danger';
  const profitIcon = finance.totalProfit >= 0 ? '📈' : '📉';
  const profitBg = finance.totalProfit >= 0 ? 'bg-gradient-success' : 'bg-gradient-danger';
  
  container.innerHTML = `
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-primary">
        <div class="label">Total Barang</div>
        <div class="value">${totalBarang}</div>
        <small>${stokRendah} stok menipis</small>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-info">
        <div class="label">💰 Nilai Aset</div>
        <div class="value text-currency" style="font-size:1.1rem">${formatRupiah(finance.totalAset)}</div>
        <small>Stok × Harga Beli</small>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-warning">
        <div class="label">💵 Revenue</div>
        <div class="value text-currency" style="font-size:1.1rem">${formatRupiah(finance.totalRevenue)}</div>
        <small>Dari penjualan</small>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card ${profitBg}">
        <div class="label">${profitIcon} Profit</div>
        <div class="value ${profitClass} text-currency" style="font-size:1.1rem">${formatRupiah(finance.totalProfit)}</div>
        <small>Revenue - Modal</small>
      </div>
    </div>
  `;
}

// === RENDER: TABLE BARANG ===
function renderTable(filter = '') {
  const tbody = document.getElementById('tabelBarang');
  const countEl = document.getElementById('countBarang');
  if (!tbody) return;
  
  // Filter & sort
  let filtered = appData.barang.filter(b => 
    b.nama.toLowerCase().includes(filter.toLowerCase()) ||
    b.kode.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => a.nama.localeCompare(b.nama));
  
  if (countEl) countEl.textContent = filtered.length;
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">' + 
      (filter ? 'Tidak ditemukan' : 'Belum ada data barang') + '</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(b => {
    const { akhir, jual } = calculateStokDetail(b.kode);
    const f = calculateFinance(b.kode);
    const statusClass = akhir < CONFIG.MIN_STOK_WARNING ? 'badge-loss' : 'badge-profit';
    const statusText = akhir < CONFIG.MIN_STOK_WARNING ? '⚠️ Rendah' : '✅ Aman';
    
    return `
      <tr>
        <td><small class="text-muted">${escapeHtml(b.kode)}</small></td>
        <td>
          <strong>${escapeHtml(b.nama)}</strong><br>
          <small class="text-muted">Beli: ${formatRupiah(b.harga_beli)} | Jual: ${formatRupiah(b.harga_jual || 0)}</small>
        </td>
        <td class="d-none d-md-table-cell">${escapeHtml(b.satuan)}</td>
        <td><span class="${statusClass}">${akhir}</span></td>
        <td class="d-none d-lg-table-cell text-currency">
          <small>${formatRupiah(b.harga_beli)}</small>
        </td>
        <td class="d-none d-lg-table-cell fw-bold text-currency">${formatRupiah(f.nilaiAset)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editBarang('${b.kode}')">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="hapusBarang('${b.kode}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// === RENDER: SELECT DROPDOWN ===
function renderSelect() {
  const select = document.getElementById('selectBarang');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Pilih Barang --</option>';
  
  appData.barang.sort((a,b) => a.nama.localeCompare(b.nama)).forEach(b => {
    const stok = calculateStok(b.kode);
    const hargaInfo = b.harga_jual ? ` | Jual: ${formatRupiah(b.harga_jual)}` : '';
    select.innerHTML += `<option value="${escapeHtml(b.kode)}">${escapeHtml(b.nama)} (Stok: ${stok})${hargaInfo}</option>`;
  });
}

// === RENDER: FINANCE REPORT ===
function renderFinanceReport() {
  const container = document.getElementById('financeReport');
  if (!container) return;
  
  const total = calculateTotalFinance();
  const margin = total.totalRevenue > 0 ? ((total.totalProfit / total.totalRevenue) * 100).toFixed(1) : 0;
  
  // Top 5 barang paling profit
  const topProfit = appData.barang
    .map(b => ({ ...b, ...calculateFinance(b.kode) }))
    .filter(f => f.jual > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);
  
  container.innerHTML = `
    <div class="col-md-8">
      <div class="table-responsive">
        <table class="table table-sm mb-0">
          <thead>
            <tr>
              <th>Barang</th>
              <th>Terjual</th>
              <th>Revenue</th>
              <th>Modal</th>
              <th>Profit</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            ${topProfit.length > 0 ? topProfit.map(f => {
              const m = f.revenue > 0 ? ((f.profit / f.revenue) * 100).toFixed(1) : 0;
              const color = f.profit >= 0 ? 'text-success' : 'text-danger';
              const badge = f.profit >= 0 ? 'badge-profit' : 'badge-loss';
              return `
                <tr class="finance-row ${f.profit >= 0 ? 'profit' : 'loss'}">
                  <td><small><strong>${escapeHtml(f.nama)}</strong></small></td>
                  <td>${f.jual}</td>
                  <td class="text-currency">${formatRupiah(f.revenue)}</td>
                  <td class="text-currency">${formatRupiah(f.cogs)}</td>
                  <td class="${color} fw-bold text-currency">${formatRupiah(f.profit)}</td>
                  <td><span class="${badge}">${m}%</span></td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="6" class="text-center py-3 text-muted">Belum ada data penjualan</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card bg-light h-100">
        <div class="card-body">
          <h6 class="card-title mb-3">📊 Ringkasan Keuangan</h6>
          <ul class="list-unstyled mb-0 small">
            <li class="d-flex justify-content-between py-1">
              <span>Total Revenue:</span>
              <strong class="text-currency">${formatRupiah(total.totalRevenue)}</strong>
            </li>
            <li class="d-flex justify-content-between py-1">
              <span>Total Modal (COGS):</span>
              <strong class="text-currency">${formatRupiah(total.totalCogs)}</strong>
            </li>
            <li class="d-flex justify-content-between border-top pt-2 mt-2">
              <span><strong>Net Profit:</strong></span>
              <strong class="${total.totalProfit >= 0 ? 'text-success' : 'text-danger'} text-currency">
                ${formatRupiah(total.totalProfit)}
              </strong>
            </li>
            <li class="d-flex justify-content-between py-1">
              <span>Profit Margin:</span>
              <strong>${margin}%</strong>
            </li>
            <li class="d-flex justify-content-between py-1">
              <span>Nilai Inventory:</span>
              <strong class="text-currency">${formatRupiah(total.totalAset)}</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

// === RENDER: HISTORY ===
function renderHistory() {
  const tbody = document.getElementById('tabelHistory');
  if (!tbody) return;
  
  // Ambil 20 transaksi terakhir
  const recent = [...appData.history]
    .sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 20);
  
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-3 text-muted">Belum ada transaksi</td></tr>';
    return;
  }
  
  tbody.innerHTML = recent.map(h => {
    const barang = appData.barang.find(b => b.kode === h.id_barang);
    const namaBarang = barang ? barang.nama : h.id_barang;
    
    let icon = '➖', colorClass = 'text-danger', label = 'Keluar';
    if (h.jenis === 'masuk') { icon = '➕'; colorClass = 'text-success'; label = 'Masuk'; }
    if (h.jenis === 'keluar_jual') { icon = '💰'; colorClass = 'text-primary'; label = 'Jual'; }
    if (h.jenis === 'keluar_pakai') { icon = '📦'; colorClass = 'text-secondary'; label = 'Pakai'; }
    
    return `
      <tr>
        <td><small>${formatDate(h.tanggal)}</small></td>
        <td><small>${escapeHtml(namaBarang)}</small></td>
        <td>${icon} ${label}</td>
        <td class="${colorClass} fw-bold">${h.jumlah}</td>
        <td class="text-currency"><small>${formatRupiah(h.total || 0)}</small></td>
        <td><small class="text-muted">${escapeHtml(h.keterangan || '-')}</small></td>
      </tr>
    `;
  }).join('');
}

// === RENDER ALL ===
function renderAll() {
  renderSummary();
  renderTable();
  renderSelect();
  renderHistory();
  renderFinanceReport();
  checkLowStock();
}

// === CHECK LOW STOCK ===
function checkLowStock() {
  const lowStock = appData.barang.filter(b => calculateStok(b.kode) < CONFIG.MIN_STOK_WARNING);
  const header = document.querySelector('header');
  if (header) {
    if (lowStock.length > 0) {
      header.classList.add('border-bottom', 'border-warning');
    } else {
      header.classList.remove('border-bottom', 'border-warning');
    }
  }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  // Form Tambah Barang (dengan harga)
  const formBarang = document.getElementById('formBarang');
  if (formBarang) {
    formBarang.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const barang = {
        kode: document.getElementById('kode').value.toUpperCase().trim(),
        nama: document.getElementById('nama').value.trim(),
        satuan: document.getElementById('satuan').value.trim() || 'pcs',
        stok_awal: parseInt(document.getElementById('stok').value) || 0,
        harga_beli: parseInt(document.getElementById('hargaBeli').value) || 0,
        harga_jual: parseInt(document.getElementById('hargaJual').value) || 0,
        created: new Date().toISOString()
      };
      
      if (!barang.kode || !barang.nama || !barang.harga_beli) {
        showToast('Kode, Nama, dan Harga Beli wajib diisi!', 'error');
        return;
      }
      
      if (appData.barang.find(b => b.kode === barang.kode)) {
        showToast('Kode barang sudah ada!', 'error');
        return;
      }
      
      appData.barang.push(barang);
      saveData();
      renderAll();
      e.target.reset();
      document.getElementById('kode')?.focus();
      showToast('✅ Barang berhasil ditambahkan!', 'success');
    });
  }
  
  // Form Update Stok (dengan tipe transaksi)
  const formStok = document.getElementById('formStok');
  if (formStok) {
    formStok.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const id_barang = document.getElementById('selectBarang').value;
      const jenis = document.getElementById('jenisStok').value;
      const jumlah = parseInt(document.getElementById('jumlahStok').value);
      const keterangan = document.getElementById('keterangan').value.trim();
      
      if (!id_barang) { showToast('Pilih barang dulu!', 'error'); return; }
      
      const barang = appData.barang.find(b => b.kode === id_barang);
      if (!barang) return;
      
      // Validasi stok untuk keluar
      if (jenis.startsWith('keluar')) {
        const stokSekarang = calculateStokDetail(id_barang).akhir;
        if (jumlah > stokSekarang) {
          showToast(`Stok tidak cukup! Tersedia: ${stokSekarang}`, 'error');
          return;
        }
      }
      
      // Hitung total berdasarkan jenis
      let total = 0;
      let harga_satuan = barang.harga_beli;
      
      if (jenis === 'masuk') {
        total = jumlah * barang.harga_beli;
      } else if (jenis === 'keluar_jual') {
        harga_satuan = barang.harga_jual || barang.harga_beli;
        total = jumlah * harga_satuan;
      } else if (jenis === 'keluar_pakai') {
        total = jumlah * barang.harga_beli; // Hanya untuk catatan modal
      }
      
      // Catat history
      appData.history.push({
        id: Date.now(),
        id_barang,
        jenis,
        jumlah,
        harga_satuan,
        total,
        keterangan,
        tanggal: new Date().toISOString()
      });
      
      saveData();
      renderAll();
      e.target.reset();
      
      const label = jenis === 'masuk' ? 'bertambah' : (jenis === 'keluar_jual' ? 'terjual' : 'dipakai');
      const extra = jenis === 'keluar_jual' ? ` 💰 ${formatRupiah(total)}` : '';
      showToast(`✅ Stok ${label} ${jumlah}!${extra}`, 'success');
    });
  }
  
  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderTable(e.target.value);
    });
  }
  
  // Export buttons
  document.getElementById('btnExport')?.addEventListener('click', () => {
    if (typeof exportToExcel === 'function') exportToExcel();
  });
  document.getElementById('btnExportHistory')?.addEventListener('click', () => {
    if (typeof exportHistoryToExcel === 'function') exportHistoryToExcel();
  });
  document.getElementById('btnExportFinance')?.addEventListener('click', () => {
    if (typeof exportFinanceReport === 'function') exportFinanceReport();
  });
  
  // Backup/Restore
  document.getElementById('btnBackup')?.addEventListener('click', backupData);
  document.getElementById('btnRestore')?.addEventListener('click', () => {
    document.getElementById('fileRestore')?.click();
  });
  document.getElementById('fileRestore')?.addEventListener('change', restoreData);
  
  // Clear All
  document.getElementById('btnClearAll')?.addEventListener('click', () => {
    if (confirm('⚠️ Hapus SEMUA data? Aksi ini tidak bisa dibatalkan!') && 
        confirm('Benar-benar yakin? Data akan hilang permanen.')) {
      clearAllData();
      renderAll();
      showToast('🗑️ Semua data dihapus', 'info');
    }
  });
  
  // Clear History Only
  document.getElementById('btnClearHistory')?.addEventListener('click', () => {
    if (confirm('Hapus riwayat saja? Data barang tetap.')) {
      appData.history = [];
      saveData();
      renderSummary();
      renderHistory();
      renderFinanceReport();
      showToast('🗑️ Riwayat dihapus', 'info');
    }
  });
}

// === EXPORT/IMPORT FUNCTIONS ===
function backupData() {
  const dataStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_backup_pro_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Backup berhasil diunduh!', 'success');
}

function restoreData(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const restored = JSON.parse(event.target.result);
      if (!restored.barang || !restored.history) {
        throw new Error('Format file tidak valid');
      }
      
      if (confirm(`⚠️ Data saat ini akan ditimpa dengan backup.\n\nBarang: ${restored.barang.length}\nTransaksi: ${restored.history.length}\n\nLanjutkan?`)) {
        appData = restored;
        saveData();
        renderAll();
        showToast('✅ Data berhasil dipulihkan!', 'success');
      }
    } catch (err) {
      showToast('❌ File backup tidak valid!', 'error');
      console.error(err);
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // Reset input
}

// === UTILITY FUNCTIONS ===
function showToast(message, type = 'info') {
  const toastEl = document.getElementById('liveToast');
  if (!toastEl) { alert(message); return; }
  
  const titleEl = document.getElementById('toastTitle');
  const msgEl = document.getElementById('toastMessage');
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const titles = { success: 'Berhasil', error: 'Error', info: 'Info', warning: 'Peringatan' };
  
  titleEl.textContent = `${icons[type] || 'ℹ️'} ${titles[type] || 'Notifikasi'}`;
  msgEl.textContent = message;
  
  toastEl.className = `toast ${type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : 'text-bg-light'}`;
  
  const toast = new bootstrap.Toast(toastEl, { delay: CONFIG.TOAST_DURATION });
  toast.show();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit' 
  });
}

function getRelativeTime() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// === EDIT & DELETE ===
function editBarang(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return;
  
  const namaBaru = prompt('✏️ Edit nama barang:', barang.nama);
  const hargaJualBaru = prompt('✏️ Edit harga jual (kosongkan untuk tidak ubah):', barang.harga_jual || '');
  
  let updated = false;
  if (namaBaru && namaBaru.trim() && namaBaru.trim() !== barang.nama) {
    barang.nama = namaBaru.trim();
    updated = true;
  }
  if (hargaJualBaru !== null && hargaJualBaru.trim() !== '') {
    const parsed = parseInt(hargaJualBaru.replace(/[^0-9]/g, ''));
    if (!isNaN(parsed)) {
      barang.harga_jual = parsed;
      updated = true;
    }
  }
  
  if (updated) {
    saveData();
    renderAll();
    showToast('✅ Data barang diupdate', 'success');
  }
}

// Global functions for onclick handlers
window.hapusBarang = function(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return;
  
  if (!confirm(`Hapus "${barang.nama}" (${kode})?\n\n⚠️ Semua riwayat transaksi barang ini juga akan terhapus.`)) {
    return;
  }
  
  appData.barang = appData.barang.filter(b => b.kode !== kode);
  appData.history = appData.history.filter(h => h.id_barang !== kode);
  
  saveData();
  renderAll();
  showToast('🗑️ Barang dihapus', 'info');
};

window.editBarang = editBarang;
