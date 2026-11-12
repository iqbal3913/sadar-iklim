"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { listSamplePhotos, listScenarios } from "@/lib/data";
import { hazardLabel } from "@/lib/format";
import { analyzePhoto } from "@/features/vision-triage/analyze";
import { VisionResultCard } from "@/features/vision-triage/vision-result-card";
import { Button, Panel, cx } from "@/components/ui";
import type { VisionResult } from "@/lib/types";

const steps = [
  "Jalankan satu skenario simulasi di bawah, peta langsung berpindah ke lokasi skenario",
  "Buka buletin dampak dan panel bukti di sisi kanan peta",
  "Coba analisis salah satu foto contoh tanpa mengunggah file",
  "Masuk memakai akun demo untuk Command Center, verifikasi laporan, dan audit mangrove",
  "Tekan Reset demo untuk mengembalikan semuanya ke kondisi awal",
];

export function JudgeMode() {
  const { scenarioCode, mode, setScenario, resetDemo } = useAppState();
  const router = useRouter();
  const scenarios = listScenarios();
  const samples = listSamplePhotos();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, VisionResult>>({});

  const run = async (id: string) => {
    setRunning(id);
    const r = await analyzePhoto({ sampleId: id });
    setResults((prev) => ({ ...prev, [id]: r }));
    setRunning(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Judge Mode</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Uji fitur utama tanpa menunggu kondisi cuaca nyata dan tanpa file pribadi. Semua data di sini berlabel simulasi
          </p>
        </div>
        <Button variant="secondary" onClick={resetDemo}>
          <RotateCcw className="size-4" aria-hidden /> Reset demo
        </Button>
      </div>

      <Panel title="Panduan singkat">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-soft">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          <Link href="/login" className="font-semibold text-teal hover:underline">
            Halaman masuk dengan auto-fill akun demo
          </Link>
        </p>
      </Panel>

      <section aria-labelledby="skenario">
        <h2 id="skenario" className="mb-3 text-lg font-semibold">
          Skenario simulasi krisis
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {scenarios.map((s) => {
            const active = mode === "SIMULATION" && scenarioCode === s.code;
            return (
              <li
                key={s.code}
                className={cx("flex flex-col rounded-xl border bg-surface p-5", active ? "border-sim" : "border-line")}
              >
                <p className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-muted">{s.code}</span>
                  <span className={active ? "font-semibold text-sim-ink" : "text-muted"}>
                    {active ? "Sedang aktif" : hazardLabel[s.hazardType]}
                  </span>
                </p>
                <h3 className="mt-2 font-semibold">{s.name}</h3>
                <p className="mt-1 flex-1 text-sm text-ink-soft">{s.description}</p>
                <p className="mt-3 text-xs text-muted">Menguji {s.testsModules.join(" · ")}</p>
                <Button
                  variant={active ? "secondary" : "primary"}
                  className="mt-4"
                  onClick={() => {
                    setScenario(s.code);
                    router.push("/");
                  }}
                >
                  {active ? "Buka lagi di peta" : "Jalankan skenario"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="foto">
        <h2 id="foto" className="mb-1 text-lg font-semibold">
          Galeri foto uji 1-klik
        </h2>
        <p className="mb-3 text-sm text-muted">
          Hasil ditandai sebagai sampel dan tidak masuk ke antrean laporan live
        </p>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {samples.map((s) => (
            <li key={s.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt={s.title} className="aspect-video w-full object-cover" />
              <div className="space-y-3 p-4">
                <p className="text-xs text-muted">Sampel · {s.kind === "flood_report" ? "Triase banjir" : "Audit mangrove"}</p>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="text-xs text-muted">
                  {s.origin}. {s.license}
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={running === s.id}
                  onClick={() => run(s.id)}
                >
                  {running === s.id ? "Menganalisis" : "Analisis Foto Ini"}
                </Button>
                {results[s.id] && <VisionResultCard result={results[s.id]} />}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
