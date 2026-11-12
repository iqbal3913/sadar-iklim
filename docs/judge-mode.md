# Judge Mode

Rute: `/judge-mode`. Publik.

## Guna

- **Menguji tanpa menunggu bencana.** Kondisi nyata tidak bisa dipesan. Judge Mode menyediakan skenario simulasi agar semua fitur dapat dicoba kapan saja.
- **Menguji tanpa file pribadi.** Foto contoh tersedia, jadi penguji tidak perlu mengunggah foto sendiri.
- **Mempermudah penilaian.** Panduan lima langkah dan akun demo siap pakai menghemat waktu juri.
- **Menjaga keamanan data.** Semua data di sini berlabel Simulasi dan tidak bercampur dengan data Live.

## Siapa yang memakai

Juri, penguji, dan siapa pun yang ingin mencoba fitur secara menyeluruh.

## Panduan lima langkah

1. Jalankan satu skenario simulasi. Peta langsung berpindah ke lokasi skenario.
2. Buka buletin dampak dan panel bukti di sisi kanan peta.
3. Coba analisis salah satu foto contoh tanpa mengunggah file.
4. Masuk memakai akun demo untuk Command Center, verifikasi laporan, dan audit mangrove.
5. Tekan **Reset demo** untuk mengembalikan semuanya ke kondisi awal.

## Skenario

Memilih skenario langsung mengaktifkan mode **Simulasi** dan membawa pengguna ke Peta. Skenario yang aktif ditandai.

| Kode | Skenario | Lokasi simulasi | Yang diuji |
| --- | --- | --- | --- |
| `ROB-URBAN-01` | Banjir rob dan perkotaan ekstrem | Pasar Baru, Kota Bengkulu | Buletin dampak, triase foto, fasilitas, penutupan ruas jalan, dan kampanye bantuan |
| `KARHUTLA-GAMBUT-02` | Darurat karhutla lahan gambut | Pangkalan Lampam, OKI | Titik panas, koridor asap indikatif, rute ke shelter |
| `GEMPA-PESISIR-03` | Gempa dan peringatan pesisir | Pesisir Selatan, Sumatera Barat | Zona tsunami, bukit evakuasi, peringatan pesisir |

Lokasi skenario tidak terikat ke wilayah BMKG pada data Live. Skenario boleh berada di daerah berbeda selama jelas berlabel simulasi.

## Foto contoh

Galeri lima foto simulasi untuk menguji pembuatan laporan dan audit mangrove tanpa mengunggah file sendiri. Foto ada di `public/demo/` dan berupa gambar SVG buatan.

## Reset demo

Tombol **Reset demo** (juga ada di bar status saat mode Simulasi) menghapus laporan dan keputusan petugas yang dibuat selama pengujian, lalu mengembalikan mode ke Live. Pilihan wilayah BMKG tidak ikut direset.

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Petugas BPBD | `petugas.demo@sadariklim.example` | `demo-bpbd-2026` |
| Warga | `warga.demo@sadariklim.example` | `demo-warga-2026` |

Halaman Masuk menyediakan pengisian otomatis untuk kedua akun. Akun ini hanya untuk demo dan **harus dihapus sebelum aplikasi dipakai sungguhan**.

## Cara menguji tiap menu

| Menu | Yang bisa dicoba |
| --- | --- |
| [Peta](peta.md) | Ganti skenario, nyalakan atau matikan lapisan, baca buletin dampak |
| [Laporan](laporan.md) | Masuk sebagai warga, buat laporan dengan foto contoh, lihat hasil analisis |
| [Command Center](command-center.md) | Masuk sebagai petugas, verifikasi laporan tadi dengan alasan |
| [Mangrove](mangrove.md) | Buat audit, isi bibit ditanam dan hidup, lihat survival rate |
| [Kampanye](kampanye.md) | Lihat kampanye yang berubah menurut skenario, isi kalkulator |

## Catatan

Semua data di halaman ini berlabel **Simulasi** dan bukan peringatan resmi.

## Pertanyaan umum

**Mengapa mode berubah ke Simulasi?** Memilih skenario selalu mengaktifkan mode Simulasi. Kembali ke Live lewat tombol di header atau Reset demo.

**Apakah laporan yang saya buat tersimpan permanen?** Belum. Laporan tersimpan di browser dan hilang bila data situs dihapus atau Reset demo ditekan.
