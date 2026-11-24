# Panduan Instalasi — KIB Digital KKMP (Backend GAS + Frontend GitHub Pages)

Setelah migrasi, aplikasi terbagi menjadi dua bagian:

| Bagian | Isi | Tempat |
|---|---|---|
| **Backend** | `Kode.gs` (REST API JSON) | Google Apps Script, terhubung ke spreadsheet database Anda |
| **Frontend** | `index.html`, `css/`, `js/` | GitHub Pages (`https://USERNAME.github.io/NAMA-REPO/`) |

Frontend memanggil backend dengan `fetch()`. Data, akun, foto, dan log tetap tersimpan di spreadsheet dan folder Drive yang sama seperti sebelumnya.

---

## A. Backend — Google Apps Script

1. Buka **spreadsheet database KIB Digital KKMP** yang sudah Anda pakai → menu **Ekstensi → Apps Script**.
2. Buka file `Code.gs`, hapus seluruh isinya, lalu tempel seluruh isi **`Kode.gs`**. Simpan (Ctrl+S).
3. File `Index`, `Style`, dan `Script` (HTML) sudah tidak dipakai. Boleh dihapus: klik titik tiga di samping nama file → **Hapus**.
4. Pilih fungsi **`setupAppEnvironment`** di dropdown → klik **▶ Jalankan**. Izinkan akses bila diminta.
   - Fungsi ini menyimpan ID spreadsheet dan folder Drive ke **Properti skrip**, lalu membuat sheet **AppConfig** berisi catatan ID.
   - Aman dijalankan ulang: data yang sudah ada tidak dihapus atau diduplikasi.
   - Buka **Eksekusi** dan pastikan muncul `✅ Setup selesai.`
5. **Deploy → Kelola deployment → ✏️ Edit**:
   - Versi: **Versi baru**
   - Jalankan sebagai: **Saya (Me)**
   - Yang memiliki akses: **Siapa saja (Anyone)**
   - Klik **Deploy**, lalu **salin URL Web App** yang berakhiran `/exec`.

   > Memakai *Edit* pada deployment lama membuat URL `/exec` tetap sama, jadi QR Code yang sudah tercetak tetap berlaku (lihat bagian C).

6. Cek cepat: buka `URL/exec?action=identitas` di browser. Harus tampil teks JSON seperti
   `{"ok":true,"data":{"namaAplikasi":"KIB Digital KKMP","namaInstansi":"Kota Ternate"}}`.

---

## B. Frontend — GitHub Pages

### B1. Siapkan folder

1. Ekstrak ZIP `kib-digital-kkmp.zip`. Folder hasil ekstraksi berisi:

   ```
   kib-digital-kkmp\        ← folder ini yang nanti di-"git init"
   ├── index.html
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   ├── css\
   │   └── style.css
   └── js\
       ├── config.js
       └── app.js
   ```

   > Kalau setelah ekstrak ada folder `kib-digital-kkmp` di dalam folder `kib-digital-kkmp`, masuk ke folder yang **langsung berisi `index.html`**.

2. Buka `js\config.js` dengan Notepad, lalu ganti `https://script.google.com/macros/s/XXXX/exec` dengan URL `/exec` dari langkah A5. Simpan.

### B2. Install Git & identitas (sekali saja per komputer)

1. Unduh dan install Git: https://git-scm.com/download/win (pakai pengaturan default).
2. Buka **PowerShell**, lalu jalankan:
   ```powershell
   git --version
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```

### B3. Buat repository di GitHub

1. Masuk ke https://github.com, klik **+ → New repository**.
2. Nama: misalnya `kib-digital-kkmp`. Pilih **Public**.
3. **Jangan** centang README, .gitignore, atau license. Klik **Create repository**.

### B4. Kirim (push) file ke GitHub

