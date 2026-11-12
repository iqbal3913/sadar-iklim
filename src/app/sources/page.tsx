import type { Metadata } from "next";
import { ExternalIcon, Notice, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Sumber data" };

const sources = [
  { name: "BMKG Prakiraan Cuaca", use: "Cuaca, angin, awan per 3 jam", refresh: "30–60 menit, sumber diperbarui 2 kali sehari", attr: "Sumber: BMKG", href: "https://data.bmkg.go.id/prakiraan-cuaca/" },
  { name: "BMKG Peringatan Dini (CAP)", use: "Peringatan aktif, polygon, masa berlaku", refresh: "2–5 menit saat mode live", attr: "Sumber: BMKG", href: "https://data.bmkg.go.id/peringatan-dini-cuaca/" },
  { name: "BMKG Gempabumi", use: "Gempa terbaru, M5.0+, dirasakan, shakemap", refresh: "1–3 menit", attr: "Sumber: BMKG", href: "https://data.bmkg.go.id/gempabumi/" },
  { name: "Open-Meteo Marine", use: "Tinggi, arah, dan periode gelombang serta swell", refresh: "30–60 menit", attr: "Open-Meteo, CC BY 4.0", href: "https://open-meteo.com/en/features" },
  { name: "NASA LANCE FIRMS", use: "Titik panas VIIRS dan MODIS", refresh: "10–20 menit", attr: "NASA LANCE FIRMS", href: "https://firms.modaps.eosdis.nasa.gov/" },
  { name: "BNPB InaRISK", use: "Baseline risiko, batas administrasi, fasilitas", refresh: "1–7 hari", attr: "BNPB InaRISK. Lokasi relatif, bukan untuk tujuan hukum atau rekayasa sipil", href: "https://inarisk.bnpb.go.id/webgis/" },
  { name: "OpenStreetMap", use: "Peta dasar Jalan, dan bahan peta Terang", refresh: "Extract regional terjadwal", attr: "© OpenStreetMap contributors, ODbL", href: "https://www.openstreetmap.org/copyright" },
  { name: "Esri World Imagery dan Light Gray", use: "Peta dasar Satelit dan Terang", refresh: "Tile dilayani langsung ke browser", attr: "Tiles © Esri, Maxar, Earthstar Geographics, HERE, Garmin", href: "https://www.esri.com" },
  { name: "Kode wilayah administrasi (cahyadsn/wilayah)", use: "Daftar provinsi sampai kelurahan untuk pemilih wilayah, mengikuti Kepmendagri No 300.2.2-2138 Tahun 2025", refresh: "Berkas statis, diperbarui manual", attr: "cahyadsn/wilayah, lisensi MIT", href: "https://github.com/cahyadsn/wilayah" },
  { name: "Kitabisa", use: "Katalog kampanye yang dikurasi manual", refresh: "Verifikasi admin 12–24 jam", attr: "Tautan eksternal, bukan kemitraan", href: "https://kitabisa.com/" },
  { name: "Google Gemini", use: "Ringkasan dampak dan klasifikasi visual", refresh: "Per permintaan", attr: "Hasil AI bersifat asistif dan dapat salah", href: "https://ai.google.dev/" },
];

const labels = [
  { tag: "LIVE", text: "Data dari sumber aktif dan masih dalam batas umur" },
  { tag: "STALE", text: "Data valid terakhir, sumber gagal atau sudah lewat batas umur" },
  { tag: "SIMULASI", text: "Skenario demo yang tersimpan, tidak pernah dicampur dengan data live" },
];

export default function SourcesPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Sumber data dan provenance</h1>
        <p className="mt-1 text-sm text-muted">
          Setiap panel menampilkan sumber, waktu pembaruan, dan status data agar dapat ditelusuri
        </p>
      </div>

      <Notice tone="warn">
        Prakiraan cuaca, gempabumi, dan peringatan dini sudah diambil langsung dari BMKG. Sumber lain di tabel ini masih rencana integrasi
      </Notice>

      <Panel title="Arti label status">
        <ul className="grid gap-3 md:grid-cols-3">
          {labels.map((l) => (
            <li key={l.tag} className="rounded-lg border border-line p-3">
              <p className="text-sm font-bold">{l.tag}</p>
              <p className="mt-1 text-sm text-ink-soft">{l.text}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Daftar sumber">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Sumber</th>
                <th scope="col" className="py-2 pr-3 font-medium">Pemakaian</th>
                <th scope="col" className="py-2 pr-3 font-medium">Interval refresh</th>
                <th scope="col" className="py-2 font-medium">Atribusi</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.name} className="border-b border-line/60 align-top last:border-0">
                  <td className="py-3 pr-3 font-semibold">
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal hover:underline">
                      {s.name}
                      <ExternalIcon className="size-3" />
                    </a>
                  </td>
                  <td className="py-3 pr-3 text-ink-soft">{s.use}</td>
                  <td className="py-3 pr-3 text-ink-soft">{s.refresh}</td>
                  <td className="py-3 text-ink-soft">{s.attr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
