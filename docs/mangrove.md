# Mangrove

Rute: `/mangrove`. Perlu masuk (warga atau petugas).

## Guna

- **Mencatat kondisi plot mangrove** secara teratur dengan foto, lokasi, dan hitungan lapangan.
- **Mengukur keberhasilan penanaman dengan jujur.** Banyak program penanaman melaporkan jumlah bibit ditanam tetapi tidak pernah mengukur yang bertahan hidup. Menu ini menghitung *survival rate* dari angka lapangan yang dikonfirmasi.
- **Menunjukkan peran ekosistem.** Mangrove meredam gelombang dan abrasi. Risiko abrasi dicatat per plot supaya terlihat bagian pesisir yang paling rentan.
- **Memisahkan taksiran AI dari fakta.** AI hanya menaksir kondisi dari foto, sedangkan angka bibit hidup tidak pernah berasal dari foto.

## Siapa yang memakai

Komunitas penanam mangrove, relawan, dan petugas yang memantau pesisir.

## Prinsip inti

```
survival rate = bibit hidup (hitungan lapangan) / bibit ditanam
```

- Angka bibit hidup **harus berasal dari hitungan lapangan**. Foto tidak dipakai untuk menghitungnya.
- Jika jumlah bibit hidup belum diisi atau bibit ditanam kosong atau nol, hasilnya ditulis **belum dapat dihitung** dan bukan angka tebakan.
- Hasil dibulatkan ke satu desimal.

## Cara memakai

1. Masuk memakai akun demo (lihat [Judge Mode](judge-mode.md)).
2. Buka **Mangrove** dan tekan **Audit baru**.
3. Isi **Kode plot**, **Nama plot**, **Bibit ditanam** (pembagi survival rate), dan **Bibit hidup** (hitungan lapangan).
4. Unggah foto atau pilih foto contoh.
5. Perhatikan pratinjau survival rate yang dihitung otomatis. Catatan di formulir menegaskan bahwa nilai ini tidak berasal dari foto.
6. Tekan **Simpan audit**. Kartu audit muncul di daftar dan tetap ada setelah halaman dimuat ulang.

### Verifikasi dan penghapusan

| Siapa | Tombol | Berlaku untuk |
| --- | --- | --- |
| Petugas BPBD | **Verifikasi** dan **Tolak** | Semua audit, status dapat diubah kembali |
| Petugas BPBD | **Hapus audit** | Semua audit |
| Warga | **Hapus audit** | Hanya audit yang ia buat sendiri |

Penghapusan meminta konfirmasi lebih dulu. Tombol **Reset demo** di Judge Mode mengembalikan audit bawaan yang dihapus dan menghapus audit buatan pengguna.

## Isi kartu audit

| Bagian | Arti |
| --- | --- |
| Foto | Foto plot saat audit |
| Kode dan nama plot | Identitas plot |
| Survival rate terkonfirmasi | Angka persen, atau "Belum dapat dihitung, jumlah hidup belum diisi" |
| Kondisi | Tampak sehat, Perlu perhatian, Tampak rusak berat, atau Tidak dapat dinilai. Taksiran AI dari foto |
| Risiko abrasi | Rendah, Sedang, Tinggi, atau Belum diketahui |
| Verifikasi | Terverifikasi atau perlu verifikasi |
| Tanda stres | Gejala yang tampak pada tanaman |
| Keterbatasan | Hal yang tidak dapat disimpulkan dari foto |

## Data yang dicatat per audit

Kode dan nama plot, waktu pengamatan, lokasi, bibit ditanam, bibit hidup, jumlah bibit yang terlihat di foto, tanda stres, keterbatasan, kondisi, risiko abrasi, status verifikasi (menunggu, terverifikasi, ditolak), dan foto.

## Status implementasi

| Bagian | Status |
| --- | --- |
| Formulir, kartu, perhitungan | Berfungsi |
| Penyimpanan | Browser (`localStorage`), belum ada database |
| Taksiran kondisi dari foto | Tiruan |
| Verifikasi dan penghapusan audit | Berfungsi di browser |

## Titik sambung backend

- Simpan audit ke tabel khusus dan foto ke Storage.
- Panggil model visi untuk taksiran kondisi, tanpa menghitung jumlah bibit hidup dari foto.
- Simpan keputusan verifikasi beserta petugas dan waktunya agar status "terverifikasi" bermakna, dan batasi penghapusan di sisi server.

## Pertanyaan umum

**Mengapa survival rate saya "belum dapat dihitung"?** Jumlah bibit hidup belum diisi, atau bibit ditanam kosong. Isi keduanya dari hitungan lapangan.

**Mengapa AI tidak menghitung bibit hidup?** Hitungan dari foto mudah keliru, sehingga angka yang dipublikasikan harus dapat dipertanggungjawabkan dari lapangan.
