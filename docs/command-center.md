# Command Center

Rute: `/command-center`. **Hanya Petugas BPBD.** Pengunjung melihat "Masuk untuk melanjutkan", dan warga melihat "Akses terbatas".

## Guna

- **Satu tempat kerja untuk petugas.** Laporan masuk, kondisi fasilitas, rute, dan titik panas terlihat bersama sehingga petugas tidak berpindah-pindah halaman.
- **Menentukan prioritas.** Antrean verifikasi menyoroti laporan berurgensi tinggi sehingga yang paling mendesak ditinjau lebih dahulu.
- **Menjaga keputusan di tangan manusia.** Sistem mengusulkan rute dan memberi taksiran. Yang memutuskan adalah petugas, dan keputusan itu tercatat.
- **Mengurangi beban penyaringan.** Hasil analisis foto membantu petugas menilai laporan lebih cepat, tetapi tidak menggantikan penilaian mereka.

## Siapa yang memakai

Petugas BPBD dan relawan terverifikasi yang diberi peran petugas.

## Contoh penggunaan

1. Petugas membuka Command Center. Empat angka teratas menunjukkan 3 laporan menunggu dan 2 fasilitas terpapar.
2. Dari antrean, ia membuka laporan berurgensi tinggi, memeriksa foto dan hasil analisis AI, lalu memutuskan **Verifikasi** dengan alasan singkat.
3. Ia membaca rute kandidat, menilai alasannya, dan memutuskan menyetujui atau menolaknya untuk wilayah.

## Bagian halaman

### Kepala halaman

Nama wilayah, lencana **tingkat dampak** (Rendah sampai Ekstrem), dan lencana **mode data** (Live, Stale, atau Simulasi).

### Empat angka kunci

| Angka | Arti |
| --- | --- |
| Laporan menunggu | Laporan yang berstatus terkirim atau menunggu verifikasi |
| Fasilitas terpapar | Sekolah, puskesmas, dan rumah sakit yang berada di zona bahaya |
| Rute perlu perhatian | Rute kandidat yang tidak berstatus "disarankan", yaitu waspada atau tidak disarankan |
| Titik panas | Jumlah titik panas terdeteksi |

### Peta

Peta dengan semua lapisan aktif untuk gambaran menyeluruh. Kontrolnya sama dengan menu [Peta](peta.md).

### Antrean verifikasi

Daftar laporan yang menunggu, diurutkan dari urgensi tertinggi (kritis, tinggi, sedang, rendah), lengkap dengan foto kecil, judul, tingkat urgensi (lencana oranye untuk tinggi atau kritis), dan status. Klik laporan untuk membuka detail dan mengambil keputusan (lihat [Laporan](laporan.md)). Jika kosong, tampil "Tidak ada laporan yang menunggu".

### Rute kandidat menunggu persetujuan

Setiap rute menampilkan:

| Bagian | Arti |
| --- | --- |
| Nama | Mis. "Rute A, lewat Jalan Soekarno-Hatta" |
| Jarak, durasi, ruas terdampak | Ringkasan rute |
| Alasan | Mengapa rute disarankan atau perlu waspada |
| Tombol | **Setujui untuk wilayah** dan **Tolak** |
| Hasil keputusan | Lencana **Disetujui petugas** atau **Ditolak petugas**, dengan tombol **Batalkan keputusan** untuk mengubahnya |

Sistem hanya mengusulkan. Rute tidak berlaku sebelum petugas menyetujuinya. Tombol keputusan hanya tampil bagi petugas, dan keputusan juga tampil sebagai label pada panel rute di halaman Peta. Keputusan tetap tersimpan setelah halaman dimuat ulang.

## Prinsip

Penutupan jalan, rute evakuasi, dan perintah evakuasi adalah keputusan manusia dari otoritas, bukan keluaran otomatis AI.

## Status implementasi

| Bagian | Status |
| --- | --- |
| Angka kunci, peta, antrean, keputusan verifikasi | Berfungsi di browser |
| Persetujuan rute | Berfungsi di browser, keputusan tersimpan di `localStorage` |
| Pembatasan peran | Berfungsi untuk akun demo |

## Titik sambung backend

- Simpan keputusan verifikasi dan persetujuan rute beserta pelaku dan waktunya (tabel `route_decisions`, menggantikan `routeDecisions` di `src/lib/app-state.tsx`).
- Terapkan pembatasan peran di sisi server (RLS), bukan hanya di tampilan.
- Isi angka kunci dari database dan sumber data nyata (FIRMS, InaRISK).

## Pertanyaan umum

**Mengapa saya tidak bisa membuka halaman ini?** Halaman ini hanya untuk akun Petugas BPBD. Masuk memakai akun demo petugas.

**Apakah menyetujui rute langsung mengumumkannya ke warga?** Belum. Setelah backend ada, persetujuan akan menjadi syarat sebelum rute ditampilkan sebagai rute resmi.
