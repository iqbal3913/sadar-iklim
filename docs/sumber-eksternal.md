# Sumber eksternal

Daftar semua hal yang diambil dari luar proyek, supaya tim tahu dari mana asalnya, siapa yang memanggil, dan apa yang perlu diperhatikan. Tidak ada kunci API yang dibutuhkan untuk satu pun dari daftar ini.

## Ringkasan

| Sumber | Dipakai untuk | Dipanggil oleh | Kunci API | Lisensi atau atribusi |
| --- | --- | --- | --- | --- |
| BMKG, prakiraan cuaca | Cuaca per 3 jam | Server Next.js | Tidak | Wajib cantumkan BMKG |
| BMKG, gempa | Gempa terbaru dan dirasakan, shakemap | Server Next.js | Tidak | Wajib cantumkan BMKG |
| BMKG, peringatan dini CAP | Peringatan dini dan polygon | Server Next.js | Tidak | Wajib cantumkan BMKG |
| cahyadsn/wilayah (GitHub) | Daftar kode wilayah | Berkas statis di repositori | Tidak | MIT |
| OpenStreetMap | Peta dasar Jalan | Browser | Tidak | ODbL, © OpenStreetMap contributors |
| Esri World Light Gray | Peta dasar Terang | Browser | Tidak | Tiles © Esri, HERE, Garmin, OpenStreetMap contributors |
| Esri World Imagery | Peta dasar Satelit | Browser | Tidak | Tiles © Esri, Maxar, Earthstar Geographics |
| Paket npm | Pustaka aplikasi | Waktu build | Tidak | Lihat bagian paket |
| Font Plus Jakarta Sans | Huruf aplikasi | Paket npm, dilayani dari domain sendiri | Tidak | SIL OFL |

Sumber lain yang tampil di halaman Sumber data (Open-Meteo, NASA FIRMS, BNPB InaRISK, Kitabisa, Google Gemini) **belum dipakai** dan masih rencana. Tidak ada kode yang memanggilnya.

## BMKG

| Data | Alamat | Cache server | Berkas kode |
| --- | --- | --- | --- |
| Prakiraan cuaca | `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode>` | 30 menit | `src/lib/bmkg/client.ts` |
| Gempa terbaru | `https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json` | 2 menit | `src/lib/bmkg/client.ts` |
| Gempa dirasakan | `https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json` | 2 menit | `src/lib/bmkg/client.ts` |
| Daftar peringatan dini | `https://www.bmkg.go.id/alerts/nowcast/id` | 3 menit | `src/lib/bmkg/client.ts` |
| Rincian peringatan (CAP XML) | `https://www.bmkg.go.id/alerts/nowcast/id/<id>_alert.xml` | 3 menit | `src/lib/bmkg/client.ts` |
| Gambar shakemap | `https://static.bmkg.go.id/<berkas>` | Langsung dari browser | `src/lib/bmkg/parse.ts` |

Catatan penting:

- Dokumentasi resmi: https://data.bmkg.go.id
- Batas penggunaan: **60 permintaan per menit per IP**. Cache di server menjaga agar tetap jauh di bawah batas itu.
- Semua panggilan dilakukan dari server (`src/app/api/bmkg/*`), bukan dari browser, sehingga tidak ada masalah CORS.
- Jika BMKG gagal dijangkau, server mengirim data valid terakhir berlabel **Stale**.
- Tautan CAP hanya diikuti jika cocok dengan pola `https://www.bmkg.go.id/alerts/nowcast/id/<nama>_alert.xml`.
- Kode wilayah bawaan diatur lewat `BMKG_ADM4` di `.env`.

## Daftar kode wilayah (GitHub)

| Keterangan | Nilai |
| --- | --- |
| Repositori | https://github.com/cahyadsn/wilayah |
| Berkas | `db/wilayah.sql` |
| Lisensi | MIT |
| Dasar data | Kepmendagri No 300.2.2-2138 Tahun 2025 |
| Terakhir disunting di sumber | 2026-02-13 |
| Isi | 91.599 wilayah |
| Tempat di proyek | `src/data/wilayah.json` |
| Cara dipakai | `GET /api/regions?parent=<kode>` di `src/app/api/regions/route.ts` |

Berkas ini **diunduh sekali dan disimpan di repositori**. Aplikasi tidak memanggil GitHub saat berjalan. Untuk memperbarui, unduh `wilayah.sql` terbaru lalu jalankan `node scripts/build-wilayah.mjs <jalur ke wilayah.sql>`. Rinciannya ada di `src/data/README.md`.

Kode wilayah mengikuti Kemendagri dan dipakai BMKG sebagai parameter `adm4`. Tidak semua kelurahan punya data prakiraan di BMKG.

## Peta dasar

Browser pengguna mengambil tile langsung dari penyedia. Server proyek tidak terlibat.

| Pilihan | Alamat tile |
| --- | --- |
| Jalan | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Terang | `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}` |
| Satelit | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` |

Catatan:

- Kebijakan tile OpenStreetMap membatasi pemakaian berat. Itu cukup untuk demo, tetapi untuk lalu lintas besar perlu penyedia sendiri.
- Atribusi tiap penyedia tampil otomatis di pojok kanan bawah peta dan tidak boleh dihapus.
- Satu penyedia sempat dicoba lalu dibuang karena meminta API key. Jika sebuah peta dasar menampilkan "API key required", ganti penyedianya di `src/components/map/map-view.tsx`.
- Sebagian jaringan (misalnya kampus) dapat memblokir domain tile.

## Paket npm

| Paket | Fungsi | Lisensi |
| --- | --- | --- |
| `next`, `react`, `react-dom` | Kerangka aplikasi | MIT |
| `leaflet` | Peta | BSD-2-Clause |
| `react-leaflet` | Pembungkus React untuk Leaflet | Hippocratic-2.1 |
| `lucide-react` | Ikon | ISC |
| `fast-xml-parser` | Membaca XML CAP dan RSS BMKG | MIT |
| `server-only` | Menjamin berkas tertentu hanya jalan di server | MIT |
| `@fontsource-variable/plus-jakarta-sans` | Font | SIL OFL, data font dilayani dari domain sendiri |
| `tailwindcss`, `@tailwindcss/postcss` | Gaya | MIT |
| `typescript`, `@types/*` | Tipe | Apache-2.0, MIT |

Ikon "buka tautan keluar" (`ExternalIcon`) dibuat ulang dari proyek Ravenville milik tim sendiri.

## Yang tidak diambil dari luar

- Foto contoh di `public/demo/` adalah gambar SVG buatan sendiri.
- Data skenario di `src/lib/mock/` ditulis sendiri.
- Tidak ada analitik, iklan, atau pelacak pihak ketiga.
- Tidak ada font atau skrip yang dimuat dari CDN.

## Jika menambah sumber baru

1. Tambahkan barisnya ke tabel di dokumen ini.
2. Tambahkan juga di halaman Sumber data (`src/app/sources/page.tsx`) lengkap dengan atribusi.
3. Panggil dari server (`src/app/api/...`) bila sumbernya membatasi laju atau butuh kunci.
4. Beri label status (Live, Stale, Simulasi, Contoh) pada panel yang memakainya.
