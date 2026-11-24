# KIB Digital KKMP — Kota Ternate

Frontend statis Sistem Informasi Kartu Inventaris Barang (KIB B) Koperasi Kelurahan Merah Putih Kota Ternate.

- **Frontend:** HTML, CSS, dan JavaScript murni, di-hosting di GitHub Pages
- **Backend:** Google Apps Script Web App (REST API JSON) dengan database Google Sheets dan foto di Google Drive

## Struktur

```
index.html        Halaman aplikasi (login, dashboard admin, halaman publik hasil scan)
css/style.css     Tampilan
js/config.js      URL backend (GAS_URL) — wajib diisi
js/app.js         Logika aplikasi, memanggil backend lewat fetch()
```

## Konfigurasi

Isi `GAS_URL` di `js/config.js` dengan URL Web App Apps Script yang berakhiran `/exec`.

Panduan lengkap: [PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md)

© 2026 PMO Kartu Inventaris Barang, Koperasi Kelurahan Merah Putih Kota Ternate.