1. Buka folder `kib-digital-kkmp` di File Explorer. Klik address bar, ketik `powershell`, lalu Enter.
2. Pastikan Anda berada di folder yang benar:
   ```powershell
   dir
   ```
   Harus terlihat `index.html`, `css`, dan `js`. **Jangan lanjut kalau belum.**
3. Jalankan satu per satu:
   ```powershell
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/kib-digital-kkmp.git
   git push -u origin main
   ```
4. Saat diminta **Password**, tempel **Personal Access Token**, bukan password akun:
   - Buat token di https://github.com/settings/tokens → **Generate new token (classic)** → centang **repo** → **Generate**. Salin token `ghp_...` (hanya tampil sekali).
   - Saat menempel token, layar terminal **tetap kosong**. Itu normal. Tekan Enter.
   - Push berhasil bila muncul `Writing objects: 100%` dan `* [new branch] main -> main`.

### B5. Aktifkan GitHub Pages

1. Buka repository → **Settings → Pages**.
2. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)** → **Save**.
3. Centang **Enforce HTTPS**. Ini wajib karena kamera untuk scan QR hanya berjalan di HTTPS.
4. Tunggu 1–2 menit. Muncul: *Your site is live at `https://USERNAME.github.io/kib-digital-kkmp/`*.

---

## C. Setelah situs online (penting)

1. Kembali ke Apps Script → **⚙️ Setelan project → Properti skrip → Tambahkan properti skrip**:
   - Properti: `FRONTEND_URL`
   - Nilai: `https://USERNAME.github.io/kib-digital-kkmp/` (pakai `/` di akhir)
   - Klik **Simpan properti skrip**. Tidak perlu deploy ulang.
2. Fungsi `FRONTEND_URL`:
   - QR Code lokasi dan barcode barang yang dibuat sesudahnya akan berisi alamat GitHub Pages.
   - QR Code atau stiker **lama** yang masih berisi alamat `script.google.com/.../exec?p=...` otomatis dialihkan ke GitHub Pages.
3. Disarankan mengunduh atau mencetak ulang poster QR Lokasi dan stiker barcode secara bertahap, agar langsung membuka GitHub Pages tanpa pengalihan.
4. Buka situs → login → cek Dashboard, Data Inventaris, QR Code Lokasi, dan scan QR dari HP.

---

## D. Update di kemudian hari

**Frontend berubah** (index.html, css, js), jalankan dari folder `kib-digital-kkmp`:
```powershell
git add .
git commit -m "Keterangan perubahan"
git push
```
Tunggu 1–2 menit, lalu buka situs dengan **Ctrl+Shift+R**.

**Backend berubah** (`Kode.gs`): tempel kode baru → **Deploy → Kelola deployment → Edit → Versi baru**.

---

## E. Masalah umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| Toast "GAS_URL di js/config.js belum diisi" | `config.js` masih berisi `XXXX` | Isi URL `/exec`, lalu `git add .` → `commit` → `push` |
| "Respons server tidak valid" | Web App tidak diakses *Anyone*, atau URL salah | Cek deployment: *Siapa saja*; salin ulang URL `/exec` |
| "Koneksi ke server gagal" | Internet atau URL salah | Coba buka `URL/exec?action=identitas` di browser |
| Situs 404 | `index.html` tidak di root repo | Lihat repo di GitHub: `index.html` harus terlihat di daftar teratas |
| Tampilan tanpa warna (CSS 404) | Folder `css`/`js` tidak ikut | Push dari folder yang berisi `css` dan `js`, jangan upload lewat web GitHub |
| "Database belum disiapkan" | `setupAppEnvironment` belum dijalankan | Jalankan dari editor Apps Script |
| QR lama membuka halaman kosong/JSON | `FRONTEND_URL` belum diisi | Isi properti skrip `FRONTEND_URL` (bagian C) |
| Perubahan belum tampil | Cache browser | Ctrl+Shift+R atau jendela Incognito |
| `Password authentication is not supported` | GitHub menolak password akun | Pakai Personal Access Token |
