import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/ui";

export const metadata: Metadata = { title: "Tentang" };

const pillars = [
  { title: "Data menjadi tindakan", text: "Prakiraan, peringatan, dan gelombang diterjemahkan menjadi tindakan yang relevan untuk nelayan, warga, dan aparat desa" },
  { title: "Laporan dipilah lebih cepat", text: "Foto warga dipilah oleh AI untuk membantu prioritas, lalu selalu diverifikasi manusia sebelum memengaruhi peta" },
  { title: "Satu gambaran spasial", text: "Titik panas, angin, zona bahaya, fasilitas kritis, dan rute dalam satu peta dengan sumber yang jelas" },
  { title: "Bantuan yang transparan", text: "Kampanye dikurasi manual dan estimasi logistik menampilkan asumsi serta komponen biayanya" },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tentang SadarIklim</h1>
        <p className="mt-2 text-ink-soft">
          Platform informasi kesiapsiagaan bencana pesisir dan hutan tropis yang mengubah data multi-sumber menjadi
          rekomendasi tindakan lokal yang dapat dipahami, ditelusuri sumbernya, dan diverifikasi manusia
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {pillars.map((p) => (
          <li key={p.title} className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{p.text}</p>
          </li>
        ))}
      </ul>

      <Panel title="Batasan yang kami pegang">
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-soft">
          <li>SadarIklim bukan pengganti BMKG, BNPB, BPBD, atau Basarnas</li>
          <li>Keluaran AI tidak pernah menjadi perintah evakuasi resmi</li>
          <li>Estimasi tinggi air dari satu foto adalah perkiraan visual dengan ketidakpastian tinggi</li>
          <li>Koridor asap bersifat indikatif dan bukan model dispersi atmosfer</li>
          <li>Tidak ada donasi yang diproses di SadarIklim</li>
        </ul>
      </Panel>

      <p className="text-sm text-muted">
        Ingin mencoba tanpa menunggu kondisi cuaca nyata? Buka{" "}
        <Link href="/judge-mode" className="font-semibold text-teal hover:underline">
          Judge Mode
        </Link>
      </p>
    </div>
  );
}
