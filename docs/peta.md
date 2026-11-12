# Peta

Halaman utama (`/`). Satu layar untuk menjawab pertanyaan "apa yang sedang terjadi di wilayah saya dan apa artinya".

## Guna

- **Memberi gambaran cepat.** Dalam satu pandang pengguna tahu apakah ada peringatan dini, bagaimana cuaca beberapa jam ke depan, dan apakah baru saja terjadi gempa.
- **Menyatukan sumber resmi.** Prakiraan, peringatan dini, dan gempa dari BMKG ditampilkan berdampingan dengan peta, tanpa perlu membuka tiga situs berbeda.
- **Menerjemahkan data menjadi tindakan.** Pada mode Simulasi, panel buletin dampak menyatakan siapa yang terpengaruh dan apa yang perlu dilakukan, bukan hanya angka cuaca.
- **Menunjukkan lokasi.** Zona bahaya, fasilitas kritis, shelter, rute, dan laporan warga diletakkan di peta sehingga mudah dikaitkan dengan lokasi nyata.

## Siapa yang memakai

| Pengguna | Kebutuhan |
| --- | --- |
| Warga | Mengetahui apakah perlu waspada hari ini |
| Petugas BPBD | Gambaran situasi sebelum membuka Command Center |
| Komunitas dan relawan | Menentukan lokasi dan jenis bantuan |
| Juri | Melihat bagaimana data resmi diolah menjadi informasi yang berguna |

## Contoh penggunaan

1. Seorang warga Pasar Baru, Kota Bengkulu membuka Peta di pagi hari. Ringkasan menyatakan tidak ada peringatan dini, suhu 24°C, dan angin 2,1 m/s. Ia tidak perlu mengubah rencana.
2. Hujan lebat disertai petir diumumkan untuk provinsinya. Status berubah menjadi "Peringatan dini aktif", polygon area peringatan muncul di peta, dan panel peringatan memuat rinciannya.
3. Seorang pengguna di kota lain memilih kelurahannya lewat pemilih wilayah. Prakiraan dan peringatan langsung mengikuti kelurahan itu.

## Bagian halaman

### Ringkasan situasi

Kartu di bagian atas.

- **Status:** "Tanpa peringatan dini aktif" (hijau) atau "Peringatan dini aktif" (oranye) pada mode Live. Pada mode Simulasi berupa tingkat dampak: Rendah, Sedang, Tinggi, Ekstrem.
- **Judul kondisi:** misalnya "Cerah Berawan di Tegal Kertha, tidak ada peringatan dini cuaca untuk Bali". Jika ada peringatan, yang tampil adalah judul peringatan itu.
- **Lokasi dan masa berlaku:** kelurahan, kota, provinsi, dan batas waktu berlaku bila ada.
- **Empat angka kunci:**
  - Mode Live: suhu, angin, peringatan aktif di provinsi, dan magnitudo gempa terakhir.
  - Mode Simulasi: gelombang maksimum, fasilitas terpapar (dari total), laporan menunggu, dan titik panas.

### Peta

Peta interaktif dengan kontrol di empat tempat:

| Kontrol | Letak | Fungsi |
| --- | --- | --- |
| + dan − | Kiri atas | Memperbesar dan memperkecil |
| Ikon peta | Kiri, di bawah + dan − | Mengganti peta dasar |
| Nama wilayah | Kanan atas, hanya mode Live | Membuka pemilih wilayah |
| Lapisan | Kanan atas | Menyalakan atau mematikan lapisan |

**Peta dasar:**

| Pilihan | Sumber | Cocok untuk |
| --- | --- | --- |
| Terang | Esri World Light Gray | Menonjolkan zona bahaya dan penanda (default) |
| Jalan | OpenStreetMap | Mencari nama jalan dan bangunan |
| Satelit | Esri World Imagery | Melihat garis pantai, mangrove, permukiman |

Pilihan peta dasar tidak tersimpan dan kembali ke Terang saat halaman dimuat ulang.

**Lapisan** (hanya yang punya data pada mode aktif yang ditampilkan):

| Lapisan | Isi | Sumber |
| --- | --- | --- |
| Peringatan dini BMKG | Polygon area peringatan (oranye) | BMKG CAP |
| Zona bahaya | Genangan, zona tsunami, guncangan | Skenario |
| Koridor asap indikatif | Perkiraan arah sebaran asap 6 dan 12 jam | Aturan sistem, indikatif |
| Titik panas | Titik api dari satelit | Skenario (rencana NASA FIRMS) |
| Fasilitas kritis | Sekolah, puskesmas, rumah sakit | Skenario |
| Laporan warga | Laporan dengan lokasi | Menu Laporan |
| Shelter | Tempat penampungan dengan kapasitas | Skenario |
| Rute kandidat | Rute evakuasi usulan | Skenario |
| Gempa | Pusat gempa terbaru | BMKG |

**Warna penanda fasilitas kritis.** Penanda fasilitas berbentuk kotak dan warnanya menunjukkan jenis. Legenda warna muncul di bawah "Fasilitas kritis" pada menu Lapisan saat lapisan itu menyala.

| Warna | Arti |
| --- | --- |
| Biru | Sekolah |
| Teal | Puskesmas |
| Abu-abu gelap | Rumah sakit |
| Merah | Fasilitas yang berada di zona bahaya, menimpa warna jenisnya |

