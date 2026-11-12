# Logo SadarIklim

![Logo SadarIklim](../src/app/icon.svg)

Logo SadarIklim adalah tunas daun yang tumbuh di atas dua lapis gelombang, di dalam kotak bulat berwarna teal. Satu gambar, tiga gagasan: **sadar**, **iklim**, dan **tumbuh**.

## Filosofi

### Tunas: kesadaran yang mulai tumbuh

Nama "Sadar" berarti tahu dan siap. Tunas dipilih karena kesadaran bukan sesuatu yang datang sekaligus, melainkan tumbuh dari informasi kecil yang rutin: satu peringatan dini, satu laporan warga, satu kebiasaan memeriksa kondisi.

- **Daun besar yang terang** adalah kesadaran yang sudah terbentuk: warga yang tahu risikonya.
- **Daun kecil yang lebih pudar** adalah kesadaran yang sedang tumbuh: yang belum tahu hari ini, tetapi akan tahu karena informasinya tersedia.
- **Batang yang tegak** adalah dasar yang kokoh. Aplikasi ini berpijak pada data resmi, dan bukan pada kabar yang tidak jelas asalnya.

### Gelombang: iklim dan air

Air adalah wajah paling nyata dari perubahan iklim di Indonesia: rob, banjir, abrasi, dan kenaikan muka air laut. Dua gelombang menggambarkannya.

- **Gelombang atas yang tegas** adalah ancaman yang terlihat dan sudah dapat diukur.
- **Gelombang bawah yang pudar** adalah risiko yang belum tampak: dampak yang datang belakangan, atau bahaya yang baru ketahuan setelah ada yang melaporkan.

Gelombang itu bergerak pelan dan tidak menghantam. SadarIklim tidak menakut-nakuti, melainkan membantu orang membaca situasi dengan tenang.

### Tunas di atas air: mangrove dan harapan

Tunas yang berdiri di atas permukaan air mengingatkan pada mangrove, tanaman pesisir yang meredam gelombang dan menahan abrasi. Menu **Mangrove** di aplikasi ini adalah wujud langsungnya. Pesannya: ancaman iklim memang nyata, tetapi tindakan kecil yang tumbuh bersama bisa menahannya.

### Kotak bulat: dekat dan dapat dipercaya

Sudut yang membulat membuat logo terasa ramah dan mudah didekati, sesuai tujuan aplikasi yang dipakai warga biasa dan bukan hanya ahli. Bentuk kotak juga siap dipakai sebagai ikon aplikasi dan favicon.

### Gradasi teal: dari waspada ke tenang

Warna bergerak dari teal terang di kiri atas ke teal gelap di kanan bawah. Teal berada di antara hijau (alam, tumbuh, aman) dan biru (air, laut, langit). Gradasinya menggambarkan perjalanan dari kesadaran awal menuju kesiapsiagaan yang matang.

## Rangkuman unsur

| Unsur | Gambar | Makna |
| --- | --- | --- |
| Daun besar putih | Tunas | Kesadaran yang sudah terbentuk |
| Daun kecil pudar | Tunas | Kesadaran yang sedang tumbuh |
| Batang | Tunas | Dasar data resmi yang kokoh |
| Gelombang atas tegas | Air | Ancaman iklim yang terukur |
| Gelombang bawah pudar | Air | Risiko yang belum tampak |
| Kotak bulat | Wadah | Ramah, dapat dipercaya, siap jadi ikon |
| Gradasi teal | Warna | Dari waspada menuju kesiapsiagaan |

## Logotype

Tulisan **SadarIklim** ditulis rapat sebagai satu kata, bukan dua.

- **"Sadar"** berwarna putih pada latar gelap, mewakili sikap dasar: tahu.
- **"Iklim"** berwarna teal terang `#14B8A6`, mewakili hal yang ditinjau: perubahan iklim.
- Huruf memakai **Plus Jakarta Sans**, tebal (bold), dengan jarak antarhuruf yang sedikit rapat.

## Warna

| Nama | Kode | Dipakai untuk |
| --- | --- | --- |
| Teal terang | `#2DD4BF` | Awal gradasi kotak |
| Teal gelap | `#0F766E` | Akhir gradasi kotak |
| Teal aksen | `#14B8A6` | Kata "Iklim", garis bawah menu aktif |
| Putih | `#FFFFFF` | Tunas dan gelombang |
| Hijau tua | `#0F2B2A` | Latar header |

Gelombang bawah dan daun kecil memakai putih dengan keburaman sekitar 55 sampai 82 persen, bukan warna lain, supaya logo tetap satu warna.

## Aturan pemakaian

**Boleh**
- Memakai logo pada latar hijau tua, putih, atau abu-abu sangat muda.
- Memperbesar atau memperkecil secara proporsional.
- Memakai logo sendiri tanpa tulisan untuk ikon dan favicon.

**Jangan**
- Mengubah warna gradasi atau warna tunas.
- Meregangkan, memiringkan, atau memutar logo.
- Menambahkan bayangan, garis tepi, atau efek lain.
- Menaruh logo di atas foto yang ramai tanpa latar polos.
- Memisahkan tunas dari gelombang, karena maknanya ada pada keduanya.

**Ukuran dan ruang**
- Ukuran terkecil yang masih terbaca adalah **16 px** (favicon). Di ukuran ini detail daun kecil mulai hilang, tetapi bentuk tunas di atas gelombang tetap dikenali.
- Beri ruang kosong di sekeliling logo minimal setengah lebar kotaknya.

## Letak di kode

| Berkas | Fungsi |
| --- | --- |
| `src/components/logo.tsx` | Komponen `LogoMark`, dipakai di header dan drawer menu. Ukuran diatur lewat `className`, misalnya `size-9` |
| `src/app/icon.svg` | Favicon tab browser |
| `src/components/header.tsx` | Menempatkan logo dan logotype |

Gradasi memakai pengenal unik per pemakaian (`useId`), sehingga logo boleh muncul lebih dari satu kali dalam satu halaman tanpa saling mengganggu.

Jika mengubah gambar logo, ubah **dua tempat**: `logo.tsx` dan `icon.svg`, karena keduanya berisi gambar yang sama.
