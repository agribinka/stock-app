/**
 * Stock Tracker App - Client Side Only
 * Data stored in localStorage
 */

// === KONFIGURASI ===
const CONFIG = {
  DB_KEY: 'stock_app_data_v1',
  MIN_STOK_WARNING: 5,
  TOAST_DURATION: 3000
};

// === STATE GLOBAL ===
let appData = {
  barang: [],
  history: []
};

// === INISIALISASI ===
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderSummary();
  renderTable();
  renderSelect();
  renderHistory();
  setupEventListeners();
  checkLowStock();
});

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
    showToast('⚠️ Gagal menyimpan data! Storage penuh?', 'error');
  }
}

function clearAllData() {
  localStorage.removeItem(CONFIG.DB_KEY);
  appData = { barang: [], history: [] };
}

// === RENDER FUNCTIONS ===
function renderSummary() {
  const container = document.getElementById('summaryCards');
  
  const totalBarang = appData.barang.length;
  const totalTransaksi = appData.history.length;
  
  const stokRendah = appData.barang.filter(b => {
    const stok = calculateStok(b.kode);
    return stok < CONFIG.MIN_STOK_WARNING;
  }).length;
  
  const totalValue = appData.barang.reduce((sum, b) => {
    // Jika ada field harga, bisa dihitung total nilai stok
    return sum;
  }, 0);

  container.innerHTML = `
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-primary">
        <div class="label">Total Barang</div>
        <div class="value">${totalBarang}</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-success">
        <div class="label">Transaksi</div>
        <div class="value">${totalTransaksi}</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-warning">
        <div class="label">Stok Menipis</div>
        <div class="value">${stokRendah}</div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="summary-card bg-gradient-info">
        <div class="label">Last Update</div>
        <div class="value" style="font-size:1rem">${getRelativeTime()}</div>
      </div>
    </div>
  `;
}

function renderTable(filter = '') {
  const tbody = document.getElementById('tabelBarang');
  const countEl = document.getElementById('countBarang');
  
  // Filter & sort
  let filtered = appData.barang.filter(b => 
    b.nama.toLowerCase().includes(filter.toLowerCase()) ||
    b.kode.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => a.nama.localeCompare(b.nama));
  
  countEl.textContent = filtered.length;
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">' + 
      (filter ? 'Tidak ditemukan' : 'Belum ada data barang') + '</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(b => {
    const { masuk, keluar, akhir } = calculateStokDetail(b.kode);
    const statusClass = akhir < CONFIG.MIN_STOK_WARNING ? 'badge-stok-rendah' : 'badge-stok-aman';
    const statusText = akhir < CONFIG.MIN_STOK_WARNING ? '⚠️ Rendah' : '✅ Aman';
    
    return `
      <tr>
        <td><small class="text-muted">${escapeHtml(b.kode)}</small></td>
        <td><strong>${escapeHtml(b.nama)}</strong></td>
        <td class="d-none d-md-table-cell">${escapeHtml(b.satuan)}</td>
        <td><span class="${statusClass}">${akhir}</span></td>
        <td class="d-none d-md-table-cell">
          <small class="text-success">+${masuk}</small>/<small class="text-danger">-${keluar}</small>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editBarang('${b.kode}')">✏️</button>
          <button class="btn btn-sm btn-outline-danger" onclick="hapusBarang('${b.kode}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSelect() {
  const select = document.getElementById('selectBarang');
  select.innerHTML = '<option value="">-- Pilih Barang --</option>';
  
  appData.barang.sort((a,b) => a.nama.localeCompare(b.nama)).forEach(b => {
    const stok = calculateStok(b.kode);
    select.innerHTML += `<option value="${escapeHtml(b.kode)}">${escapeHtml(b.nama)} (Stok: ${stok})</option>`;
  });
}

function renderHistory() {
  const tbody = document.getElementById('tabelHistory');
  
  // Ambil 20 transaksi terakhir
  const recent = [...appData.history]
    .sort((a,b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 20);
  
  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada transaksi</td></tr>';
    return;
  }
  
  tbody.innerHTML = recent.map(h => {
    const barang = appData.barang.find(b => b.kode === h.id_barang);
    const namaBarang = barang ? barang.nama : h.id_barang;
    const icon = h.jenis === 'masuk' ? '➕' : '➖';
    const colorClass = h.jenis === 'masuk' ? 'text-success' : 'text-danger';
    
    return `
      <tr>
        <td><small>${formatDate(h.tanggal)}</small></td>
        <td><small>${escapeHtml(namaBarang)}</small></td>
        <td>${icon}</td>
        <td class="${colorClass} fw-bold">${h.jumlah}</td>
        <td><small class="text-muted">${escapeHtml(h.keterangan || '-')}</small></td>
      </tr>
    `;
  }).join('');
}

// === CALCULATION FUNCTIONS ===
function calculateStok(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return 0;
  
  const { akhir } = calculateStokDetail(kode);
  return akhir;
}

function calculateStokDetail(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return { masuk: 0, keluar: 0, akhir: 0 };
  
  const masuk = appData.history
    .filter(h => h.id_barang === kode && h.jenis === 'masuk')
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  const keluar = appData.history
    .filter(h => h.id_barang === kode && h.jenis === 'keluar')
    .reduce((sum, h) => sum + h.jumlah, 0);
  
  return {
    masuk,
    keluar,
    akhir: barang.stok_awal + masuk - keluar
  };
}

function checkLowStock() {
  const lowStock = appData.barang.filter(b => calculateStok(b.kode) < CONFIG.MIN_STOK_WARNING);
  if (lowStock.length > 0) {
    // Bisa tambah notifikasi visual
    document.querySelector('header')?.classList.add('border-bottom', 'border-warning');
  }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  // Form Tambah Barang
  document.getElementById('formBarang').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const kode = document.getElementById('kode').value.toUpperCase().trim();
    const nama = document.getElementById('nama').value.trim();
    const satuan = document.getElementById('satuan').value.trim() || 'pcs';
    const stok_awal = parseInt(document.getElementById('stok').value) || 0;
    
    // Validasi
    if (!kode || !nama) {
      showToast('Kode dan Nama wajib diisi!', 'error');
      return;
    }
    
    if (appData.barang.find(b => b.kode === kode)) {
      showToast('Kode barang sudah ada!', 'error');
      return;
    }
    
    // Tambah ke data
    appData.barang.push({
      kode, nama, satuan, stok_awal,
      created: new Date().toISOString()
    });
    
    saveData();
    renderSummary();
    renderTable();
    renderSelect();
    
    // Reset form
    e.target.reset();
    document.getElementById('kode').focus();
    
    showToast('✅ Barang berhasil ditambahkan!', 'success');
  });
  
  // Form Update Stok
  document.getElementById('formStok').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const id_barang = document.getElementById('selectBarang').value;
    const jenis = document.getElementById('jenisStok').value;
    const jumlah = parseInt(document.getElementById('jumlahStok').value);
    const keterangan = document.getElementById('keterangan').value.trim();
    
    if (!id_barang) {
      showToast('Pilih barang dulu!', 'error');
      return;
    }
    
    if (jenis === 'keluar') {
      const stokSekarang = calculateStok(id_barang);
      if (jumlah > stokSekarang) {
        showToast(`Stok tidak cukup! Tersedia: ${stokSekarang}`, 'error');
        return;
      }
    }
    
    // Catat history
    appData.history.push({
      id: Date.now(),
      id_barang,
      jenis,
      jumlah,
      keterangan,
      tanggal: new Date().toISOString()
    });
    
    saveData();
    renderSummary();
    renderTable();
    renderHistory();
    
    e.target.reset();
    showToast(`✅ Stok ${jenis === 'masuk' ? 'bertambah' : 'berkurang'} ${jumlah}!`, 'success');
  });
  
  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderTable(e.target.value);
  });
  
  // Backup Data
  document.getElementById('btnBackup').addEventListener('click', backupData);
  
  // Restore Data
  document.getElementById('btnRestore').addEventListener('click', () => {
    document.getElementById('fileRestore').click();
  });
  
  document.getElementById('fileRestore').addEventListener('change', restoreData);
  
  // Clear All (with confirmation)
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (confirm('⚠️ Hapus SEMUA data? Aksi ini tidak bisa dibatalkan!')) {
      if (confirm('Benar-benar yakin? Data akan hilang permanen.')) {
        clearAllData();
        renderSummary();
        renderTable();
        renderSelect();
        renderHistory();
        showToast('🗑️ Semua data dihapus', 'info');
      }
    }
  });
  
  // Clear History Only
  document.getElementById('btnClearHistory').addEventListener('click', () => {
    if (confirm('Hapus riwayat transaksi saja? Data barang tetap ada.')) {
      appData.history = [];
      saveData();
      renderSummary();
      renderHistory();
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
  a.download = `stock_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 Backup berhasil diunduh!', 'success');
}

