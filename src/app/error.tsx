"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-warn-soft text-warn">
        <TriangleAlert className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-ink">Terjadi gangguan</h1>
      <p className="mt-2 text-sm text-muted">Halaman tidak dapat dimuat. Coba lagi, atau kembali ke Peta</p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-deep"
        >
          Coba lagi
        </button>
        <Link href="/" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas">
          Kembali ke Peta
        </Link>
      </div>
    </div>
  );
}
