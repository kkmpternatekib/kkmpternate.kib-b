// ===== BLOK: SCRIPT_CORE =====
const S = {
  token: '', awal: null, user: null, peran: '', multi: false, menu: '', baseUrl: '', identitas: {},
  dash: null, inv: null, lok: null, kat: null, kkmpList: null, pengguna: null, lap: null, peng: null,
  pilih2: new Set(), pilih5: new Set(), pilih6: new Set(), pilih7: new Set(),
  grafik: {}
};
const MENU_PERAN = {
  A: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'],
  M: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm12'],
  V: ['m1', 'm2', 'm4', 'm8', 'm12']
};
const JUDUL = {
  m1: 'Dashboard', m2: 'Data Inventaris', m3: 'Lokasi Unit', m4: 'Kategori Barang', m5: 'QR Code Lokasi',
  m6: 'Barcode Barang', m7: 'Cetak Stiker', m8: 'Laporan', m9: 'Pengaturan Global', m10: 'Manajemen KKMP',
  m11: 'Manajemen Pengguna', m12: 'Profil Akun'
};
const KERTAS = { A4: [210, 297], A3: [297, 420], F4: [215, 330], Letter: [215.9, 279.4] };
const TOKEN_KEY = 'kib_token';
// Data awal halaman dibaca dari alamat URL (dulu disisipkan server lewat HtmlService).
const DATA_AWAL = (() => {
  const q = new URLSearchParams(location.search), ambil = k => String(q.get(k) || '').slice(0, 100), p = q.get('p');
  return {
    halaman: ['lokasi', 'barang', 'pindai'].indexOf(p) >= 0 ? p : '',
    kkmp: ambil('kkmp'), id: ambil('id'), q: ambil('q'), kode: ambil('kode'),
    baseUrl: location.origin + location.pathname.replace(/index\.html$/, ''),
    identitas: { namaAplikasi: 'KIB Digital KKMP', namaInstansi: 'Kota Ternate' }
  };
})();
const LAINNYA = '__LAINNYA__';

const $ = id => document.getElementById(id);
const $$ = (sel, akar) => Array.from((akar || document).querySelectorAll(sel));

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ikon(nama, kelas) { return '<svg class="ik' + (kelas ? ' ' + kelas : '') + '"><use href="#' + nama + '"/></svg>'; }
function tampil(el, ya) { (typeof el === 'string' ? $(el) : el).classList.toggle('tersembunyi', !ya); }
function nilai(v) { return (v === '' || v === null || v === undefined) ? '-' : String(v); }
function nilaiKosong(v) { return (v === null || v === undefined) ? '' : v; }
function rupiah(n) { return (n === '' || n === null || n === undefined) ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID'); }
function angka(n) { return Number(n || 0).toLocaleString('id-ID'); }
function cm(v) { return String(Math.round(Number(v) * 10) / 10).replace('.', ','); }
function tanggal(s) {
  if (!s) return '-';
  const b = String(s).split(' '), p = b[0].split('-');
  return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] + (b[1] ? ' ' + b[1] : '') : String(s);
}
function tunda(fn, ms) { let t; return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms || 250); }; }
function inisial(nama) { return String(nama || '?').trim().split(/\s+/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join(''); }
function namaBerkas(s) { return String(s).replace(/[^\w.-]+/g, '_'); }
function urlPublik(q) { return (S.baseUrl || '') + (q || ''); }

function simpanToken(t) { try { sessionStorage.setItem(TOKEN_KEY, t); } catch (e) { /* penyimpanan diblokir browser */ } }
function ambilToken() { try { localStorage.removeItem(TOKEN_KEY); return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
function hapusToken() { try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) { /* abaikan */ } }

// Panggilan ke backend GAS lewat fetch. POST wajib text/plain agar tidak memicu CORS preflight.
function gasSiap() { return typeof GAS_URL === 'string' && /^https:\/\/script\.google\.com\/.+\/exec$/.test(GAS_URL) && GAS_URL.indexOf('XXXX') < 0; }
function bacaJawaban(res) {
  return res.json().catch(() => { throw new Error('Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone".'); })
    .then(h => {
      if (h && h.ok) return h.data;
      const e = new Error((h && h.pesan) || 'Terjadi kesalahan.');
      e.kode = h && h.kode;
      throw e;
    });
}
function jalankan(fungsi, args) {
  if (!gasSiap()) return Promise.reject(new Error('GAS_URL di js/config.js belum diisi dengan URL Web App (/exec).'));
  return fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ fn: fungsi, args: args || [] })
  }).catch(() => { throw new Error('Koneksi ke server gagal. Periksa internet Anda.'); }).then(bacaJawaban);
}
function ambilIdentitas() {
  if (!gasSiap()) return Promise.resolve(null);
  return fetch(GAS_URL + '?action=identitas').then(bacaJawaban).catch(() => null);
}
function panggil(nama) {
  const args = Array.prototype.slice.call(arguments, 1);
  return jalankan('api', [S.token, nama, args]).catch(e => {
    if (e.kode === 'SESI') sesiBerakhir();
    else if (e.kode === 'GANTI_PASSWORD') tampilLayar('hal-ganti');
    throw e;
  });
}
function publik(nama, args) { return jalankan('publik', [nama, args]); }
function catatAktivitas(jenis, modul, ids, desk, kkmp) { panggil('catatAktivitas', jenis, modul, ids, desk, kkmp || '').catch(() => {}); }

function toast(pesan, jenis) {
  jenis = jenis || 'sukses';
  const el = document.createElement('div');
  el.className = 'toast toast-' + jenis;
  el.innerHTML = ikon(jenis === 'galat' ? 'i-alert-circle' : jenis === 'info' ? 'i-info' : 'i-check-circle') + '<span>' + esc(pesan) + '</span>';
  $('toast-wadah').appendChild(el);
  setTimeout(() => { el.classList.add('keluar'); setTimeout(() => el.remove(), 220); }, jenis === 'galat' ? 5000 : 3200);
}
function galat(e) { toast(e && e.message ? e.message : String(e), 'galat'); }
function pesanForm(id, pesan) { $(id).textContent = pesan || ''; tampil(id, !!pesan); }
function sibuk(btn, ya) { btn.classList.toggle('memuat', ya); btn.disabled = ya; }

function bukaModal(id) { tampil(id, true); document.body.style.overflow = 'hidden'; }
function tutupModal(id) { tampil(id, false); if (!$$('.modal:not(.tersembunyi)').length) document.body.style.overflow = ''; }
let konfirmasiSelesai = null;
function konfirmasi(judul, pesan, teksYa) {
  $('mk-judul').textContent = judul;
  $('mk-pesan').textContent = pesan;
  $('mk-ya').textContent = teksYa || 'Ya, Lanjutkan';
  bukaModal('modal-konfirmasi');
  return new Promise(res => { konfirmasiSelesai = res; });
}
function jawabKonfirmasi(ya) {
  tutupModal('modal-konfirmasi');
  if (konfirmasiSelesai) { konfirmasiSelesai(ya); konfirmasiSelesai = null; }
}

function isiPilih(el, items, o) {
  o = o || {};
  const v = typeof o.nilai === 'function' ? o.nilai : (x => o.nilai ? x[o.nilai] : x);
  const t = typeof o.teks === 'function' ? o.teks : (x => o.teks ? x[o.teks] : x);
  const lama = o.pilih !== undefined ? o.pilih : el.value;
  el.innerHTML = (o.semua !== undefined && o.semua !== null ? '<option value="">' + esc(o.semua) + '</option>' : '') +
    items.map(x => '<option value="' + esc(v(x)) + '">' + esc(t(x)) + '</option>').join('');
  if (Array.from(el.options).some(op => op.value === String(lama))) el.value = lama;
}
function namaKKMP(id) { return ((S.awal ? S.awal.kkmp : []).find(k => k.ID === id) || {}).NamaKKMP || ''; }
function labelLokasi(l) { return S.multi ? l.NamaLokasi + ' – ' + namaKKMP(l.KKMPID) : l.NamaLokasi; }
function opsiKKMP(el, semua, pilih) { isiPilih(el, S.awal.kkmp, { semua: semua, nilai: 'ID', teks: 'NamaKKMP', pilih: pilih }); }
function opsiLokasi(el, kkmpId, semua, pilih) {
  isiPilih(el, S.awal.lokasi.filter(l => !kkmpId || l.KKMPID === kkmpId), { semua: semua, nilai: 'ID', teks: labelLokasi, pilih: pilih });
}
function opsiKategori(el, semua, pilih) { isiPilih(el, S.awal.kategori, { semua: semua, nilai: 'ID', teks: 'NamaKategori', pilih: pilih }); }
function opsiKondisi(el, semua, pilih) { isiPilih(el, S.awal.pilihan.kondisi, { semua: semua, pilih: pilih }); }

function jmlKolom(tb) { return tb.closest('table').querySelectorAll('thead th:not(.tersembunyi)').length; }
function barisKosong(tb, pesan, ik) {
  tb.innerHTML = '<tr><td class="sel-kosong" colspan="' + jmlKolom(tb) + '"><div class="kosong">' + ikon(ik || 'i-box') + '<span>' + esc(pesan) + '</span></div></td></tr>';
}
function barisMemuat(tb) {
  const k = jmlKolom(tb);
  tb.innerHTML = Array(4).fill('<tr>' + Array(k).fill('<td><span class="kerangka"></span></td>').join('') + '</tr>').join('');
}
function renderPaging(wadah, info, total, hal, per, ubah) {
  const jml = Math.max(1, Math.ceil(total / per));
  hal = Math.min(Math.max(1, hal), jml);
  const awal = total ? (hal - 1) * per + 1 : 0, akhir = Math.min(total, hal * per);
  info.textContent = 'Menampilkan ' + awal + ' – ' + akhir + ' dari ' + total + ' data';
  const nomor = [];
  for (let i = 1; i <= jml; i++) {
    if (i === 1 || i === jml || Math.abs(i - hal) <= 1) nomor.push(i);
    else if (nomor[nomor.length - 1] !== '…') nomor.push('…');
  }
  wadah.innerHTML = '<button class="tombol-halaman" type="button" data-hal="' + (hal - 1) + '"' + (hal <= 1 ? ' disabled' : '') + ' aria-label="Sebelumnya">' + ikon('i-chev-l', 'ik-sm') + '</button>' +
    nomor.map(n => n === '…' ? '<span class="halaman-elipsis">…</span>' : '<button class="tombol-halaman' + (n === hal ? ' aktif' : '') + '" type="button" data-hal="' + n + '">' + n + '</button>').join('') +
    '<button class="tombol-halaman" type="button" data-hal="' + (hal + 1) + '"' + (hal >= jml ? ' disabled' : '') + ' aria-label="Berikutnya">' + ikon('i-chev-r', 'ik-sm') + '</button>';
  wadah.onclick = e => { const b = e.target.closest('[data-hal]'); if (b && !b.disabled) ubah(Number(b.dataset.hal)); };
  return hal;
}
function tombolAksi(aksi, id, ik, judul, bahaya) {
  return '<button type="button" class="tombol-ikon tombol-ikon-kecil' + (bahaya ? ' tombol-ikon-bahaya' : '') + '" data-aksi="' + aksi + '" data-id="' + esc(id) + '" title="' + esc(judul) + '" aria-label="' + esc(judul) + '">' + ikon(ik) + '</button>';
}
function badgeKondisi(k) {
  const m = { 'Baik': ['badge-baik', 'i-check-circle'], 'Rusak Ringan': ['badge-ringan', 'i-alert'], 'Rusak Berat': ['badge-berat', 'i-x-circle'] }[k];
  return m ? '<span class="badge ' + m[0] + '">' + ikon(m[1]) + esc(k) + '</span>' : '<span class="badge badge-netral">' + esc(nilai(k)) + '</span>';
}
function badgeStatus(s) { return '<span class="badge ' + (s === 'Aktif' ? 'badge-aktif' : 'badge-nonaktif') + '">' + esc(s || '-') + '</span>'; }
function fotoMini(url) {
  return url ? '<img class="foto-mini" src="' + esc(url) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="foto-mini foto-mini-kosong">' + ikon('i-image') + '</span>';
}
function kartuStat(label, isi, ik, warna) {
  return '<div class="stat"><span class="stat-ikon ' + warna + '">' + ikon(ik) + '</span><span class="stat-teks"><b class="stat-nilai">' + esc(isi) + '</b><span class="stat-label">' + esc(label) + '</span></span></div>';
}
function itemAktivitas(l) {
  const p = {
    'Tambah': ['i-plus', 'warna-hijau'], 'Edit': ['i-edit', 'warna-biru'], 'Hapus': ['i-trash', 'warna-merah'],
    'Buat Barcode': ['i-barcode', 'warna-ungu'], 'Buat QR': ['i-qr', 'warna-ungu'], 'Buat Poster': ['i-qr', 'warna-ungu'],
    'Login': ['i-login', 'warna-abu'], 'Logout': ['i-logout', 'warna-abu'], 'Cetak': ['i-printer', 'warna-abu'],
    'Unduh': ['i-download', 'warna-abu'], 'Pindah KKMP': ['i-arrow-r', 'warna-kuning'], 'Akses Ditolak': ['i-alert', 'warna-merah']
  }[l.jenis] || ['i-activity', 'warna-abu'];
  return '<li><span class="aktivitas-ikon ' + p[1] + '">' + ikon(p[0]) + '</span><span class="aktivitas-teks"><b>' + esc(l.deskripsi) +
    '</b><span class="teks-redup">' + esc(l.pengguna) + ' · ' + esc(l.jenis) + '</span></span><span class="aktivitas-waktu">' + esc(tanggal(l.waktu)) + '</span></li>';
}

function salin(teks) {
  const ok = () => toast('URL publik disalin.');
  const cadangan = () => {
    const ta = document.createElement('textarea');
    ta.value = teks; ta.setAttribute('readonly', ''); ta.className = 'sprite';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast(teks, 'info'); }
    ta.remove();
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(teks).then(ok).catch(cadangan);
  else cadangan();
}
function unduhBlob(blob, nama) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nama;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function base64KeBytes(b64) {
  const s = atob(b64), a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
function muatGambar(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Gambar gagal dimuat.'));
    i.src = src;
  });
}
function kompresGambar(file, maksByte) {
  return new Promise((res, rej) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return rej(new Error('Format foto harus JPG, PNG, atau WEBP.'));
    const url = URL.createObjectURL(file);
    muatGambar(url).then(img => {
      URL.revokeObjectURL(url);
      const cv = document.createElement('canvas');
      let sisi = 1600, q = .85;
      for (let i = 0; i < 10; i++) {
        const r = Math.min(1, sisi / Math.max(img.width, img.height));
        cv.width = Math.round(img.width * r); cv.height = Math.round(img.height * r);
        const c = cv.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
        c.drawImage(img, 0, 0, cv.width, cv.height);
        const hasil = cv.toDataURL('image/jpeg', q);
        if (hasil.length * .75 <= maksByte) return res(hasil);
        if (q > .6) q -= .1; else sisi *= .8;
      }
      rej(new Error('Foto terlalu besar setelah dikompres.'));
    }).catch(e => { URL.revokeObjectURL(url); rej(e); });
  });
}
function logoData() {
  const img = document.querySelector('#ik-logo image');
  return img ? img.getAttribute('href') : '';
}
function logoStiker() { return Promise.resolve(logoData() || null); }

let chartJanji = null;
function muatChart() {
  if (window.Chart) return Promise.resolve();
  if (!chartJanji) {
    chartJanji = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/chart.umd.min.js'; // Chart.js 4.4.1 disimpan di repo sendiri (tidak bergantung CDN)
      s.onload = res;
      s.onerror = () => { chartJanji = null; rej(new Error('Grafik gagal dimuat.')); };
      document.head.appendChild(s);
    });
  }
  return chartJanji;
}

function terapkanTema(t) {
  document.documentElement.setAttribute('data-tema', t);
  try { localStorage.setItem('kib_tema', t); } catch (e) { /* abaikan */ }
  $('btn-tema').innerHTML = ikon(t === 'gelap' ? 'i-sun' : 'i-moon');
  if (S.menu === 'm1' && S.dash && window.M1) M1.grafik();
}
function tampilLayar(id) {
  ['hal-publik', 'hal-login', 'hal-ganti', 'hal-app'].forEach(x => tampil(x, x === id));
  tampil('layar-muat', false);
  window.scrollTo(0, 0);
}
function isiIdentitas(idt) {
  idt = idt || {};
  S.identitas = { namaAplikasi: idt.namaAplikasi || 'KIB Digital KKMP', namaInstansi: idt.namaInstansi || 'Kota Ternate' };
  $$('.js-nama-app').forEach(e => { e.textContent = S.identitas.namaAplikasi; });
  $$('.js-instansi').forEach(e => { e.textContent = S.identitas.namaInstansi.toUpperCase(); });
  $$('.js-instansi-biasa').forEach(e => { e.textContent = S.identitas.namaInstansi; });
  $$('.js-tahun').forEach(e => { e.textContent = new Date().getFullYear(); });
}
// ===== AKHIR BLOK: SCRIPT_CORE =====


// ===== BLOK: DROPDOWN =====
// Daftar pilihan modern untuk semua <select class="pilih">. Select asli tetap dipakai sebagai sumber nilai,
// jadi isiPilih, .value, dan event change tetap bekerja seperti biasa. Di HP (layar sentuh) memakai pemilih bawaan HP.
const DD = {
  sel: null, panel: null, sorot: -1,
  pasang() {
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    document.addEventListener('mousedown', e => {
      const s = e.target.closest('select.pilih');
      if (s && e.button === 0) {
        e.preventDefault();
        if (s.disabled) return;
        s.focus();
        if (DD.sel === s) DD.tutup(); else DD.buka(s);
        return;
      }
      if (DD.panel && !DD.panel.contains(e.target)) DD.tutup();
    }, true);
    document.addEventListener('keydown', e => {
      const s = e.target.closest ? e.target.closest('select.pilih') : null;
      if (!s) return;
      if (DD.sel !== s) {
        if (e.key === 'Enter' || e.key === ' ' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); if (!s.disabled) DD.buka(s); }
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); DD.geser(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (DD.sorot >= 0) DD.pilih(DD.sorot); }
      else if (e.key === 'Escape' || e.key === 'Tab') DD.tutup();
    }, true);
    document.addEventListener('scroll', e => { if (DD.panel && !DD.panel.contains(e.target)) DD.tutup(); }, true);
    window.addEventListener('resize', () => DD.tutup());
  },
  buka(s) {
    DD.tutup();
    const p = document.createElement('div');
    p.className = 'dd-panel';
    p.setAttribute('role', 'listbox');
    const terang = document.documentElement.getAttribute('data-tema') === 'terang' && !!s.closest('.app, .modal');
    p.classList.toggle('dd-terang', terang);
    p.innerHTML = Array.from(s.options).map((o, i) =>
      '<div class="dd-opsi' + (o.value === '' ? ' dd-kosong' : '') + (i === s.selectedIndex ? ' dd-terpilih' : '') + '" role="option" data-i="' + i + '"' +
      (i === s.selectedIndex ? ' aria-selected="true"' : '') + '><span>' + esc(o.text) + '</span>' + (i === s.selectedIndex ? ikon('i-check', 'ik-sm') : '') + '</div>').join('');
    p.addEventListener('mousedown', e => {
      e.preventDefault();
      const o = e.target.closest('.dd-opsi');
      if (o) DD.pilih(Number(o.dataset.i));
    });
    p.addEventListener('mousemove', e => { const o = e.target.closest('.dd-opsi'); if (o) DD.tandai(Number(o.dataset.i), false); });
    document.body.appendChild(p);
    DD.sel = s; DD.panel = p;
    s.classList.add('dd-buka');
    DD.posisi();
    DD.tandai(s.selectedIndex, true);
  },
  posisi() {
    const s = DD.sel, p = DD.panel, r = s.getBoundingClientRect(), jarak = 6, tepi = 12;
    const bawah = window.innerHeight - r.bottom - jarak - tepi, atas = r.top - jarak - tepi;
    const tinggi = Math.min(p.scrollHeight, 300), keAtas = bawah < Math.min(tinggi, 160) && atas > bawah;
    p.style.maxHeight = Math.max(120, Math.min(300, keAtas ? atas : bawah)) + 'px';
    p.style.minWidth = r.width + 'px';
    p.style.left = Math.max(tepi, Math.min(r.left, window.innerWidth - Math.max(r.width, p.offsetWidth) - tepi)) + 'px';
    p.style.top = (keAtas ? r.top - jarak - p.offsetHeight : r.bottom + jarak) + 'px';
    p.classList.toggle('dd-atas', keAtas);
  },
  tandai(i, gulir) {
    if (!DD.panel) return;
    DD.sorot = i;
    $$('.dd-opsi', DD.panel).forEach(o => o.classList.toggle('dd-sorot', Number(o.dataset.i) === i));
    const o = DD.panel.querySelector('[data-i="' + i + '"]');
    if (o && gulir) o.scrollIntoView({ block: 'nearest' });
  },
  geser(arah) {
    const n = DD.sel.options.length;
    if (n) DD.tandai(Math.min(n - 1, Math.max(0, (DD.sorot < 0 ? DD.sel.selectedIndex : DD.sorot) + arah)), true);
  },
  pilih(i) {
    const s = DD.sel;
    DD.tutup();
    if (!s || i === s.selectedIndex) return;
    s.selectedIndex = i;
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  },
  tutup() {
    if (DD.panel) DD.panel.remove();
    if (DD.sel) DD.sel.classList.remove('dd-buka');
    DD.panel = null; DD.sel = null; DD.sorot = -1;
  }
};
// ===== AKHIR BLOK: DROPDOWN =====


