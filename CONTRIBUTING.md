# Panduan kerja tim

Panduan ini menjelaskan cara tim frontend dan backend bekerja di repo yang sama tanpa saling menimpa. Aturan dasarnya: jangan commit langsung ke `main`. Setiap pekerjaan dikerjakan di branch sendiri, lalu digabung lewat Pull Request.

## Pembagian area

| Area | Pemegang | Lokasi |
| --- | --- | --- |
| Tampilan dan interaksi | Frontend | `src/components`, `src/features`, `src/app` (halaman) |
| API dan basis data | Backend | `src/app/api`, sambungan di `src/lib/data.ts` |
| Dokumentasi | Siapa saja | `docs/`, `README.md` |

Panduan titik sambung frontend ke backend ada di [`docs/backend.md`](docs/backend.md). Jika perlu mengubah file di area orang lain, kabari dulu supaya tidak bentrok.

## Pertama kali

```bash
git clone https://github.com/USERNAME/sadariklim.git
cd sadariklim
npm install
```

Salin `.env.example` menjadi `.env.local`, lalu isi nilainya. File `.env` dan `.env.local` tidak boleh di-commit.

## Penamaan branch

| Awalan | Untuk | Contoh |
| --- | --- | --- |
| `frontend/` | pekerjaan tampilan | `frontend/perbaikan-peta` |
| `backend/` | pekerjaan API dan data | `backend/auth-supabase` |
| `docs/` | dokumentasi | `docs/panduan-juri` |
| `fix/` | perbaikan bug kecil | `fix/legenda-peta` |

Gunakan huruf kecil dan tanda hubung. Satu branch untuk satu pekerjaan.

## Alur kerja

1. Ambil `main` terbaru dan buat branch:

```bash
git checkout main
git pull
git checkout -b frontend/nama-pekerjaan
```

2. Kerjakan, lalu simpan:

```bash
git add .
git commit -m "Perbaiki legenda peta"
```

3. Kirim ke GitHub:

```bash
git push -u origin frontend/nama-pekerjaan
```

4. Di GitHub klik **Compare & pull request**, isi judul dan deskripsi singkat, lalu **Create pull request**.

5. Minta satu orang lain meninjau. Setelah disetujui, tekan **Merge pull request**.

6. Kembali ke komputer sendiri:

```bash
git checkout main
git pull
git branch -d frontend/nama-pekerjaan
```

## Sebelum membuka Pull Request

Jalankan dua perintah ini dan pastikan tidak ada galat:

```bash
npm run typecheck
npm run build
```

Isi deskripsi Pull Request dengan: apa yang berubah, kenapa, dan cara mengujinya.

## Pesan commit

- Satu kalimat, kata kerja di depan, dan jelas: "Tambah pemilih wilayah", "Perbaiki warna legenda RSUD".
- Satu commit untuk satu perubahan yang utuh. Hindari commit "update" atau "fix" tanpa keterangan.

## Jika branch tertinggal dari `main`

```bash
git checkout main
git pull
git checkout frontend/nama-pekerjaan
git merge main
```

Jika Git melaporkan konflik, buka file yang ditandai. Bagian di antara `<<<<<<<` dan `>>>>>>>` adalah dua versi yang bentrok. Pilih isi yang benar, hapus tanda tersebut, lalu:

```bash
git add .
git commit
```

## Jangan di-commit

- `.env`, `.env.local`, dan file lain yang berisi kunci rahasia
- `node_modules` dan `.next`
- Kata sandi, token, atau kunci API dalam bentuk apa pun

Jika kunci terlanjur ter-commit, anggap kunci itu bocor dan buat yang baru.

## Menjaga `main` tetap aman

Disarankan pemilik repo mengaktifkan aturan di Settings → Branches → Add branch ruleset, dengan opsi "Require a pull request before merging". Setelah itu tidak ada yang bisa push langsung ke `main`.
