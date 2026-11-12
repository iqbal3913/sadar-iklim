"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { demoCredentials } from "@/lib/mock/users";
import { Button, Field, Notice, Panel, inputCls } from "@/components/ui";

export default function LoginPage() {
  const { login, user, logout } = useAppState();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fill = (key: "bpbd" | "warga") => {
    setEmail(demoCredentials[key].email);
    setPassword(demoCredentials[key].password);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = Object.values(demoCredentials).find((c) => c.email === email.trim() && c.password === password);
    if (!match) {
      setError("Email atau kata sandi tidak sesuai")
      return;
    }
    login({ email: match.email, displayName: match.displayName, role: match.role });
    router.push(match.role === "bpbd_admin" ? "/command-center" : "/reports");
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:pt-10">
      <h1 className="sr-only">Masuk ke SadarIklim</h1>
      <Panel title="Masuk">
        {user ? (
          <div className="space-y-3 text-sm">
            <p>
              Masuk sebagai <strong>{user.displayName}</strong>
            </p>
            <Button variant="secondary" onClick={logout}>
              Keluar
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label="Email">
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="nama@contoh.id"
              />
            </Field>
            <Field label="Kata sandi">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              <KeyRound className="size-4" aria-hidden /> Masuk
            </Button>
          </form>
        )}
      </Panel>

      <Panel title="Akun demo untuk juri">
        <div className="space-y-3">
          <Notice tone="info">
            Akun ini hanya berisi data sintetis. Tombol di bawah mengisi kolom, lalu tekan Masuk
          </Notice>
          <button
            type="button"
            onClick={() => fill("bpbd")}
            className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-teal/50"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-canvas text-teal">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">Auto-Fill Login Petugas BPBD</span>
              <span className="block text-xs text-muted">Command Center, verifikasi laporan, katalog</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => fill("warga")}
            className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-teal/50"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-canvas text-teal">
              <UserRound className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">Auto-Fill Login Warga</span>
              <span className="block text-xs text-muted">Kirim laporan foto dan audit mangrove</span>
            </span>
          </button>
          <dl className="rounded-lg bg-canvas p-3 text-xs text-ink-soft">
            <dt className="font-semibold">Petugas</dt>
            <dd>{demoCredentials.bpbd.email} / {demoCredentials.bpbd.password}</dd>
            <dt className="mt-2 font-semibold">Warga</dt>
            <dd>{demoCredentials.warga.email} / {demoCredentials.warga.password}</dd>
          </dl>
        </div>
      </Panel>
    </div>
  );
}