**Pemilih wilayah.** Pilih Provinsi, Kota atau kabupaten, Kecamatan, lalu Kelurahan atau desa, kemudian **Terapkan**. Pilihan tersimpan di browser. **Wilayah bawaan** mengembalikan ke nilai `BMKG_ADM4` di `.env`. Daftar memuat sekitar 91 ribu kelurahan dan desa. Kelurahan tanpa data prakiraan di BMKG menampilkan galat sumber dan data contoh.

Di mode Simulasi peta berpindah ke lokasi skenario, dan watermark "SIMULASI — BUKAN PERINGATAN RESMI" muncul di bagian bawah.

### Peringatan dini cuaca

Peringatan aktif dari BMKG untuk **provinsi** wilayah terpilih.

- Tiap peringatan memuat judul, jenis, tingkat keparahan (misalnya Moderate), urgensi (misalnya Immediate), waktu berakhir, deskripsi, dan tautan infografik BMKG.
- Peringatan provinsi lain tidak ditampilkan langsung, tetapi bisa dibuka lewat baris "peringatan aktif di provinsi lain".
- Pencocokan ke provinsi memakai **judul** peringatan, dan nama provinsi harus menjadi akhir judul ("... di Bali"). Pencocokan memakai teks penuh pernah menghasilkan peringatan yang salah wilayah, karena nama kecamatan di Papua memuat "bali".

### Prakiraan per 3 jam

Deretan kartu yang dapat digeser: jam, suhu, kondisi, dan kecepatan angin. Pada skenario pesisir ada tambahan tinggi gelombang. Kartu pertama (slot terdekat) diberi latar teal. Di bawahnya tertulis lokasi dan waktu prakiraan diproduksi BMKG.

### Gempa terbaru

Magnitudo, pusat gempa, waktu, kedalaman, wilayah yang merasakan beserta skala intensitas, keterangan potensi dari BMKG, dan tautan shakemap.

### Panel khusus mode Simulasi

- **Buletin dampak (IBF):** judul, ringkasan, kelompok terdampak, dan **Apa yang perlu dilakukan**. Tiap tindakan menyebut sasaran (misalnya nelayan, lansia, pengelola fasilitas), isi tindakan, prioritas (Disarankan, Mendesak, Kritis), dan batas waktu (Sekarang, 3, 6, atau 24 jam). Tersedia juga bukti dan sumber, catatan ketidakpastian, dan penafian.
- **Titik panas satelit:** sensor, waktu akuisisi, tingkat keyakinan (rendah, nominal, tinggi), dan FRP.
- **Fasilitas kritis:** nama, jenis, jarak, status terpapar, dan status verifikasi (belum diverifikasi, dicek, dikonfirmasi).
- **Rute kandidat:** nama, jarak, durasi, ruas terdampak, keputusan (disarankan, waspada, tidak disarankan), dan alasannya. Rute hanya usulan dan memerlukan persetujuan petugas.

## Asal data dan pembaruan

| Data | Sumber | Cache server | Muat ulang browser |
| --- | --- | --- | --- |
| Prakiraan cuaca | BMKG `api.bmkg.go.id/publik/prakiraan-cuaca` | 30 menit | 5 menit |
| Gempa | BMKG autogempa dan gempa dirasakan | 2 menit | 5 menit |
| Peringatan dini | BMKG CAP nowcast | 3 menit | 5 menit |
| Skenario | `src/lib/mock` | tidak berubah | tidak berlaku |

Jika BMKG tidak dapat dijangkau, server mengirim data valid terakhir berlabel **Stale**. Bila belum pernah ada data sama sekali, tampilan kembali ke data contoh.

## Layar kecil

Di ponsel halaman dibagi dua tab: **Peta** dan **Informasi**, agar peta mendapat layar penuh.

## Titik sambung backend

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/bmkg/forecast?adm4=<kode>` | Prakiraan wilayah |
| `GET /api/bmkg/earthquakes` | Gempa terbaru dan dirasakan |
| `GET /api/bmkg/alerts?province=<nama>` | Peringatan dini provinsi |
| `GET /api/regions?parent=<kode>` | Daftar wilayah untuk pemilih |

## Batasan

- Laporan warga, fasilitas, titik panas, shelter, dan rute pada mode Live masih contoh, sampai backend dan sumber datanya tersedia.
- Peringatan dini dicocokkan sampai tingkat provinsi, belum sampai kelurahan.
- Sebagian kelurahan tidak punya data prakiraan di BMKG.
- Aplikasi ini bukan pengganti BMKG, BNPB, atau BPBD.

## Pertanyaan umum

**Mengapa peta kosong di wilayah tertentu?** Lapisan hanya tampil bila ada datanya. Pada mode Live, hanya peringatan dini dan gempa yang bersumber nyata.

**Mengapa ada peringatan di panel "provinsi lain"?** BMKG menerbitkan peringatan nasional. Aplikasi memisahkan yang berlaku di provinsi Anda dari yang lain.

**Mengapa tulisan "Stale"?** BMKG sedang tidak dapat dijangkau. Data yang tampil adalah data terakhir yang valid, dengan waktu pengambilannya.
