"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Copy, Undo2, XCircle } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { formatDateTime, statusLabel, urgencyLabel } from "@/lib/format";
import { VisionResultCard } from "@/features/vision-triage/vision-result-card";
import { ConfirmButton } from "@/components/confirm-button";
import { Button, EmptyState, Field, Pill, Panel, inputCls } from "@/components/ui";

const statusTone = {
  submitted: "neutral",
  needs_review: "warn",
  verified: "ok",
  rejected: "danger",
  duplicate: "neutral",
} as const;

export function ReportDetail({ id }: { id: string }) {
  const { snapshot, user, reviewReport, removeItem, ready } = useAppState();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  const report = snapshot.reports.find((r) => r.id === id);

  if (!ready) return <div className="h-40 animate-pulse rounded-xl bg-line/60" aria-busy="true" />;
  if (!report) {
    return (
      <div className="space-y-4">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-teal">
          <ArrowLeft className="size-4" aria-hidden /> Semua laporan
        </Link>
        <EmptyState title="Laporan tidak ditemukan" text="Laporan mungkin berada pada mode data yang berbeda" />
      </div>
    );
  }

  const canReview = user?.role === "bpbd_admin";
  const pending = report.status === "needs_review" || report.status === "submitted";
  const isOwn = report.reporterMasked === "Anda";
  const canRemove = canReview || (isOwn && pending);

  const remove = () => {
    removeItem(report.id);
    router.push("/reports");
  };

  const act = (status: "verified" | "rejected" | "duplicate" | "needs_review") => {
    if (note.trim().length < 5) {
      setNoteError("Alasan wajib diisi, minimal 5 karakter");
      return;
    }
    setNoteError(null);
    reviewReport(report.id, status, note.trim());
    setNote("");
  };

  return (
    <div className="space-y-4">
      <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-medium text-teal">
        <ArrowLeft className="size-4" aria-hidden /> Semua laporan
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.photo} alt={`Foto laporan: ${report.title}`} className="w-full rounded-xl border border-line object-cover" />
          <Panel title="Rincian laporan">
            <div className="flex flex-wrap gap-1.5">
              <Pill tone={statusTone[report.status]}>{statusLabel[report.status]}</Pill>
              <Pill tone="neutral">Tingkat {urgencyLabel[report.severity].toLowerCase()}</Pill>
              {report.dataMode === "simulation" && <Pill tone="sim">Simulasi</Pill>}
            </div>
            <h1 className="mt-2 text-lg font-bold">{report.title}</h1>
            {report.description && <p className="mt-1 text-sm text-ink-soft">{report.description}</p>}
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">Kejadian</dt>
                <dd>{formatDateTime(report.observedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Dikirim</dt>
                <dd>{formatDateTime(report.submittedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Lokasi</dt>
                <dd>{report.village}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Pelapor</dt>
                <dd>{report.reporterMasked}</dd>
              </div>
            </dl>
            {report.reviewNote && (
              <p className="mt-3 rounded-lg bg-canvas p-3 text-sm">
                <span className="font-semibold">Catatan petugas. </span>
                {report.reviewNote}
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          {report.ai ? (
            <VisionResultCard result={report.ai} />
          ) : (
            <EmptyState title="Belum ada hasil analisis" text="Foto belum dianalisis oleh AI" />
          )}

          {canReview ? (
            <Panel title="Keputusan petugas">
              <Field label="Alasan" hint="Perubahan status dicatat dalam jejak audit">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} />
              </Field>
              {noteError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {noteError}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => act("verified")}>
                  <CheckCircle2 className="size-4" aria-hidden /> Verifikasi
                </Button>
                <Button variant="danger" onClick={() => act("rejected")}>
                  <XCircle className="size-4" aria-hidden /> Tolak
                </Button>
                <Button variant="secondary" onClick={() => act("duplicate")}>
                  <Copy className="size-4" aria-hidden /> Duplikat
                </Button>
                {!pending && (
                  <Button variant="ghost" onClick={() => act("needs_review")}>
                    <Undo2 className="size-4" aria-hidden /> Kembalikan ke antrean
                  </Button>
                )}
              </div>
            </Panel>
          ) : (
            <p className="rounded-lg bg-canvas p-3 text-sm text-muted">
              Verifikasi hanya dapat dilakukan oleh petugas BPBD
            </p>
          )}

          {canRemove && (
            <Panel title={canReview ? "Hapus laporan" : "Tarik laporan"}>
              <p className="mb-3 text-sm text-ink-soft">
                {canReview
                  ? "Laporan dihapus dari daftar, peta, dan antrean verifikasi. Gunakan untuk laporan palsu, ganda, atau salah kirim"
                  : "Laporan yang belum diverifikasi dapat ditarik. Setelah ditarik, laporan hilang dari daftar dan peta"}
              </p>
              <ConfirmButton
                label={canReview ? "Hapus laporan" : "Tarik laporan"}
                question={canReview ? "Hapus laporan ini secara permanen?" : "Tarik laporan ini?"}
                confirmLabel={canReview ? "Ya, hapus" : "Ya, tarik"}
                onConfirm={remove}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
