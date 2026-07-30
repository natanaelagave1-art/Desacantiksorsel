/* =========================================================================
   KONFIGURASI SUMBER DATA — Desa Sudrofoyo
   =========================================================================
   Sudah disambungkan ke Google Sheets asli Desa Sudrofoyo.

   PENTING: sheet-sheet ini harus di-share dengan akses
   "Anyone with the link" (Viewer) supaya bisa diakses tanpa login —
   kalau masih "Restricted", grafik akan gagal dimuat dan otomatis
   memakai data cadangan di bawah.

   Format kolom yang diharapkan tiap sheet:
   - Sheet grafik (demografi/pendidikan/komoditas/pdrb/ringkasan): kolom
     pertama "Label", kolom kedua "Nilai".
   - Sheet infografis: kolom "Judul", "URL_Gambar", "Kategori".
   ========================================================================= */

const CONFIG = {
  CHART_SOURCES: {
    demografi: "https://docs.google.com/spreadsheets/d/11xIcGgczdC21ZZobepYXk1BKyvE83O34dCzOc5wnufg/gviz/tq?tqx=out:csv&gid=591267247",
    pendidikan: "https://docs.google.com/spreadsheets/d/1_frakQdOkcBDWDno0pWYe1940k2TgpKfbcJFKCifsXI/gviz/tq?tqx=out:csv&gid=0",
    komoditas: "https://docs.google.com/spreadsheets/d/1f5OE_4IIV-3M4B4eHXIKOlJ6GGjrosH16yF0cWSEhCU/gviz/tq?tqx=out:csv&gid=24863216",
    pdrb: "https://docs.google.com/spreadsheets/d/1ujvfmkzepleT7unznZvOPGcvly3t_B1iop0DIJbmubU/gviz/tq?tqx=out:csv&gid=0",
  },
  INFOGRAFIS_SOURCE: "https://docs.google.com/spreadsheets/d/16NNRqU1_OSzClx7TICdKcjNxRsmidmO-tejaGKZfXRk/gviz/tq?tqx=out:csv&gid=908468724",
  RINGKASAN_SOURCE: "https://docs.google.com/spreadsheets/d/1-VV2WkcBn_7wulrLH1GES6kaeHIDRMDZT8lY4GT9zio/gviz/tq?tqx=out:csv&gid=0",
};

/* Palet warna resmi — dipakai konsisten di semua grafik */
const PALET = ["#16324a", "#c69a2e", "#3f6b4b", "#8a9aa8", "#b33a34", "#6f8a9e"];

