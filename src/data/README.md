# Data statis

## wilayah.json

Daftar kode wilayah administrasi Indonesia untuk pemilih wilayah di menu Peta. Dilayani oleh `GET /api/regions?parent=<kode>`.

| Keterangan | Nilai |
| --- | --- |
| Sumber | https://github.com/cahyadsn/wilayah, berkas `db/wilayah.sql` |
| Lisensi sumber | MIT |
| Dasar data | Kepmendagri No 300.2.2-2138 Tahun 2025 |
| Terakhir disunting di sumber | 2026-02-13 |
| Isi | 91.599 wilayah: provinsi, kota atau kabupaten, kecamatan, kelurahan atau desa |

Bentuk data: objek yang dikelompokkan menurut kode induk, dan isinya daftar `[kode, nama]`.

```
{ "": [["11","Aceh"], ...], "17": [["17.71","Kota Bengkulu"], ...], "17.71.03": [["17.71.03.1002","Pasar Baru"], ...] }
```

### Membuat ulang

1. Unduh `db/wilayah.sql` dari repositori di atas.
2. Jalankan dari akar proyek:

```
node scripts/build-wilayah.mjs <jalur ke wilayah.sql>
```

Hasilnya menimpa `src/data/wilayah.json`. Skrip ini tidak memerlukan paket tambahan.
