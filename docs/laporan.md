# Laporan

Rute: `/reports` (daftar), `/reports/new` (buat), `/reports/[id]` (detail).

## Guna

- **Mengisi celah data resmi.** Sensor dan stasiun tidak melihat jalan yang tergenang atau tanggul yang retak. Warga di lokasi yang melihatnya.
- **Mengubah foto menjadi informasi terstruktur.** Foto dari warga dianalisis sehingga petugas langsung tahu jenis bahaya, taksiran tingkat urgensi, dan apa yang perlu dicek, tanpa membaca ratusan pesan mentah.
- **Memberi jalur verifikasi.** Tidak setiap laporan benar. Petugas BPBD memutuskan mana yang dipercaya, dan keputusannya tercatat beserta alasannya.
- **Menjaga kehati-hatian.** Laporan yang belum diverifikasi tidak pernah menutup jalan atau menerbitkan perintah evakuasi.

## Siapa yang memakai

| Pengguna | Yang dilakukan |
| --- | --- |
| Pengunjung | Melihat daftar dan detail laporan |
| Warga | Membuat laporan |
| Petugas BPBD | Meninjau dan memutuskan status laporan |

## Alur laporan

```
Warga membuat laporan
        │
        ▼
Foto dianalisis AI (asistif)
        │
        ▼
Status: Menunggu verifikasi ──► tampil di antrean Command Center
        │
        ▼
Petugas memutuskan, wajib menulis alasan
   ├── Verifikasi  → Terverifikasi
   ├── Tolak       → Ditolak
   └── Duplikat    → Duplikat
```

Status yang dikenal: **Terkirim**, **Menunggu verifikasi**, **Terverifikasi**, **Ditolak**, **Duplikat**.

## Halaman daftar laporan

- Penyaring status: Semua, Menunggu verifikasi, Terverifikasi, Ditolak.
- Setiap baris menampilkan foto, judul, status, tingkat urgensi, dan penanda **Simulasi** bila laporan dibuat pada mode itu.
- Laporan mengikuti mode data: laporan simulasi tidak muncul di mode Live, dan sebaliknya.
- Jika tidak ada yang cocok, tampil "Belum ada laporan".

## Membuat laporan

Perlu masuk. Isian formulir:

| Isian | Keterangan |
| --- | --- |
| Jenis laporan | Banjir atau genangan, Kerusakan jalan, Bahaya pesisir, Lainnya |
| Judul singkat | Maksimal 160 karakter. Contoh: "Jalan depan sekolah tergenang" |
| Deskripsi | Kondisi singkat. Teks ini diperlakukan sebagai data, bukan instruksi |
| Waktu kejadian | Kapan kondisi diamati |
| Lintang dan Bujur | Lokasi kejadian |
| Foto | Unggah foto atau pilih salah satu foto contoh |

Setelah dikirim, aplikasi menampilkan pesan bahwa laporan berstatus menunggu verifikasi dan belum menutup jalan atau menerbitkan perintah evakuasi, diikuti hasil analisis foto. Pada mode Simulasi muncul catatan bahwa laporan tersimpan sebagai simulasi.

## Hasil analisis foto

Kartu hasil analisis memuat:

| Bagian | Arti |
| --- | --- |
| Klasifikasi | Jenis kondisi yang terlihat |
| Urgensi | Rendah, Sedang, Tinggi, atau Kritis |
| Tingkat keyakinan | Seberapa yakin taksiran |
| Kedalaman air | Taksiran dalam cm beserta dasar penaksirannya, atau kosong bila tidak dapat ditaksir |
| Pengamatan | Hal yang tampak di foto |
| Bahaya | Risiko yang teridentifikasi |
| Keterbatasan | Apa yang tidak dapat disimpulkan dari foto |
| Integritas | Tidak ada ketidakkonsistenan visual yang jelas, Ada artefak visual mencurigakan, atau Belum dapat disimpulkan |
| Tindakan lanjutan | Saran langkah berikutnya |
| Perlu ditinjau | Apakah wajib ditinjau petugas |

Label "Asistif, bukan keputusan" selalu tampil di kartu ini.

## Halaman detail dan keputusan petugas

Detail memuat rincian laporan, foto, dan hasil analisis. Jika foto belum dianalisis, tampil "Belum ada hasil analisis".

Panel **Keputusan petugas** hanya tampil bagi petugas BPBD. Pengguna lain melihat keterangan bahwa verifikasi hanya dapat dilakukan petugas BPBD. Aturannya:

- Petugas memilih **Verifikasi**, **Tolak**, atau **Duplikat**.
- Kolom **Alasan** wajib diisi minimal 5 karakter, dan perubahan status dicatat dalam jejak audit.

## Keamanan dan privasi

- Deskripsi laporan diperlakukan sebagai data dan tidak dijalankan sebagai instruksi oleh AI.
- Nama pelapor ditampilkan tersamar.
- Laporan simulasi dipisahkan dari laporan Live.

## Status implementasi

| Bagian | Status |
| --- | --- |
| Formulir, daftar, detail, keputusan petugas | Berfungsi di browser |
| Penyimpanan | `localStorage` browser, belum ada database |
| Analisis foto | Tiruan: hasil tetap setelah jeda sekitar 1,4 detik (`src/features/vision-triage/analyze.ts`) |
| Foto contoh | Lima gambar SVG di `public/demo/` untuk uji tanpa file pribadi |

## Titik sambung backend

1. Ganti `addReport` dan `reviewReport` di `src/lib/app-state.tsx` dengan pemanggilan Supabase (tabel laporan dan peninjauan, Storage untuk foto).
2. Ganti `analyze.ts` dengan route server yang memanggil model visi. Kunci API disimpan di `.env.local`.
3. Simpan pelaku dan waktu setiap keputusan agar jejak audit utuh.

Rinciannya ada di [backend.md](backend.md).

## Pertanyaan umum

**Apakah laporan saya langsung menutup jalan?** Tidak. Laporan hanya masuk antrean verifikasi.

**Mengapa laporan saya tidak muncul?** Periksa mode data. Laporan simulasi hanya tampil pada mode Simulasi.

**Apakah hasil AI bisa salah?** Ya. Karena itu hasilnya asistif dan petugas yang memutuskan.
