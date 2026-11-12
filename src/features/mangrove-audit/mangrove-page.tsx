"use client";

import { useState } from "react";
import { CheckCircle2, Plus, XCircle } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { listSamplePhotos } from "@/lib/data";
import { conditionLabel, formatDate, survivalRate } from "@/lib/format";
import type { MangroveAudit } from "@/lib/types";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, Field, Notice, Panel, Pill, inputCls } from "@/components/ui";

const erosionLabel = { low: "Rendah", moderate: "Sedang", high: "Tinggi", unknown: "Belum diketahui" } as const;
const stressLabel: Record<string, string> = {
  yellowing_leaves: "Daun menguning",
  dry_leaves: "Daun kering",
  broken_stem: "Batang patah",
  exposed_roots: "Akar terbuka",
  sediment_burial: "Tertimbun sedimen",
  debris_impact: "Terkena puing",
  none_obvious: "Tidak tampak jelas",
  unclear: "Tidak jelas",
};

function AuditCard({
  audit,
  canReview,
  canRemove,
  onReview,
  onRemove,
}: {
  audit: MangroveAudit;
  canReview: boolean;
  canRemove: boolean;
  onReview: (verification: MangroveAudit["verification"]) => void;
  onRemove: () => void;
}) {
  const rate = survivalRate(audit.plantedCount, audit.survivingCount);
  return (
    <li className="overflow-hidden rounded-xl border border-line bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={audit.photo} alt={`Foto audit ${audit.plotName}`} className="aspect-video w-full object-cover" />
      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs text-muted">{audit.plotCode}</p>
          <h3 className="font-semibold">{audit.plotName}</h3>
          <p className="text-xs text-muted">{formatDate(audit.observedAt)}</p>
        </div>

        <div className="rounded-lg bg-canvas p-3">
          <p className="text-xs text-muted">Survival rate terkonfirmasi</p>
          {rate === null ? (
            <p className="text-sm font-semibold text-stale">Belum dapat dihitung, jumlah hidup belum diisi</p>
          ) : (
            <>
              <p className="text-2xl font-bold tabular-nums">{rate}%</p>
              <p className="text-xs text-muted">
                {audit.survivingCount} hidup dari {audit.plantedCount} ditanam
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Pill tone={audit.condition === "healthy_appearing" ? "ok" : audit.condition === "needs_attention" ? "warn" : "neutral"}>
            {conditionLabel[audit.condition]}
          </Pill>
          <Pill tone="neutral">Abrasi {erosionLabel[audit.erosionRisk].toLowerCase()}</Pill>
          <Pill tone={audit.verification === "verified" ? "ok" : "warn"}>
            {audit.verification === "verified" ? "Terverifikasi" : audit.verification === "pending" ? "Menunggu" : "Ditolak"}
          </Pill>
        </div>

        <div className="text-xs text-ink-soft">
          <p className="font-semibold">Taksiran visual AI</p>
          <p>
            {audit.visibleSeedlings === null ? "Jumlah bibit terlihat tidak dapat ditaksir" : `Sekitar ${audit.visibleSeedlings} bibit terlihat`}
            . Tanda tekanan: {audit.stressSigns.map((s) => stressLabel[s] ?? s).join(", ")}
          </p>
          <ul className="mt-1 list-disc pl-4 text-muted">
            {audit.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>

        {(canReview || canRemove) && (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            {canReview && audit.verification !== "verified" && (
              <Button onClick={() => onReview("verified")}>
                <CheckCircle2 className="size-4" aria-hidden /> Verifikasi
              </Button>
            )}
            {canReview && audit.verification !== "rejected" && (
              <Button variant="secondary" onClick={() => onReview("rejected")}>
                <XCircle className="size-4" aria-hidden /> Tolak
              </Button>
            )}
            {canRemove && (
              <ConfirmButton
                label="Hapus audit"
                question="Hapus audit ini secara permanen?"
                confirmLabel="Ya, hapus"
                onConfirm={onRemove}
              />
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function MangrovePage() {
  const { audits, addedAudits, addAudit, reviewAudit, removeItem, user } = useAppState();
  const isOfficer = user?.role === "bpbd_admin";
  const [open, setOpen] = useState(false);
  const mangroveSamples = listSamplePhotos().filter((s) => s.kind === "mangrove_audit");

  const [plotCode, setPlotCode] = useState("");
  const [plotName, setPlotName] = useState("");
  const [planted, setPlanted] = useState("");
  const [surviving, setSurviving] = useState("");
  const [sampleIdx, setSampleIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const plantedN = planted === "" ? null : Number(planted);
  const survivingN = surviving === "" ? null : Number(surviving);
  const liveRate = survivalRate(plantedN, survivingN);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (plotCode.trim().length < 3 || plotName.trim().length < 3) return setError("Kode dan nama plot wajib diisi");
    if (plantedN !== null && (!Number.isInteger(plantedN) || plantedN < 0)) return setError("Jumlah ditanam harus bilangan bulat 0 atau lebih");
    if (survivingN !== null && (!Number.isInteger(survivingN) || survivingN < 0)) return setError("Jumlah hidup harus bilangan bulat 0 atau lebih");
    if (survivingN !== null && plantedN === null) return setError("Isi jumlah ditanam sebagai pembagi")
    if (survivingN !== null && plantedN !== null && survivingN > plantedN) return setError("Jumlah hidup tidak boleh melebihi jumlah ditanam");
    setError(null);
    const s = mangroveSamples[sampleIdx];
    addAudit({
      id: `m-${Date.now()}`,
      plotCode: plotCode.trim(),
      plotName: plotName.trim(),
      observedAt: new Date().toISOString(),
      position: [-3.84, 102.31],
      plantedCount: plantedN,
      survivingCount: survivingN,
      verification: "pending",
      erosionRisk: s.id === "sample-mangrove-stressed" ? "moderate" : "low",
      condition: s.id === "sample-mangrove-stressed" ? "needs_attention" : "healthy_appearing",
      visibleSeedlings: s.id === "sample-mangrove-stressed" ? 12 : 18,
      stressSigns: s.id === "sample-mangrove-stressed" ? ["yellowing_leaves", "exposed_roots"] : ["none_obvious"],
      limitations: s.result.limitations,
      photo: s.src,
    });
    setOpen(false);
    setPlotCode("");
    setPlotName("");
    setPlanted("");
    setSurviving("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Eco-Audit mangrove</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            AI hanya menaksir kondisi dari foto. Survival rate dihitung dari hitungan lapangan yang dikonfirmasi
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden /> Audit baru
        </Button>
      </div>

      {open && (
        <Panel title="Audit baru">
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
            <Field label="Kode plot">
              <input value={plotCode} onChange={(e) => setPlotCode(e.target.value)} className={inputCls} placeholder="PLT-BKL-003" />
            </Field>
            <Field label="Nama plot">
              <input value={plotName} onChange={(e) => setPlotName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Bibit ditanam" hint="Pembagi survival rate">
              <input inputMode="numeric" value={planted} onChange={(e) => setPlanted(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Bibit hidup (hitungan lapangan)">
              <input inputMode="numeric" value={surviving} onChange={(e) => setSurviving(e.target.value)} className={inputCls} />
            </Field>
            <div className="md:col-span-2">
              <p className="text-sm font-medium">Foto contoh</p>
              <div className="mt-2 flex gap-3">
                {mangroveSamples.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSampleIdx(i)}
                    aria-pressed={sampleIdx === i}
                    aria-label={s.title}
                    className={`w-40 overflow-hidden rounded-lg border-2 ${sampleIdx === i ? "border-teal" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt="" className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <Notice tone="info">
                Survival rate dihitung otomatis:{" "}
                <strong>{liveRate === null ? "belum dapat dihitung" : `${liveRate}%`}</strong>. Nilai ini tidak berasal dari foto
              </Notice>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger md:col-span-2">
                {error}
              </p>
            )}
            <div className="md:col-span-2">
              <Button type="submit">
                Simpan audit
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {audits.map((a) => (
          <AuditCard
            key={a.id}
            audit={a}
            canReview={isOfficer}
            canRemove={isOfficer || addedAudits.some((x) => x.id === a.id)}
            onReview={(v) => reviewAudit(a.id, v)}
            onRemove={() => removeItem(a.id)}
          />
        ))}
      </ul>
    </div>
  );
}
