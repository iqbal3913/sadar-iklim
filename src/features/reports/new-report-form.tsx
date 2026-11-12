"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ImagePlus, LocateFixed, Send } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { analyzePhoto } from "@/features/vision-triage/analyze";
import { VisionResultCard } from "@/features/vision-triage/vision-result-card";
import { listSamplePhotos } from "@/lib/data";
import type { Report, VisionResult } from "@/lib/types";
import { Button, Field, Notice, Panel, inputCls } from "@/components/ui";

const maxBytes = 8 * 1024 * 1024;
const allowed = ["image/jpeg", "image/png", "image/webp"];

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 640 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Kanvas tidak tersedia"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak dapat dibaca"));
    };
    img.src = url;
  });
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewReportForm() {
  const { snapshot, addReport, mode } = useAppState();
  const samples = listSamplePhotos().filter((s) => s.kind === "flood_report");
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<Report["type"]>("flood_report");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [observedAt, setObservedAt] = useState(() => toLocalInput(new Date()));
  const [lat, setLat] = useState(String(snapshot.center[0]));
  const [lng, setLng] = useState(String(snapshot.center[1]));
  const [preview, setPreview] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ai: VisionResult; id: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!allowed.includes(file.type)) {
      setError("Format foto harus JPEG, PNG, atau WebP");
      return;
    }
    if (file.size > maxBytes) {
      setError("Ukuran foto maksimum 8 MB");
      return;
    }
    try {
      setPreview(await shrink(file));
      setSampleId(undefined);
    } catch {
      setError("Foto tidak dapat dibaca. Coba foto lain");
    }
  };

  const useSample = (id: string) => {
    const s = samples.find((x) => x.id === id);
    if (!s) return;
    setSampleId(id);
    setPreview(s.src);
    if (!title) setTitle(s.title);
    if (fileRef.current) fileRef.current.value = "";
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setError("Peramban tidak mendukung lokasi")
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(5));
        setLng(p.coords.longitude.toFixed(5));
      },
      () => setError("Lokasi tidak dapat diambil. Isi koordinat secara manual"),
      { timeout: 8000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const la = Number(lat);
    const lo = Number(lng);
    if (title.trim().length < 5) return setError("Judul laporan minimal 5 karakter");
    if (!preview) return setError("Tambahkan foto atau pilih foto contoh");
    if (!Number.isFinite(la) || la < -90 || la > 90 || !Number.isFinite(lo) || lo < -180 || lo > 180) {
      return setError("Koordinat tidak valid");
    }
    setBusy(true);
    const ai = await analyzePhoto({ sampleId });
    const id = `r-${Date.now()}`;
    addReport({
      id,
      title: title.trim(),
      type,
      description: description.trim(),
      position: [la, lo],
      village: "Lokasi pelapor",
      observedAt: new Date(observedAt).toISOString(),
      submittedAt: new Date().toISOString(),
      status: "needs_review",
      severity: ai.urgency,
      reporterMasked: "Anda",
      photo: preview,
      ai,
      reviewNote: null,
      dataMode: mode === "LIVE" ? "live" : "simulation",
    });
    setResult({ ai, id });
    setBusy(false);
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Notice tone="info">
          Laporan terkirim dengan status menunggu verifikasi. Laporan ini belum menutup jalan atau menerbitkan perintah evakuasi
        </Notice>
        <VisionResultCard result={result.ai} />
        <div className="flex gap-3">
          <Link href={`/reports/${result.id}`}>
            <Button>Lihat laporan</Button>
          </Link>
          <Link href="/reports">
            <Button variant="secondary">Semua laporan</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-2" noValidate>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Buat laporan</h1>
        {mode === "SIMULATION" && <Notice tone="sim">Mode simulasi aktif. Laporan ini tersimpan sebagai simulasi</Notice>}
        <Field label="Jenis laporan">
          <select value={type} onChange={(e) => setType(e.target.value as Report["type"])} className={inputCls}>
            <option value="flood_report">Banjir atau genangan</option>
            <option value="road_damage">Kerusakan jalan</option>
            <option value="coastal_hazard">Bahaya pesisir</option>
            <option value="other">Lainnya</option>
          </select>
        </Field>
        <Field label="Judul singkat">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={inputCls} placeholder="Contoh: Jalan depan sekolah tergenang" />
        </Field>
        <Field label="Deskripsi" hint="Ceritakan kondisi singkat. Teks ini diperlakukan sebagai data, bukan instruksi">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="Waktu kejadian">
          <input type="datetime-local" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lintang">
            <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Bujur">
            <input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Button type="button" variant="secondary" onClick={locate}>
          <LocateFixed className="size-4" aria-hidden /> Gunakan lokasi saya
        </Button>
      </div>

      <div className="space-y-4 lg:pt-12">
        <Panel title="Foto">
          <div className="space-y-3">
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas p-4 text-center hover:border-teal">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pratinjau foto laporan" className="max-h-56 rounded-lg object-contain" />
              ) : (
                <>
                  <ImagePlus className="size-8 text-muted" aria-hidden />
                  <span className="text-sm font-medium">Pilih foto dari perangkat</span>
                  <span className="text-xs text-muted">JPEG, PNG, atau WebP, maksimum 8 MB</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-ink-soft">Atau pakai foto contoh</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {samples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => useSample(s.id)}
                    aria-label={`Pakai foto contoh: ${s.title}`}
                    aria-pressed={sampleId === s.id}
                    className={`overflow-hidden rounded-lg border-2 ${sampleId === s.id ? "border-teal" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.src} alt="" className="aspect-video w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          <Send className="size-4" aria-hidden /> {busy ? "Menganalisis foto" : "Kirim laporan"}
        </Button>
        <p className="text-xs text-muted">
          Foto dikirim ke server untuk dianalisis, tidak langsung dari peramban ke layanan AI. Metadata lokasi pada foto tidak ditampilkan ke publik
        </p>
      </div>
    </form>
  );
}
