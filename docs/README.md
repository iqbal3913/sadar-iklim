# Dokumentasi SadarIklim

SadarIklim adalah aplikasi web untuk membantu warga, komunitas, dan petugas BPBD memahami situasi bencana dan perubahan iklim di wilayahnya, lalu bertindak dengan data yang dapat ditelusuri. Dokumen ini menjelaskan guna dan cara kerja setiap menu di header.

## Ringkasan menu

| Menu | Guna utama | Pengguna utama | Akses |
| --- | --- | --- | --- |
| [Peta](peta.md) | Melihat situasi wilayah: peringatan dini, cuaca, gempa, dan peta risiko | Semua orang | Publik |
| [Laporan](laporan.md) | Mengumpulkan laporan kondisi lapangan dari warga dan memverifikasinya | Warga dan petugas | Daftar publik, membuat laporan perlu masuk |
| [Mangrove](mangrove.md) | Mencatat kondisi plot mangrove dan menghitung tingkat hidup bibit secara jujur | Komunitas dan warga | Perlu masuk |
| [Kampanye](kampanye.md) | Menghubungkan kebutuhan bantuan dengan kampanye donasi yang sudah dicek | Warga, komunitas, relawan | Publik |
| [Command Center](command-center.md) | Ruang kerja petugas untuk antrean verifikasi dan persetujuan rute | Petugas BPBD | Petugas BPBD |
| [Judge Mode](judge-mode.md) | Jalur uji cepat memakai skenario simulasi dan akun demo | Juri dan penguji | Publik |

Dokumen pendukung: [sumber-eksternal.md](sumber-eksternal.md) (semua hal yang diambil dari luar proyek), [logo.md](logo.md) (filosofi dan aturan pemakaian logo), dan [backend.md](backend.md) (catatan untuk tim backend).

Halaman pendukung yang tidak ada di menu header: **Sumber data** (`/sources`, tautan "Semua sumber" di bar status dan footer), **Tentang** (`/about`), dan **Masuk** (`/login`).

## Cara menu saling terhubung

```
Peta ──────────► menampilkan laporan terverifikasi dan situasi wilayah
  ▲
  │ laporan yang terverifikasi muncul sebagai lapisan di peta
Laporan ───────► antrean verifikasi di Command Center
Mangrove ──────► audit tercatat dengan status verifikasi
Kampanye ──────► kebutuhan dihitung dari skenario bahaya yang aktif
Judge Mode ────► mengatur skenario dan mode untuk semua menu di atas
```

Judge Mode adalah pengendali: skenario yang dipilih di sana menentukan isi Peta, Kampanye, dan Command Center.

## Mode data

Tombol di kanan header mengganti mode untuk seluruh aplikasi.

- **Live:** prakiraan cuaca, gempa, dan peringatan dini diambil dari BMKG. Bagian yang belum punya sumber nyata (fasilitas, titik panas, rute, shelter) berlabel **Contoh**.
- **Simulasi krisis:** data skenario buatan agar fitur dapat diuji tanpa menunggu kejadian nyata. Semuanya berlabel **Simulasi** dan bukan peringatan resmi. Data simulasi tidak pernah dicampur dengan data Live.

### Label status

| Label | Arti | Tampil di |
| --- | --- | --- |
| Live | Data baru saja diambil dari sumber resmi dan masih dalam batas umur | Bar status, panel BMKG |
| Stale | Sumber gagal dijangkau atau sudah lewat batas umur, yang tampil adalah data valid terakhir | Bar status, panel BMKG |
| Simulasi | Skenario demo yang tersimpan | Bar status teal, lencana, watermark peta |
| Contoh | Data tampilan sementara yang belum berasal dari layanan nyata | Bar status, panel |

## Peran pengguna

| Peran | Cara mendapatkan | Kemampuan |
| --- | --- | --- |
| Pengunjung | Tanpa masuk | Peta, daftar laporan, Kampanye, Judge Mode |
| Warga | Akun demo warga | Pengunjung, ditambah membuat laporan dan audit mangrove |
| Petugas BPBD | Akun demo petugas | Warga, ditambah Command Center dan keputusan verifikasi laporan |

Halaman yang dibatasi menampilkan "Masuk untuk melanjutkan" bagi pengunjung dan "Akses terbatas" bagi peran yang tidak cukup. Akun demo ada di [Judge Mode](judge-mode.md).

## Prinsip yang berlaku di semua fitur

1. **Asistif, bukan memutuskan.** AI membantu menaksir dan meringkas. Penutupan jalan, rute evakuasi, dan perintah evakuasi adalah keputusan manusia dari otoritas.
2. **Setiap angka punya sumber.** Panel menampilkan sumber, waktu pembaruan, dan status data.
3. **Tidak menebak.** Nilai yang tidak dapat dihitung ditulis "belum dapat dihitung" atau "belum diketahui", bukan angka karangan.
4. **Simulasi dipisah jelas.** Simulasi selalu berlabel dan tidak pernah dianggap peringatan resmi.
5. **Bukan pengganti sumber resmi.** SadarIklim bukan pengganti BMKG, BNPB, atau BPBD.

## Status implementasi

| Area | Status |
| --- | --- |
| Tampilan semua halaman | Selesai |
| Data BMKG (prakiraan, gempa, peringatan dini) | Nyata, lewat route server |
| Pemilih wilayah | Selesai, memakai daftar kode wilayah Kemendagri |
| Laporan, audit mangrove, keputusan petugas | Tersimpan di browser (`localStorage`), belum ada database |
| Analisis foto AI | Tiruan, hasil tetap setelah jeda sekitar 1,4 detik |
| Katalog kampanye | Contoh berlabel `[CONTOH]` |
| Autentikasi | Akun demo, belum ada autentikasi sungguhan |
| Backend (database, penyimpanan foto, AI sungguhan) | Dikerjakan tim backend, catatan kebutuhan ada di [backend.md](backend.md) |

## Sumber data dan atribusi

Data cuaca, gempa, dan peringatan dini bersumber dari BMKG (data.bmkg.go.id) dan wajib mencantumkan BMKG sebagai sumber. Batas BMKG adalah 60 permintaan per menit per IP. Daftar lengkap sumber, termasuk yang masih rencana, ada di halaman Sumber data.

## Glosarium

| Istilah | Arti |
| --- | --- |
| adm4 | Kode wilayah tingkat IV Kemendagri (kelurahan atau desa), 10 digit dengan titik, misalnya `17.71.03.1002` |
| CAP | Common Alerting Protocol, format peringatan dini BMKG |
| IBF | Impact-Based Forecast, prakiraan berbasis dampak: bukan hanya cuaca, tetapi apa akibatnya bagi warga |
| Rob | Banjir pesisir akibat pasang air laut |
| Karhutla | Kebakaran hutan dan lahan |
| Shakemap | Peta guncangan gempa dari BMKG |
| Provenance | Asal-usul data: sumber, waktu, dan statusnya |
| BPBD | Badan Penanggulangan Bencana Daerah |