// ===== BLOK: QR_ENCODER =====
const QR = (() => {
  const ECW = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  const NB = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];
  const LVL = { L: [0, 1], M: [1, 0], Q: [2, 3], H: [3, 2] };
  const bit = (x, i) => ((x >>> i) & 1) !== 0;
  const cache = {};

  function rawMod(v) {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function dataCw(v, e) { return Math.floor(rawMod(v) / 8) - ECW[e][v] * NB[e][v]; }
  function kali(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function pembagi(d) {
    const r = new Array(d).fill(0);
    r[d - 1] = 1;
    let akar = 1;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < r.length; j++) { r[j] = kali(r[j], akar); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      akar = kali(akar, 0x02);
    }
    return r;
  }
  function sisa(data, div) {
    const r = div.map(() => 0);
    data.forEach(b => {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => { r[i] ^= kali(c, f); });
    });
    return r;
  }
  function penalti(m, n) {
    let hasil = 0;
    const tambahRiwayat = (len, rh) => { if (rh[0] === 0) len += n; rh.pop(); rh.unshift(len); };
    const hitungPola = rh => {
      const k = rh[1], inti = k > 0 && rh[2] === k && rh[3] === k * 3 && rh[4] === k && rh[5] === k;
      return (inti && rh[0] >= k * 4 && rh[6] >= k ? 1 : 0) + (inti && rh[6] >= k * 4 && rh[0] >= k ? 1 : 0);
    };
    const akhiri = (warna, len, rh) => { if (warna) { tambahRiwayat(len, rh); len = 0; } len += n; tambahRiwayat(len, rh); return hitungPola(rh); };
    for (let arah = 0; arah < 2; arah++) {
      for (let a = 0; a < n; a++) {
        let warna = false, run = 0;
        const rh = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < n; b++) {
          const c = arah === 0 ? m[a][b] : m[b][a];
          if (c === warna) { run++; if (run === 5) hasil += 3; else if (run > 5) hasil++; }
          else { tambahRiwayat(run, rh); if (!warna) hasil += hitungPola(rh) * 40; warna = c; run = 1; }
        }
        hasil += akhiri(warna, run, rh) * 40;
      }
    }
    for (let y = 0; y < n - 1; y++) {
      for (let x = 0; x < n - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) hasil += 3;
      }
    }
    let gelap = 0;
    m.forEach(r => r.forEach(c => { if (c) gelap++; }));
    const total = n * n;
    return hasil + (Math.ceil(Math.abs(gelap * 20 - total * 10) / total) - 1) * 10;
  }

  function buat(teks, level) {
    const kunci = (level || 'M') + '|' + teks;
    if (cache[kunci]) return cache[kunci];
    const lv = LVL[level || 'M'], e = lv[0];
    const bytes = Array.from(new TextEncoder().encode(String(teks)));
    let ver = 1;
    for (; ver <= 40; ver++) {
      const cc = ver < 10 ? 8 : 16;
      if (bytes.length < (1 << cc) && 4 + cc + bytes.length * 8 <= dataCw(ver, e) * 8) break;
    }
    if (ver > 40) throw new Error('Teks terlalu panjang untuk QR Code.');
    const bits = [];
    const tambah = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    tambah(4, 4);
    tambah(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(b => tambah(b, 8));
    const kap = dataCw(ver, e) * 8;
    tambah(0, Math.min(4, kap - bits.length));
    tambah(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < kap; p ^= 0xEC ^ 0x11) tambah(p, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; data.push(b); }

    const nb = NB[e][ver], el = ECW[e][ver], raw = Math.floor(rawMod(ver) / 8);
    const pendek = nb - raw % nb, lenPendek = Math.floor(raw / nb), div = pembagi(el), blok = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = data.slice(k, k + lenPendek - el + (i < pendek ? 0 : 1));
      k += d.length;
      const ecc = sisa(d, div);
      if (i < pendek) d.push(0);
      blok.push(d.concat(ecc));
    }
    const kode = [];
    for (let i = 0; i < blok[0].length; i++) blok.forEach((b, j) => { if (i !== lenPendek - el || j >= pendek) kode.push(b[i]); });

    const n = ver * 4 + 17;
    const m = Array.from({ length: n }, () => new Array(n).fill(false));
    const f = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (x, y, d) => { m[y][x] = d; f[y][x] = true; };
    for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (x, y) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < n && yy >= 0 && yy < n) set(xx, yy, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    const pos = [];
    if (ver > 1) {
      const na = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      pos.push(6);
      for (let p = n - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    }
    pos.forEach((a, i) => pos.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const format = mask => {
      const d = lv[1] << 3 | mask;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = (d << 10 | r) ^ 0x5412;
      for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
      set(8, 7, bit(b, 6)); set(8, 8, bit(b, 7)); set(7, 8, bit(b, 8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(b, i));
      for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(b, i));
      set(8, n - 8, true);
    };
    format(0);
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = ver << 12 | r;
      for (let i = 0; i < 18; i++) { const c = bit(b, i), a = n - 11 + i % 3, z = Math.floor(i / 3); set(a, z, c); set(z, a, c); }
    }
    let idx = 0;
    for (let kanan = n - 1; kanan >= 1; kanan -= 2) {
      if (kanan === 6) kanan = 5;
      for (let v = 0; v < n; v++) for (let j = 0; j < 2; j++) {
        const x = kanan - j, naik = ((kanan + 1) & 2) === 0, y = naik ? n - 1 - v : v;
        if (!f[y][x] && idx < kode.length * 8) { m[y][x] = bit(kode[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }
    const masker = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
      (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
    ];
    const terapkan = k => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!f[y][x] && masker[k](x, y)) m[y][x] = !m[y][x]; };
    let terbaik = 0, min = Infinity;
    for (let k = 0; k < 8; k++) {
      terapkan(k); format(k);
      const p = penalti(m, n);
      if (p < min) { min = p; terbaik = k; }
      terapkan(k);
    }
    terapkan(terbaik); format(terbaik);
    return (cache[kunci] = { ukuran: n, modul: m });
  }
  function jalur(qr, tepi) {
    tepi = tepi || 0;
    let d = '';
    qr.modul.forEach((r, y) => r.forEach((c, x) => { if (c) d += 'M' + (x + tepi) + ',' + (y + tepi) + 'h1v1h-1z'; }));
    return d;
  }
  function svg(qr, tepi) {
    tepi = tepi === undefined ? 4 : tepi;
    const n = qr.ukuran + tepi * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges"><rect width="' + n + '" height="' + n + '" fill="#fff"/><path d="' + jalur(qr, tepi) + '" fill="#000"/></svg>';
  }
  return { buat: buat, jalur: jalur, svg: svg };
})();
// ===== AKHIR BLOK: QR_ENCODER =====


// ===== BLOK: BARCODE_CODE128 =====
const C128 = (() => {
  const P = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
    '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
    '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
    '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
    '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
    '114131 311141 411131 211412 211214 211232 2331112').split(' ');
  function batang(teks) {
    teks = String(teks || '');
    const v = [104];
    for (const ch of teks) {
      const c = ch.charCodeAt(0);
      if (c < 32 || c > 126) throw new Error('Karakter barcode tidak didukung: ' + ch);
      v.push(c - 32);
    }
    let cek = 104;
    for (let i = 1; i < v.length; i++) cek += v[i] * i;
    v.push(cek % 103, 106);
    const hasil = [];
    let x = 0;
    v.forEach(k => P[k].split('').forEach((w, i) => { w = Number(w); if (i % 2 === 0) hasil.push([x, w]); x += w; }));
    return { batang: hasil, lebar: x };
  }
  function svg(teks, o) {
    o = o || {};
    const b = batang(teks), q = 10, t = o.tinggi || 50, lebar = b.lebar + q * 2;
    const d = b.batang.map(z => 'M' + (z[0] + q) + ',0h' + z[1] + 'v' + t + 'h-' + z[1] + 'z').join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + lebar + ' ' + t + '" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="' + lebar + '" height="' + t + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  return { batang: batang, svg: svg };
})();
// ===== AKHIR BLOK: BARCODE_CODE128 =====


// ===== BLOK: GAMBAR_CETAK =====
const WARNA_STIKER = '#5B1A72';
const FONT = '"Plus Jakarta Sans", Arial, sans-serif';

function r2(n) { return Math.round(n * 100) / 100; }
function potongTeks(teks, size, maks) {
  teks = String(teks === '' || teks === null || teks === undefined ? '-' : teks);
  const muat = Math.max(2, Math.floor(maks * 1.7 / (size * .56)));
  return teks.length > muat ? teks.slice(0, muat - 1) + '…' : teks;
}
function teksSvg(x, y, teks, size, maks, attr) {
  teks = potongTeks(teks, size, maks);
  const est = teks.length * size * .56;
  return '<text x="' + r2(x) + '" y="' + r2(y) + '" font-size="' + r2(size) + '"' +
    (est > maks ? ' textLength="' + r2(maks) + '" lengthAdjust="spacingAndGlyphs"' : '') + ' ' + attr + '>' + esc(teks) + '</text>';
}
function logoSvg(x, y, s, data) {
  if (data) {
    return '<image x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(s) + '" height="' + r2(s) + '" href="' + data + '" xlink:href="' + data + '" preserveAspectRatio="xMidYMid meet"/>';
  }
  return '<g transform="translate(' + r2(x) + ',' + r2(y) + ') scale(' + (s / 48).toFixed(4) + ')"><rect width="48" height="48" rx="11" fill="#E11D2A"/>' +
    '<g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 24.5 26 11.5l11.5 9.8"/><path d="M15 21v15.5h18"/><path d="M33 19v8"/></g>' +
    '<path d="M23.2 18.6h2.6v2.6h-2.6zM26.8 18.6h2.6v2.6h-2.6zM23.2 22.2h2.6v2.6h-2.6zM26.8 22.2h2.6v2.6h-2.6z" fill="#fff"/></g>';
}
function barcodeGrup(teks, x, y, w, h) {
  const b = C128.batang(teks), sc = w / (b.lebar + 4);
  return '<path transform="translate(' + r2(x + 2 * sc) + ',' + r2(y) + ') scale(' + sc.toFixed(5) + ',1)" fill="#000" d="' +
    b.batang.map(z => 'M' + z[0] + ',0h' + z[1] + 'v' + r2(h) + 'h-' + z[1] + 'z').join('') + '"/>';
}
function qrGrup(url, x, y, s) {
  const q = QR.buat(url, 'M'), n = q.ukuran + 2, sc = s / n;
  return '<g transform="translate(' + r2(x) + ',' + r2(y) + ') scale(' + sc.toFixed(5) + ')"><rect width="' + n + '" height="' + n + '" fill="#fff"/><path transform="translate(1,1)" fill="#000" d="' + QR.jalur(q) + '"/></g>';
}

function presetDaftar() {
  const p = S.awal.pengaturan;
  const d = [['Kecil', 'Kecil', p.PresetStikerKecil, 'barang kecil'], ['Sedang', 'Sedang (Standar)', p.PresetStikerSedang, 'ideal standar'],
    ['Besar', 'Besar', p.PresetStikerBesar, 'barang besar'], ['AsetBesar', 'Aset Besar', p.PresetStikerAsetBesar, 'barang / aset besar']];
  if (p.PresetStikerCustom) d.push(['Custom', 'Custom', p.PresetStikerCustom, 'tersimpan']);
  return d.map(x => { const u = String(x[2]).split('x').map(Number); return { kunci: x[0], nama: x[1], w: u[0], h: u[1], ket: x[3] }; });
}
function labelPreset(p) { return p.nama + ' – ' + cm(p.w) + ' × ' + cm(p.h) + ' cm (' + p.ket + ')'; }

function stikerSvg(b, w, h, o) {
  o = o || {};
  const W = w * 10, H = h * 10, k = Math.min(W / 80, H / 40), u = WARNA_STIKER;
  const g = r2(Math.max(.4, .6 * k)), pad = 2 * k, rad = 2.5 * k, ringkas = w < 7, t = ' fill="#111827"';
  const hh = H * (ringkas ? .22 : .19);
  const url = urlPublik(b.QueryPublik || ('?p=barang&kode=' + encodeURIComponent(b.KodeBarcode)));
  let s = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + 'mm" height="' + H + 'mm" font-family="Arial, Helvetica, sans-serif">';
  s += '<rect x="' + g / 2 + '" y="' + g / 2 + '" width="' + r2(W - g) + '" height="' + r2(H - g) + '" rx="' + r2(rad) + '" fill="#fff" stroke="' + u + '" stroke-width="' + g + '"/>';
  const ra = r2(rad - g / 2);
  s += '<path d="M' + g / 2 + ',' + r2(hh) + 'V' + r2(rad) + 'A' + ra + ',' + ra + ' 0 0 1 ' + r2(rad) + ',' + g / 2 + 'H' + r2(W - rad) + 'A' + ra + ',' + ra + ' 0 0 1 ' + r2(W - g / 2) + ',' + r2(rad) + 'V' + r2(hh) + 'Z" fill="' + u + '"/>';
  const lg = hh * .74;
  s += logoSvg(pad, (hh - lg) / 2, lg, o.logo);
  s += teksSvg((pad + lg + W) / 2, hh * .68, 'KARTU INVENTARIS BARANG (KIB)', hh * .48, W - pad * 3 - lg, 'fill="#fff" font-weight="700" text-anchor="middle"');

  if (ringkas) {
    const qs = o.qrmini ? H - hh - pad * 2 : 0, lebar = W - pad * 2 - (qs ? qs + pad : 0), tengah = pad + lebar / 2;
    const ny = hh + H * .17, by = ny + H * .05, bh = H * .34;
    s += teksSvg(tengah, ny, b.NamaBarang, H * .1, lebar, 'font-weight="700" text-anchor="middle"' + t);
    s += barcodeGrup(b.KodeBarcode, pad, by, lebar, bh);
    s += teksSvg(tengah, by + bh + H * .1, b.KodeBarcode, H * .085, lebar, 'font-weight="700" text-anchor="middle"' + t);
    if (qs) s += qrGrup(url, W - pad - qs, hh + pad, qs);
    return s + '</svg>';
  }

  const fh = H * .13, y0 = hh, y1 = H - fh, bodyH = y1 - y0;
  s += '<line x1="' + r2(pad) + '" x2="' + r2(W - pad) + '" y1="' + r2(y1) + '" y2="' + r2(y1) + '" stroke="' + u + '" stroke-width="' + r2(g * .8) + '"/>';
  s += teksSvg(W / 2, y1 + fh * .66, 'Aset ' + (b.NamaKKMP || 'KKMP') + ' – Gunakan dengan Baik, Jaga dan Pelihara', fh * .5, W - pad * 2, 'font-style="italic" font-weight="700" text-anchor="middle" fill="' + u + '"');

  if (w >= 12) {
    const kolB = W * .46, qs = o.qrmini ? bodyH * .7 : 0, bh = bodyH * .5, bt = y0 + bodyH * .14;
    const rows = [['Kode Barang', b.KodeBarang], ['Nama Barang', b.NamaBarang], ['Lokasi Unit', b.NamaLokasi], ['KKMP', b.NamaKKMP], ['Tahun', b.TahunPembelian]];
    s += barcodeGrup(b.KodeBarcode, pad, bt, kolB - pad * 1.5, bh);
    s += teksSvg(kolB / 2 + pad / 4, bt + bh + bodyH * .2, b.KodeBarcode, bodyH * .12, kolB - pad * 2, 'font-weight="700" text-anchor="middle"' + t);
    s += '<line x1="' + r2(kolB) + '" x2="' + r2(kolB) + '" y1="' + r2(y0 + bodyH * .1) + '" y2="' + r2(y1 - bodyH * .08) + '" stroke="' + u + '" stroke-width="' + r2(g * .8) + '"/>';
    const ix = kolB + pad, iw = W - ix - pad - (qs ? qs + pad : 0), rh = bodyH * .84 / rows.length, fs = Math.min(rh * .58, H * .055), lw = iw * .36;
    rows.forEach((r, i) => {
      const y = y0 + bodyH * .1 + rh * (i + .72);
      s += teksSvg(ix, y, r[0], fs, lw, t.slice(1)) + teksSvg(ix + lw, y, ': ' + nilai(r[1]), fs, iw - lw, 'font-weight="700"' + t);
    });
    if (qs) s += qrGrup(url, W - pad - qs, y0 + (bodyH - qs) / 2, qs);
  } else {
    const qs = o.qrmini ? bodyH * .44 : 0, ih = bodyH * .46, iw = W - pad * 2 - (qs ? qs + pad : 0), rh = ih / 3;
    const info = [b.NamaBarang, 'Kode: ' + nilai(b.KodeBarang) + ' · Tahun: ' + nilai(b.TahunPembelian), 'Lokasi: ' + nilai(b.NamaLokasi) + ' · ' + (b.NamaKKMP || '')];
    info.forEach((x, i) => { s += teksSvg(pad, y0 + rh * (i + .8) + bodyH * .03, x, i ? rh * .6 : rh * .7, iw, (i ? '' : 'font-weight="700" ') + t.slice(1)); });
    if (qs) s += qrGrup(url, W - pad - qs, y0 + bodyH * .03, qs);
    const bt = y0 + ih + bodyH * .06, bh = bodyH * .3;
    s += barcodeGrup(b.KodeBarcode, pad, bt, W - pad * 2, bh);
    s += teksSvg(W / 2, bt + bh + bodyH * .14, b.KodeBarcode, bodyH * .11, W - pad * 2, 'font-weight="700" text-anchor="middle"' + t);
  }
  return s + '</svg>';
}

function svgKePng(svg, wmm, hmm, dpi) {
  return muatGambar('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)).then(img => new Promise((res, rej) => {
    const px = (dpi || 300) / 25.4, cv = document.createElement('canvas');
    cv.width = Math.round(wmm * px); cv.height = Math.round(hmm * px);
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob(b => b ? res(b) : rej(new Error('Gagal membuat PNG.')), 'image/png');
  }));
}

function siapFont() {
  if (!document.fonts) return Promise.resolve();
  return Promise.all(['500', '700', '800'].map(w => document.fonts.load(w + ' 20px "Plus Jakarta Sans"'))).catch(() => {});
}
function rr(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function pasFont(c, teks, bobot, ukuran, maks) {
  let u = ukuran;
  c.font = bobot + ' ' + u + 'px ' + FONT;
  while (c.measureText(teks).width > maks && u > 2) { u *= .94; c.font = bobot + ' ' + u + 'px ' + FONT; }
  return u;
}
function bungkus(c, teks, maks) {
  const kata = String(teks || '').split(/\s+/).filter(Boolean), baris = [];
  let b = '';
  kata.forEach(k => { const coba = b ? b + ' ' + k : k; if (c.measureText(coba).width > maks && b) { baris.push(b); b = k; } else b = coba; });
  if (b) baris.push(b);
  return baris;
}
function logoBawaan(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s / 48, s / 48);
  c.fillStyle = '#E11D2A'; rr(c, 0, 0, 48, 48, 11); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 3.4; c.lineCap = 'round'; c.lineJoin = 'round';
  ['M10.5 24.5 26 11.5l11.5 9.8', 'M15 21v15.5h18', 'M33 19v8'].forEach(p => c.stroke(new Path2D(p)));
  c.fillStyle = '#fff';
  [[23.2, 18.6], [26.8, 18.6], [23.2, 22.2], [26.8, 22.2]].forEach(a => c.fillRect(a[0], a[1], 2.6, 2.6));
  c.restore();
}
function gambarLogo(c, img, x, y, s) {
  if (!img) return logoBawaan(c, x, y, s);
  const iw = img.naturalWidth || s, ih = img.naturalHeight || s, r = Math.min(s / iw, s / ih);
  c.drawImage(img, x + (s - iw * r) / 2, y + (s - ih * r) / 2, iw * r, ih * r);
}

function campurWarna(hex, ke, t) {
  const a = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)), b = [1, 3, 5].map(i => parseInt(ke.substr(i, 2), 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) { return 'rgba(' + [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)).join(',') + ',' + a + ')'; }

function gambarPoster(cv, px, d) {
  const W = d.W, H = d.H, t = d.tpl;
  const aksen = /^#[0-9a-f]{6}$/i.test(t.WarnaAksen) ? t.WarnaAksen : '#E11D2A';
  const latar = /^#[0-9a-f]{6}$/i.test(t.WarnaLatar) ? t.WarnaLatar : '#FFFFFF';
  const gelap = '#0B1220', abu = '#4B5563', terang = campurWarna(aksen, '#FFFFFF', .25), tua = campurWarna(aksen, '#000000', .3);
  cv.width = Math.max(1, Math.round(W * px)); cv.height = Math.max(1, Math.round(H * px));
  const c = cv.getContext('2d');
  c.setTransform(px, 0, 0, px, 0, 0);
  const k = Math.min(W, H * .68) / 200, tepi = .8 * k, tebal = 1.6 * k, rad = 8 * k, lebar = W - 32 * k;
  const bayang = (warna, blur, dy) => { c.shadowColor = warna; c.shadowBlur = blur * px; c.shadowOffsetX = 0; c.shadowOffsetY = (dy || 0) * px; };
  const tanpaBayang = () => { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; };
  const kurva = (titik, warna) => {
    c.beginPath(); c.moveTo(titik[0][0], titik[0][1]);
    for (let i = 1; i < titik.length; i += 3) c.bezierCurveTo(titik[i][0], titik[i][1], titik[i + 1][0], titik[i + 1][1], titik[i + 2][0], titik[i + 2][1]);
    c.fillStyle = warna; c.fill();
  };
  const titik = (x0, y0, kol, bar, jarak, r, warna) => {
    c.fillStyle = warna;
    for (let i = 0; i < kol; i++) for (let j = 0; j < bar; j++) { c.beginPath(); c.arc(x0 + i * jarak, y0 + j * jarak, r, 0, Math.PI * 2); c.fill(); }
  };

  // --- ukur teks ---
  c.font = '500 ' + 5.3 * k + 'px ' + FONT;
  const desk = t.Deskripsi ? bungkus(c, t.Deskripsi, Math.min(lebar, 150 * k)).slice(0, 3) : [];
  const kw = Math.min(W - 26 * k, H * .9), kx = (W - kw) / 2, teksX = 24.7 * k, teksW = kw - teksX - 5 * k;
  c.font = '500 ' + 5.1 * k + 'px ' + FONT;
  const kaki = t.TeksFooter ? bungkus(c, t.TeksFooter, teksW).slice(0, 3) : [];
  const hKaki = kaki.length ? 15.6 * k + (kaki.length - 1) * 6.9 * k : 0;

  // --- tata letak vertikal (proporsi referensi 20 x 30 cm) ---
  const yLogo = 16.7 * k, sLogo = 21 * k;
  const yJudul = yLogo + 50 * k, yBanner = yLogo + 58.8 * k, hBanner = 13.7 * k;
  const yLok = yBanner + hBanner + 14.1 * k, yKKMP = yLok + 8.1 * k;
  const yDesk = yKKMP + 10.8 * k, lhDesk = 7.2 * k;
  const atasQR = (desk.length ? yDesk + (desk.length - 1) * lhDesk : yKKMP) + 11 * k;
  const bawah = (hKaki ? 10.4 * k + hKaki : 0) + 26 * k;
  const modul = d.qr ? d.qr.ukuran : 25, celah = 6.4 * k;
  const kotak = q => q * (1 + 6 / modul) + celah * 2;
  const ruangV = H - atasQR - bawah, ruangH = W - 24 * k;
  let q = (Number(t.UkuranQR) || 12) * 10;
  q = Math.max(10, Math.min(q, (Math.min(ruangV, ruangH) - celah * 2) / (1 + 6 / modul)));
  const ekstra = Math.max(0, ruangV - kotak(q));

  // --- latar & bingkai ---
  c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H);
  rr(c, tepi, tepi, W - tepi * 2, H - tepi * 2, rad); c.fillStyle = latar; c.fill();
  c.save();
  rr(c, tepi, tepi, W - tepi * 2, H - tepi * 2, rad); c.clip();
  const gLatar = c.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .15, W / 2, H * .45, Math.max(W, H) * .75);
  gLatar.addColorStop(0, 'rgba(15,23,42,0)'); gLatar.addColorStop(1, 'rgba(15,23,42,.06)');
  c.fillStyle = gLatar; c.fillRect(0, 0, W, H);
  // gelombang kanan atas
  kurva([[W * .44, 0], [W * .62, 6 * k], [W * .7, 30 * k], [W, 50 * k], [W, 50 * k], [W, 0], [W, 0]], rgba(aksen, .16));
  const gAtas = c.createLinearGradient(W * .55, 0, W, 45 * k);
  gAtas.addColorStop(0, terang); gAtas.addColorStop(1, tua);
  kurva([[W * .56, 0], [W * .74, 5 * k], [W * .8, 27 * k], [W, 44 * k], [W, 44 * k], [W, 0], [W, 0]], gAtas);
  kurva([[W * .7, 0], [W * .85, 3 * k], [W * .9, 17 * k], [W, 25 * k], [W, 25 * k], [W, 0], [W, 0]], rgba(tua, .55));
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = .6 * k;
  c.beginPath(); c.moveTo(W * .6, 0); c.bezierCurveTo(W * .76, 6 * k, W * .82, 26 * k, W, 38 * k); c.stroke();
  titik(W - 29.4 * k, 8 * k, 7, 5, 3.3 * k, .35 * k, 'rgba(255,255,255,.75)');
  // gelombang bawah: kurva halus melewati titik (posisi x relatif, tinggi mm dari dasar) sesuai referensi
  const halus = (tt, geser, warna) => {
    const p = tt.map(v => [v[0] * W, H - Math.max(0, v[1] - geser) * k]);
    c.beginPath(); c.moveTo(p[0][0], p[0][1]);
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
      c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = warna; c.fill();
  };
  const gelombang = [[0, 19], [.08, 16.2], [.18, 10.8], [.3, 6.6], [.4, 7.4], [.5, 11.4], [.6, 16.4], [.7, 20.2], [.8, 21.6], [.88, 19.6], [.95, 15.2], [1, 11.5]];
  halus(gelombang, 0, rgba(aksen, .25));
  const gBawah = c.createLinearGradient(0, 0, W, 0);
  gBawah.addColorStop(0, campurWarna(aksen, '#000000', .12)); gBawah.addColorStop(.45, aksen); gBawah.addColorStop(.78, terang); gBawah.addColorStop(1, aksen);
  halus(gelombang, 2.2, gBawah);
  const gDasar = c.createLinearGradient(0, H - 22 * k, 0, H);
  gDasar.addColorStop(0, 'rgba(0,0,0,0)'); gDasar.addColorStop(1, rgba(tua, .4));
  halus(gelombang, 2.2, gDasar);
  const gTua = c.createLinearGradient(0, 0, W, 0);
  gTua.addColorStop(0, rgba(tua, .75)); gTua.addColorStop(.5, rgba(tua, .35)); gTua.addColorStop(1, rgba(tua, .5));
  halus(gelombang, 7.5, gTua);
  c.restore();
  rr(c, tepi + tebal / 2, tepi + tebal / 2, W - tepi * 2 - tebal, H - tepi * 2 - tebal, rad - tebal / 2);
  c.lineWidth = tebal; c.strokeStyle = aksen; c.stroke();

  // --- kepala: logo | nama aplikasi / instansi ---
  const xLogo = 15.3 * k;
  let tx = xLogo;
  if (t.TampilkanLogo !== 'Tidak') {
    bayang('rgba(15,23,42,.18)', 2.5 * k, .8 * k);
    gambarLogo(c, d.logoImg, xLogo, yLogo, sLogo);
    tanpaBayang();
    c.fillStyle = '#334155'; c.fillRect(xLogo + sLogo + 4.2 * k, yLogo + 2.9 * k, .35 * k, sLogo - 5.8 * k);
    tx = xLogo + sLogo + 7.8 * k;
  }
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = gelap;
  pasFont(c, d.identitas.namaAplikasi, 800, 9 * k, W * .72 - tx);
  c.fillText(d.identitas.namaAplikasi, tx, yLogo + 9.8 * k);
  c.font = '600 ' + 5.4 * k + 'px ' + FONT;
  if ('letterSpacing' in c) c.letterSpacing = (1.7 * k) + 'px';
  c.fillText(String(d.identitas.namaInstansi).toUpperCase(), tx, yLogo + 18.2 * k);
  if ('letterSpacing' in c) c.letterSpacing = '0px';

  // --- judul & banner ---
  c.textAlign = 'center'; c.fillStyle = gelap;
  pasFont(c, t.Judul, 800, 23 * k, W - 34 * k);
  c.fillText(t.Judul, W / 2, yJudul);
  const bw = Math.min(W - 28 * k, H * .9), bx = (W - bw) / 2;
  const gBanner = c.createLinearGradient(0, yBanner, 0, yBanner + hBanner);
  gBanner.addColorStop(0, terang); gBanner.addColorStop(1, campurWarna(aksen, '#000000', .12));
  bayang(rgba(aksen, .35), 3 * k, 1 * k);
  rr(c, bx, yBanner, bw, hBanner, hBanner / 2); c.fillStyle = gBanner; c.fill();
  tanpaBayang();
  c.fillStyle = '#FFFFFF'; pasFont(c, t.TeksBanner, 700, 7.8 * k, bw - 16 * k);
  c.textBaseline = 'middle'; c.fillText(t.TeksBanner, W / 2, yBanner + hBanner / 2 + .3 * k); c.textBaseline = 'alphabetic';

  // --- lokasi, KKMP, deskripsi ---
  const judulLok = 'INVENTARIS LOKASI ' + String(d.lokasi).toUpperCase();
  c.fillStyle = gelap; pasFont(c, judulLok, 800, 8.6 * k, lebar); c.fillText(judulLok, W / 2, yLok);
  c.fillStyle = abu; pasFont(c, d.kkmp, 500, 6 * k, lebar * .6);
  c.fillText(d.kkmp, W / 2, yKKMP);
  const lk = c.measureText(d.kkmp).width, pg = 27.8 * k, sela = 8 * k;
  c.fillStyle = aksen;
  c.fillRect(W / 2 - lk / 2 - sela - pg, yKKMP - 1.6 * k, pg, .35 * k);
  c.fillRect(W / 2 + lk / 2 + sela, yKKMP - 1.6 * k, pg, .35 * k);
  if (desk.length) {
    c.fillStyle = abu; c.font = '500 ' + 5.3 * k + 'px ' + FONT;
    desk.forEach((b, i) => c.fillText(b, W / 2, yDesk + i * lhDesk));
  }

  // --- QR Code dalam kartu putih + bingkai sudut ---
  const m = q / modul, padQ = m * 3, kartu = q + padQ * 2, kotakQ = kartu + celah * 2;
  const bxQ = (W - kotakQ) / 2, byQ = atasQR + ekstra / 2, cx0 = bxQ + celah, cy0 = byQ + celah, qx = cx0 + padQ, qy = cy0 + padQ;
  bayang('rgba(15,23,42,.14)', 5 * k, 1.6 * k);
  rr(c, cx0, cy0, kartu, kartu, 4.7 * k); c.fillStyle = '#FFFFFF'; c.fill();
  tanpaBayang();
  if (d.qr) {
    c.fillStyle = '#000000';
    d.qr.modul.forEach((r, yy) => r.forEach((v, xx) => { if (v) c.fillRect(qx + xx * m, qy + yy * m, m + .01, m + .01); }));
    if (t.LogoTengahQR === 'Ya') {
      const ls = q * .19, lb = ls + m * 1.6;
      c.fillStyle = '#FFFFFF'; rr(c, W / 2 - lb / 2, qy + q / 2 - lb / 2, lb, lb, 2.2 * k); c.fill();
      gambarLogo(c, d.logoImg, W / 2 - ls / 2, qy + q / 2 - ls / 2, ls);
    }
  } else {
    c.strokeStyle = '#94A3B8'; c.lineWidth = .8 * k; c.setLineDash([3 * k, 2 * k]); c.strokeRect(qx, qy, q, q); c.setLineDash([]);
    c.fillStyle = '#64748B'; c.textBaseline = 'middle'; c.font = '700 ' + 7 * k + 'px ' + FONT;
    c.fillText('[QR Code]', W / 2, qy + q / 2); c.textBaseline = 'alphabetic';
  }
  const lengan = Math.max(14 * k, kotakQ * .19), rs = 3.5 * k;
  c.strokeStyle = aksen; c.lineWidth = 2.2 * k; c.lineCap = 'round'; c.lineJoin = 'round';
  bayang(rgba(aksen, .3), 2 * k, .6 * k);
  [[bxQ, byQ, 1, 1], [bxQ + kotakQ, byQ, -1, 1], [bxQ, byQ + kotakQ, 1, -1], [bxQ + kotakQ, byQ + kotakQ, -1, -1]].forEach(p => {
    c.beginPath(); c.moveTo(p[0], p[1] + p[3] * lengan);
    c.arcTo(p[0], p[1], p[0] + p[2] * lengan, p[1], rs);
    c.lineTo(p[0] + p[2] * lengan, p[1]); c.stroke();
  });
  tanpaBayang(); c.lineCap = 'butt';
  titik(8 * k, byQ + kotakQ - 18 * k, 6, 5, 4 * k, .3 * k, rgba(aksen, .22));

  // --- kotak informasi bawah ---
  if (kaki.length) {
    const ky = byQ + kotakQ + ekstra / 2 + 10.4 * k;
    const gKaki = c.createLinearGradient(0, ky, 0, ky + hKaki);
    gKaki.addColorStop(0, '#FFFFFF'); gKaki.addColorStop(1, campurWarna(aksen, '#FFFFFF', .95));
    bayang('rgba(15,23,42,.08)', 4 * k, 1.5 * k);
    rr(c, kx, ky, kw, hKaki, 4.3 * k); c.fillStyle = gKaki; c.fill();
    tanpaBayang();
    c.strokeStyle = aksen; c.lineWidth = .3 * k; c.stroke();
    const ix = kx + 10.8 * k, iy = ky + hKaki / 2;
    c.beginPath(); c.arc(ix, iy, 5.9 * k, 0, Math.PI * 2); c.lineWidth = 1.2 * k; c.stroke();
    c.fillStyle = aksen; c.font = '800 ' + 7.4 * k + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('i', ix, iy + .3 * k);
    c.fillRect(kx + 20.6 * k, ky + 3.7 * k, .55 * k, hKaki - 7.6 * k);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = '#1F2937'; c.font = '500 ' + 5.1 * k + 'px ' + FONT;
    kaki.forEach((b, i) => c.fillText(b, kx + teksX, ky + 9.2 * k + i * 6.9 * k));
  }
  return { qrCm: Math.round(q) / 10 };
}

