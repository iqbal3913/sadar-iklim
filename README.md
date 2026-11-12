# SadarIklim (frontend)

Frontend Next.js 15 + Tailwind 4 + React-Leaflet. Mode Live mengambil prakiraan cuaca, gempabumi, dan peringatan dini dari BMKG. Data lain masih contoh statis.

## Menjalankan

```bash
npm install
npm run dev
```

## Titik sambung ke backend

- `src/lib/data.ts`: getLiveSnapshot, getScenarioSnapshot, listCampaigns, listMangroveAudits, listSamplePhotos
- `src/features/vision-triage/analyze.ts`: analyzePhoto, ganti dengan POST ke `/api/vision/triage`
- `src/lib/app-state.tsx`: addReport dan reviewReport, ganti dengan pemanggilan API
- `src/lib/mock/users.ts`: akun demo, ganti dengan Supabase Auth

## Akun demo

- Petugas: petugas.demo@sadariklim.example / demo-bpbd-2026
- Warga: warga.demo@sadariklim.example / demo-warga-2026

## Data BMKG

- `GET /api/bmkg/forecast?adm4=` prakiraan per 3 jam, cache 30 menit
- `GET /api/bmkg/earthquakes` gempa terbaru dan gempa dirasakan, cache 2 menit
- `GET /api/bmkg/alerts?province=` peringatan dini CAP, cache 3 menit

Wilayah bawaan diatur lewat `BMKG_ADM4` di `.env` (kode wilayah tingkat IV Kemendagri). Jika BMKG gagal dijangkau, server mengirim data valid terakhir berlabel STALE, dan tampilan kembali ke data contoh bila belum ada data sama sekali.

## Dokumentasi fitur

Penjelasan tiap menu ada di folder [`docs/`](docs/README.md): Peta, Laporan, Mangrove, Kampanye, Command Center, dan Judge Mode.