function restoreData(e) {
  const file = e.target.files[0];
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
        renderSummary();
        renderTable();
        renderSelect();
        renderHistory();
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
  const titleEl = document.getElementById('toastTitle');
  const msgEl = document.getElementById('toastMessage');
  
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const titles = { success: 'Berhasil', error: 'Error', info: 'Info', warning: 'Peringatan' };
  
  titleEl.textContent = `${icons[type] || 'ℹ️'} ${titles[type] || 'Notifikasi'}`;
  msgEl.textContent = message;
  
  // Update toast color based on type
  toastEl.className = `toast ${type === 'error' ? 'text-bg-danger' : type === 'success' ? 'text-bg-success' : 'text-bg-light'}`;
  
  const toast = new bootstrap.Toast(toastEl, { delay: CONFIG.TOAST_DURATION });
  toast.show();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('id-ID', { 
    day: '2-digit', month: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  });
}

function getRelativeTime() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function editBarang(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return;
  
  const namaBaru = prompt('Edit nama barang:', barang.nama);
  if (namaBaru && namaBaru.trim() && namaBaru.trim() !== barang.nama) {
    barang.nama = namaBaru.trim();
    saveData();
    renderTable();
    renderSelect();
    showToast('✅ Nama barang diupdate', 'success');
  }
}

// Global functions for onclick handlers
window.hapusBarang = function(kode) {
  const barang = appData.barang.find(b => b.kode === kode);
  if (!barang) return;
  
  if (!confirm(`Hapus "${barang.nama}" (${kode})?\n\n⚠️ Semua riwayat stok barang ini juga akan terhapus.`)) {
    return;
  }
  
  appData.barang = appData.barang.filter(b => b.kode !== kode);
  appData.history = appData.history.filter(h => h.id_barang !== kode);
  
  saveData();
  renderSummary();
  renderTable();
  renderSelect();
  renderHistory();
  showToast('🗑️ Barang dihapus', 'info');
};

window.editBarang = editBarang;