function kertasUntuk(nama, dim) {
  const k = KERTAS[nama], potret = dim[1] >= dim[0];
  const ukuran = potret ? [Math.min(k[0], k[1]), Math.max(k[0], k[1])] : [Math.max(k[0], k[1]), Math.min(k[0], k[1])];
  return { ukuran: ukuran, muat: dim[0] <= ukuran[0] && dim[1] <= ukuran[1] };
}

function buatPDF(halaman) {
  const enc = s => { const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
  const bagian = [], offset = [];
  let panjang = 0;
  const tulis = d => { const b = typeof d === 'string' ? enc(d) : d; bagian.push(b); panjang += b.length; };
  const pt = mm => (mm * 72 / 25.4).toFixed(2);
  const obj = (id, isi) => { offset[id] = panjang; tulis(id + ' 0 obj\n'); isi(); tulis('\nendobj\n'); };
  const idHal = i => 3 + i * 3, idIsi = i => 4 + i * 3, idImg = i => 5 + i * 3;
  tulis('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, () => tulis('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => tulis('<< /Type /Pages /Kids [' + halaman.map((_, i) => idHal(i) + ' 0 R').join(' ') + '] /Count ' + halaman.length + ' >>'));
  halaman.forEach((h, i) => {
    obj(idHal(i), () => tulis('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pt(h.wmm) + ' ' + pt(h.hmm) + '] /Resources << /XObject << /Im' + i + ' ' + idImg(i) + ' 0 R >> >> /Contents ' + idIsi(i) + ' 0 R >>'));
    let s = 'q ' + pt(h.w) + ' 0 0 ' + pt(h.h) + ' ' + pt(h.x) + ' ' + pt(h.hmm - h.y - h.h) + ' cm /Im' + i + ' Do Q\n';
    if (h.tanda) {
      const L = 5, J = 2, x0 = h.x, y0 = h.y, x1 = h.x + h.w, y1 = h.y + h.h;
      s += '0.3 w 0 0 0 RG\n';
      const garis = (ax, ay, bx, by) => { s += pt(ax) + ' ' + pt(h.hmm - ay) + ' m ' + pt(bx) + ' ' + pt(h.hmm - by) + ' l S\n'; };
      [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(p => {
        const sx = p[0] === x0 ? -1 : 1, sy = p[1] === y0 ? -1 : 1;
        garis(p[0] + sx * J, p[1], p[0] + sx * (J + L), p[1]);
        garis(p[0], p[1] + sy * J, p[0], p[1] + sy * (J + L));
      });
    }
    obj(idIsi(i), () => { tulis('<< /Length ' + s.length + ' >>\nstream\n'); tulis(s); tulis('\nendstream'); });
    obj(idImg(i), () => {
      tulis('<< /Type /XObject /Subtype /Image /Width ' + h.gambar.w + ' /Height ' + h.gambar.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + h.gambar.bytes.length + ' >>\nstream\n');
      tulis(h.gambar.bytes); tulis('\nendstream');
    });
  });
  const total = 3 + halaman.length * 3, xref = panjang;
  let x = 'xref\n0 ' + total + '\n0000000000 65535 f \n';
  for (let id = 1; id < total; id++) x += String(offset[id]).padStart(10, '0') + ' 00000 n \n';
  tulis(x + 'trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(bagian, { type: 'application/pdf' });
}

function cetakArea(html, ukuran, alir) {
  return new Promise(res => {
    $('area-cetak').innerHTML = html;
    $('gaya-cetak').textContent = alir
      ? '@page{size:' + ukuran + ';margin:10mm}'
      : '@page{size:' + ukuran[0] + 'mm ' + ukuran[1] + 'mm;margin:0}.cetak-halaman{width:' + ukuran[0] + 'mm;height:' + ukuran[1] + 'mm}';
    const gambar = $$('#area-cetak img');
    Promise.all(gambar.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => {
      setTimeout(() => {
        window.print();
        setTimeout(() => { $('area-cetak').innerHTML = ''; $('gaya-cetak').textContent = ''; res(); }, 600);
      }, 120);
    });
  });
}

async function cetakStiker(daftar, p, L, qrmini) {
  const logo = await logoStiker(), w = p.w * 10, h = p.h * 10;
  const sel = (b, x, y) => '<div class="cetak-sel" style="left:' + r2(x) + 'mm;top:' + r2(y) + 'mm;width:' + w + 'mm;height:' + h + 'mm">' + stikerSvg(b, p.w, p.h, { qrmini: qrmini, logo: logo }) + '</div>';
  if (L.mode === 'satu') {
    return cetakArea(daftar.map(b => '<div class="cetak-halaman">' + sel(b, 0, 0) + '</div>').join(''), [w, h]);
  }
  const per = L.kolom * L.baris, m = L.margin * 10, g = L.jarak * 10, halaman = [];
  for (let i = 0; i < daftar.length; i += per) {
    halaman.push('<div class="cetak-halaman">' + daftar.slice(i, i + per).map((b, j) => sel(b, m + (j % L.kolom) * (w + g), m + Math.floor(j / L.kolom) * (h + g))).join('') + '</div>');
  }
  return cetakArea(halaman.join(''), KERTAS[L.kertas]);
}
// ===== AKHIR BLOK: GAMBAR_CETAK =====


// ===== BLOK: PUBLIK =====
const P = { lokasi: null, f: { q: '', kategori: '', kondisi: '', hal: 1, per: 15 }, barang: null, foto: 0, dariLokasi: false, stream: null, detektor: null, timer: 0 };

function tampilPub(id) {
  ['pub-pindai', 'pub-lokasi', 'pub-barang', 'pub-galat', 'pub-memuat'].forEach(x => tampil(x, x === id));
  window.scrollTo(0, 0);
}
function bukaPublik(h, d) {
  tampilLayar('hal-publik');
  if (h === 'lokasi') bukaP2(d.kkmp, d.id, d.q);
  else if (h === 'barang') bukaP3(d.kode, false);
  else bukaP1();
}
function bukaP1() {
  hentikanKamera();
  tampilPub('pub-pindai');
  tampil('form-kode-manual', false);
  tampil('pindai-galat', false);
}
function galatPublik(judul, pesan) {
  hentikanKamera();
  $('pg-judul').textContent = judul;
  $('pg-pesan').textContent = pesan;
  tampilPub('pub-galat');
}
function pesanPindai(t) { $('pindai-galat').textContent = t; tampil('pindai-galat', true); }

async function bukaP2(kkmp, id, q) {
  hentikanKamera();
  tampilPub('pub-memuat');
  try {
    const d = await publik('lokasi', [kkmp, id, q]);
    P.lokasi = d;
    P.f = { q: '', kategori: '', kondisi: '', hal: 1, per: Number($('pl-perhal').value) || 15 };
    if (d.identitas) isiIdentitas(d.identitas);
    $('pl-judul').textContent = 'INVENTARIS LOKASI ' + String(d.lokasi.nama).toUpperCase();
    $('pl-kkmp').textContent = d.kkmp.nama;
    $('pl-jumlah').textContent = angka(d.jumlah);
    $('pl-jml-kategori').textContent = angka(d.jumlahKategori);
    $('pl-baik').textContent = angka(d.kondisi.baik);
    $('pl-ringan').textContent = angka(d.kondisi.rusakRingan);
    $('pl-berat').textContent = angka(d.kondisi.rusakBerat);
    $('pl-cari').value = '';
    isiPilih($('pl-kategori'), d.kategori, { semua: 'Semua Kategori', pilih: '' });
    isiPilih($('pl-kondisi'), ['Baik', 'Rusak Ringan', 'Rusak Berat'], { semua: 'Semua Kondisi', pilih: '' });
    tampilPub('pub-lokasi');
    renderP2();
  } catch (e) {
    galatPublik(e.kode === 'TIDAK_VALID' ? 'QR Code Tidak Valid' : 'Gagal Memuat Data', e.message);
  }
}
function renderP2() {
  const f = P.f, d = P.lokasi, tb = $('pl-tbody');
  const data = d.barang.filter(b => (!f.kategori || b.kategori === f.kategori) && (!f.kondisi || b.kondisi === f.kondisi) &&
    (!f.q || (b.nama + ' ' + b.spesifikasi + ' ' + b.kodeBarang).toLowerCase().indexOf(f.q) >= 0));
  f.hal = renderPaging($('pl-paging'), $('pl-info'), data.length, f.hal, f.per, h => { P.f.hal = h; renderP2(); });
  if (!data.length) return barisKosong(tb, d.barang.length ? 'Tidak ada barang yang cocok dengan pencarian.' : 'Belum ada inventaris di lokasi ini.', 'i-clipboard');
  const mulai = (f.hal - 1) * f.per;
  tb.innerHTML = data.slice(mulai, mulai + f.per).map((b, i) => '<tr>' +
    '<td class="kol-no" data-label="No">' + (mulai + i + 1) + '</td>' +
    '<td data-label="Foto">' + fotoMini(b.foto) + '</td>' +
    '<td data-label="Nama Barang"><span class="sel-dua"><b>' + esc(b.nama) + '</b>' + (b.spesifikasi && b.spesifikasi !== b.nama ? '<small>' + esc(b.spesifikasi) + '</small>' : '') + '</span></td>' +
    '<td data-label="Kode Barang"><span class="kode-mono">' + esc(nilai(b.kodeBarang)) + '</span></td>' +
    '<td data-label="Kategori">' + esc(b.kategori) + '</td>' +
    '<td data-label="Kondisi">' + badgeKondisi(b.kondisi) + '</td>' +
    '<td class="kol-aksi" data-label=""><button class="tombol-lihat" type="button" data-kode="' + esc(b.kode) + '">' + ikon('i-eye') + 'Lihat</button></td></tr>').join('');
}

async function bukaP3(kode, dariLokasi) {
  hentikanKamera();
  tampilPub('pub-memuat');
  try {
    const d = await publik('barang', [kode]);
    P.barang = d; P.foto = 0; P.dariLokasi = !!dariLokasi;
    if (d.identitas) isiIdentitas(d.identitas);
    renderP3();
    tampilPub('pub-barang');
  } catch (e) {
    galatPublik(e.kode === 'TIDAK_ADA' ? 'Data Tidak Tersedia' : 'Gagal Memuat Data', e.message);
  }
}
function dl(baris) { return baris.map(r => '<dt>' + esc(r[0]) + '</dt><dd>' + (r[2] ? r[1] : esc(nilai(r[1]))) + '</dd>').join(''); }
function renderP3() {
  const b = P.barang;
  const nomor = [['Pabrik', b.nomorPabrik], ['Rangka', b.nomorRangka], ['Polisi', b.nomorPolisi], ['BPKB', b.nomorBPKB]]
    .filter(x => x[1]).map(x => esc(x[0]) + ' No. ' + esc(x[1])).join('<br>') || '-';
  $('pb-singkat').innerHTML = dl([['Kode Barang', b.kodeBarang], ['Nama Barang', b.nama], ['Kondisi', badgeKondisi(b.kondisi), true]]);
  $('pb-detail1').innerHTML = dl([['Kode Barang', b.kodeBarang], ['Nama Barang / Jenis Barang', b.nama], ['KKMP', b.kkmp], ['Lokasi Unit', b.lokasi],
    ['Kategori', b.kategori], ['Spesifikasi Unit', b.spesifikasi], ['Nomor Register', b.nomorRegister], ['Merk Type', b.merkType], ['Ukuran / CC', b.ukuranCC], ['Bahan', b.bahan]]);
  $('pb-detail2').innerHTML = dl([['Tahun Pembelian', b.tahun], ['Nomor', nomor, true], ['Asal Usul', b.asalUsul], ['Harga', rupiah(b.harga)],
    ['Kondisi', badgeKondisi(b.kondisi), true], ['Keterangan', b.keterangan]]);
  renderFotoP3();
}
function renderFotoP3() {
  const f = P.barang.foto, ada = f.length > 0, banyak = f.length > 1;
  tampil('pb-foto', ada); tampil('pb-foto-kosong', !ada); tampil('pb-hitung', ada);
  tampil('pb-sebelum', banyak); tampil('pb-berikut', banyak);
  if (ada) { $('pb-foto').src = f[P.foto]; $('pb-foto').referrerPolicy = 'no-referrer'; $('pb-hitung').querySelector('b').textContent = (P.foto + 1) + ' / ' + f.length; }
  $('pb-titik').innerHTML = banyak ? f.map((_, i) => '<span class="' + (i === P.foto ? 'aktif' : '') + '"></span>').join('') : '';
}
function geserFoto(arah) {
  const n = P.barang.foto.length;
  P.foto = (P.foto + arah + n) % n;
  renderFotoP3();
}
function kembaliP3() {
  if (P.dariLokasi && P.lokasi) return tampilPub('pub-lokasi');
  const k = P.barang && P.barang.kembali;
  if (k) bukaP2(k.kkmp, k.id, k.q); else bukaP1();
}

async function mulaiPindai() {
  tampil('pindai-galat', false);
  if (!('BarcodeDetector' in window)) {
    return pesanPindai('Browser ini belum mendukung pemindaian langsung. Gunakan aplikasi kamera HP untuk memindai QR Code, atau pilih Masukkan Kode Manual.');
  }
  try {
    const dukung = await window.BarcodeDetector.getSupportedFormats();
    P.detektor = new window.BarcodeDetector({ formats: ['qr_code', 'code_128'].filter(f => dukung.indexOf(f) >= 0) });
  } catch (e) { return pesanPindai('Pemindai tidak dapat dijalankan di browser ini. Pilih Masukkan Kode Manual.'); }
  try {
    P.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    const v = $('pindai-video');
    v.srcObject = P.stream;
    await v.play();
    tampil(v, true); tampil('pindai-petunjuk', false);
    $('btn-scan-kamera').innerHTML = ikon('i-x') + 'Hentikan Kamera';
    deteksiKamera();
  } catch (e) {
    hentikanKamera();
    $('pindai-foto').click();
  }
}
function deteksiKamera() {
  if (!P.stream) return;
  P.detektor.detect($('pindai-video')).then(h => {
    if (h.length) { const t = h[0].rawValue; hentikanKamera(); prosesPindai(t); }
    else P.timer = setTimeout(deteksiKamera, 250);
  }).catch(() => { P.timer = setTimeout(deteksiKamera, 400); });
}
function hentikanKamera() {
  clearTimeout(P.timer);
  if (P.stream) P.stream.getTracks().forEach(t => t.stop());
  P.stream = null;
  const v = $('pindai-video');
  v.srcObject = null;
  tampil(v, false); tampil('pindai-petunjuk', true);
  $('btn-scan-kamera').innerHTML = ikon('i-camera') + 'Scan dengan Kamera';
}
async function fotoPindai(e) {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !P.detektor) return;
  try {
    const bmp = await createImageBitmap(f);
    const h = await P.detektor.detect(bmp);
    if (h.length) prosesPindai(h[0].rawValue); else pesanPindai('Kode tidak terbaca. Coba foto lebih dekat dan lebih terang.');
  } catch (er) { pesanPindai('Gambar tidak dapat dibaca.'); }
}
function prosesPindai(teks) {
  teks = String(teks || '').trim();
  const i = teks.indexOf('?');
  if (i >= 0 && /[?&]p=(lokasi|barang)(&|$)/.test(teks)) {
    const q = new URLSearchParams(teks.slice(i + 1));
    if (q.get('p') === 'lokasi') return bukaP2(q.get('kkmp'), q.get('id'), q.get('q'));
    return bukaP3(q.get('kode'), false);
  }
  cariKode(teks);
}
async function cariKode(kode) {
  const btn = $('btn-cari-kode');
  sibuk(btn, true);
  tampil('pindai-galat', false);
  try {
    const r = await publik('cariKode', [kode]);
    if (r.jenis === 'barang') bukaP3(r.kode, false); else bukaP2(r.kkmp, r.id, r.q);
  } catch (e) {
    tampilPub('pub-pindai');
    pesanPindai(e.message);
  } finally { sibuk(btn, false); }
}
// ===== AKHIR BLOK: PUBLIK =====


// ===== BLOK: AUTH_APP =====
function tampilLogin() {
  tampilLayar('hal-login');
  $('login-password').value = '';
  tampil('login-galat', false);
}
async function prosesLogin(e) {
  e.preventDefault();
  const btn = $('btn-login');
  tampil('login-galat', false);
  sibuk(btn, true);
  try {
    const r = await jalankan('login', [$('login-username').value, $('login-password').value]);
    S.token = r.token;
    simpanToken(r.token);
    $('login-password').value = '';
    await muatAplikasi();
  } catch (er) {
    pesanForm('login-galat', er.message);
  } finally { sibuk(btn, false); }
}
async function muatAplikasi() {
  tampil('layar-muat', true);
  try {
    const d = await panggil('muatAwal');
    terimaAwal(d);
    if (d.user.wajibGanti) { tampilLayar('hal-ganti'); return; }
    siapkanApp();
  } catch (e) {
    tampil('layar-muat', false);
    if (e.kode !== 'SESI') { hapusToken(); tampilLogin(); galat(e); }
  }
}
function terimaAwal(d) {
  S.awal = d; S.user = d.user; S.dash = d.dashboard;
  S.baseUrl = d.baseUrl || DATA_AWAL.baseUrl || '';
  isiIdentitas({ namaAplikasi: d.pengaturan.NamaAplikasi, namaInstansi: d.pengaturan.NamaInstansi });
}
function siapkanApp() {
  const u = S.user;
  S.peran = u.kodeRole;
  S.multi = S.peran !== 'M' && (u.cakupan === 'SEMUA' || (Array.isArray(u.cakupan) && u.cakupan.length > 1));
  $$('.hanya-admin').forEach(e => tampil(e, S.peran === 'A'));
  $$('.hanya-kelola').forEach(e => tampil(e, S.peran !== 'V'));
  $$('.hanya-multi').forEach(e => tampil(e, S.multi));
  $$('.sembunyi-manager').forEach(e => tampil(e, S.peran !== 'M'));
  const menu = MENU_PERAN[S.peran];
  $$('.nav-item').forEach(b => tampil(b, menu.indexOf(b.dataset.menu) >= 0));
  tampil('nav-grup-admin', S.peran === 'A');
  isiProfilHeader();
  tampilLayar('hal-app');
  bukaMenu('m1');
}
function isiProfilHeader() {
  const u = S.user;
  $('avatar').textContent = inisial(u.nama);
  $('profil-nama').textContent = u.nama;
  $('profil-role').textContent = u.role;
  tampil('topbar-kkmp', S.peran === 'M');
  $('topbar-kkmp').querySelector('b').textContent = u.namaKKMP || '';
}
function bukaMenu(m) {
  if (!S.peran || MENU_PERAN[S.peran].indexOf(m) < 0) return;
  S.menu = m;
  $$('.nav-item').forEach(b => b.classList.toggle('aktif', b.dataset.menu === m));
  $$('.bagian').forEach(s => tampil(s, s.id === m));
  $('judul-halaman').textContent = (m === 'm1' && S.peran === 'M') ? 'Dashboard Inventaris' : JUDUL[m];
  $('sub-halaman').textContent = S.peran === 'M' ? S.user.role : (S.multi ? 'Semua KKMP dalam cakupan' : namaKKMP((S.awal.kkmp[0] || {}).ID));
  tutupSidebar();
  tampil('menu-profil', false);
  window.scrollTo(0, 0);
  MODUL[m].buka();
}
function tutupSidebar() { $('sidebar').classList.remove('terbuka'); tampil('lapisan-sidebar', false); }
function resetState() {
  Object.assign(S, { token: '', awal: null, user: null, peran: '', multi: false, menu: '', dash: null, inv: null, lok: null, kat: null, kkmpList: null, pengguna: null, lap: null, peng: null });
  ['pilih2', 'pilih5', 'pilih6', 'pilih7'].forEach(k => { S[k] = new Set(); });
  Object.keys(S.grafik).forEach(k => { if (S.grafik[k]) S.grafik[k].destroy(); });
  S.grafik = {};
  // Kembalikan filter & pilihan KKMP tiap menu ke awal, agar akun berikutnya (mis. Manager Koperasi) tidak mewarisi pilihan akun sebelumnya.
  M1.kkmp = ''; M1.lokKkmp = '';
  M2.f = { q: '', kkmp: '', lokasi: '', kategori: '', kondisi: '', urut: 'NamaBarang', arah: 1, hal: 1, per: 15 };
  M3.f = { q: '', kkmp: '' };
  Object.assign(ED, { siap: false, kkmp: '', lokasi: '', target: 'kkmp', tpl: null, tplKkmp: null, sumber: '' });
  M5.f = { q: '', kkmp: '' };
  M6.f = { q: '', kkmp: '', lokasi: '', kategori: '' };
  Object.assign(M7, { kkmp: '', f: { q: '', lokasi: '', kategori: '' }, L: null, tab: 'm7-panel-qr' });
  Object.assign(M8, { f: {}, jenis: 'total', siap: false });
  M9.logDimuat = false;
  M11.f = { q: '', role: '', kkmp: '', status: '', manager: false };
  $$('.cari .masukan').forEach(i => { i.value = ''; });
}
function keluar() {
  const t = S.token;
  hapusToken();
  if (t) jalankan('logout', [t]).catch(() => {});
  $$('.modal').forEach(m => tampil(m, false));
  document.body.style.overflow = '';
  resetState();
  tampilLogin();
}
function sesiBerakhir() {
  hapusToken();
  $$('.modal').forEach(m => tampil(m, false));
  resetState();
  tampilLogin();
}
async function prosesGantiWajib(e) {
  e.preventDefault();
  const btn = $('fg-simpan');
  sibuk(btn, true);
  tampil('fg-galat', false);
  try {
    await panggil('gantiPassword', $('fg-lama').value, $('fg-baru').value);
    $('fg-lama').value = ''; $('fg-baru').value = '';
    toast('Password berhasil diganti.');
    await muatAplikasi();
  } catch (er) {
    pesanForm('fg-galat', er.message);
  } finally { sibuk(btn, false); }
}

function pasangUmum() {
  $('form-login').onsubmit = prosesLogin;
  $('btn-lihat-password').onclick = () => {
    const i = $('login-password'), lihat = i.type === 'password';
    i.type = lihat ? 'text' : 'password';
    $('btn-lihat-password').innerHTML = ikon(lihat ? 'i-eye-off' : 'i-eye');
  };
  $('btn-lupa').onclick = () => tampil('login-lupa-info', $('login-lupa-info').classList.contains('tersembunyi'));
  $('btn-akses-qr').onclick = () => { tampilLayar('hal-publik'); bukaP1(); };
  $('form-ganti').onsubmit = prosesGantiWajib;
  $('fg-keluar').onclick = keluar;
  $('btn-tema').onclick = () => terapkanTema(document.documentElement.getAttribute('data-tema') === 'gelap' ? 'terang' : 'gelap');
  $('btn-profil').onclick = e => { e.stopPropagation(); tampil('menu-profil', $('menu-profil').classList.contains('tersembunyi')); };
  $('mp-profil').onclick = () => bukaMenu('m12');
  $('mp-keluar').onclick = keluar;
  $$('.nav-item').forEach(b => { b.onclick = () => bukaMenu(b.dataset.menu); });
  $('btn-menu').onclick = () => { $('sidebar').classList.add('terbuka'); tampil('lapisan-sidebar', true); };
  $('lapisan-sidebar').onclick = tutupSidebar;
  document.addEventListener('click', e => {
    if (!e.target.closest('.profil-wadah')) tampil('menu-profil', false);
    const t = e.target.closest('[data-tutup]');
    if (t) tutupModal(t.closest('.modal').id);
  });
  $('mk-ya').onclick = () => jawabKonfirmasi(true);
  $('mk-batal').onclick = () => jawabKonfirmasi(false);

  $('btn-scan-kamera').onclick = () => { if (P.stream) hentikanKamera(); else mulaiPindai(); };
  $('btn-kode-manual').onclick = () => { hentikanKamera(); tampil('form-kode-manual', true); $('input-kode-manual').focus(); };
  $('form-kode-manual').onsubmit = e => { e.preventDefault(); const v = $('input-kode-manual').value.trim(); if (v) prosesPindai(v); };
  $('pindai-foto').onchange = fotoPindai;
  $('pl-cari').oninput = tunda(e => { P.f.q = e.target.value.trim().toLowerCase(); P.f.hal = 1; renderP2(); });
  $('pl-kategori').onchange = e => { P.f.kategori = e.target.value; P.f.hal = 1; renderP2(); };
  $('pl-kondisi').onchange = e => { P.f.kondisi = e.target.value; P.f.hal = 1; renderP2(); };
  $('pl-perhal').onchange = e => { P.f.per = Number(e.target.value); P.f.hal = 1; renderP2(); };
  $('pl-reset').onclick = () => {
    P.f = { q: '', kategori: '', kondisi: '', hal: 1, per: P.f.per };
    $('pl-cari').value = ''; $('pl-kategori').value = ''; $('pl-kondisi').value = '';
    renderP2();
  };
  $('pl-tbody').onclick = e => { const b = e.target.closest('[data-kode]'); if (b) bukaP3(b.dataset.kode, true); };
  $('pb-beranda').onclick = bukaP1;
  $('pg-pindai').onclick = bukaP1;
  $('pb-kembali').onclick = kembaliP3;
  $('pb-sebelum').onclick = () => geserFoto(-1);
  $('pb-berikut').onclick = () => geserFoto(1);
  $('pb-tampil-barcode').onclick = () => {
    $('mbp-barcode').innerHTML = C128.svg(P.barang.kode, { tinggi: 70 });
    $('mbp-kode').textContent = P.barang.kode;
    bukaModal('modal-barcode-publik');
  };
}
// ===== AKHIR BLOK: AUTH_APP =====

// ===== BLOK: M1_DASHBOARD =====
var M1 = {
  kkmp: '', lokKkmp: '',
  pasang() {
    $('m1-kkmp').onchange = e => { M1.kkmp = e.target.value; M1.muat(); };
    $('m1-tab-lokasi').onclick = e => {
      const b = e.target.closest('[data-kkmp]');
      if (b) { M1.lokKkmp = b.dataset.kkmp; M1.renderLokasi(); }
    };
  },
  buka() {
    opsiKKMP($('m1-kkmp'), 'Semua KKMP', M1.kkmp);
    if (S.dash) M1.render(); else M1.muat();
  },
  async muat() {
    $('m1-kartu').innerHTML = Array(6).fill(kartuStat('Memuat...', '…', 'i-activity', 'warna-abu')).join('');
    try {
      S.dash = await panggil('dashboard', M1.kkmp);
      if (S.menu === 'm1') M1.render();
    } catch (e) {
      galat(e);
      $('m1-kartu').innerHTML = '<div class="kosong">' + ikon('i-alert') + '<span>Gagal memuat dashboard.</span></div>';
    }
  },
  render() {
    const d = S.dash, k = d.kartu;
    const kartu = [
      ['Total Barang', k.totalBarang, 'i-box', 'warna-merah'], ['Total Lokasi Unit', k.totalLokasi, 'i-pin', 'warna-biru'],
      ['Total Kategori', k.totalKategori, 'i-tag', 'warna-ungu'], ['Kondisi Baik', k.baik, 'i-check-circle', 'warna-hijau'],
      ['Rusak Ringan', k.rusakRingan, 'i-alert', 'warna-kuning'], ['Rusak Berat', k.rusakBerat, 'i-x-circle', 'warna-merah']
    ];
    if (S.peran === 'A') kartu.push(['Total KKMP', k.totalKKMP, 'i-building', 'warna-abu'], ['Pengguna Aktif', k.totalPenggunaAktif, 'i-users', 'warna-biru']);
    $('m1-kartu').innerHTML = kartu.map(x => kartuStat(x[0], angka(x[1]), x[2], x[3])).join('');

    M1.renderLokasi();
    if (S.peran === 'A') {
      const tk = $('m1-tbody-kkmp'), pk = d.perKKMP || [];
      if (!pk.length) barisKosong(tk, 'Belum ada KKMP.', 'i-building');
      else {
        tk.innerHTML = pk.map(x => '<tr><td data-label="KKMP"><b>' + esc(x.nama) + '</b></td><td data-label="Status">' + badgeStatus(x.status) + '</td>' +
          '<td class="kol-angka" data-label="Lokasi">' + angka(x.lokasi) + '</td><td class="kol-angka" data-label="Jumlah">' + angka(x.jumlah) + '</td>' +
          '<td class="kol-angka" data-label="Baik">' + angka(x.baik) + '</td><td class="kol-angka" data-label="Rusak Ringan">' + angka(x.rusakRingan) + '</td>' +
          '<td class="kol-angka" data-label="Rusak Berat">' + angka(x.rusakBerat) + '</td><td class="kol-angka" data-label="Total Nilai">' + rupiah(x.nilai) + '</td></tr>').join('');
      }
    }
    const a = d.analitik;
    $('m1-analitik').innerHTML = [
      ['i-x-circle', 'warna-merah', 'Rusak Berat Terbanyak per Lokasi', a.rusakBeratTerbanyak.length
        ? a.rusakBeratTerbanyak.map(x => x.nama + (S.multi ? ' (' + x.kkmp + ')' : '') + ': ' + x.jumlah).join(' · ') : 'Tidak ada barang rusak berat.'],
      ['i-image', 'warna-kuning', 'Barang Tanpa Foto', angka(a.tanpaFoto) + ' barang'],
      ['i-eye-off', 'warna-abu', 'Disembunyikan dari Publik', angka(a.disembunyikan) + ' barang']
    ].map(x => '<div class="analitik-item"><span class="stat-ikon ' + x[1] + '">' + ikon(x[0]) + '</span><div><p class="analitik-judul">' + esc(x[2]) +
      '</p><p class="analitik-isi">' + esc(x[3]) + '</p></div></div>').join('');
    $('m1-aktivitas').innerHTML = d.aktivitas.length ? d.aktivitas.map(itemAktivitas).join('') : '<li class="teks-redup">Belum ada aktivitas.</li>';
    M1.grafik();
  },
  // Ringkasan Jumlah Barang per Lokasi. Administrator (Semua KKMP): tombol per KKMP, tabel hanya menampilkan KKMP terpilih.
  renderLokasi() {
    const d = S.dash, tl = $('m1-tbody-lokasi');
    const daftarK = d.perLokasi.map(l => l.kkmp).filter((v, i, a) => a.indexOf(v) === i);
    const pakaiTab = S.peran === 'A' && !M1.kkmp && daftarK.length > 1;
    if (daftarK.indexOf(M1.lokKkmp) < 0) M1.lokKkmp = daftarK[0] || '';
    tampil('m1-tab-lokasi', pakaiTab);
    $('m1-tab-lokasi').innerHTML = pakaiTab ? daftarK.map(n => '<button type="button" class="tab-item' + (n === M1.lokKkmp ? ' aktif' : '') +
      '" data-kkmp="' + esc(n) + '">' + esc(n) + '</button>').join('') : '';
    const rows = pakaiTab ? d.perLokasi.filter(l => l.kkmp === M1.lokKkmp) : d.perLokasi;
    if (!rows.length) return barisKosong(tl, 'Belum ada lokasi unit.', 'i-pin');
    tl.innerHTML = rows.map(l => '<tr><td data-label="Lokasi Unit"><b>' + esc(l.nama) + '</b></td>' +
      (S.multi ? '<td data-label="KKMP">' + esc(l.kkmp) + '</td>' : '') +
      '<td class="kol-angka" data-label="Jumlah">' + angka(l.jumlah) + '</td>' +
      '<td class="kol-angka" data-label="Baik">' + angka(l.baik) + '</td>' +
      '<td class="kol-angka" data-label="Rusak Ringan">' + angka(l.rusakRingan) + '</td>' +
      '<td class="kol-angka" data-label="Rusak Berat">' + angka(l.rusakBerat) + '</td></tr>').join('');
  },
  async grafik() {
    try { await muatChart(); } catch (e) { return; }
    if (S.menu !== 'm1' || !S.dash) return;
    const d = S.dash, gaya = getComputedStyle($('hal-app'));
    const hp = window.innerWidth <= 640;
    const teks = gaya.getPropertyValue('--muted').trim(), garis = gaya.getPropertyValue('--border').trim();
    window.Chart.defaults.font.family = '"Plus Jakarta Sans", Arial, sans-serif';
    window.Chart.defaults.color = teks;
    const sumbu = () => ({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { x: { grid: { color: garis } }, y: { beginAtZero: true, grid: { color: garis }, ticks: { precision: 0 } } } });
    const buat = (id, cfg) => { if (S.grafik[id]) S.grafik[id].destroy(); S.grafik[id] = new window.Chart($(id), cfg); };
    // Administrator tanpa filter KKMP: satu batang per KKMP (total GERAI + KLINIK + GUDANG). Selain itu: per lokasi unit.
    const perKKMP = S.peran === 'A' && !M1.kkmp && Array.isArray(d.perKKMP);
    // Desktop: label tegak bersusun per kata. HP: label satu baris dimiringkan agar tidak bertumpuk.
    const kata = t => hp ? String(t) : String(t).split(/\s+/).filter(String);
    const grafikLok = perKKMP ? d.perKKMP.map(x => ({ label: kata(x.nama), jumlah: x.jumlah }))
      : d.perLokasi.map(l => ({ label: S.multi && !M1.kkmp ? (hp ? l.nama + ' – ' + l.kkmp : [l.nama].concat(kata(l.kkmp))) : l.nama, jumlah: l.jumlah }));
    const opsiLok = sumbu();
    opsiLok.scales.x.ticks = { maxRotation: hp ? 60 : 0, minRotation: hp ? 60 : 0, autoSkip: false, font: { size: hp ? 10 : 12 } };
    buat('m1-grafik-lokasi', { type: 'bar', data: {
      labels: grafikLok.map(x => x.label),
      datasets: [{ label: 'Jumlah Barang', data: grafikLok.map(x => x.jumlah), backgroundColor: '#E11D2A', borderRadius: 6, maxBarThickness: 38 }] }, options: opsiLok });
    buat('m1-grafik-kondisi', { type: 'doughnut', data: {
      labels: d.perKondisi.map(x => x.nama),
      datasets: [{ data: d.perKondisi.map(x => x.jumlah), backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom',
        labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: hp ? 10 : 12, boxHeight: hp ? 10 : 12, padding: hp ? 10 : 16, font: { size: hp ? 12 : 13 } } } } } });
    const cp = d.capaian || { kendaraan: { realisasi: 0, target: 0, persen: 0 }, sarpras: { realisasi: 0, target: 0, persen: 0 } };
    const baris = [[hp ? ['Kendaraan', 'Operasional'] : ['Kendaraan Operasional'], cp.kendaraan], [hp ? ['Sarana dan', 'Prasarana'] : ['Sarana dan Prasarana'], cp.sarpras]];
    buat('m1-grafik-capaian', { type: 'bar', data: {
      labels: baris.map(x => x[0].concat('(' + x[1].realisasi + '/' + x[1].target + ')')),
      datasets: [{ label: 'Realisasi', data: baris.map(x => x[1].persen), backgroundColor: ['#E11D2A', '#38BDF8'], borderRadius: 6, maxBarThickness: 34 }] },
      options: Object.assign(sumbu(), { indexAxis: 'y',
        scales: { x: { min: 0, max: 100, grid: { color: garis }, ticks: { callback: v => v + '%', font: { size: hp ? 11 : 12 } } }, y: { grid: { color: garis }, ticks: { font: { size: hp ? 12 : 13 } } } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => {
          const x = baris[c.dataIndex][1];
          return ' ' + String(x.persen).replace('.', ',') + '% (' + x.realisasi + ' dari ' + x.target + ' item)';
        } } } } }) });
  }
};
// ===== AKHIR BLOK: M1_DASHBOARD =====


