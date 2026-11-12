# Catatan untuk tim backend

Backend dikerjakan oleh tim backend dan berada di luar lingkup frontend. Dokumen ini hanya usulan dan gambaran apa yang dibutuhkan tampilan, bukan keputusan teknologi. Tim bebas memakai Supabase atau yang lain. Bagian frontend yang siap disambungkan ada di `src/lib/app-state.tsx` dan `src/features/vision-triage/analyze.ts`.

Saat ini seluruh data buatan pengguna (laporan, audit, keputusan petugas, sesi masuk) tersimpan di `localStorage` browser. Itu cukup untuk demo, tetapi tidak cukup untuk dipakai bersama.

## Mengapa perlu backend

| Keterbatasan sekarang | Akibat | Solusi |
| --- | --- | --- |
| Data hanya ada di satu browser | Laporan warga tidak pernah sampai ke petugas | Database bersama |
| Foto tidak punya tempat penyimpanan | Foto hilang atau terbatas ukurannya | Penyimpanan file |
| Akun demo tertanam di kode | Siapa pun bisa masuk sebagai petugas | Autentikasi sungguhan |
| Pembatasan peran hanya di tampilan | Dapat dilewati lewat konsol browser | Aturan akses di sisi server |
| Analisis foto tiruan | Hasil selalu sama | Panggilan ke model visi dari server |
| Kunci API tidak boleh ada di browser | Tidak bisa memanggil layanan berbayar atau berkuota | Route server |

## Peran Supabase

Supabase menyediakan empat hal dalam satu layanan.

| Fitur | Dipakai untuk |
| --- | --- |
| **Database (PostgreSQL)** | Menyimpan laporan, audit, keputusan, dan kampanye |
| **Auth** | Pendaftaran dan masuk warga serta petugas, lengkap dengan peran |
| **Storage** | Menyimpan foto laporan dan audit mangrove |
| **Row Level Security (RLS)** | Aturan di dalam database tentang siapa boleh membaca atau mengubah baris mana |

Paket gratisnya cukup untuk demo kompetisi. Proyek gratis dapat dijeda otomatis jika lama tidak ada aktivitas, jadi buka aplikasi secara berkala menjelang dan selama masa penjurian.

## Tabel yang direncanakan

| Tabel | Isi | Menggantikan |
| --- | --- | --- |
| `profiles` | Id pengguna, nama tampilan, peran (`citizen`, `community`, `bpbd_admin`) | Akun demo di `src/lib/mock/users.ts` |
| `reports` | Judul, jenis, deskripsi, lokasi, waktu kejadian, status, urgensi, hasil analisis AI, foto, mode data | `addedReports` di `app-state.tsx` |
| `report_reviews` | Laporan, petugas, keputusan, alasan, waktu | `overrides` di `app-state.tsx` |
| `mangrove_audits` | Plot, bibit ditanam, bibit hidup, kondisi, risiko abrasi, status verifikasi, foto | State lokal halaman Mangrove |
| `campaigns` | Judul, tautan, kategori, ringkasan, wilayah, status, verifikasi | `src/lib/mock/campaigns.ts` |
| `route_decisions` | Rute, petugas, keputusan, waktu | Tombol rute di Command Center |

## Aturan akses (RLS)

| Siapa | Boleh |
| --- | --- |
| Pengunjung | Membaca laporan terverifikasi dan kampanye aktif |
| Warga | Membuat laporan dan audit, membaca miliknya sendiri |
| Petugas BPBD | Membaca semua laporan, menulis keputusan verifikasi dan persetujuan rute |

Aturan ini harus berada di database, bukan hanya di tampilan.

## Layanan lain yang dibutuhkan

| Kebutuhan | Pilihan | Catatan |
| --- | --- | --- |
| Analisis foto | Google Gemini lewat route server | Kunci API di `.env.local`, tidak pernah ke browser. Batasi ukuran dan jumlah permintaan |
| Hosting | Vercel (paket gratis) | Atur variabel lingkungan, termasuk `BMKG_ADM4` |
| Sumber data tambahan | Open-Meteo, NASA FIRMS, BNPB InaRISK | Opsional, boleh tetap berlabel Contoh |

## Variabel lingkungan

| Variabel | Tempat | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | `.env` | Alamat aplikasi |
| `BMKG_ADM4` | `.env` | Kode wilayah bawaan untuk data BMKG |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Alamat proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Kunci publik, aman di browser jika RLS aktif |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` | **Rahasia.** Hanya di server, jangan dikirim ke chat atau repositori |
| `GEMINI_API_KEY` | `.env.local` | **Rahasia.** Hanya di server |

`.env.example` hanya memuat nama variabel tanpa nilai.

## Urutan pengerjaan yang disarankan

1. Buat proyek Supabase, jalankan skema dan aturan RLS.
2. Ganti akun demo dengan Supabase Auth.
3. Sambungkan laporan: simpan ke database dan foto ke Storage.
4. Sambungkan keputusan petugas ke `report_reviews`.
5. Ganti `analyze.ts` dengan route server yang memanggil Gemini.
6. Sambungkan audit mangrove dan katalog kampanye.
7. Deploy ke Vercel dan uji dari perangkat lain.
8. Opsional: sumber data tambahan.

## Yang tetap tidak berubah

Data BMKG sudah berjalan lewat route server dan tidak membutuhkan database. Skenario simulasi di Judge Mode tetap berupa data tetap agar hasil uji selalu sama.
