"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { getScenario } from "@/lib/mock/scenarios";
import { formatDateTime } from "@/lib/format";
import type { SourceStatus } from "@/lib/types";
import { cx } from "./ui";

const statusStyle: Record<SourceStatus["status"], { dot: string; label: string }> = {
  LIVE: { dot: "bg-live", label: "Live" },
  STALE: { dot: "bg-stale", label: "Data terakhir" },
  LOADING: { dot: "animate-pulse bg-muted", label: "Memuat" },
  ERROR: { dot: "bg-danger", label: "Tidak terjangkau" },
  SAMPLE: { dot: "bg-muted/60", label: "Contoh" },
  SIMULATION: { dot: "bg-sim", label: "Simulasi" },
};

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(formatDateTime(new Date().toISOString()));
    tick();
    const timer = window.setInterval(tick, 30 * 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="hidden tabular-nums text-muted sm:inline">{now}</span>;
}

function summarize(sources: SourceStatus[]): { dot: string; text: string } {
  const count = (status: SourceStatus["status"]) => sources.filter((s) => s.status === status).length;
  if (count("ERROR") > 0) return { dot: statusStyle.ERROR.dot, text: `${count("ERROR")} sumber tidak terjangkau` };
  if (count("LOADING") > 0) return { dot: statusStyle.LOADING.dot, text: "Memuat sumber data" };
  if (count("STALE") > 0) return { dot: statusStyle.STALE.dot, text: `${count("STALE")} sumber memakai data terakhir` };
  return { dot: statusStyle.LIVE.dot, text: `${count("LIVE")} sumber BMKG live` };
}

export function SourceBar() {
  const { snapshot, ready, mode, scenarioCode, resetDemo } = useAppState();
  if (!ready) return <div className="h-9 border-b border-line bg-surface" />;

  if (mode === "SIMULATION") {
    const scenario = getScenario(scenarioCode);
    return (
      <div className="bg-sim text-navy">
        <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-4 px-4 text-xs">
          <p className="flex min-w-0 items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-navy" aria-hidden />
            <span className="truncate font-semibold">
              Simulasi<span className="hidden sm:inline">, bukan peringatan resmi</span>
            </span>
            <span className="hidden truncate text-navy/75 lg:inline">{scenario?.name}</span>
          </p>
          <span className="ml-auto flex shrink-0 items-center gap-4 font-semibold">
            <Link href="/judge-mode" className="hover:underline">
              Ganti skenario
            </Link>
            <button onClick={resetDemo} className="hover:underline">
              Reset demo
            </button>
          </span>
        </div>
      </div>
    );
  }

  const summary = summarize(snapshot.sources);

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center gap-5 px-4 text-xs">
        <ul className="hidden min-w-0 items-center gap-5 xl:flex">
          {snapshot.sources.map((s) => {
            const st = statusStyle[s.status];
            const tip = [st.label, s.updatedAt && `diperbarui ${formatDateTime(s.updatedAt)}`, s.note]
              .filter(Boolean)
              .join(", ");
            return (
              <li key={s.key} className="flex items-center gap-1.5 whitespace-nowrap" title={tip}>
                <span className={cx("size-1.5 rounded-full", st.dot)} aria-hidden />
                <span className="text-ink-soft">{s.label}</span>
                <span className="text-muted">{st.label}</span>
              </li>
            );
          })}
        </ul>
        <p className="flex min-w-0 items-center gap-1.5 text-ink-soft xl:hidden">
          <span className={cx("size-1.5 shrink-0 rounded-full", summary.dot)} aria-hidden />
          <span className="truncate">{summary.text}</span>
        </p>
        <span className="ml-auto flex shrink-0 items-center gap-4">
          <Clock />
          <Link href="/sources" className="font-semibold text-teal hover:underline">
            Semua sumber
          </Link>
        </span>
      </div>
    </div>
  );
}
