"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import type { UserRole } from "@/lib/types";

export function RoleGate({
  roles,
  children,
}: {
  roles?: UserRole[];
  children: React.ReactNode;
}) {
  const { user, ready } = useAppState();

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-xl bg-line/60" aria-busy="true" />;
  }

  if (!user) {
    return (
      <Gate
        title="Masuk untuk melanjutkan"
        text="Halaman ini memerlukan akun. Gunakan tombol isi otomatis di halaman masuk untuk akun demo"
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Gate
        title="Akses terbatas"
        text="Halaman ini hanya untuk petugas BPBD. Masuk dengan akun petugas demo untuk mencobanya"
      />
    );
  }

  return <>{children}</>;
}

function Gate({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-teal-soft text-teal">
        <Lock className="size-5" aria-hidden />
      </span>
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">{text}</p>
      <Link
        href="/login"
        className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-deep"
      >
        Ke halaman masuk
      </Link>
    </div>
  );
}
