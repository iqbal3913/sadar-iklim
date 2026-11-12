"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { listCampaigns } from "@/lib/data";
import { getScenario } from "@/lib/mock/scenarios";
import { categoryLabel, formatDate, hazardLabel } from "@/lib/format";
import type { Campaign } from "@/lib/types";
import { Button, ExternalIcon, Field, Notice, Panel, Pill, inputCls } from "@/components/ui";

interface PriceItem {
  code: string;
  name: string;
  unit: string;
  basis: "per_person_day" | "per_person" | "fixed";
  unitCostIdr: number | null;
  source: string;
}

const priceCatalog: PriceItem[] = [
  { code: "FOOD", name: "Paket pangan", unit: "paket", basis: "per_person_day", unitCostIdr: 35000, source: "Katalog harga contoh, belum diverifikasi admin" },
  { code: "WATER", name: "Air bersih", unit: "paket", basis: "per_person_day", unitCostIdr: 15000, source: "Katalog harga contoh, belum diverifikasi admin" },
  { code: "BLANKET", name: "Selimut", unit: "lembar", basis: "per_person", unitCostIdr: 45000, source: "Katalog harga contoh, belum diverifikasi admin" },
  { code: "BOAT", name: "Perahu karet", unit: "unit", basis: "fixed", unitCostIdr: null, source: "Harga belum tersedia" },
];

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function matchScore(c: Campaign, category: Campaign["category"]): number {
  if (c.category === category) return 90;
  if (c.category === "humanitarian") return 50;
  return 10;
}

export function CampaignsPage() {
  const { snapshot } = useAppState();
  const hazard = snapshot.scenarioCode ? getScenario(snapshot.scenarioCode)?.hazardType ?? "coastal_flood" : "coastal_flood";
  const category: Campaign["category"] = hazard === "wildfire" ? "wildfire" : hazard === "earthquake" ? "earthquake" : "flood";

  const [people, setPeople] = useState("150");
  const [days, setDays] = useState("3");
  const [copied, setCopied] = useState(false);

  const all = listCampaigns();
  const candidates = all.filter((c) => c.status === "active" && c.verification === "verified");
  const matches = useMemo(
    () =>
      candidates
        .map((c) => ({ c, score: matchScore(c, category) }))
        .filter((m) => m.score >= 40)
        .sort((a, b) => b.score - a.score),
    [candidates, category],
  );

  const peopleN = Math.max(0, Math.floor(Number(people) || 0));
  const daysN = Math.max(0, Math.floor(Number(days) || 0));

  const lines = priceCatalog.map((p) => {
    const qty = p.basis === "per_person_day" ? peopleN * daysN : p.basis === "per_person" ? peopleN : 1;
    const subtotal = p.unitCostIdr === null ? null : qty * p.unitCostIdr;
    return { ...p, qty, subtotal };
  });
  const known = lines.filter((l) => l.subtotal !== null);
  const total = known.reduce((sum, l) => sum + (l.subtotal ?? 0), 0);
  const incomplete = lines.some((l) => l.subtotal === null);

  const draft = `Bantuan darurat untuk ${hazardLabel[hazard].toLowerCase()} di ${snapshot.bulletin.village}, ${snapshot.bulletin.province}. Perkiraan ${peopleN} orang terdampak selama ${daysN} hari membutuhkan pangan, air bersih, dan selimut. Rincian kebutuhan dan asumsi tercantum pada kalkulator. Galang dana ini belum disetujui pihak berwenang dan belum menjanjikan jumlah penerima manfaat`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Kampanye bantuan</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Katalog dikurasi manual dan tidak diambil otomatis dari Kitabisa. SadarIklim tidak menampung atau memproses donasi
        </p>
      </div>

      <Notice tone="warn">
        Entri kampanye saat ini adalah contoh tampilan. Admin perlu mengganti dengan 10–15 kampanye nyata yang sudah dicek
      </Notice>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Kampanye yang cocok" action={<Pill tone="teal">{hazardLabel[hazard]}</Pill>}>
          {matches.length === 0 ? (
            <p className="text-sm text-muted">
              Tidak ada kampanye relevan pada katalog. Gunakan kalkulator dan draf di sebelah untuk menyusun kebutuhan awal
            </p>
          ) : (
            <ul className="space-y-3">
              {matches.map(({ c, score }) => (
                <li key={c.id} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="teal">{categoryLabel[c.category]}</Pill>
                    <Pill tone="ok">Terverifikasi {c.verifiedAt && formatDate(c.verifiedAt)}</Pill>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-ink-soft">Relevansi {score}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-muted">{c.area}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {score >= 90 ? "Kategori kampanye sesuai jenis bencana terpilih" : "Kampanye kemanusiaan umum, kecocokan sebagian"}
                  </p>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"
                  >
                    Buka halaman resmi <ExternalIcon />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Tautan eksternal pihak ketiga. Tampilan ini bukan kemitraan atau dukungan resmi Kitabisa. Skor hanya alat urut, bukan penilaian kredibilitas
          </p>
        </Panel>

        <Panel title="Kalkulator logistik awal">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Orang terdampak" hint="Isi hanya dengan estimasi bersumber">
              <input inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Durasi (hari)">
              <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <div tabIndex={0} role="region" aria-label="Tabel kebutuhan logistik, dapat digeser" className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="py-2 pr-2 font-medium">Item</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Jumlah</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Harga satuan</th>
                  <th scope="col" className="py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.code} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-2">
                      {l.name}
                      <span className="block text-xs text-muted">{l.source}</span>
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {l.qty} {l.unit}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {l.unitCostIdr === null ? <Pill tone="neutral">cost_unknown</Pill> : idr.format(l.unitCostIdr)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {l.subtotal === null ? "—" : idr.format(l.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={3} className="py-3 text-right text-sm">
                    Total{incomplete && " (belum lengkap)"}
                  </th>
                  <td className="py-3 text-right text-base font-bold tabular-nums">{idr.format(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {incomplete && (
            <p className="text-xs text-stale">Ada item tanpa harga, jadi total hanya mencakup item yang harganya diketahui</p>
          )}
        </Panel>
      </div>

      <Panel
        title="Draf narasi penggalangan dana"
        action={<Pill tone="warn">DRAF — belum disetujui BPBD atau komunitas</Pill>}
      >
        <p className="rounded-lg bg-canvas p-4 text-sm leading-relaxed text-ink-soft">{draft}</p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Tersalin" : "Salin draf"}
          </Button>
          <p className="text-xs text-muted">Penggunaan nama atau logo organisasi memerlukan izin</p>
        </div>
      </Panel>
    </div>
  );
}