// ===== BLOK: M2_DATA_INVENTARIS =====
async function pastikanInventaris() { if (!S.inv) S.inv = await panggil('daftarInventaris', ''); return S.inv; }
function gantiBarang(b) {
  if (!S.inv) S.inv = [];
  const i = S.inv.findIndex(x => x.ID === b.ID);
  if (i >= 0) S.inv[i] = b; else S.inv.unshift(b);
}
function tandaiUsang() { S.dash = null; S.lap = null; S.lok = null; S.kat = null; }

const M2 = {
  f: { q: '', kkmp: '', lokasi: '', kategori: '', kondisi: '', urut: 'NamaBarang', arah: 1, hal: 1, per: 15 },
  halamanIni: [], edit: null, foto: [], antrian: [], idDetail: '',
  pasang() {
    $('m2-cari').oninput = tunda(e => { M2.f.q = e.target.value.trim().toLowerCase(); M2.f.hal = 1; M2.render(); });
    $('m2-kkmp').onchange = e => { M2.f.kkmp = e.target.value; M2.f.lokasi = ''; opsiLokasi($('m2-lokasi'), M2.f.kkmp, 'Semua Lokasi', ''); M2.f.hal = 1; M2.render(); };
    $('m2-lokasi').onchange = e => { M2.f.lokasi = e.target.value; M2.f.hal = 1; M2.render(); };
    $('m2-kategori').onchange = e => { M2.f.kategori = e.target.value; M2.f.hal = 1; M2.render(); };
    $('m2-kondisi').onchange = e => { M2.f.kondisi = e.target.value; M2.f.hal = 1; M2.render(); };
    $('m2-perhal').onchange = e => { M2.f.per = Number(e.target.value); M2.f.hal = 1; M2.render(); };
    $('m2-reset').onclick = () => {
      Object.assign(M2.f, { q: '', kkmp: '', lokasi: '', kategori: '', kondisi: '', hal: 1 });
      $('m2-cari').value = '';
      M2.isiFilter(); M2.render();
    };
    $$('#m2 th[data-sort]').forEach(th => {
      th.onclick = () => { const k = th.dataset.sort; M2.f.arah = M2.f.urut === k ? -M2.f.arah : 1; M2.f.urut = k; M2.render(); };
    });
    $('m2-pilih-semua').onchange = e => { M2.halamanIni.forEach(b => { if (e.target.checked) S.pilih2.add(b.ID); else S.pilih2.delete(b.ID); }); M2.render(); };
    $('m2-tbody').onchange = e => {
      const c = e.target.closest('[data-pilih]');
      if (!c) return;
      if (c.checked) S.pilih2.add(c.dataset.pilih); else S.pilih2.delete(c.dataset.pilih);
      M2.hitungPilih();
    };
    $('m2-tbody').onclick = M2.aksi;
    $('m2-cetak-massal').onclick = () => M7.bukaDenganPilihan(S.pilih2);
    $('m2-tambah').onclick = () => M2.bukaForm(null);

    $('form-barang').onsubmit = M2.simpan;
    $('fb-kkmp').onchange = e => { M2.isiLokasiForm(e.target.value, ''); if (!M2.edit) { $('fb-kode').value = ''; M2.isiKodeOtomatis(e.target.value); } };
    $('fb-nama').onchange = e => M2.isiSpesifikasi(e.target.value, '');
    $('fb-harga').oninput = e => { const d = e.target.value.replace(/[^\d]/g, ''); e.target.value = d ? Number(d).toLocaleString('id-ID') : ''; };
    $('fb-foto-input').onchange = e => { const f = Array.from(e.target.files); e.target.value = ''; M2.pilihFoto(f); };
    $('fb-foto-daftar').onclick = M2.aksiFoto;

    $('db-isi').onclick = e => {
      const t = e.target.closest('.galeri-kecil img');
      if (!t) return;
      $('db-foto').src = t.dataset.src;
      $$('.galeri-kecil img', $('db-isi')).forEach(i => i.classList.toggle('aktif', i === t));
    };
    $('db-edit').onclick = () => { const b = (S.inv || []).find(x => x.ID === M2.idDetail); tutupModal('modal-detail-barang'); if (b) M2.bukaForm(b); };
    $('db-barcode').onclick = () => { const b = (S.inv || []).find(x => x.ID === M2.idDetail); tutupModal('modal-detail-barang'); if (b) BC.buka(b); };
  },
  isiFilter() {
    opsiKKMP($('m2-kkmp'), 'Semua KKMP', M2.f.kkmp);
    opsiLokasi($('m2-lokasi'), M2.f.kkmp, 'Semua Lokasi', M2.f.lokasi);
    opsiKategori($('m2-kategori'), 'Semua Kategori', M2.f.kategori);
    opsiKondisi($('m2-kondisi'), 'Semua Kondisi', M2.f.kondisi);
  },
  async buka() {
    M2.isiFilter();
    if (!S.inv) {
      barisMemuat($('m2-tbody'));
      try { await pastikanInventaris(); } catch (e) { galat(e); return barisKosong($('m2-tbody'), 'Gagal memuat data inventaris.', 'i-alert'); }
    }
    M2.render();
  },
  saring() {
    const f = M2.f, k = f.urut, a = f.arah;
    return (S.inv || []).filter(b =>
      (!f.kkmp || b.KKMPID === f.kkmp) && (!f.lokasi || b.LokasiID === f.lokasi) && (!f.kategori || b.KategoriID === f.kategori) &&
      (!f.kondisi || b.Kondisi === f.kondisi) &&
      (!f.q || [b.NamaBarang, b.KodeBarang, b.MerkType, b.NomorRegister, b.SpesifikasiUnit, b.KodeBarcode].join(' ').toLowerCase().indexOf(f.q) >= 0)
    ).sort((x, y) => {
      const p = x[k], r = y[k];
      if (typeof p === 'number' && typeof r === 'number') return (p - r) * a;
      return String(p).localeCompare(String(r), 'id', { numeric: true }) * a;
    });
  },
  render() {
    const tb = $('m2-tbody'), f = M2.f;
    $$('#m2 th[data-sort]').forEach(th => {
      th.classList.toggle('urut-naik', th.dataset.sort === f.urut && f.arah === 1);
      th.classList.toggle('urut-turun', th.dataset.sort === f.urut && f.arah === -1);
    });
    const data = M2.saring();
    f.hal = renderPaging($('m2-paging'), $('m2-info'), data.length, f.hal, f.per, h => { M2.f.hal = h; M2.render(); });
    if (!data.length) {
      M2.halamanIni = [];
      barisKosong(tb, S.inv && S.inv.length ? 'Tidak ada data yang cocok dengan filter.' : 'Belum ada data inventaris.', 'i-box');
      return M2.hitungPilih();
    }
    const mulai = (f.hal - 1) * f.per, kelola = S.peran !== 'V', admin = S.peran === 'A';
    M2.halamanIni = data.slice(mulai, mulai + f.per);
    tb.innerHTML = M2.halamanIni.map((b, i) => '<tr>' +
      (kelola ? '<td data-label="Pilih"><input type="checkbox" class="centang" data-pilih="' + esc(b.ID) + '"' + (S.pilih2.has(b.ID) ? ' checked' : '') + ' aria-label="Pilih"></td>' : '') +
      '<td class="kol-no" data-label="No">' + (mulai + i + 1) + '</td>' +
      (S.multi ? '<td data-label="KKMP">' + esc(b.NamaKKMP) + '</td>' : '') +
      '<td data-label="Lokasi Unit">' + esc(b.NamaLokasi) + '</td>' +
      '<td data-label="Kode Barang"><span class="kode-mono">' + esc(nilai(b.KodeBarang)) + '</span></td>' +
      '<td data-label="Nama Barang"><b>' + esc(b.NamaBarang) + '</b></td>' +
      '<td data-label="Spesifikasi Unit">' + esc(nilai(b.SpesifikasiUnit)) + '</td>' +
      '<td data-label="Merk/Type">' + esc(nilai(b.MerkType)) + '</td>' +
      '<td class="kol-angka" data-label="Tahun">' + esc(nilai(b.TahunPembelian)) + '</td>' +
      '<td data-label="Kondisi">' + badgeKondisi(b.Kondisi) + '</td>' +
      '<td data-label="Foto">' + fotoMini(b.FotoUtama) + '</td>' +
      '<td data-label="Barcode"><span class="barcode-mini">' + C128.svg(b.KodeBarcode, { tinggi: 40 }) + '</span></td>' +
      '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('detail', b.ID, 'i-file', 'Detail') +
      (kelola ? tombolAksi('edit', b.ID, 'i-edit', 'Edit') + tombolAksi('barcode', b.ID, 'i-barcode', 'Barcode') +
        tombolAksi('publikasi', b.ID, b.Publikasi === 'Tampil' ? 'i-eye' : 'i-eye-off', 'Publikasi: ' + b.Publikasi) : '') +
      (admin ? tombolAksi('hapus', b.ID, 'i-trash', 'Hapus', true) : '') + '</div></td></tr>').join('');
    M2.hitungPilih();
  },
  hitungPilih() {
    const n = S.pilih2.size;
    $('m2-jml-pilih').textContent = n;
    $('m2-cetak-massal').disabled = !n;
    $('m2-pilih-semua').checked = M2.halamanIni.length > 0 && M2.halamanIni.every(b => S.pilih2.has(b.ID));
  },
  aksi(e) {
    const t = e.target.closest('[data-aksi]');
    if (!t) return;
    const b = (S.inv || []).find(x => x.ID === t.dataset.id);
    if (!b) return;
    ({ detail: () => M2.detail(b.ID), edit: () => M2.bukaForm(b), barcode: () => BC.buka(b), publikasi: () => M2.publikasi(b), hapus: () => M2.hapus(b) })[t.dataset.aksi]();
  },

  isiLokasiForm(kkmpId, pilih) {
    isiPilih($('fb-lokasi'), S.awal.lokasi.filter(l => l.KKMPID === kkmpId && (l.Status === 'Aktif' || l.ID === pilih)),
      { semua: '— Pilih Lokasi Unit —', nilai: 'ID', teks: 'NamaLokasi', pilih: pilih });
  },
  isiJenis(nama, spek) {
    const daftar = (S.awal.pilihan.jenisBarang || []).map(j => [j[0], j[0]]);
    const lain = !!nama && !daftar.some(j => j[0] === nama);
    daftar.push([LAINNYA, 'Lainnya']);
    isiPilih($('fb-nama'), daftar, { semua: '— Pilih Nama Barang / Jenis Barang —', nilai: x => x[0], teks: x => x[1], pilih: lain ? LAINNYA : (nama || '') });
    $('fb-nama-lain').value = lain ? nama : '';
    $('fb-spesifikasi-lain').value = lain ? (spek || '') : '';
    M2.isiSpesifikasi($('fb-nama').value, lain ? '' : spek);
  },
  isiSpesifikasi(nama, spek) {
    const lain = nama === LAINNYA;
    tampil('fb-nama-lain', lain);
    tampil('fb-spesifikasi', !lain);
    tampil('fb-spesifikasi-lain', lain);
    if (lain) return;
    const j = (S.awal.pilihan.jenisBarang || []).find(x => x[0] === nama), daftar = j ? j[1].slice() : [];
    if (spek && daftar.indexOf(spek) < 0) daftar.push(spek);
    isiPilih($('fb-spesifikasi'), daftar, { semua: '— Pilih Spesifikasi Unit —', pilih: spek || '' });
  },
  isiKodeOtomatis(kkmpId) {
    if (!kkmpId) return;
    panggil('kodeBarangBerikut', kkmpId).then(r => { if (!$('fb-kode').value && !M2.edit) $('fb-kode').value = r.kode; }).catch(() => {});
  },
  async bukaForm(b) {
    M2.edit = b; M2.antrian = []; M2.foto = [];
    $('fb-judul').textContent = b ? 'Edit Barang' : 'Tambah Barang';
    pesanForm('fb-galat', '');
    const isA = S.peran === 'A';
    tampil('fb-grup-kkmp', isA);
    tampil('fb-grup-kkmp-kunci', !isA);
    const kkmpId = b ? b.KKMPID : (isA ? (M2.f.kkmp || (S.awal.kkmp.find(k => k.Status === 'Aktif') || {}).ID || '') : S.user.kkmpId);
    if (isA) isiPilih($('fb-kkmp'), S.awal.kkmp.filter(k => k.Status === 'Aktif' || k.ID === kkmpId), { nilai: 'ID', teks: 'NamaKKMP', pilih: kkmpId });
    $('fb-kkmp-teks').value = namaKKMP(kkmpId) || S.user.namaKKMP || '';
    M2.isiLokasiForm(kkmpId, b ? b.LokasiID : '');
    isiPilih($('fb-kategori'), S.awal.kategori.filter(k => k.Status === 'Aktif' || (b && k.ID === b.KategoriID)), { semua: '— Pilih Kategori —', nilai: 'ID', teks: 'NamaKategori', pilih: b ? b.KategoriID : '' });
    isiPilih($('fb-asal'), S.awal.pilihan.asalUsul, { semua: '— Pilih Asal Usul —', pilih: b ? b.AsalUsul : '' });
    isiPilih($('fb-kondisi'), S.awal.pilihan.kondisi, { semua: '— Pilih Kondisi —', pilih: b ? b.Kondisi : '' });
    isiPilih($('fb-publikasi'), S.awal.pilihan.publikasi, { pilih: b ? b.Publikasi : 'Tampil' });
    const isi = {
      'fb-id': 'ID', 'fb-kode': 'KodeBarang', 'fb-noreg': 'NomorRegister',
      'fb-merk': 'MerkType', 'fb-ukuran': 'UkuranCC', 'fb-bahan': 'Bahan', 'fb-tahun': 'TahunPembelian', 'fb-pabrik': 'NomorPabrik',
      'fb-rangka': 'NomorRangka', 'fb-polisi': 'NomorPolisi', 'fb-bpkb': 'NomorBPKB', 'fb-keterangan': 'Keterangan'
    };
    Object.keys(isi).forEach(id => { $(id).value = b ? nilaiKosong(b[isi[id]]) : ''; });
    M2.isiJenis(b ? b.NamaBarang : '', b ? b.SpesifikasiUnit : '');
    $('fb-harga').value = b && b.Harga !== '' ? Number(b.Harga).toLocaleString('id-ID') : '';
    $('fb-tahun').max = new Date().getFullYear();
    if (b) {
      $('fb-barcode').innerHTML = C128.svg(b.KodeBarcode, { tinggi: 60 });
      $('fb-barcode-kode').textContent = b.KodeBarcode;
    } else {
      $('fb-barcode').innerHTML = '';
      $('fb-barcode-kode').textContent = 'Barcode dibuat otomatis saat barang disimpan.';
    }
    M2.renderFoto();
    bukaModal('modal-barang');
    if (b) {
      try { const d = await panggil('detailInventaris', b.ID); M2.foto = d.foto; M2.renderFoto(); } catch (e) { galat(e); }
    } else M2.isiKodeOtomatis(kkmpId);
  },
  renderFoto() {
    const daftar = M2.edit
      ? M2.foto.map(f => ({ id: f.ID, src: f.URLFoto, utama: f.Utama === 'Ya' }))
      : M2.antrian.map((src, i) => ({ id: 'a' + i, src: src, utama: i === 0 }));
    $('fb-foto-daftar').innerHTML = daftar.length ? daftar.map(f => '<div class="foto-item' + (f.utama ? ' foto-utama' : '') + '">' +
      '<img src="' + esc(f.src) + '" alt="" referrerpolicy="no-referrer">' + (f.utama ? '<span class="foto-label-utama">Utama</span>' : '') +
      '<div class="foto-aksi">' + (f.utama ? '' : '<button type="button" data-foto="utama" data-id="' + esc(f.id) + '" title="Jadikan foto utama">' + ikon('i-check') + '</button>') +
      '<button type="button" data-foto="hapus" data-id="' + esc(f.id) + '" title="Hapus foto">' + ikon('i-trash') + '</button></div></div>').join('')
      : '<p class="info-teks">Belum ada foto.</p>';
    tampil('fb-foto-tombol', daftar.length < S.awal.batas.FOTO_PER_BARANG);
  },
  terimaFoto(id, r) {
    M2.foto = r.foto;
    const b = (S.inv || []).find(x => x.ID === id);
    if (b) { b.FotoUtama = r.FotoUtama; b.JumlahFoto = r.foto.length; }
    S.dash = null;
    if (S.menu === 'm2') M2.render();
  },
  async pilihFoto(files) {
    const maks = S.awal.batas.FOTO_PER_BARANG, sisa = maks - (M2.edit ? M2.foto.length : M2.antrian.length);
    if (files.length > sisa) toast('Maksimal ' + maks + ' foto per barang.', 'info');
    const lbl = $('fb-foto-tombol');
    lbl.classList.add('memuat');
    for (const f of files.slice(0, Math.max(0, sisa))) {
      try {
        const url = await kompresGambar(f, S.awal.batas.FOTO_BYTE);
        if (M2.edit) M2.terimaFoto(M2.edit.ID, await panggil('uploadFoto', M2.edit.ID, url));
        else M2.antrian.push(url);
        M2.renderFoto();
      } catch (e) { galat(e); }
    }
    lbl.classList.remove('memuat');
  },
  async aksiFoto(e) {
    const t = e.target.closest('[data-foto]');
    if (!t) return;
    const id = t.dataset.id, aksi = t.dataset.foto;
    if (!M2.edit) {
      const i = Number(id.slice(1));
      if (aksi === 'hapus') M2.antrian.splice(i, 1); else M2.antrian.unshift(M2.antrian.splice(i, 1)[0]);
      return M2.renderFoto();
    }
    try {
      if (aksi === 'hapus') {
        if (!(await konfirmasi('Hapus Foto?', 'Foto ini akan dihapus dari data barang.', 'Hapus'))) return;
        M2.terimaFoto(M2.edit.ID, await panggil('hapusFoto', id));
      } else M2.terimaFoto(M2.edit.ID, await panggil('setFotoUtama', id));
      M2.renderFoto();
    } catch (er) { galat(er); }
  },
  async simpan(e) {
    e.preventDefault();
    const btn = $('fb-simpan');
    sibuk(btn, true);
    pesanForm('fb-galat', '');
    const v = id => $(id).value;
    const d = {
      ID: v('fb-id'), KKMPID: S.peran === 'A' ? v('fb-kkmp') : S.user.kkmpId, LokasiID: v('fb-lokasi'), KategoriID: v('fb-kategori'),
      KodeBarang: v('fb-kode'), NomorRegister: v('fb-noreg'),
      NamaBarang: v('fb-nama') === LAINNYA ? v('fb-nama-lain') : v('fb-nama'),
      SpesifikasiUnit: v('fb-nama') === LAINNYA ? v('fb-spesifikasi-lain') : v('fb-spesifikasi'),
      MerkType: v('fb-merk'), UkuranCC: v('fb-ukuran'), Bahan: v('fb-bahan'), TahunPembelian: v('fb-tahun'), NomorPabrik: v('fb-pabrik'),
      NomorRangka: v('fb-rangka'), NomorPolisi: v('fb-polisi'), NomorBPKB: v('fb-bpkb'), AsalUsul: v('fb-asal'),
      Harga: v('fb-harga').replace(/[^\d]/g, ''), Kondisi: v('fb-kondisi'), Keterangan: v('fb-keterangan'), Publikasi: v('fb-publikasi')
    };
    try {
      const b = await panggil('simpanInventaris', d);
      gantiBarang(b);
      tandaiUsang();
      if (!d.ID && M2.antrian.length) {
        for (const url of M2.antrian) {
          try { M2.terimaFoto(b.ID, await panggil('uploadFoto', b.ID, url)); } catch (er) { galat(er); }
        }
      }
      tutupModal('modal-barang');
      toast(d.ID ? 'Data barang diperbarui.' : 'Barang ditambahkan.');
      if (S.menu === 'm2') M2.render();
    } catch (er) {
      pesanForm('fb-galat', er.message);
    } finally { sibuk(btn, false); }
  },
  async detail(id) {
    const b = (S.inv || []).find(x => x.ID === id);
    M2.idDetail = id;
    $('db-judul').textContent = b ? b.NamaBarang : 'Detail Barang';
    $('db-isi').innerHTML = '<div class="kosong"><div class="pemutar"></div><span>Memuat...</span></div>';
    bukaModal('modal-detail-barang');
    try { M2.renderDetail(await panggil('detailInventaris', id)); }
    catch (e) { $('db-isi').innerHTML = '<div class="kosong">' + ikon('i-alert') + '<span>' + esc(e.message) + '</span></div>'; }
  },
  renderDetail(d) {
    const b = d.barang, foto = d.foto.map(f => f.URLFoto);
    const baris = [['KKMP', b.NamaKKMP], ['Lokasi Unit', b.NamaLokasi], ['Kategori', b.NamaKategori], ['Kode Barang', b.KodeBarang],
      ['Nama Barang / Jenis Barang', b.NamaBarang], ['Spesifikasi Unit', b.SpesifikasiUnit], ['Nomor Register', b.NomorRegister],
      ['Merk/Type', b.MerkType], ['Ukuran/CC', b.UkuranCC], ['Bahan', b.Bahan], ['Tahun Pembelian', b.TahunPembelian],
      ['Nomor Pabrik', b.NomorPabrik], ['Nomor Rangka', b.NomorRangka], ['Nomor Polisi', b.NomorPolisi], ['Nomor BPKB', b.NomorBPKB],
      ['Asal Usul', b.AsalUsul], ['Harga', rupiah(b.Harga)], ['Kondisi', badgeKondisi(b.Kondisi), true], ['Publikasi', b.Publikasi],
      ['Keterangan', b.Keterangan], ['Diperbarui', tanggal(b.Diperbarui)]];
    $('db-isi').innerHTML = '<div class="detail-grid"><div>' +
      (foto.length
        ? '<img id="db-foto" class="detail-foto" src="' + esc(foto[0]) + '" alt="" referrerpolicy="no-referrer"><div class="galeri-kecil">' +
          foto.map((u, i) => '<img src="' + esc(u) + '" data-src="' + esc(u) + '" class="' + (i ? '' : 'aktif') + '" alt="" referrerpolicy="no-referrer">').join('') + '</div>'
        : '<div class="detail-foto kosong">' + ikon('i-image') + '<span>Belum ada foto</span></div>') +
      '<h4 class="sub-bagian">' + ikon('i-barcode') + 'Barcode</h4><div class="barcode-pratinjau"><div class="barcode-gambar">' + C128.svg(b.KodeBarcode, { tinggi: 60 }) +
      '</div><b class="kode-mono">' + esc(b.KodeBarcode) + '</b></div></div>' +
      '<div><dl class="daftar-info">' + dl(baris) + '</dl><h4 class="sub-bagian">' + ikon('i-activity') + 'Riwayat Aktivitas</h4><ul class="aktivitas">' +
      (d.riwayat.length ? d.riwayat.map(itemAktivitas).join('') : '<li class="teks-redup">Belum ada riwayat.</li>') + '</ul></div></div>';
  },
  async publikasi(b) {
    const baru = b.Publikasi === 'Tampil' ? 'Sembunyikan' : 'Tampil';
    try {
      gantiBarang(await panggil('ubahPublikasi', b.ID, baru));
      S.dash = null;
      M2.render();
      toast('Publikasi diubah menjadi ' + baru + '.');
    } catch (e) { galat(e); }
  },
  async hapus(b) {
    if (!(await konfirmasi('Hapus Barang?', 'Barang ' + b.NamaBarang + ' (' + nilai(b.KodeBarang) + ') beserta fotonya akan dihapus dan barcodenya dinonaktifkan.', 'Hapus'))) return;
    try {
      await panggil('hapusInventaris', b.ID);
      S.inv = S.inv.filter(x => x.ID !== b.ID);
      S.pilih2.delete(b.ID);
      tandaiUsang();
      M2.render();
      toast('Barang dihapus.');
    } catch (e) { galat(e); }
  }
};

