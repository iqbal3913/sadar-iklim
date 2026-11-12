# SadarIklim (frontend)

Frontend Next.js 15 + Tailwind 4 + React-Leaflet. Mode Live mengambil prakiraan cuaca, gempabumi, dan peringatan dini dari BMKG. Data lain masih contoh statis.

SadarIklim adalah platform peringatan dini berbasis dampak untuk mitigasi bencana dan perubahan iklim. Aplikasi ini tidak berhenti pada "cuaca apa yang akan terjadi", tetapi menunjukkan fasilitas, wilayah, dan warga mana yang terdampak, lalu mengarahkan tindakan yang perlu diambil. Dibuat untuk IT RUSH 2026, kategori Web Development, tema Mitigasi Bencana dan Perubahan Iklim.

## Fitur utama

- Peta dampak: prakiraan BMKG, gempa terbaru, titik panas, fasilitas kritis, shelter, dan laporan warga dalam satu peta, dengan pilihan peta dasar Terang, Jalan, dan Satelit
- Pemilih wilayah: pengguna bisa mengganti kelurahan atau desa yang dipantau (provinsi, kabupaten/kota, kecamatan, kelurahan)
- Mode Live dan Simulasi: Live memakai data BMKG, Simulasi memutar skenario krisis untuk demo, dengan penanda sumber data yang selalu terlihat
- Laporan warga: kirim laporan dengan foto, triase foto otomatis (contoh), dan peninjauan oleh petugas
- Eco-Audit mangrove: pencatatan kondisi mangrove sebagai penyangga pesisir
- Kampanye bantuan: kebutuhan logistik per lokasi terdampak
- Command Center: ringkasan operasional dan rute untuk petugas
- Judge Mode: jalur cepat untuk juri menelusuri fitur dan sumber data

Penjelasan lengkap tiap menu ada di [`docs/`](docs/README.md).

## Teknologi

- Next.js 15 (App Router), React 19, TypeScript strict
- Tailwind CSS 4 dengan token desain di `src/app/globals.css`
- React-Leaflet 5 dan Leaflet 1.9 untuk peta
- lucide-react untuk ikon, Plus Jakarta Sans untuk huruf
- fast-xml-parser untuk membaca CAP BMKG di sisi server

## Prasyarat

- Node.js 20 atau lebih baru
- npm

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Sebelum itu salin `.env.example` menjadi `.env.local` dan isi nilainya (lihat bagian Konfigurasi).

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | server pengembangan |
| `npm run build` | build produksi |
| `npm run start` | menjalankan hasil build |
| `npm run lint` | pemeriksaan lint |
| `npm run typecheck` | pemeriksaan tipe TypeScript |

## Konfigurasi

Semua variabel ada di `.env.example` (hanya nama, tanpa nilai). File `.env` dan `.env.local` tidak ikut ke Git.

| Variabel | Fungsi | Contoh |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | alamat dasar aplikasi | `http://localhost:3000` |
| `BMKG_ADM4` | wilayah bawaan untuk prakiraan BMKG (kode tingkat IV Kemendagri) | `17.71.03.1002` |

Jika `BMKG_ADM4` kosong, dipakai kode bawaan di `src/lib/env-config.ts`.

## Struktur folder

```text
src/
  app/             halaman dan route API (Next.js App Router)
    api/bmkg/      forecast, earthquakes, alerts
    api/regions/   daftar wilayah untuk pemilih wilayah
  components/      header, source bar, peta, komponen UI bersama
  features/        dashboard, ibf, laporan, mangrove, kampanye, vision-triage
  lib/             state aplikasi, klien BMKG, konfigurasi, data
  data/            wilayah.json (data wilayah Kemendagri)
scripts/           build-wilayah.mjs (membuat ulang wilayah.json)
docs/              dokumentasi fitur dan catatan untuk tim backend
public/            aset statis
```

## Halaman

| Rute | Isi |
| --- | --- |
| `/` | dashboard peta dan ringkasan dampak |
| `/reports`, `/reports/new`, `/reports/[id]` | daftar, form, dan detail laporan |
| `/mangrove` | Eco-Audit mangrove |
| `/campaigns` | kampanye bantuan |
| `/command-center` | ruang kendali petugas |
| `/judge-mode` | panduan untuk juri |
| `/about`, `/sources` | tentang aplikasi dan sumber data |
| `/login` | masuk dengan akun demo |

## Titik sambung ke backend

- `src/lib/data.ts`: getLiveSnapshot, getScenarioSnapshot, listCampaigns, listMangroveAudits, listSamplePhotos
- `src/features/vision-triage/analyze.ts`: analyzePhoto, ganti dengan POST ke `/api/vision/triage`
- `src/lib/app-state.tsx`: addReport dan reviewReport, ganti dengan pemanggilan API
- `src/lib/mock/users.ts`: akun demo, ganti dengan Supabase Auth

Catatan lengkap untuk tim backend ada di [`docs/backend.md`](docs/backend.md).

## Akun demo

- Petugas: petugas.demo@sadariklim.example / demo-bpbd-2026
- Warga: warga.demo@sadariklim.example / demo-warga-2026

## Data BMKG

- `GET /api/bmkg/forecast?adm4=` prakiraan per 3 jam, cache 30 menit
- `GET /api/bmkg/earthquakes` gempa terbaru dan gempa dirasakan, cache 2 menit
- `GET /api/bmkg/alerts?province=` peringatan dini CAP, cache 3 menit

Wilayah bawaan diatur lewat `BMKG_ADM4` di `.env` (kode wilayah tingkat IV Kemendagri). Jika BMKG gagal dijangkau, server mengirim data valid terakhir berlabel STALE, dan tampilan kembali ke data contoh bila belum ada data sama sekali.

## Data wilayah

Daftar provinsi sampai kelurahan untuk pemilih wilayah ada di `src/data/wilayah.json`, bersumber dari [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (lisensi MIT, mengacu Kepmendagri No 300.2.2-2138 Tahun 2025). Untuk membuat ulang:

```bash
node scripts/build-wilayah.mjs <path-ke-wilayah.sql>
```

Daftar semua sumber eksternal yang dipakai ada di [`docs/sumber-eksternal.md`](docs/sumber-eksternal.md).

## Status

- Sudah berjalan: data Live BMKG, pemilih wilayah, peta dengan tiga peta dasar, mode Simulasi, alur laporan, Command Center, Judge Mode
- Masih contoh: kampanye, analisis foto, akun demo, dan persetujuan rute di Command Center (belum tersimpan)
- Belum ada: basis data, autentikasi sungguhan, dan penyimpanan laporan, yang dikerjakan tim backend

## Tim

| Peran | Nama | GitHub |
| --- | --- | --- |
| Frontend | Ibal | |
| Backend | | |
| Backend | | |

## Dokumentasi fitur

Penjelasan tiap menu ada di folder [`docs/`](docs/README.md): Peta, Laporan, Mangrove, Kampanye, Command Center, dan Judge Mode.

Dokumen lain: [panduan kerja tim dengan Git](CONTRIBUTING.md), [catatan untuk tim backend](docs/backend.md), [sumber eksternal](docs/sumber-eksternal.md), dan [filosofi logo](docs/logo.md).
