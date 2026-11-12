# Kampanye

Rute: `/campaigns`. Publik.

## Guna

- **Mengarahkan niat membantu ke tempat yang tepat.** Setelah melihat situasi di Peta, orang sering bertanya "bagaimana saya bisa membantu". Menu ini menyodorkan kampanye penggalangan dana yang sudah dicek dan sesuai jenis bencana.
- **Membantu menyusun kebutuhan.** Kalkulator logistik memperkirakan kebutuhan awal (pangan, air, selimut) dari jumlah orang terdampak dan durasi, sehingga penggalang dana punya dasar angka dan bukan tebakan.
- **Mempercepat penulisan narasi.** Draf narasi penggalangan dana memberi titik awal yang bisa disunting.
- **Menjaga kepercayaan.** Katalog dikurasi manual dan setiap kampanye punya tanggal verifikasi. SadarIklim tidak memegang uang donasi.

## Siapa yang memakai

| Pengguna | Kebutuhan |
| --- | --- |
| Warga dan donatur | Menemukan kampanye yang layak didukung |
| Komunitas dan relawan | Menghitung kebutuhan awal dan menyusun narasi |
| Admin | Mengelola katalog kampanye yang sudah dicek |

## Prinsip

1. **Katalog dikurasi manual**, tidak diambil otomatis dari Kitabisa. Kitabisa tidak menyediakan API publik.
2. **SadarIklim tidak menampung atau memproses donasi.** Tombol kampanye membuka situs asal di tab baru (ikon tautan keluar).
3. **Tautan eksternal bukan kemitraan.** Menampilkan kampanye tidak berarti ada kerja sama resmi.
4. **Hanya angka yang bersumber.** Kolom jumlah orang terdampak diisi dengan estimasi yang punya dasar.
5. **Draf bukan dokumen resmi.** Narasi selalu berlabel DRAF dan belum disetujui BPBD atau komunitas.

## Bagian halaman

### Kampanye yang cocok

Daftar kampanye yang kategorinya sesuai bahaya pada skenario aktif.

| Skenario aktif | Kategori yang ditampilkan |
| --- | --- |
| Banjir rob (dan mode Live) | Banjir |
| Karhutla gambut | Karhutla |
| Gempa pesisir | Gempa |

Setiap kartu menampilkan judul, ringkasan, wilayah, kategori, tanggal verifikasi (lencana "Terverifikasi"), dan tautan keluar. Kampanye yang tidak aktif atau belum terverifikasi tidak ditampilkan di daftar.

### Kalkulator logistik awal

Masukan: **Orang terdampak** dan **Durasi (hari)**. Keluaran: tabel kebutuhan dengan jumlah, satuan, harga satuan, dan subtotal.

| Item | Satuan | Dasar hitung | Harga acuan |
| --- | --- | --- | --- |
| Paket pangan | paket | per orang per hari | Rp 35.000 |
| Air bersih | paket | per orang per hari | Rp 15.000 |
| Selimut | lembar | per orang | Rp 45.000 |
| Perahu karet | unit | tetap | Belum tersedia (`cost_unknown`) |

- Item tanpa harga ditandai `cost_unknown`, dan total hanya mencakup item yang harganya diketahui. Aplikasi menampilkan peringatan ini di bawah total.
- Harga acuan adalah contoh dan bukan hasil verifikasi admin.

### Draf narasi penggalangan dana

Teks otomatis yang menyebut jenis bahaya, lokasi, jumlah orang terdampak, dan durasi, serta pernyataan bahwa galang dana belum disetujui pihak berwenang dan belum menjanjikan jumlah penerima manfaat. Label **DRAF — belum disetujui BPBD atau komunitas** selalu tampil.

## Status implementasi

| Bagian | Status |
| --- | --- |
| Pencocokan kategori, kalkulator, draf | Berfungsi |
| Katalog | Empat kampanye **contoh** berlabel `[CONTOH]` di `src/lib/mock/campaigns.ts` |
| Harga acuan | Contoh, belum diverifikasi |

Halaman menampilkan peringatan bahwa entri saat ini adalah contoh tampilan dan perlu diganti oleh admin dengan 10 sampai 15 kampanye nyata yang sudah dicek.

## Titik sambung backend

- Tabel kampanye dengan status (aktif, berakhir, belum terverifikasi, tersembunyi) dan status verifikasi (terverifikasi, perlu cek ulang, tidak valid).
- Formulir admin untuk menempelkan tautan dan mengambil pratinjau OpenGraph (judul dan ringkasan), lalu admin menandainya terverifikasi.
- Katalog harga logistik yang dikelola admin dengan sumber tiap harga.

## Pertanyaan umum

**Apakah donasi lewat SadarIklim?** Tidak. Donasi dilakukan langsung di situs kampanye.

**Mengapa tidak diambil otomatis dari Kitabisa?** Tidak ada API publik, dan pengambilan otomatis tanpa pengecekan berisiko menampilkan kampanye yang tidak layak.

**Mengapa total tidak mencakup perahu karet?** Harganya belum tersedia. Menjumlahkan item tanpa harga akan menghasilkan angka yang menyesatkan.