const BC = {
  b: null,
  pasang() {
    $('mbc-preset').onchange = () => { $('mbc-qrmini').checked = BC.preset().kunci !== 'Kecil'; BC.render(); };
    $('mbc-qrmini').onchange = () => BC.render();
    $('mbc-salin').onclick = () => salin(urlPublik(BC.b.QueryPublik));
    $('mbc-png').onclick = () => BC.png();
    $('mbc-svg').onclick = () => BC.svg();
    $('mbc-cetak').onclick = () => BC.cetak();
  },
  preset() { const d = presetDaftar(); return d.find(p => p.kunci === $('mbc-preset').value) || d[1]; },
  buka(b) {
    BC.b = b;
    $('mbc-sub').textContent = b.NamaBarang + ' · ' + b.KodeBarcode;
    isiPilih($('mbc-preset'), presetDaftar(), { nilai: 'kunci', teks: labelPreset, pilih: S.awal.pengaturan.PresetStikerDefault });
    $('mbc-qrmini').checked = BC.preset().kunci !== 'Kecil';
    $('mbc-pratinjau').innerHTML = '<div class="pemutar"></div>';
    bukaModal('modal-barcode');
    BC.render();
  },
  async buatSvg() {
    const p = BC.preset();
    return { p: p, svg: stikerSvg(BC.b, p.w, p.h, { qrmini: $('mbc-qrmini').checked, logo: await logoStiker() }) };
  },
  async render() { $('mbc-pratinjau').innerHTML = (await BC.buatSvg()).svg; },
  async png() {
    const btn = $('mbc-png');
    sibuk(btn, true);
    try {
      const r = await BC.buatSvg();
      unduhBlob(await svgKePng(r.svg, r.p.w * 10, r.p.h * 10, 300), namaBerkas('stiker-' + BC.b.KodeBarcode) + '.png');
      catatAktivitas('Unduh', 'Stiker', [BC.b.ID], 'Unduh PNG stiker barcode ' + BC.b.KodeBarcode);
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  },
  async svg() {
    const r = await BC.buatSvg();
    unduhBlob(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + r.svg], { type: 'image/svg+xml' }), namaBerkas('stiker-' + BC.b.KodeBarcode) + '.svg');
    catatAktivitas('Unduh', 'Stiker', [BC.b.ID], 'Unduh SVG stiker barcode ' + BC.b.KodeBarcode);
  },
  async cetak() {
    const btn = $('mbc-cetak');
    sibuk(btn, true);
    try {
      await cetakStiker([BC.b], BC.preset(), { mode: 'satu' }, $('mbc-qrmini').checked);
      catatAktivitas('Cetak', 'Stiker', [BC.b.ID], 'Cetak stiker barcode ' + BC.b.KodeBarcode);
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M2_DATA_INVENTARIS =====


// ===== BLOK: M3_LOKASI_UNIT =====
async function pastikanLokasi() { if (!S.lok) S.lok = await panggil('daftarLokasi', ''); return S.lok; }
function sinkronLokasi() {
  S.awal.lokasi = S.lok.map(l => ({ ID: l.ID, NamaLokasi: l.NamaLokasi, KodeLokasi: l.KodeLokasi, KKMPID: l.KKMPID, Status: l.Status }));
}
function gantiLokasi(l) {
  if (!S.lok) return;
  const i = S.lok.findIndex(x => x.ID === l.ID);
  if (i >= 0) S.lok[i] = l; else S.lok.push(l);
  sinkronLokasi();
}

const M3 = {
  f: { q: '', kkmp: '' },
  pasang() {
    $('m3-cari').oninput = tunda(e => { M3.f.q = e.target.value.trim().toLowerCase(); M3.render(); });
    $('m3-kkmp').onchange = e => { M3.f.kkmp = e.target.value; M3.render(); };
    $('m3-tambah').onclick = () => M3.bukaForm(null);
    $('m3-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const l = S.lok.find(x => x.ID === t.dataset.id);
      if (t.dataset.aksi === 'edit') M3.bukaForm(l); else M3.hapus(l);
    };
    $('form-lokasi').onsubmit = M3.simpan;
  },
  async buka() {
    opsiKKMP($('m3-kkmp'), 'Semua KKMP', M3.f.kkmp);
    if (!S.lok) {
      barisMemuat($('m3-tbody'));
      try { await pastikanLokasi(); } catch (e) { galat(e); return barisKosong($('m3-tbody'), 'Gagal memuat data lokasi.', 'i-alert'); }
    }
    M3.render();
  },
  render() {
    const f = M3.f, tb = $('m3-tbody');
    const data = (S.lok || []).filter(l => (!f.kkmp || l.KKMPID === f.kkmp) && (!f.q || (l.NamaLokasi + ' ' + l.KodeLokasi).toLowerCase().indexOf(f.q) >= 0));
    if (!data.length) return barisKosong(tb, 'Belum ada lokasi unit.', 'i-pin');
    const admin = S.peran === 'A';
    tb.innerHTML = data.map((l, i) => '<tr><td class="kol-no" data-label="No">' + (i + 1) + '</td>' +
      (S.multi ? '<td data-label="KKMP">' + esc(l.NamaKKMP) + '</td>' : '') +
      '<td data-label="Nama Lokasi Unit"><b>' + esc(l.NamaLokasi) + '</b></td>' +
      '<td data-label="Kode Lokasi"><span class="kode-mono">' + esc(l.KodeLokasi) + '</span></td>' +
      '<td data-label="Keterangan">' + esc(nilai(l.Keterangan)) + '</td>' +
      '<td class="kol-angka" data-label="Jumlah Barang">' + angka(l.JumlahBarang) + '</td>' +
      '<td data-label="QR Code">' + (l.QR ? '<span class="qr-mini">' + QR.svg(QR.buat(urlPublik(l.QR.QueryPublik), 'M'), 1) + '</span>' : '<span class="badge badge-nonaktif">Belum ada</span>') + '</td>' +
      '<td data-label="Status">' + badgeStatus(l.Status) + '</td>' +
      '<td data-label="Tanggal Dibuat">' + esc(tanggal(l.Dibuat)) + '</td>' +
      (admin ? '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('edit', l.ID, 'i-edit', 'Edit') + tombolAksi('hapus', l.ID, 'i-trash', 'Hapus', true) + '</div></td>' : '') +
      '</tr>').join('');
  },
  bukaForm(l) {
    $('fl-judul').textContent = l ? 'Edit Lokasi Unit' : 'Tambah Lokasi Unit';
    pesanForm('fl-galat', '');
    const kk = l ? l.KKMPID : (M3.f.kkmp || (S.awal.kkmp.find(k => k.Status === 'Aktif') || {}).ID || '');
    isiPilih($('fl-kkmp'), S.awal.kkmp.filter(k => k.Status === 'Aktif' || k.ID === kk), { nilai: 'ID', teks: 'NamaKKMP', pilih: kk });
    $('fl-kkmp').disabled = !!l;
    isiPilih($('fl-status'), S.awal.pilihan.status, { pilih: l ? l.Status : 'Aktif' });
    $('fl-id').value = l ? l.ID : '';
    $('fl-nama').value = l ? l.NamaLokasi : '';
    $('fl-kode').value = l ? l.KodeLokasi : '';
    $('fl-keterangan').value = l ? l.Keterangan : '';
    bukaModal('modal-lokasi');
  },
  async simpan(e) {
    e.preventDefault();
    const btn = $('fl-simpan');
    sibuk(btn, true);
    pesanForm('fl-galat', '');
    try {
      const l = await panggil('simpanLokasi', {
        ID: $('fl-id').value, KKMPID: $('fl-kkmp').value, NamaLokasi: $('fl-nama').value,
        KodeLokasi: $('fl-kode').value, Keterangan: $('fl-keterangan').value, Status: $('fl-status').value
      });
      gantiLokasi(l);
      S.dash = null; S.lap = null;
      tutupModal('modal-lokasi');
      toast($('fl-id').value ? 'Lokasi diperbarui.' : 'Lokasi ditambahkan beserta QR Code-nya.');
      M3.render();
    } catch (er) { pesanForm('fl-galat', er.message); } finally { sibuk(btn, false); }
  },
  async hapus(l) {
    if (!(await konfirmasi('Hapus Lokasi?', 'Lokasi ' + l.NamaLokasi + ' (' + l.NamaKKMP + ') beserta QR Code-nya akan dihapus.', 'Hapus'))) return;
    try {
      await panggil('hapusLokasi', l.ID);
      S.lok = S.lok.filter(x => x.ID !== l.ID);
      sinkronLokasi();
      S.dash = null;
      M3.render();
      toast('Lokasi dihapus.');
    } catch (e) { galat(e); }
  }
};
// ===== AKHIR BLOK: M3_LOKASI_UNIT =====


// ===== BLOK: M4_KATEGORI_BARANG =====
async function pastikanKategori() { if (!S.kat) S.kat = await panggil('daftarKategori'); return S.kat; }
function sinkronKategori() {
  S.awal.kategori = S.kat.map(k => ({ ID: k.ID, NamaKategori: k.NamaKategori, KodeKategori: k.KodeKategori, Status: k.Status }));
}

const M4 = {
  q: '',
  pasang() {
    $('m4-cari').oninput = tunda(e => { M4.q = e.target.value.trim().toLowerCase(); M4.render(); });
    $('m4-tambah').onclick = () => M4.bukaForm(null);
    $('m4-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const k = S.kat.find(x => x.ID === t.dataset.id);
      if (t.dataset.aksi === 'edit') M4.bukaForm(k); else M4.hapus(k);
    };
    $('form-kategori').onsubmit = M4.simpan;
  },
  async buka() {
    if (!S.kat) {
      barisMemuat($('m4-tbody'));
      try { await pastikanKategori(); } catch (e) { galat(e); return barisKosong($('m4-tbody'), 'Gagal memuat kategori.', 'i-alert'); }
    }
    M4.render();
  },
  render() {
    const tb = $('m4-tbody');
    const data = (S.kat || []).filter(k => !M4.q || (k.NamaKategori + ' ' + k.KodeKategori).toLowerCase().indexOf(M4.q) >= 0);
    if (!data.length) return barisKosong(tb, 'Belum ada kategori.', 'i-tag');
    const admin = S.peran === 'A';
    tb.innerHTML = data.map((k, i) => '<tr><td class="kol-no" data-label="No">' + (i + 1) + '</td>' +
      '<td data-label="Nama Kategori"><b>' + esc(k.NamaKategori) + '</b></td>' +
      '<td data-label="Kode Kategori"><span class="kode-mono">' + esc(k.KodeKategori) + '</span></td>' +
      '<td data-label="Keterangan">' + esc(nilai(k.Keterangan)) + '</td>' +
      '<td class="kol-angka" data-label="Jumlah Barang">' + angka(k.JumlahBarang) + '</td>' +
      '<td data-label="Status">' + badgeStatus(k.Status) + '</td>' +
      (admin ? '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('edit', k.ID, 'i-edit', 'Edit') + tombolAksi('hapus', k.ID, 'i-trash', 'Hapus', true) + '</div></td>' : '') +
      '</tr>').join('');
  },
  bukaForm(k) {
    $('fk-judul').textContent = k ? 'Edit Kategori' : 'Tambah Kategori';
    pesanForm('fk-galat', '');
    $('fk-id').value = k ? k.ID : '';
    $('fk-nama').value = k ? k.NamaKategori : '';
    $('fk-kode').value = k ? k.KodeKategori : '';
    $('fk-keterangan').value = k ? k.Keterangan : '';
    isiPilih($('fk-status'), S.awal.pilihan.status, { pilih: k ? k.Status : 'Aktif' });
    bukaModal('modal-kategori');
  },
  async simpan(e) {
    e.preventDefault();
    const btn = $('fk-simpan');
    sibuk(btn, true);
    pesanForm('fk-galat', '');
    try {
      const k = await panggil('simpanKategori', {
        ID: $('fk-id').value, NamaKategori: $('fk-nama').value, KodeKategori: $('fk-kode').value,
        Keterangan: $('fk-keterangan').value, Status: $('fk-status').value
      });
      await pastikanKategori();
      const i = S.kat.findIndex(x => x.ID === k.ID);
      if (i >= 0) S.kat[i] = k; else S.kat.push(k);
      sinkronKategori();
      S.dash = null;
      tutupModal('modal-kategori');
      toast($('fk-id').value ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
      M4.render();
    } catch (er) { pesanForm('fk-galat', er.message); } finally { sibuk(btn, false); }
  },
  async hapus(k) {
    if (!(await konfirmasi('Hapus Kategori?', 'Kategori ' + k.NamaKategori + ' akan dihapus.', 'Hapus'))) return;
    try {
      await panggil('hapusKategori', k.ID);
      S.kat = S.kat.filter(x => x.ID !== k.ID);
      sinkronKategori();
      M4.render();
      toast('Kategori dihapus.');
    } catch (e) { galat(e); }
  }
};
// ===== AKHIR BLOK: M4_KATEGORI_BARANG =====


// ===== BLOK: M5_QR_CODE_LOKASI =====
function luminans(hex) {
  return [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255)
    .map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4))
    .reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
}
function kontras(a, b) { const x = luminans(a), y = luminans(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function pindahEditor(slot) { const e = $('m5-editor'); if (e.parentNode.id !== slot) $(slot).appendChild(e); }

const ED = {
  siap: false, kkmp: '', lokasi: '', target: 'kkmp', tpl: null, tplKkmp: null, sumber: '', logoImg: null, valid: true, versi: 0,
  pasang() {
    ED.ubah = tunda(() => ED.render(), 120);
    $('m5-editor-kkmp').onchange = async e => {
      ED.kkmp = e.target.value; ED.lokasi = '';
      ED.isiLokasi();
      if (ED.target === 'kkmp') await ED.muatTemplate();
      ED.render();
    };
    $('m5-lokasi').onchange = e => { ED.lokasi = e.target.value; ED.render(); };
    $('m5-target').onchange = async e => { ED.target = e.target.value; await ED.muatTemplate(); ED.render(); };
    $('m5-ukuran').onchange = () => ED.ubahUkuran();
    $('m7l-poster').onchange = e => { $('m5-ukuran').value = e.target.value; ED.ubahUkuran(); };
    ['m5-orientasi', 'm5-lebar', 'm5-tinggi', 'm5-judul', 'm5-banner', 'm5-deskripsi', 'm5-footer', 'm5-aksen', 'm5-latar']
      .forEach(id => { $(id).addEventListener('input', () => ED.ubah()); $(id).addEventListener('change', () => ED.ubah()); });
    $('m5-qr').oninput = e => { $('m5-qr-angka').value = e.target.value; ED.ubah(); };
    $('m5-qr-angka').oninput = e => { $('m5-qr').value = e.target.value; ED.ubah(); };
    $('m5-default').onclick = () => { ED.tpl = Object.assign({}, S.awal.templateDefault); ED.isiKontrol(); ED.render(); };
    $('m5-simpan').onclick = () => ED.simpan();
    $('m5-generate-qr').onclick = () => ED.generateQR();
    $('m5-buat-ulang').onclick = () => ED.buatUlang();
    $('m5-uji').onclick = () => { const l = ED.lokasiRow(); if (l && l.QR) window.open(urlPublik(l.QR.QueryPublik), '_blank'); };
    $('m5-kertas').onchange = () => ED.aturTombol();
    $('m5-pdf-tata').onchange = () => ED.aturTombol();
    $('m5-png').onclick = () => ED.unduhPNG();
    $('m5-pdf').onclick = () => ED.unduhPDF();
    $('m5-cetak').onclick = () => { const l = ED.lokasiRow(); if (l) ED.cetak([l], $('m5-cetak')); };
  },
  async buka(o) {
    o = o || {};
    try { await pastikanLokasi(); } catch (e) { return galat(e); }
    if (o.global) ED.target = 'global';
    if (o.lokasiId) {
      const l = S.lok.find(x => x.ID === o.lokasiId);
      if (l) { ED.kkmp = l.KKMPID; ED.lokasi = l.ID; }
    }
    if (S.peran === 'M') ED.kkmp = S.user.kkmpId;
    else if (!S.awal.kkmp.some(k => k.ID === ED.kkmp)) ED.kkmp = M5.f.kkmp || (S.awal.kkmp[0] || {}).ID || '';
    if (S.peran === 'M') ED.target = 'kkmp';
    $('m5-target').value = ED.target;
    opsiKKMP($('m5-editor-kkmp'), null, ED.kkmp);
    ED.isiLokasi();
    if (!ED.tpl || ED.tplKkmp !== (ED.target === 'global' ? '' : ED.kkmp)) await ED.muatTemplate();
    ED.siap = true;
    ED.render();
  },
  async muatTemplate() {
    const kk = ED.target === 'global' ? '' : ED.kkmp;
    try {
      const r = await panggil('ambilTemplatePoster', kk);
      ED.tpl = Object.assign({}, r.template); ED.sumber = r.sumber; ED.tplKkmp = kk;
    } catch (e) {
      galat(e);
      ED.tpl = Object.assign({}, S.awal.templateDefault); ED.sumber = 'Default'; ED.tplKkmp = kk;
    }
    ED.isiKontrol();
  },
  isiLokasi() {
    const d = (S.lok || []).filter(l => l.KKMPID === ED.kkmp);
    isiPilih($('m5-lokasi'), d, { semua: '— Pilih Lokasi Unit —', nilai: 'ID', teks: l => l.NamaLokasi + ' (' + l.KodeLokasi + ')' + (l.QR ? '' : ' – belum ada QR'), pilih: ED.lokasi });
    ED.lokasi = $('m5-lokasi').value;
  },
  lokasiRow() { return (S.lok || []).find(l => l.ID === ED.lokasi) || null; },
  isiKontrol() {
    const t = ED.tpl, preset = ['15x20', '20x30', '25x35'].indexOf(String(t.UkuranPoster)) >= 0, u = String(t.UkuranPoster).split('x');
    $('m5-ukuran').value = preset ? t.UkuranPoster : 'custom';
    $('m7l-poster').value = $('m5-ukuran').value;
    $('m5-lebar').value = u[0]; $('m5-tinggi').value = u[1];
    $$('.m5-custom').forEach(e => tampil(e, !preset));
    isiPilih($('m5-orientasi'), S.awal.pilihan.orientasi, { pilih: t.Orientasi });
    $('m5-qr').value = t.UkuranQR; $('m5-qr-angka').value = t.UkuranQR;
    $('m5-judul').value = t.Judul; $('m5-banner').value = t.TeksBanner;
    $('m5-deskripsi').value = t.Deskripsi; $('m5-footer').value = t.TeksFooter;
    $('m5-aksen').value = String(t.WarnaAksen).toLowerCase(); $('m5-latar').value = String(t.WarnaLatar).toLowerCase();
    $('m5-sumber').textContent = 'Template ' + (ED.sumber === 'KKMP' ? 'KKMP' : ED.sumber === 'Global' ? 'Global' : 'Default');
  },
  ubahUkuran() {
    const v = $('m5-ukuran').value, kustom = v === 'custom';
    $$('.m5-custom').forEach(e => tampil(e, kustom));
    const qrDefault = { '15x20': 10, '20x30': 12, '25x35': 15 }[v];
    if (qrDefault) { $('m5-qr').value = qrDefault; $('m5-qr-angka').value = qrDefault; }
    else {
      const lebar = Math.min(Number($('m5-lebar').value) || 20, Number($('m5-tinggi').value) || 30);
      const q = Math.max(8, Math.round(lebar * .6 * 2) / 2);
      $('m5-qr').value = q; $('m5-qr-angka').value = q;
    }
    ED.render();
  },
  dimensi() {
    const u = String(ED.tpl.UkuranPoster).split('x').map(Number), a = Math.min(u[0], u[1]) * 10, b = Math.max(u[0], u[1]) * 10;
    return ED.tpl.Orientasi === 'Landscape' ? [b, a, a] : [a, b, a];
  },
  bacaKontrol() {
    const t = ED.tpl, v = $('m5-ukuran').value;
    if (v === 'custom') {
      const a = Number($('m5-lebar').value) || 20, b = Number($('m5-tinggi').value) || 30;
      t.UkuranPoster = Math.min(a, b) + 'x' + Math.max(a, b);
    } else t.UkuranPoster = v;
    t.Orientasi = $('m5-orientasi').value || 'Portrait';
    t.TampilkanLogo = 'Ya';
    t.LogoTengahQR = 'Ya';
    t.Judul = $('m5-judul').value; t.TeksBanner = $('m5-banner').value;
    t.Deskripsi = $('m5-deskripsi').value; t.TeksFooter = $('m5-footer').value;
    t.WarnaAksen = $('m5-aksen').value.toUpperCase(); t.WarnaLatar = $('m5-latar').value.toUpperCase();
    const maks = Math.max(S.awal.batas.QR_MIN, ED.dimensi()[2] / 10 - 2 * S.awal.batas.MARGIN_POSTER);
    $('m5-qr').max = maks; $('m5-qr-angka').max = maks;
    t.UkuranQR = Math.min(maks, Math.max(S.awal.batas.QR_MIN, Number($('m5-qr-angka').value) || 12));
    ['judul', 'banner', 'deskripsi', 'footer'].forEach(k => { const el = $('m5-' + k); $('m5-' + k + '-hitung').textContent = el.value.length + '/' + el.maxLength; });
    $('m5-aksen-kode').textContent = t.WarnaAksen;
    $('m5-latar-kode').textContent = t.WarnaLatar;
    $('m7l-poster').value = v;
  },
  cekWarna() {
    const t = ED.tpl;
    const pesan = kontras(t.WarnaLatar, '#000000') < 12 ? 'Warna latar terlalu gelap sehingga QR Code sulit dipindai. Pilih warna latar yang lebih terang.'
      : kontras(t.WarnaAksen, '#FFFFFF') < 3 ? 'Warna aksen terlalu terang sehingga teks putih pada banner tidak terbaca.' : '';
    pesanForm('m5-warna-galat', pesan);
    ED.valid = !pesan;
  },
  async muatLogo() {
    if (ED.logoImg) return;
    try { ED.logoImg = await muatGambar(logoData()); } catch (e) { ED.logoImg = null; }
  },
  dataPoster(l) {
    const dim = ED.dimensi();
    return {
      W: dim[0], H: dim[1], tpl: ED.tpl, identitas: S.identitas, logoImg: ED.logoImg,
      lokasi: l ? l.NamaLokasi : '[NAMA LOKASI]', kkmp: l ? l.NamaKKMP : '[NAMA KKMP]',
      qr: l && l.QR ? QR.buat(urlPublik(l.QR.QueryPublik), ED.tpl.LogoTengahQR === 'Ya' ? 'H' : 'Q') : null
    };
  },
  async render() {
    if (!ED.tpl) return;
    ED.bacaKontrol();
    ED.cekWarna();
    const l = ED.lokasiRow(), adaQR = !!(l && l.QR), global = ED.target === 'global', lihat = !!l || global;
    $('m5-status-qr').textContent = l ? (adaQR ? 'QR Code aktif: ' + l.QR.ID : 'Lokasi ini belum memiliki QR Code aktif.') : '';
    tampil('m5-generate-qr', !!l && !adaQR);
    $('m5-buat-ulang').disabled = !adaQR;
    $('m5-url').textContent = adaQR ? urlPublik(l.QR.QueryPublik) : '-';
    $('m5-uji').disabled = !adaQR;
    tampil('m5-kanvas', lihat);
    tampil('m5-kosong', !lihat);
    ED.aturTombol();
    if (!lihat) { $('m5-dimensi').textContent = ''; $('m5-qr-info').textContent = ''; return; }
    const versi = ++ED.versi;
    await siapFont();
    await ED.muatLogo();
    if (versi !== ED.versi) return;
    const dim = ED.dimensi(), px = Math.min(560 / dim[1], 480 / dim[0]) * Math.min(2, window.devicePixelRatio || 1);
    const h = gambarPoster($('m5-kanvas'), px, ED.dataPoster(l));
    $('m5-dimensi').textContent = 'Poster ' + cm(dim[0] / 10) + ' × ' + cm(dim[1] / 10) + ' cm · QR Code ' + cm(h.qrCm) + ' × ' + cm(h.qrCm) + ' cm';
    $('m5-qr-info').textContent = h.qrCm + .05 < ED.tpl.UkuranQR ? 'QR Code disesuaikan menjadi ' + cm(h.qrCm) + ' cm agar muat di poster.' : '';
  },
  aturTombol() {
    if (!ED.tpl) return;
    const l = ED.lokasiRow(), siap = !!(l && l.QR) && ED.valid, dim = ED.dimensi();
    const kp = $('m5-kertas').value, kd = $('m5-pdf-tata').value;
    const okCetak = kp === 'poster' || kertasUntuk(kp, dim).muat, okPdf = kd === 'poster' || kertasUntuk(kd, dim).muat;
    const ukuran = cm(dim[0] / 10) + ' × ' + cm(dim[1] / 10) + ' cm', pesan = [];
    if (!okCetak) pesan.push('Poster ' + ukuran + ' tidak muat di kertas ' + kp + ' untuk Print. Pilih A3 atau Sesuai Ukuran Poster.');
    if (!okPdf && kd !== kp) pesan.push('Poster ' + ukuran + ' tidak muat di kertas ' + kd + ' untuk PDF. Pilih A3 atau Sesuai Ukuran Poster.');
    pesanForm('m5-peringatan', pesan.join(' '));
    $('m5-png').disabled = !siap;
    $('m5-pdf').disabled = !siap || !okPdf;
    $('m5-cetak').disabled = !siap || !okCetak;
    $('m5-simpan').disabled = !ED.valid;
  },
  async kanvasEkspor(l, dpi) {
    await siapFont();
    await ED.muatLogo();
    const dim = ED.dimensi();
    let px = (dpi || 300) / 25.4;
    if (dim[0] * dim[1] * px * px > 16e6) px = Math.sqrt(16e6 / (dim[0] * dim[1]));
    const cv = document.createElement('canvas');
    gambarPoster(cv, px, ED.dataPoster(l));
    return { cv: cv, dim: dim };
  },
  namaFile(l) { return namaBerkas('poster-' + l.KodeKKMP + '-' + l.KodeLokasi); },
  async unduhPNG() {
    const l = ED.lokasiRow();
    if (!l || !l.QR) return;
    const btn = $('m5-png');
    sibuk(btn, true);
    try {
      const r = await ED.kanvasEkspor(l, 300);
      await new Promise(res => r.cv.toBlob(b => { unduhBlob(b, ED.namaFile(l) + '.png'); res(); }, 'image/png'));
      catatAktivitas('Unduh', 'Poster', [l.ID], 'Unduh PNG poster QR lokasi ' + l.NamaLokasi, l.KKMPID);
    } catch (e) { galat(e); } finally { sibuk(btn, false); ED.aturTombol(); }
  },
  async unduhPDF() {
    const l = ED.lokasiRow();
    if (!l || !l.QR) return;
    const btn = $('m5-pdf');
    sibuk(btn, true);
    try {
      const r = await ED.kanvasEkspor(l, 300), tata = $('m5-pdf-tata').value;
      let hal;
      if (tata === 'poster') hal = { wmm: r.dim[0], hmm: r.dim[1], x: 0, y: 0, w: r.dim[0], h: r.dim[1] };
      else {
        const k = kertasUntuk(tata, r.dim).ukuran;
        hal = { wmm: k[0], hmm: k[1], x: (k[0] - r.dim[0]) / 2, y: (k[1] - r.dim[1]) / 2, w: r.dim[0], h: r.dim[1], tanda: true };
      }
      hal.gambar = { bytes: base64KeBytes(r.cv.toDataURL('image/jpeg', .92).split(',')[1]), w: r.cv.width, h: r.cv.height };
      unduhBlob(buatPDF([hal]), ED.namaFile(l) + '.pdf');
      catatAktivitas('Unduh', 'Poster', [l.ID], 'Unduh PDF poster QR lokasi ' + l.NamaLokasi, l.KKMPID);
    } catch (e) { galat(e); } finally { sibuk(btn, false); ED.aturTombol(); }
  },
  async cetak(daftar, btn) {
    if (btn) sibuk(btn, true);
    try {
      const dim = ED.dimensi(), kp = $('m5-kertas').value;
      let ukuran = [dim[0], dim[1]], x = 0, y = 0;
      if (kp !== 'poster') {
        const k = kertasUntuk(kp, dim);
        if (!k.muat) throw new Error('Poster tidak muat di kertas ' + kp + '.');
        ukuran = k.ukuran; x = (ukuran[0] - dim[0]) / 2; y = (ukuran[1] - dim[1]) / 2;
      }
      const hal = [];
      for (const l of daftar) {
        const r = await ED.kanvasEkspor(l, 200);
        hal.push('<div class="cetak-halaman cetak-poster"><div class="cetak-sel" style="left:' + r2(x) + 'mm;top:' + r2(y) + 'mm;width:' + dim[0] + 'mm;height:' + dim[1] + 'mm"><img src="' + r.cv.toDataURL('image/jpeg', .92) + '" alt=""></div></div>');
      }
      await cetakArea(hal.join(''), ukuran);
      catatAktivitas('Cetak', 'Poster', daftar.map(l => l.ID), 'Cetak poster QR lokasi', daftar[0].KKMPID);
    } catch (e) { galat(e); } finally { if (btn) sibuk(btn, false); ED.aturTombol(); }
  },
  async simpan() {
    if (!ED.valid) return;
    const btn = $('m5-simpan');
    sibuk(btn, true);
    try {
      ED.bacaKontrol();
      const kk = ED.target === 'global' ? '' : ED.kkmp;
      const r = await panggil('simpanTemplatePoster', kk, ED.tpl);
      ED.tpl = Object.assign({}, r.template); ED.sumber = r.sumber; ED.tplKkmp = kk;
      ED.isiKontrol();
      S.peng = null;
      toast('Template poster disimpan.');
    } catch (e) { galat(e); } finally { sibuk(btn, false); ED.aturTombol(); }
  },
  async generateQR() {
    const btn = $('m5-generate-qr');
    sibuk(btn, true);
    try {
      gantiLokasi(await panggil('generateQR', ED.lokasi));
      toast('QR Code dibuat.');
      ED.isiLokasi(); ED.render();
      if (S.menu === 'm5') M5.render();
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  },
  async buatUlang() {
    const l = ED.lokasiRow();
    if (!l || !l.QR) return;
    const ya = await konfirmasi('Buat Ulang QR Code?', 'QR Code lama untuk ' + l.NamaLokasi + ' akan dinonaktifkan sehingga poster yang sudah tercetak tidak berlaku lagi.', 'Buat Ulang');
    if (!ya) return;
    try {
      gantiLokasi(await panggil('buatUlangQR', l.ID));
      toast('QR Code baru dibuat.');
      ED.render();
      if (S.menu === 'm5') M5.render();
    } catch (e) { galat(e); }
  }
};

const M5 = {
  f: { q: '', kkmp: '' }, tampilan: [], qrLok: null,
  pasang() {
    $('m5-cari').oninput = tunda(e => { M5.f.q = e.target.value.trim().toLowerCase(); M5.render(); });
    $('m5-kkmp').onchange = e => { M5.f.kkmp = e.target.value; M5.render(); };
    $('m5-pilih-semua').onchange = e => {
      M5.tampilan.forEach(l => { if (!l.QR) return; if (e.target.checked) S.pilih5.add(l.ID); else S.pilih5.delete(l.ID); });
      M5.render();
    };
    $('m5-tbody').onchange = e => {
      const c = e.target.closest('[data-pilih]');
      if (!c) return;
      if (c.checked) S.pilih5.add(c.dataset.pilih); else S.pilih5.delete(c.dataset.pilih);
      M5.hitungPilih();
    };
    $('m5-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const l = S.lok.find(x => x.ID === t.dataset.id);
      if (!l) return;
      if (t.dataset.aksi === 'preview') M5.preview(l);
      else if (t.dataset.aksi === 'salin') salin(urlPublik(l.QR.QueryPublik));
      else M5.keEditor(l.ID);
    };
    $('m5-cetak-massal').onclick = () => M5.cetakMassal();
    $('mqr-salin').onclick = () => salin(urlPublik(M5.qrLok.QR.QueryPublik));
    $('mqr-png').onclick = () => M5.unduhQRPng();
    $('mqr-svg').onclick = () => M5.unduhQRSvg();
    $('mqr-poster').onclick = () => { tutupModal('modal-qr'); M5.keEditor(M5.qrLok.ID); };
  },
  async buka() {
    pindahEditor('m5-slot-editor');
    opsiKKMP($('m5-kkmp'), 'Semua KKMP', M5.f.kkmp);
    if (!S.lok) {
      barisMemuat($('m5-tbody'));
      try { await pastikanLokasi(); } catch (e) { galat(e); return barisKosong($('m5-tbody'), 'Gagal memuat data lokasi.', 'i-alert'); }
    }
    M5.render();
    if (!ED.siap) ED.buka({});
    else { ED.isiLokasi(); ED.render(); }
  },
  render() {
    const f = M5.f, tb = $('m5-tbody');
    M5.tampilan = (S.lok || []).filter(l => (!f.kkmp || l.KKMPID === f.kkmp) && (!f.q || (l.NamaLokasi + ' ' + l.KodeLokasi).toLowerCase().indexOf(f.q) >= 0));
    if (!M5.tampilan.length) { barisKosong(tb, 'Belum ada lokasi unit.', 'i-pin'); return M5.hitungPilih(); }
    tb.innerHTML = M5.tampilan.map(l => '<tr>' +
      '<td data-label="Pilih">' + (l.QR ? '<input type="checkbox" class="centang" data-pilih="' + esc(l.ID) + '"' + (S.pilih5.has(l.ID) ? ' checked' : '') + ' aria-label="Pilih">' : '') + '</td>' +
      (S.multi ? '<td data-label="KKMP">' + esc(l.NamaKKMP) + '</td>' : '') +
      '<td data-label="Nama Lokasi"><b>' + esc(l.NamaLokasi) + '</b></td>' +
      '<td data-label="Kode Lokasi"><span class="kode-mono">' + esc(l.KodeLokasi) + '</span></td>' +
      '<td class="kol-angka" data-label="Jumlah Inventaris">' + angka(l.JumlahBarang) + '</td>' +
      '<td data-label="QR Code">' + (l.QR ? '<span class="qr-mini">' + QR.svg(QR.buat(urlPublik(l.QR.QueryPublik), 'M'), 1) + '</span>' : '<span class="badge badge-nonaktif">Belum ada</span>') + '</td>' +
      '<td data-label="Status">' + badgeStatus(l.Status) + '</td>' +
      '<td class="kol-aksi" data-label=""><div class="aksi-sel">' +
      (l.QR ? tombolAksi('preview', l.ID, 'i-eye', 'Preview') + tombolAksi('salin', l.ID, 'i-copy', 'Salin URL Publik') : '') +
      tombolAksi('poster', l.ID, 'i-printer', 'Poster') + '</div></td></tr>').join('');
    M5.hitungPilih();
  },
  hitungPilih() {
    const n = (S.lok || []).filter(l => S.pilih5.has(l.ID) && l.QR).length, pil = M5.tampilan.filter(l => l.QR);
    $('m5-jml-pilih').textContent = n;
    $('m5-cetak-massal').disabled = !n;
    $('m5-pilih-semua').checked = pil.length > 0 && pil.every(l => S.pilih5.has(l.ID));
  },
  keEditor(id) {
    const lanjut = () => ED.buka({ lokasiId: id }).then(() => $('m5-editor').scrollIntoView({ behavior: 'smooth', block: 'start' }));
    if (S.menu === 'm5' || S.menu === 'm7') lanjut();
    else { bukaMenu('m5'); lanjut(); }
  },
  preview(l) {
    M5.qrLok = l;
    $('mqr-sub').textContent = l.NamaLokasi + ' · ' + l.NamaKKMP;
    $('mqr-gambar').innerHTML = QR.svg(QR.buat(urlPublik(l.QR.QueryPublik), 'Q'));
    $('mqr-url').textContent = urlPublik(l.QR.QueryPublik);
    bukaModal('modal-qr');
  },
  unduhQRPng() {
    const l = M5.qrLok, q = QR.buat(urlPublik(l.QR.QueryPublik), 'Q'), n = q.ukuran + 8, s = Math.ceil(1024 / n);
    const cv = document.createElement('canvas');
    cv.width = n * s; cv.height = n * s;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#000';
    q.modul.forEach((r, y) => r.forEach((v, x) => { if (v) c.fillRect((x + 4) * s, (y + 4) * s, s, s); }));
    cv.toBlob(b => unduhBlob(b, namaBerkas('qr-' + l.KodeKKMP + '-' + l.KodeLokasi) + '.png'), 'image/png');
    catatAktivitas('Unduh', 'Lokasi', [l.ID], 'Unduh QR Code PNG lokasi ' + l.NamaLokasi, l.KKMPID);
  },
  unduhQRSvg() {
    const l = M5.qrLok;
    unduhBlob(new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + QR.svg(QR.buat(urlPublik(l.QR.QueryPublik), 'Q'))], { type: 'image/svg+xml' }),
      namaBerkas('qr-' + l.KodeKKMP + '-' + l.KodeLokasi) + '.svg');
    catatAktivitas('Unduh', 'Lokasi', [l.ID], 'Unduh QR Code SVG lokasi ' + l.NamaLokasi, l.KKMPID);
  },
  async cetakMassal() {
    const daftar = (S.lok || []).filter(l => S.pilih5.has(l.ID) && l.QR);
    if (!daftar.length) return;
    if (!ED.tpl) await ED.buka({});
    await ED.cetak(daftar, $('m5-cetak-massal'));
    M5.hitungPilih();
  }
};
// ===== AKHIR BLOK: M5_QR_CODE_LOKASI =====

// ===== BLOK: M6_BARCODE_BARANG =====
const M6 = {
  f: { q: '', kkmp: '', lokasi: '', kategori: '' }, tampilan: [],
  pasang() {
    $('m6-cari').oninput = tunda(e => { M6.f.q = e.target.value.trim().toLowerCase(); M6.render(); });
    $('m6-kkmp').onchange = e => { M6.f.kkmp = e.target.value; M6.f.lokasi = ''; opsiLokasi($('m6-lokasi'), M6.f.kkmp, 'Semua Lokasi', ''); M6.render(); };
    $('m6-lokasi').onchange = e => { M6.f.lokasi = e.target.value; M6.render(); };
    $('m6-kategori').onchange = e => { M6.f.kategori = e.target.value; M6.render(); };
    $('m6-pilih-semua').onchange = e => { M6.tampilan.forEach(b => { if (e.target.checked) S.pilih6.add(b.ID); else S.pilih6.delete(b.ID); }); M6.render(); };
    $('m6-tbody').onchange = e => {
      const c = e.target.closest('[data-pilih]');
      if (!c) return;
      if (c.checked) S.pilih6.add(c.dataset.pilih); else S.pilih6.delete(c.dataset.pilih);
      M6.hitungPilih();
    };
    $('m6-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const b = (S.inv || []).find(x => x.ID === t.dataset.id);
      if (!b) return;
      if (t.dataset.aksi === 'preview') BC.buka(b);
      else if (t.dataset.aksi === 'unduh') M6.unduh(b, t);
      else M6.cetak(b, t);
    };
    $('m6-cetak-massal').onclick = () => M7.bukaDenganPilihan(S.pilih6);
  },
  async buka() {
    opsiKKMP($('m6-kkmp'), 'Semua KKMP', M6.f.kkmp);
    opsiLokasi($('m6-lokasi'), M6.f.kkmp, 'Semua Lokasi', M6.f.lokasi);
    opsiKategori($('m6-kategori'), 'Semua Kategori', M6.f.kategori);
    if (!S.inv) {
      barisMemuat($('m6-tbody'));
      try { await pastikanInventaris(); } catch (e) { galat(e); return barisKosong($('m6-tbody'), 'Gagal memuat data barang.', 'i-alert'); }
    }
    M6.render();
  },
  render() {
    const f = M6.f, tb = $('m6-tbody');
    M6.tampilan = (S.inv || []).filter(b => (!f.kkmp || b.KKMPID === f.kkmp) && (!f.lokasi || b.LokasiID === f.lokasi) && (!f.kategori || b.KategoriID === f.kategori) &&
      (!f.q || (b.NamaBarang + ' ' + b.KodeBarang + ' ' + b.KodeBarcode).toLowerCase().indexOf(f.q) >= 0));
    if (!M6.tampilan.length) { barisKosong(tb, S.inv && S.inv.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang.', 'i-barcode'); return M6.hitungPilih(); }
    tb.innerHTML = M6.tampilan.map(b => '<tr>' +
      '<td data-label="Pilih"><input type="checkbox" class="centang" data-pilih="' + esc(b.ID) + '"' + (S.pilih6.has(b.ID) ? ' checked' : '') + ' aria-label="Pilih"></td>' +
      '<td data-label="Kode Barang"><span class="kode-mono">' + esc(nilai(b.KodeBarang)) + '</span></td>' +
      '<td data-label="Nama Barang"><b>' + esc(b.NamaBarang) + '</b></td>' +
      (S.multi ? '<td data-label="KKMP">' + esc(b.NamaKKMP) + '</td>' : '') +
      '<td data-label="Lokasi Unit">' + esc(b.NamaLokasi) + '</td>' +
      '<td data-label="Kategori">' + esc(b.NamaKategori) + '</td>' +
      '<td data-label="Barcode"><span class="sel-dua"><span class="barcode-mini">' + C128.svg(b.KodeBarcode, { tinggi: 40 }) + '</span><small class="kode-mono">' + esc(b.KodeBarcode) + '</small></span></td>' +
      '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('preview', b.ID, 'i-eye', 'Preview') +
      tombolAksi('unduh', b.ID, 'i-download', 'Download') + tombolAksi('cetak', b.ID, 'i-printer', 'Cetak') + '</div></td></tr>').join('');
    M6.hitungPilih();
  },
  hitungPilih() {
    const n = S.pilih6.size;
    $('m6-jml-pilih').textContent = n;
    $('m6-cetak-massal').disabled = !n;
    $('m6-pilih-semua').checked = M6.tampilan.length > 0 && M6.tampilan.every(b => S.pilih6.has(b.ID));
  },
  presetDefault() { const d = presetDaftar(); return d.find(p => p.kunci === S.awal.pengaturan.PresetStikerDefault) || d[1]; },
  async unduh(b, btn) {
    sibuk(btn, true);
    try {
      const p = M6.presetDefault(), svg = stikerSvg(b, p.w, p.h, { qrmini: p.kunci !== 'Kecil', logo: await logoStiker() });
      unduhBlob(await svgKePng(svg, p.w * 10, p.h * 10, 300), namaBerkas('stiker-' + b.KodeBarcode) + '.png');
      catatAktivitas('Unduh', 'Stiker', [b.ID], 'Unduh PNG stiker barcode ' + b.KodeBarcode);
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  },
  async cetak(b, btn) {
    sibuk(btn, true);
    try {
      const p = M6.presetDefault();
      await cetakStiker([b], p, { mode: 'satu' }, p.kunci !== 'Kecil');
      catatAktivitas('Cetak', 'Stiker', [b.ID], 'Cetak stiker barcode ' + b.KodeBarcode);
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M6_BARCODE_BARANG =====


// ===== BLOK: M7_CETAK_STIKER =====
const M7 = {
  tab: 'm7-panel-qr', kkmp: '', f: { q: '', lokasi: '', kategori: '' }, L: null, tampilan: [], versi: 0,
  pasang() {
    $$('#m7 .tab-item').forEach(b => { b.onclick = () => M7.bukaTab(b.dataset.panel); });
    $('m7-kkmp').onchange = e => {
      M7.kkmp = e.target.value;
      M7.f.lokasi = '';
      S.pilih7.forEach(id => { const b = (S.inv || []).find(x => x.ID === id); if (!b || b.KKMPID !== M7.kkmp) S.pilih7.delete(id); });
      M7.isiFilter();
      if (M7.tab === 'm7-panel-qr') { ED.kkmp = M7.kkmp; ED.buka({}); } else { M7.renderDaftar(); M7.pratinjau(); }
    };
    $('m7b-cari').oninput = tunda(e => { M7.f.q = e.target.value.trim().toLowerCase(); M7.renderDaftar(); });
    $('m7b-lokasi').onchange = e => { M7.f.lokasi = e.target.value; M7.renderDaftar(); };
    $('m7b-kategori').onchange = e => { M7.f.kategori = e.target.value; M7.renderDaftar(); };
    $('m7b-pilih-semua').onchange = e => {
      M7.tampilan.forEach(b => { if (e.target.checked) S.pilih7.add(b.ID); else S.pilih7.delete(b.ID); });
      M7.renderDaftar(); M7.pratinjau();
    };
    $('m7b-daftar').onchange = e => {
      const c = e.target.closest('[data-pilih]');
      if (!c) return;
      if (c.checked) S.pilih7.add(c.dataset.pilih); else S.pilih7.delete(c.dataset.pilih);
      M7.hitung(); M7.pratinjau();
    };
    $('m7b-qrmini').onchange = () => M7.pratinjau();
    $('m7b-cetak').onclick = () => M7.cetak();
    $('m7l-preset').onchange = e => {
      const p = M7.presetList().find(x => x.kunci === e.target.value);
      M7.L.preset = e.target.value;
      if (p) { M7.L.w = p.w; M7.L.h = p.h; }
      $('m7b-qrmini').checked = M7.L.preset !== 'Kecil';
      M7.ubahLayout();
    };
    ['m7l-lebar', 'm7l-tinggi'].forEach(id => { $(id).onchange = () => {
      M7.L.w = Number($('m7l-lebar').value) || 0; M7.L.h = Number($('m7l-tinggi').value) || 0; M7.L.preset = 'Custom';
      M7.ubahLayout();
    }; });
    $('m7l-mode').onchange = e => { M7.L.mode = e.target.value; if (M7.L.mode === 'lembar' && M7.L.kertas === 'Roll') M7.L.kertas = 'A4'; M7.ubahLayout(); };
    $('m7l-kertas').onchange = e => { M7.L.kertas = e.target.value; M7.L.mode = M7.L.kertas === 'Roll' ? 'satu' : 'lembar'; M7.ubahLayout(); };
    $('m7l-margin').onchange = e => { M7.L.margin = Math.max(0, Number(e.target.value) || 0); M7.ubahLayout(); };
    $('m7l-jarak').onchange = e => { M7.L.jarak = Math.max(0, Number(e.target.value) || 0); M7.ubahLayout(); };
    ['m7l-kolom', 'm7l-baris'].forEach(id => { $(id).onchange = () => {
      M7.L.kolom = Math.max(1, Math.floor(Number($('m7l-kolom').value) || 1));
      M7.L.baris = Math.max(1, Math.floor(Number($('m7l-baris').value) || 1));
      M7.isiLayout(); M7.pratinjau();
    }; });
    $('m7l-simpan-custom').onclick = () => M7.simpanCustom();
  },
  presetList() {
    const p = S.awal.pengaturan, simpan = p.PresetStikerCustom ? String(p.PresetStikerCustom).split('x').map(Number) : null;
    return presetDaftar().filter(x => x.kunci !== 'Custom').concat([{
      kunci: 'Custom', nama: 'Custom', w: simpan ? simpan[0] : (M7.L ? M7.L.w : 8), h: simpan ? simpan[1] : (M7.L ? M7.L.h : 4), ket: simpan ? 'tersimpan' : 'isi lebar & tinggi'
    }]);
  },
  presetAktif() {
    const L = M7.L, p = M7.presetList().find(x => x.kunci === L.preset) || {};
    return { kunci: L.preset, nama: p.nama || 'Custom', w: L.w, h: L.h, ket: L.preset === 'Custom' ? 'manual' : p.ket };
  },
  initLayout() {
    const kunci = S.awal.pengaturan.PresetStikerDefault, p = M7.presetList().find(x => x.kunci === kunci) || M7.presetList()[1];
    M7.L = { preset: p.kunci, w: p.w, h: p.h, mode: 'lembar', kertas: 'A4', margin: 1, jarak: .2, kolom: 1, baris: 1 };
    $('m7b-qrmini').checked = p.kunci !== 'Kecil';
    M7.hitungOtomatis();
  },
  hitungOtomatis() {
    const L = M7.L;
    if (L.mode === 'satu') { L.kolom = 1; L.baris = 1; return; }
    const k = KERTAS[L.kertas], uw = k[0] - L.margin * 20, uh = k[1] - L.margin * 20, w = L.w * 10, h = L.h * 10, g = L.jarak * 10;
    L.kolom = Math.max(0, Math.floor((uw + g) / (w + g)));
    L.baris = Math.max(0, Math.floor((uh + g) / (h + g)));
  },
  ubahLayout() { M7.hitungOtomatis(); M7.isiLayout(); M7.pratinjau(); },
  isiLayout() {
    const L = M7.L;
    isiPilih($('m7l-preset'), M7.presetList(), { nilai: 'kunci', teks: labelPreset, pilih: L.preset });
    $('m7l-lebar').value = L.w; $('m7l-tinggi').value = L.h;
    $('m7l-mode').value = L.mode; $('m7l-kertas').value = L.kertas;
    $('m7l-margin').value = L.margin; $('m7l-jarak').value = L.jarak;
    $('m7l-kolom').value = L.kolom; $('m7l-baris').value = L.baris;
    const satu = L.mode === 'satu';
    ['m7l-margin', 'm7l-jarak', 'm7l-kolom', 'm7l-baris'].forEach(id => { $(id).disabled = satu; });
    if (ED.tpl) $('m7l-poster').value = $('m5-ukuran').value;
  },
  isiFilter() {
    opsiLokasi($('m7b-lokasi'), M7.kkmp, 'Semua Lokasi', M7.f.lokasi);
    opsiKategori($('m7b-kategori'), 'Semua Kategori', M7.f.kategori);
  },
  async buka() {
    if (!M7.L) M7.initLayout();
    if (S.peran === 'M') M7.kkmp = S.user.kkmpId;
    else if (!S.awal.kkmp.some(k => k.ID === M7.kkmp)) M7.kkmp = (S.awal.kkmp[0] || {}).ID || '';
    opsiKKMP($('m7-kkmp'), null, M7.kkmp);
    if (!S.inv) { try { await pastikanInventaris(); } catch (e) { galat(e); } }
    M7.isiFilter();
    M7.isiLayout();
    M7.bukaTab(M7.tab);
  },
  bukaTab(panel) {
    M7.tab = panel;
    $$('#m7 .tab-item').forEach(b => b.classList.toggle('aktif', b.dataset.panel === panel));
    ['m7-panel-qr', 'm7-panel-barcode', 'm7-panel-layout'].forEach(p => tampil(p, p === panel));
    if (panel === 'm7-panel-qr') {
      pindahEditor('m7q-slot');
      if (M7.kkmp) ED.kkmp = M7.kkmp;
      ED.buka({});
    } else { M7.renderDaftar(); M7.pratinjau(); }
  },
  bukaDenganPilihan(set) {
    const daftar = (S.inv || []).filter(b => set.has(b.ID));
    if (!daftar.length) return;
    const kk = daftar[0].KKMPID, sama = daftar.filter(b => b.KKMPID === kk);
    if (sama.length < daftar.length) toast('Satu sesi cetak hanya memuat satu KKMP. Hanya barang ' + daftar[0].NamaKKMP + ' yang dipilih.', 'info');
    S.pilih7 = new Set(sama.map(b => b.ID));
    M7.kkmp = kk;
    M7.f = { q: '', lokasi: '', kategori: '' };
    $('m7b-cari').value = '';
    M7.tab = 'm7-panel-barcode';
    bukaMenu('m7');
  },
  terpilih() { return (S.inv || []).filter(b => S.pilih7.has(b.ID) && (!M7.kkmp || b.KKMPID === M7.kkmp)); },
  renderDaftar() {
    const f = M7.f;
    M7.tampilan = (S.inv || []).filter(b => (!M7.kkmp || b.KKMPID === M7.kkmp) && (!f.lokasi || b.LokasiID === f.lokasi) && (!f.kategori || b.KategoriID === f.kategori) &&
      (!f.q || (b.NamaBarang + ' ' + b.KodeBarang + ' ' + b.KodeBarcode).toLowerCase().indexOf(f.q) >= 0));
    $('m7b-daftar').innerHTML = M7.tampilan.length ? M7.tampilan.map(b => '<label class="item-pilih"><input type="checkbox" class="centang" data-pilih="' + esc(b.ID) + '"' +
      (S.pilih7.has(b.ID) ? ' checked' : '') + '><span class="item-pilih-teks"><b>' + esc(b.NamaBarang) + '</b><small>' + esc(b.KodeBarcode) + ' · ' + esc(b.NamaLokasi) +
      '</small></span></label>').join('') : '<div class="kosong">' + ikon('i-box') + '<span>Tidak ada barang.</span></div>';
    M7.hitung();
  },
  hitung() {
    $('m7b-jumlah').textContent = M7.terpilih().length + ' barang dipilih';
    $('m7b-pilih-semua').checked = M7.tampilan.length > 0 && M7.tampilan.every(b => S.pilih7.has(b.ID));
    M7.aturCetak();
  },
  cekLayout() {
    const L = M7.L, b = S.awal.batas;
    if (!(L.w >= b.STIKER_MIN[0] && L.h >= b.STIKER_MIN[1])) return 'Ukuran stiker barcode minimal 5 × 2,5 cm.';
    if (L.mode === 'satu') return '';
    const k = KERTAS[L.kertas], uw = k[0] - L.margin * 20, uh = k[1] - L.margin * 20, w = L.w * 10, h = L.h * 10, g = L.jarak * 10;
    if (w > uw || h > uh) return 'Stiker ' + cm(L.w) + ' × ' + cm(L.h) + ' cm tidak muat di kertas ' + L.kertas + ' dengan margin ' + cm(L.margin) + ' cm.';
    if (L.kolom < 1 || L.baris < 1) return 'Jumlah kolom dan baris minimal 1.';
    if (L.kolom * w + (L.kolom - 1) * g > uw + .01 || L.baris * h + (L.baris - 1) * g > uh + .01) return 'Jumlah kolom atau baris melebihi ukuran kertas sehingga stiker akan terpotong.';
    return '';
  },
  aturCetak() { $('m7b-cetak').disabled = !M7.terpilih().length || !!M7.cekLayout(); },
  async lembarHTML(items) {
    const L = M7.L, w = L.w * 10, h = L.h * 10, satu = L.mode === 'satu', hal = satu ? [w, h] : KERTAS[L.kertas];
    const sk = Math.min(340 / hal[0], 440 / hal[1]), logo = await logoStiker(), qrmini = $('m7b-qrmini').checked, posisi = [];
    if (satu) posisi.push([0, 0]);
    else for (let y = 0; y < L.baris; y++) for (let x = 0; x < L.kolom; x++) posisi.push([L.margin * 10 + x * (w + L.jarak * 10), L.margin * 10 + y * (h + L.jarak * 10)]);
    return '<div class="lembar" style="width:' + r2(hal[0] * sk) + 'px;height:' + r2(hal[1] * sk) + 'px">' + posisi.map((p, i) =>
      '<div class="lembar-sel" style="left:' + r2(p[0] * sk) + 'px;top:' + r2(p[1] * sk) + 'px;width:' + r2(w * sk) + 'px;height:' + r2(h * sk) + 'px">' +
      (items[i] ? stikerSvg(items[i], L.w, L.h, { qrmini: qrmini, logo: logo }) : '') + '</div>').join('') + '</div>';
  },
  async pratinjau() {
    if (!M7.L || M7.tab === 'm7-panel-qr') return;
    const L = M7.L, pesan = M7.cekLayout(), items = M7.terpilih(), per = L.mode === 'satu' ? 1 : L.kolom * L.baris;
    pesanForm('m7l-peringatan', pesan);
    pesanForm('m7b-peringatan', pesan);
    const ringkas = labelPreset(M7.presetAktif()) + ' · ' + (L.mode === 'satu' ? 'Satu stiker per halaman' : L.kertas + ' · ' + L.kolom + ' kolom × ' + L.baris + ' baris') +
      ' · ' + items.length + ' stiker · ' + (per ? Math.ceil(items.length / per) : 0) + ' halaman';
    $('m7b-ringkas').textContent = ringkas;
    $('m7l-ringkas').textContent = ringkas;
    const versi = ++M7.versi;
    const html = pesan ? '<div class="kosong">' + ikon('i-alert') + '<span>' + esc(pesan) + '</span></div>' : await M7.lembarHTML(items.slice(0, per));
    if (versi !== M7.versi) return;
    $(M7.tab === 'm7-panel-barcode' ? 'm7b-pratinjau' : 'm7l-pratinjau').innerHTML = html;
    M7.aturCetak();
  },
  async cetak() {
    const daftar = M7.terpilih();
    if (!daftar.length || M7.cekLayout()) return;
    const btn = $('m7b-cetak');
    sibuk(btn, true);
    try {
      await cetakStiker(daftar, M7.presetAktif(), M7.L, $('m7b-qrmini').checked);
      catatAktivitas('Cetak', 'Stiker', daftar.map(b => b.ID), 'Cetak massal stiker barcode', M7.kkmp);
    } catch (e) { galat(e); } finally { sibuk(btn, false); M7.aturCetak(); }
  },
  async simpanCustom() {
    const btn = $('m7l-simpan-custom');
    sibuk(btn, true);
    try {
      const r = await panggil('simpanPresetCustom', M7.L.w + 'x' + M7.L.h);
      S.awal.pengaturan.PresetStikerCustom = r.PresetStikerCustom;
      M7.L.preset = 'Custom';
      M7.isiLayout();
      M7.pratinjau();
      toast('Preset Custom disimpan.');
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M7_CETAK_STIKER =====


// ===== BLOK: M8_LAPORAN =====
const M8 = {
  f: {}, jenis: 'total', siap: false,
  pasang() {
    $('m8-kkmp').onchange = e => opsiLokasi($('m8-lokasi'), e.target.value, 'Semua Lokasi', '');
    $('m8-terapkan').onclick = () => M8.muat();
    $('m8-cari').onkeydown = e => { if (e.key === 'Enter') M8.muat(); };
    $('m8-reset').onclick = () => {
      ['m8-kkmp', 'm8-lokasi', 'm8-kategori', 'm8-kondisi', 'm8-tahun-dari', 'm8-tahun-sampai', 'm8-cari'].forEach(id => { $(id).value = ''; });
      opsiLokasi($('m8-lokasi'), '', 'Semua Lokasi', '');
      M8.muat();
    };
    $('m8-tab').onclick = e => { const b = e.target.closest('[data-jenis]'); if (b) { M8.jenis = b.dataset.jenis; M8.render(); } };
    $('m8-cetak').onclick = () => M8.cetak();
    $('m8-pdf').onclick = () => M8.pdf();
  },
  bacaFilter() {
    return {
      kkmpId: S.peran === 'M' ? '' : $('m8-kkmp').value, lokasiId: $('m8-lokasi').value, kategoriId: $('m8-kategori').value,
      kondisi: $('m8-kondisi').value, tahunDari: $('m8-tahun-dari').value, tahunSampai: $('m8-tahun-sampai').value, q: $('m8-cari').value.trim()
    };
  },
  buka() {
    opsiKKMP($('m8-kkmp'), 'Semua KKMP', M8.siap ? $('m8-kkmp').value : '');
    opsiLokasi($('m8-lokasi'), $('m8-kkmp').value, 'Semua Lokasi', M8.siap ? $('m8-lokasi').value : '');
    opsiKategori($('m8-kategori'), 'Semua Kategori', M8.siap ? $('m8-kategori').value : '');
    opsiKondisi($('m8-kondisi'), 'Semua Kondisi', M8.siap ? $('m8-kondisi').value : '');
    M8.siap = true;
    if (S.lap) M8.render(); else M8.muat();
  },
  async muat() {
    M8.f = M8.bacaFilter();
    barisMemuat($('m8-tbody'));
    try { S.lap = await panggil('laporan', M8.f); M8.render(); }
    catch (e) { galat(e); barisKosong($('m8-tbody'), 'Gagal memuat laporan.', 'i-alert'); }
  },
  tabel() {
    const d = S.lap, j = M8.jenis;
    if (j === 'daftar') {
      const header = ['No'].concat(d.multiKKMP ? ['KKMP'] : [], ['Lokasi Unit', 'Kode Barang', 'Nama Barang / Jenis Barang', 'Spesifikasi Unit', 'Nomor Register',
        'Merk/Type', 'Ukuran/CC', 'Bahan', 'Tahun Pembelian', 'No. Pabrik', 'No. Rangka', 'No. Polisi', 'No. BPKB', 'Asal Usul', 'Harga', 'Kondisi', 'Keterangan']);
      const rows = d.daftar.map((b, i) => [i + 1].concat(d.multiKKMP ? [b.NamaKKMP] : [], [b.NamaLokasi, b.KodeBarang, b.NamaBarang, b.SpesifikasiUnit,
        b.NomorRegister, b.MerkType, b.UkuranCC, b.Bahan, b.TahunPembelian, b.NomorPabrik, b.NomorRangka, b.NomorPolisi, b.NomorBPKB, b.AsalUsul,
        rupiah(b.Harga), b.Kondisi, b.Keterangan]).map(nilai));
      return { judul: 'Kartu Inventaris Barang (KIB) B – Peralatan dan Mesin', header: header, rows: rows, total: false, kanan: [0, header.indexOf('Tahun Pembelian'), header.indexOf('Harga')] };
    }
    const def = {
      total: ['Laporan Total Inventaris & Rekap Nilai Barang', d.perLokasi, 'Lokasi Unit'], lokasi: ['Rekap Inventaris per Lokasi Unit', d.perLokasi, 'Lokasi Unit'],
      kategori: ['Rekap Inventaris per Kategori', d.perKategori, 'Kategori'], kondisi: ['Rekap Inventaris per Kondisi', d.perKondisi, 'Kondisi'],
      tahun: ['Rekap Inventaris per Tahun Pembelian', d.perTahun, 'Tahun Pembelian'], kkmp: ['Rekap Inventaris per KKMP', d.perKKMP || [], 'KKMP']
    }[j];
    const t = d.total;
    const rows = def[1].map(r => [r.nama, angka(r.jumlah), angka(r.baik), angka(r.rusakRingan), angka(r.rusakBerat), rupiah(r.nilai)])
      .concat([['TOTAL', angka(t.jumlah), angka(t.baik), angka(t.rusakRingan), angka(t.rusakBerat), rupiah(t.nilai)]]);
    return { judul: def[0], header: [def[2], 'Jumlah Barang', 'Baik', 'Rusak Ringan', 'Rusak Berat', 'Total Nilai'], rows: rows, total: true, kanan: [1, 2, 3, 4, 5] };
  },
  render() {
    $$('#m8-tab .tab-item').forEach(b => b.classList.toggle('aktif', b.dataset.jenis === M8.jenis));
    const d = S.lap;
    if (!d) return;
    const t = d.total;
    $('m8-ringkasan').innerHTML = [['Total Barang', angka(t.jumlah), 'i-box', 'warna-merah'], ['Total Nilai (dalam ribuan)', 'Rp\u00a0' + angka(Math.round((Number(t.nilai) || 0) / 1000)), 'i-money', 'warna-biru'],
      ['Baik', angka(t.baik), 'i-check-circle', 'warna-hijau'], ['Rusak Ringan', angka(t.rusakRingan), 'i-alert', 'warna-kuning'],
      ['Rusak Berat', angka(t.rusakBerat), 'i-x-circle', 'warna-merah']].map(x => kartuStat(x[0], x[1], x[2], x[3])).join('');
    const tb = M8.tabel();
    $('m8-judul').textContent = tb.judul;
    $('m8-sub').textContent = d.judulKKMP;
    $('m8-thead').innerHTML = '<tr>' + tb.header.map((h, i) => '<th' + (tb.kanan.indexOf(i) >= 0 ? ' class="kol-angka"' : '') + '>' + esc(h) + '</th>').join('') + '</tr>';
    if (!d.daftar.length) return barisKosong($('m8-tbody'), 'Tidak ada data untuk filter ini.', 'i-file');
    $('m8-tbody').innerHTML = tb.rows.map((r, ri) => '<tr' + (tb.total && ri === tb.rows.length - 1 ? ' class="tabel-total"' : '') + '>' +
      r.map((c, i) => '<td data-label="' + esc(tb.header[i]) + '"' + (tb.kanan.indexOf(i) >= 0 ? ' class="kol-angka"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('');
  },
  cetak() {
    if (!S.lap || !S.lap.daftar.length) return toast('Tidak ada data untuk dicetak.', 'info');
    const tb = M8.tabel(), p = S.awal.pengaturan;
    const html = '<div class="cetak-laporan"><div class="cetak-kepala"><h1>' + esc(tb.judul) + '</h1><p>' + esc(S.lap.judulKKMP + ' · ' + p.NamaAplikasi + ' ' + p.NamaInstansi) +
      '<br>Dicetak: ' + esc(new Date().toLocaleString('id-ID')) + ' oleh ' + esc(S.user.nama) + '</p></div><table class="cetak-tabel"><thead><tr>' +
      tb.header.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      tb.rows.map((r, ri) => '<tr' + (tb.total && ri === tb.rows.length - 1 ? ' class="cetak-total"' : '') + '>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
    cetakArea(html, 'A4 landscape', true);
    catatAktivitas('Cetak', 'Laporan', [], 'Cetak ' + tb.judul + ' – ' + S.lap.judulKKMP, S.peran === 'M' ? S.user.kkmpId : M8.f.kkmpId);
  },
  async pdf() {
    if (!S.lap || !S.lap.daftar.length) return toast('Tidak ada data untuk diunduh.', 'info');
    const btn = $('m8-pdf');
    sibuk(btn, true);
    try {
      const r = await panggil('unduhLaporanPDF', M8.f, M8.jenis);
      unduhBlob(new Blob([base64KeBytes(r.base64)], { type: 'application/pdf' }), r.nama);
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M8_LAPORAN =====


// ===== BLOK: M9_PENGATURAN_GLOBAL =====
const M9 = {
  tab: 'm9-panel-profil', logDimuat: false,
  pasang() {
    $$('#m9 .tab-item').forEach(b => { b.onclick = () => M9.bukaTab(b.dataset.panel); });
    $('f9-simpan-profil').onclick = () => M9.simpan({ NamaAplikasi: $('f9-nama').value, NamaInstansi: $('f9-instansi').value, AlamatInstansi: $('f9-alamat').value }, $('f9-simpan-profil'));
    $('f9-simpan-format').onclick = () => M9.simpan({ FormatKodeBarang: $('f9-format-barang').value, NomorUrutBarang: $('f9-nomor-awal').value, FormatKodeBarcode: $('f9-format-barcode').value }, $('f9-simpan-format'));
    $('f9-simpan-preset').onclick = () => M9.simpan({
      PresetStikerKecil: $('f9-kecil').value, PresetStikerSedang: $('f9-sedang').value, PresetStikerBesar: $('f9-besar').value,
      PresetStikerAsetBesar: $('f9-aset').value, PresetStikerDefault: $('f9-default').value, PresetQRLokasi: $('f9-poster').value
    }, $('f9-simpan-preset'));
    $('f9-buka-template').onclick = () => {
      ED.target = 'global'; ED.siap = false;
      bukaMenu('m5');
      setTimeout(() => $('m5-editor').scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    };
    $('f9-log-terapkan').onclick = () => M9.muatLog();
  },
  async buka() {
    M9.bukaTab(M9.tab);
    if (!S.peng) {
      try { S.peng = await panggil('ambilPengaturan'); } catch (e) { return galat(e); }
    }
    M9.isi();
  },
  isi() {
    const p = S.peng.pengaturan, tg = S.peng.templateGlobal, t = tg.template;
    $('f9-nama').value = p.NamaAplikasi; $('f9-instansi').value = p.NamaInstansi; $('f9-alamat').value = p.AlamatInstansi || '';
    $('f9-format-barang').value = p.FormatKodeBarang; $('f9-nomor-awal').value = p.NomorUrutBarang; $('f9-format-barcode').value = p.FormatKodeBarcode;
    $('f9-kecil').value = p.PresetStikerKecil; $('f9-sedang').value = p.PresetStikerSedang; $('f9-besar').value = p.PresetStikerBesar; $('f9-aset').value = p.PresetStikerAsetBesar;
    $('f9-default').value = p.PresetStikerDefault; $('f9-poster').value = p.PresetQRLokasi;
    $('f9-template-info').textContent = 'Ukuran ' + String(t.UkuranPoster).replace('x', ' × ') + ' cm · ' + t.Orientasi + ' · QR Code ' + cm(t.UkuranQR) + ' cm · Judul "' + t.Judul + '"' +
      (tg.sumber === 'Default' ? ' · memakai nilai default' : '');
    opsiKKMP($('f9-log-kkmp'), 'Semua KKMP');
    isiPilih($('f9-log-jenis'), S.awal.pilihan.log, { semua: 'Semua Jenis' });
    const isiPengguna = () => isiPilih($('f9-log-pengguna'), S.pengguna || [], { semua: 'Semua Pengguna', nilai: 'ID', teks: 'NamaLengkap' });
    if (S.pengguna) isiPengguna();
    else panggil('daftarPengguna').then(d => { S.pengguna = d; isiPengguna(); }).catch(() => isiPengguna());
  },
  bukaTab(panel) {
    M9.tab = panel;
    $$('#m9 .tab-item').forEach(b => b.classList.toggle('aktif', b.dataset.panel === panel));
    ['m9-panel-profil', 'm9-panel-format', 'm9-panel-preset', 'm9-panel-template', 'm9-panel-log'].forEach(p => tampil(p, p === panel));
    if (panel === 'm9-panel-log' && !M9.logDimuat) M9.muatLog();
  },
  async simpan(d, btn) {
    sibuk(btn, true);
    try {
      S.peng = await panggil('simpanPengaturan', d);
      const p = S.peng.pengaturan;
      Object.keys(S.awal.pengaturan).forEach(k => { if (k in p) S.awal.pengaturan[k] = p[k]; });
      isiIdentitas({ namaAplikasi: p.NamaAplikasi, namaInstansi: p.NamaInstansi });
      M7.L = null;
      M9.isi();
      toast('Pengaturan disimpan.');
    } catch (e) { galat(e); } finally { sibuk(btn, false); }
  },
  async muatLog() {
    const tb = $('f9-log-tbody');
    barisMemuat(tb);
    try {
      const d = await panggil('daftarLog', {
        penggunaId: $('f9-log-pengguna').value, kkmpId: $('f9-log-kkmp').value, jenis: $('f9-log-jenis').value,
        dari: $('f9-log-dari').value, sampai: $('f9-log-sampai').value
      });
      M9.logDimuat = true;
      if (!d.length) return barisKosong(tb, 'Tidak ada log aktivitas.', 'i-activity');
      tb.innerHTML = d.map(l => '<tr><td data-label="Waktu">' + esc(tanggal(l.waktu)) + '</td><td data-label="Pengguna">' + esc(l.pengguna) + '</td>' +
        '<td data-label="Jenis"><span class="badge badge-netral">' + esc(l.jenis) + '</span></td><td data-label="Modul">' + esc(l.modul) + '</td>' +
        '<td data-label="KKMP">' + esc(namaKKMP(l.kkmpId) || '-') + '</td><td data-label="Deskripsi">' + esc(l.deskripsi) + '</td></tr>').join('');
    } catch (e) { galat(e); barisKosong(tb, 'Gagal memuat log aktivitas.', 'i-alert'); }
  }
};
// ===== AKHIR BLOK: M9_PENGATURAN_GLOBAL =====


// ===== BLOK: M10_MANAJEMEN_KKMP =====
async function segarkanMaster() {
  try {
    const d = await panggil('muatAwal');
    S.awal.kkmp = d.kkmp; S.awal.lokasi = d.lokasi; S.awal.kategori = d.kategori;
    S.dash = d.dashboard; S.lok = null; S.lap = null;
  } catch (e) { galat(e); }
}

const M10 = {
  q: '',
  pasang() {
    $('m10-cari').oninput = tunda(e => { M10.q = e.target.value.trim().toLowerCase(); M10.render(); });
    $('m10-tambah').onclick = () => M10.bukaForm(null);
    $('m10-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const k = S.kkmpList.find(x => x.ID === t.dataset.id);
      if (t.dataset.aksi === 'detail') M10.detail(k);
      else if (t.dataset.aksi === 'edit') M10.bukaForm(k);
      else M10.hapus(k);
    };
    $('form-kkmp').onsubmit = M10.simpan;
  },
  async buka() {
    if (!S.kkmpList) {
      barisMemuat($('m10-tbody'));
      try { S.kkmpList = await panggil('daftarKKMP'); } catch (e) { galat(e); return barisKosong($('m10-tbody'), 'Gagal memuat data KKMP.', 'i-alert'); }
    }
    M10.render();
  },
  render() {
    const tb = $('m10-tbody');
    const data = (S.kkmpList || []).filter(k => !M10.q || (k.NamaKKMP + ' ' + k.KodeKKMP).toLowerCase().indexOf(M10.q) >= 0);
    if (!data.length) return barisKosong(tb, 'Belum ada KKMP.', 'i-building');
    tb.innerHTML = data.map((k, i) => '<tr><td class="kol-no" data-label="No">' + (i + 1) + '</td>' +
      '<td data-label="Nama KKMP"><b>' + esc(k.NamaKKMP) + '</b></td><td data-label="Kode KKMP"><span class="kode-mono">' + esc(k.KodeKKMP) + '</span></td>' +
      '<td data-label="Alamat">' + esc(nilai(k.Alamat)) + '</td><td class="kol-angka" data-label="Jumlah Barang">' + angka(k.JumlahBarang) + '</td>' +
      '<td class="kol-angka" data-label="Jumlah Lokasi">' + angka(k.JumlahLokasi) + '</td><td class="kol-angka" data-label="Jumlah Manager">' + angka(k.JumlahManager) + '</td>' +
      '<td data-label="Status">' + badgeStatus(k.Status) + '</td><td data-label="Tanggal Dibuat">' + esc(tanggal(k.Dibuat)) + '</td>' +
      '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('detail', k.ID, 'i-eye', 'Detail') + tombolAksi('edit', k.ID, 'i-edit', 'Edit') +
      tombolAksi('hapus', k.ID, 'i-trash', 'Hapus', true) + '</div></td></tr>').join('');
  },
  bukaForm(k) {
    $('fkk-judul').textContent = k ? 'Edit KKMP' : 'Tambah KKMP';
    pesanForm('fkk-galat', '');
    tampil('fkk-info', !k);
    $('fkk-id').value = k ? k.ID : '';
    $('fkk-nama').value = k ? k.NamaKKMP : '';
    $('fkk-kode').value = k ? k.KodeKKMP : '';
    $('fkk-alamat').value = k ? k.Alamat : '';
    isiPilih($('fkk-status'), S.awal.pilihan.status, { pilih: k ? k.Status : 'Aktif' });
    bukaModal('modal-kkmp');
  },
  async simpan(e) {
    e.preventDefault();
    const btn = $('fkk-simpan'), id = $('fkk-id').value;
    sibuk(btn, true);
    pesanForm('fkk-galat', '');
    try {
      const k = await panggil('simpanKKMP', { ID: id, NamaKKMP: $('fkk-nama').value, KodeKKMP: $('fkk-kode').value, Alamat: $('fkk-alamat').value, Status: $('fkk-status').value });
      const i = S.kkmpList.findIndex(x => x.ID === k.ID);
      if (i >= 0) S.kkmpList[i] = k; else S.kkmpList.push(k);
      if (S.inv) S.inv.forEach(b => { if (b.KKMPID === k.ID) b.NamaKKMP = k.NamaKKMP; });
      await segarkanMaster();
      tutupModal('modal-kkmp');
      toast(id ? 'KKMP diperbarui.' : 'KKMP ditambahkan beserta lokasi GERAI, KLINIK, dan GUDANG.');
      M10.render();
    } catch (er) { pesanForm('fkk-galat', er.message); } finally { sibuk(btn, false); }
  },
  async hapus(k) {
    if (!(await konfirmasi('Hapus KKMP?', k.NamaKKMP + ' akan dihapus dari aplikasi.', 'Hapus'))) return;
    try {
      await panggil('hapusKKMP', k.ID);
      S.kkmpList = S.kkmpList.filter(x => x.ID !== k.ID);
      await segarkanMaster();
      M10.render();
      toast('KKMP dihapus.');
    } catch (e) { galat(e); }
  },
  async detail(k) {
    $('dk-judul').textContent = k.NamaKKMP;
    $('dk-isi').innerHTML = '<div class="kosong"><div class="pemutar"></div><span>Memuat...</span></div>';
    bukaModal('modal-detail-kkmp');
    try {
      const d = await panggil('detailKKMP', k.ID), r = d.ringkasan;
      $('dk-isi').innerHTML = '<div class="grid-stat grid-stat-kecil">' + [['Total Barang', r.totalBarang, 'i-box', 'warna-merah'], ['Lokasi Unit', r.totalLokasi, 'i-pin', 'warna-biru'],
        ['Baik', r.baik, 'i-check-circle', 'warna-hijau'], ['Rusak Ringan', r.rusakRingan, 'i-alert', 'warna-kuning'], ['Rusak Berat', r.rusakBerat, 'i-x-circle', 'warna-merah']]
        .map(x => kartuStat(x[0], angka(x[1]), x[2], x[3])).join('') + '</div>' +
        '<h4 class="sub-bagian">' + ikon('i-pin') + 'Lokasi Unit</h4><div class="tabel-wadah"><table class="tabel tabel-kartu"><thead><tr><th>Nama Lokasi</th><th>Kode</th><th class="kol-angka">Jumlah Barang</th><th>QR Code</th><th>Status</th></tr></thead><tbody>' +
        (d.lokasi.length ? d.lokasi.map(l => '<tr><td data-label="Nama Lokasi"><b>' + esc(l.NamaLokasi) + '</b></td><td data-label="Kode"><span class="kode-mono">' + esc(l.KodeLokasi) + '</span></td>' +
          '<td class="kol-angka" data-label="Jumlah Barang">' + angka(l.JumlahBarang) + '</td><td data-label="QR Code">' + (l.QR ? esc(l.QR.ID) : '-') + '</td><td data-label="Status">' + badgeStatus(l.Status) + '</td></tr>').join('')
          : '<tr><td class="sel-kosong" colspan="5"><div class="kosong"><span>Belum ada lokasi.</span></div></td></tr>') + '</tbody></table></div>' +
        '<h4 class="sub-bagian">' + ikon('i-users') + 'Akun Terhubung</h4><div class="tabel-wadah"><table class="tabel tabel-kartu"><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Status</th></tr></thead><tbody>' +
        (d.pengguna.length ? d.pengguna.map(u => '<tr><td data-label="Nama"><b>' + esc(u.NamaLengkap) + '</b></td><td data-label="Username"><span class="kode-mono">' + esc(u.Username) + '</span></td>' +
          '<td data-label="Role">' + esc(u.Role) + '</td><td data-label="Status">' + badgeStatus(u.Status) + '</td></tr>').join('')
          : '<tr><td class="sel-kosong" colspan="4"><div class="kosong"><span>Belum ada akun terhubung.</span></div></td></tr>') + '</tbody></table></div>';
    } catch (e) { $('dk-isi').innerHTML = '<div class="kosong">' + ikon('i-alert') + '<span>' + esc(e.message) + '</span></div>'; }
  }
};
// ===== AKHIR BLOK: M10_MANAJEMEN_KKMP =====


// ===== BLOK: M11_MANAJEMEN_PENGGUNA =====
function gantiPengguna(u) {
  if (!S.pengguna) S.pengguna = [];
  const i = S.pengguna.findIndex(x => x.ID === u.ID);
  if (i >= 0) S.pengguna[i] = u; else S.pengguna.push(u);
}

const M11 = {
  f: { q: '', role: '', kkmp: '', status: '', manager: false },
  pasang() {
    $('m11-tab-semua').onclick = () => { M11.f.manager = false; M11.render(); };
    $('m11-tab-manager').onclick = () => { M11.f.manager = true; M11.render(); };
    $('m11-cari').oninput = tunda(e => { M11.f.q = e.target.value.trim().toLowerCase(); M11.render(); });
    $('m11-role').onchange = e => { M11.f.role = e.target.value; M11.render(); };
    $('m11-kkmp').onchange = e => { M11.f.kkmp = e.target.value; M11.render(); };
    $('m11-status').onchange = e => { M11.f.status = e.target.value; M11.render(); };
    $('m11-tambah').onclick = () => M11.bukaForm(null);
    $('m11-tbody').onclick = e => {
      const t = e.target.closest('[data-aksi]');
      if (!t) return;
      const u = S.pengguna.find(x => x.ID === t.dataset.id);
      if (t.dataset.aksi === 'edit') M11.bukaForm(u);
      else if (t.dataset.aksi === 'status') M11.ubahStatus(u);
      else M11.bukaReset(u);
    };
    $('fp-role').onchange = () => M11.aturRole();
    $('fp-cakupan-semua').onchange = () => M11.aturCakupan();
    $('fp-cakupan-pilih').onchange = () => M11.aturCakupan();
    $('form-pengguna').onsubmit = M11.simpan;
    $('form-reset').onsubmit = M11.simpanReset;
  },
  async buka() {
    isiPilih($('m11-role'), S.awal.pilihan.role, { semua: 'Semua Role', pilih: M11.f.role });
    opsiKKMP($('m11-kkmp'), 'Semua KKMP', M11.f.kkmp);
    isiPilih($('m11-status'), S.awal.pilihan.status, { semua: 'Semua Status', pilih: M11.f.status });
    if (!S.pengguna) {
      barisMemuat($('m11-tbody'));
      try { S.pengguna = await panggil('daftarPengguna'); } catch (e) { galat(e); return barisKosong($('m11-tbody'), 'Gagal memuat data pengguna.', 'i-alert'); }
    }
    M11.render();
  },
  render() {
    const f = M11.f, tb = $('m11-tbody');
    $('m11-tab-semua').classList.toggle('aktif', !f.manager);
    $('m11-tab-manager').classList.toggle('aktif', f.manager);
    tampil('m11-role', !f.manager);
    const data = (S.pengguna || []).filter(u =>
      (f.manager ? u.Role === 'Manager Koperasi' : (!f.role || u.Role === f.role)) &&
      (!f.kkmp || u.KKMPID === f.kkmp || u.CakupanKKMP === 'SEMUA' || String(u.CakupanKKMP).split(',').indexOf(f.kkmp) >= 0) &&
      (!f.status || u.Status === f.status) &&
      (!f.q || (u.NamaLengkap + ' ' + u.Username + ' ' + u.Email).toLowerCase().indexOf(f.q) >= 0));
    if (!data.length) return barisKosong(tb, 'Tidak ada akun.', 'i-users');
    tb.innerHTML = data.map(u => '<tr><td data-label="Nama Pengguna"><b>' + esc(u.NamaLengkap) + '</b></td>' +
      '<td data-label="Username"><span class="kode-mono">' + esc(u.Username) + '</span></td><td data-label="Email">' + esc(nilai(u.Email)) + '</td>' +
      '<td data-label="Role"><span class="badge badge-info">' + esc(u.Role) + '</span></td>' +
      '<td data-label="Nama KKMP / Cakupan">' + esc(u.Role === 'Manager Koperasi' ? u.NamaKKMP : u.Role === 'Viewer' ? u.NamaCakupan : 'Semua KKMP') + '</td>' +
      '<td data-label="Status">' + badgeStatus(u.Status) + '</td><td data-label="Login Terakhir">' + esc(tanggal(u.LoginTerakhir)) + '</td>' +
      '<td class="kol-aksi" data-label=""><div class="aksi-sel">' + tombolAksi('edit', u.ID, 'i-edit', 'Edit') +
      tombolAksi('status', u.ID, u.Status === 'Aktif' ? 'i-x-circle' : 'i-check-circle', u.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan', u.Status === 'Aktif') +
      tombolAksi('reset', u.ID, 'i-lock', 'Reset Password') + '</div></td></tr>').join('');
  },
  bukaForm(u) {
    $('fp-judul').textContent = u ? 'Edit Pengguna' : 'Tambah Pengguna';
    pesanForm('fp-galat', '');
    $('fp-id').value = u ? u.ID : '';
    $('fp-nama').value = u ? u.NamaLengkap : '';
    $('fp-username').value = u ? u.Username : '';
    $('fp-email').value = u ? u.Email : '';
    $('fp-password').value = '';
    tampil('fp-grup-password', !u);
    isiPilih($('fp-role'), S.awal.pilihan.role, { pilih: u ? u.Role : 'Manager Koperasi' });
    isiPilih($('fp-kkmp'), S.awal.kkmp, { semua: '— Pilih KKMP —', nilai: 'ID', teks: 'NamaKKMP', pilih: u ? u.KKMPID : '' });
    isiPilih($('fp-status'), S.awal.pilihan.status, { pilih: u ? u.Status : 'Aktif' });
    const cak = u && u.Role === 'Viewer' ? u.CakupanKKMP : 'SEMUA', ids = cak === 'SEMUA' ? [] : String(cak).split(',');
    $('fp-cakupan-semua').checked = cak === 'SEMUA';
    $('fp-cakupan-pilih').checked = cak !== 'SEMUA';
    $('fp-cakupan-daftar').innerHTML = S.awal.kkmp.map(k => '<label class="item-pilih"><input type="checkbox" class="centang" value="' + esc(k.ID) + '"' +
      (ids.indexOf(k.ID) >= 0 ? ' checked' : '') + '><span class="item-pilih-teks"><b>' + esc(k.NamaKKMP) + '</b><small>' + esc(k.KodeKKMP) + '</small></span></label>').join('');
    M11.aturRole();
    bukaModal('modal-pengguna');
  },
  aturRole() {
    const r = $('fp-role').value;
    tampil('fp-grup-kkmp', r === 'Manager Koperasi');
    tampil('fp-grup-cakupan', r === 'Viewer');
    M11.aturCakupan();
  },
  aturCakupan() { tampil('fp-cakupan-daftar', $('fp-cakupan-pilih').checked); },
  async simpan(e) {
    e.preventDefault();
    const btn = $('fp-simpan'), id = $('fp-id').value;
    sibuk(btn, true);
    pesanForm('fp-galat', '');
    try {
      const u = await panggil('simpanPengguna', {
        ID: id, NamaLengkap: $('fp-nama').value, Username: $('fp-username').value, Email: $('fp-email').value, Password: $('fp-password').value,
        Role: $('fp-role').value, KKMPID: $('fp-kkmp').value, Status: $('fp-status').value,
        CakupanKKMP: $('fp-cakupan-semua').checked ? 'SEMUA' : $$('#fp-cakupan-daftar input:checked').map(i => i.value)
      });
      gantiPengguna(u);
      S.kkmpList = null; S.dash = null;
      tutupModal('modal-pengguna');
      toast(id ? 'Akun diperbarui.' : 'Akun dibuat. Pengguna wajib mengganti password saat login pertama.');
      M11.render();
    } catch (er) { pesanForm('fp-galat', er.message); } finally { sibuk(btn, false); }
  },
  async ubahStatus(u) {
    const baru = u.Status === 'Aktif' ? 'Nonaktif' : 'Aktif', kata = baru === 'Aktif' ? 'Aktifkan' : 'Nonaktifkan';
    if (!(await konfirmasi(kata + ' Akun?', 'Akun ' + u.Username + ' akan di' + kata.toLowerCase() + '.', kata))) return;
    try { gantiPengguna(await panggil('ubahStatusPengguna', u.ID, baru)); M11.render(); toast('Status akun diubah menjadi ' + baru + '.'); }
    catch (e) { galat(e); }
  },
  bukaReset(u) {
    $('fr-id').value = u.ID;
    $('fr-nama').textContent = 'Akun: ' + u.NamaLengkap + ' (' + u.Username + ')';
    $('fr-password').value = '';
    pesanForm('fr-galat', '');
    bukaModal('modal-reset');
  },
  async simpanReset(e) {
    e.preventDefault();
    const btn = $('fr-simpan');
    sibuk(btn, true);
    pesanForm('fr-galat', '');
    try {
      gantiPengguna(await panggil('resetPassword', $('fr-id').value, $('fr-password').value));
      tutupModal('modal-reset');
      toast('Password sementara disimpan.');
      M11.render();
    } catch (er) { pesanForm('fr-galat', er.message); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M11_MANAJEMEN_PENGGUNA =====


// ===== BLOK: M12_PROFIL_AKUN =====
const M12 = {
  pasang() {
    $('form-profil').onsubmit = M12.simpanProfil;
    $('form-password').onsubmit = M12.simpanPassword;
  },
  buka() { M12.isi(); },
  isi() {
    const u = S.user;
    const cakupan = u.kodeRole === 'A' ? 'Semua KKMP' : u.kodeRole === 'M' ? u.namaKKMP
      : (u.cakupan === 'SEMUA' ? 'Semua KKMP' : (u.cakupan || []).map(namaKKMP).join(', '));
    $('m12-info').innerHTML = dl([['Nama', u.nama], ['Username', u.username], ['Email', u.email], ['Role', u.role],
      [u.kodeRole === 'V' ? 'Cakupan KKMP' : 'Nama KKMP', cakupan]]);
    $('fpr-nama').value = u.nama;
    $('fpr-email').value = u.email || '';
  },
  async simpanProfil(e) {
    e.preventDefault();
    const btn = $('fpr-simpan');
    sibuk(btn, true);
    try {
      S.user = Object.assign(S.user, await panggil('ubahProfil', $('fpr-nama').value, $('fpr-email').value));
      isiProfilHeader();
      M12.isi();
      toast('Profil diperbarui.');
    } catch (er) { galat(er); } finally { sibuk(btn, false); }
  },
  async simpanPassword(e) {
    e.preventDefault();
    const btn = $('fpw-simpan');
    sibuk(btn, true);
    try {
      await panggil('gantiPassword', $('fpw-lama').value, $('fpw-baru').value);
      $('fpw-lama').value = ''; $('fpw-baru').value = '';
      toast('Password berhasil diganti.');
    } catch (er) { galat(er); } finally { sibuk(btn, false); }
  }
};
// ===== AKHIR BLOK: M12_PROFIL_AKUN =====


// ===== BLOK: BOOT =====
const MODUL = { m1: M1, m2: M2, m3: M3, m4: M4, m5: M5, m6: M6, m7: M7, m8: M8, m9: M9, m10: M10, m11: M11, m12: M12 };

function mulai() {
  let tema = 'gelap';
  try { tema = localStorage.getItem('kib_tema') || 'gelap'; } catch (e) { /* abaikan */ }
  terapkanTema(tema);
  isiIdentitas(DATA_AWAL.identitas);
  S.baseUrl = DATA_AWAL.baseUrl || '';
  pasangUmum();
  DD.pasang();
  [M1, M2, BC, M3, M4, ED, M5, M6, M7, M8, M9, M10, M11, M12].forEach(m => m.pasang());
  if (!gasSiap()) toast('GAS_URL di js/config.js belum diisi dengan URL Web App (/exec).', 'galat');
  ambilIdentitas().then(idt => { if (idt && !S.awal) isiIdentitas(idt); });
  if (DATA_AWAL.halaman) return bukaPublik(DATA_AWAL.halaman, DATA_AWAL);
  S.token = ambilToken();
  if (S.token) muatAplikasi(); else tampilLogin();
}
mulai();
// ===== AKHIR BLOK: BOOT =====