/* Data cadangan (dipakai kalau Google Sheets belum disambungkan / fetch gagal) */
const FALLBACK_DATA = {
  demografi: [
    { Label: "Laki-laki", Nilai: 2140 },
    { Label: "Perempuan", Nilai: 2095 },
  ],
  pendidikan: [
    { Label: "SD/Sederajat", Nilai: 1120 },
    { Label: "SMP/Sederajat", Nilai: 980 },
    { Label: "SMA/Sederajat", Nilai: 1340 },
    { Label: "Diploma/S1", Nilai: 610 },
    { Label: "Belum/Tidak Sekolah", Nilai: 185 },
  ],
  komoditas: [
    { Label: "Padi", Nilai: 45 },
    { Label: "Jagung", Nilai: 20 },
    { Label: "Sayur Mayur", Nilai: 18 },
    { Label: "Perikanan Air Tawar", Nilai: 12 },
    { Label: "Perkebunan Rakyat", Nilai: 5 },
  ],
  pdrb: [
    { Label: "2021", Nilai: 18.2 },
    { Label: "2022", Nilai: 19.6 },
    { Label: "2023", Nilai: 21.4 },
    { Label: "2024", Nilai: 23.1 },
    { Label: "2025", Nilai: 24.8 },
  ],
  ringkasan: [
    { Label: "Penduduk", Nilai: "4.235" },
    { Label: "KK", Nilai: "1.180" },
    { Label: "Dusun", Nilai: "8" },
    { Label: "Luas Wilayah", Nilai: "612 Ha" },
  ],
  infografis: [
    { Judul: "Peta Batas Wilayah Desa Sudrofoyo", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-peta/600/450", Kategori: "Wilayah" },
    { Judul: "Alur Pelayanan Surat Menyurat", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-layanan/600/450", Kategori: "Pelayanan" },
    { Judul: "Capaian Program Desa 2025", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-capaian/600/450", Kategori: "Laporan" },
    { Judul: "Peta Sebaran Potensi Komoditas", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-komoditas/600/450", Kategori: "Ekonomi" },
    { Judul: "Struktur Anggaran Dana Desa", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-anggaran/600/450", Kategori: "Laporan" },
    { Judul: "Jadwal Posyandu & Layanan Kesehatan", URL_Gambar: "https://picsum.photos/seed/sudrofoyo-posyandu/600/450", Kategori: "Kesehatan" },
  ],
};

/**
 * Mengambil dan mem-parsing CSV publik dari Google Sheets.
 * Mengembalikan array of object (key = header kolom).
 * Kalau URL masih placeholder atau fetch gagal, otomatis pakai data cadangan.
 */
async function ambilDataSheet(url, fallbackKey) {
  const isPlaceholder = !url || url.includes("GANTI_");
  if (isPlaceholder) {
    return { data: FALLBACK_DATA[fallbackKey], sumber: "cadangan" };
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Gagal fetch: " + res.status);
    const teks = await res.text();
    const hasil = Papa.parse(teks.trim(), { header: true, skipEmptyLines: true });
    if (!hasil.data.length) throw new Error("Sheet kosong");
    return { data: hasil.data, sumber: "sheets" };
  } catch (err) {
    console.warn("Gagal mengambil data dari Google Sheets, memakai data cadangan:", err);
    return { data: FALLBACK_DATA[fallbackKey], sumber: "cadangan" };
  }
}

/**
 * Membuat instance Chart.js dari data {Label, Nilai}.
 */
function buatChart(canvasId, tipe, rows, opsi = {}) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  const labels = rows.map((r) => r.Label);
  const nilai = rows.map((r) => Number(r.Nilai) || 0);
  const isPie = tipe === "pie" || tipe === "doughnut";

  return new Chart(ctx, {
    type: tipe,
    data: {
      labels,
      datasets: [
        {
          label: opsi.label || "Nilai",
          data: nilai,
          backgroundColor: isPie ? PALET : opsi.warna || PALET[0],
          borderColor: isPie ? "#ffffff" : PALET[0],
          borderWidth: isPie ? 2 : 0,
          fill: tipe === "line" ? false : true,
          tension: 0.3,
          borderRadius: tipe === "bar" ? 3 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: isPie, position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
      },
      scales: isPie
        ? {}
        : {
            x: { ticks: { font: { size: 11 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { font: { size: 11 } } },
          },
    },
  });
}

/**
 * Mengisi strip angka ringkas (Penduduk/KK/Dusun/Luas Wilayah) dari data sheet.
 * Mencocokkan berdasarkan teks Label (tidak peka huruf besar/kecil, cukup mengandung kata kunci),
 * jadi urutan baris di sheet boleh berbeda-beda.
 */
function isiRingkasan(rows) {
  const petaSelector = {
    penduduk: "#qf-penduduk",
    kk: "#qf-kk",
    dusun: "#qf-dusun",
    luas: "#qf-luas",
  };
  rows.forEach((r) => {
    const label = (r.Label || "").toLowerCase();
    let target = null;
    if (label.includes("penduduk")) target = petaSelector.penduduk;
    else if (label.includes("kk")) target = petaSelector.kk;
    else if (label.includes("dusun")) target = petaSelector.dusun;
    else if (label.includes("luas")) target = petaSelector.luas;
    if (target) {
      const el = document.querySelector(target);
      if (el) el.textContent = r.Nilai;
    }
  });
}

/**
 * Update badge status kecil di pojok kartu grafik ("Data Sheets" / "Data cadangan").
 */
function setStatusBadge(elId, sumber) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (sumber === "sheets") {
    el.textContent = "● Data Google Sheets";
    el.classList.add("ok");
  } else {
    el.textContent = "○ Data cadangan (contoh)";
  }
}

/**
 * Peta lokasi kampung (Leaflet.js) — khusus untuk halaman yang punya
 * elemen <div id="map">. Dijaga dengan pengecekan supaya tidak error
 * di halaman lain yang tidak punya peta.
 */
if (document.getElementById("map")) {
  const map = L.map('map').setView([-1.261654, 131.989948], 13);

  // OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Add marker
  L.marker([-1.261654, 131.989948])
  .addTo(map)
  .bindPopup('<b>Hello!</b><br>Lokasi Kampung Sudrofoyo')
  .openPopup();

  // Add polygon
  L.polygon([
      [-0.875, 131.25],
      [-0.880, 131.26],
      [-0.870, 131.27]
  ]).addTo(map);
}
