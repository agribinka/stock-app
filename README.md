# 📦 Stock Tracker - Client Side Only

Aplikasi manajemen stok barang sederhana yang berjalan 100% di browser, tanpa backend server.

## ✨ Fitur

- ✅ Tambah/Edit/Hapus data barang
- ✅ Catat stok masuk & keluar
- ✅ Kalkulasi stok otomatis
- ✅ 🔍 Pencarian barang
- ✅ 📥 Export ke Excel (.xlsx)
- ✅ 💾 Backup/Restore data JSON
- ✅ 📱 Responsive (mobile-friendly)
- ✅ 🌙 Dark mode support (auto)
- ✅ 📲 PWA: Bisa install di HP

## 🚀 Cara Deploy ke GitHub Pages

1. Fork/clone repository ini
2. Push semua file ke branch `main`
3. Buka repo di GitHub → **Settings** → **Pages**
4. Pilih **Source**: `Deploy from a branch` → Branch: `main` → Folder: `/ (root)`
5. Klik **Save**, tunggu ~1 menit
6. Akses di: `https://USERNAME.github.io/stock-app/`

## 💾 Penyimpanan Data

- Semua data disimpan di **localStorage browser**
- Data **tidak sinkron** antar device/browser
- Gunakan fitur **Backup/Restore** untuk pindah data
- Kapasitas: ~5MB (cukup untuk ribuan record)

## ⚠️ Penting

- Jangan clear browser data/cache jika tidak backup dulu!
- Untuk penggunaan tim dengan sinkronisasi real-time, pertimbangkan backend + database

## 🛠️ Teknologi

- HTML5 + CSS3 + Vanilla JavaScript
- Bootstrap 5 (CDN)
- SheetJS/xlsx (CDN) untuk export Excel
- PWA Manifest + Service Worker

## 📄 Lisensi

MIT License - Bebas digunakan & dimodifikasi

---
Made with ❤️ | Client-side only | No server required
