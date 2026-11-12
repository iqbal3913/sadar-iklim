"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { cx } from "./ui";
import { ModeToggle } from "./mode-toggle";
import { LogoMark } from "./logo";

const links = [
  { href: "/", label: "Peta" },
  { href: "/reports", label: "Laporan" },
  { href: "/mangrove", label: "Mangrove" },
  { href: "/campaigns", label: "Kampanye" },
  { href: "/command-center", label: "Command Center" },
  { href: "/judge-mode", label: "Judge Mode" },
];

export function Header() {
  const pathname = usePathname();
  const { user, logout, ready } = useAppState();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
    <header
      className={cx(
        "sticky top-0 z-[1000] text-white transition-[background-color,box-shadow] duration-300",
        scrolled || open
          ? "bg-teal-deep/80 shadow-[0_8px_24px_-12px_rgba(15,43,42,0.55)] backdrop-blur-md backdrop-saturate-150"
          : "bg-navy",
      )}
    >
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-8 px-4">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
          <LogoMark className="size-9 shrink-0" />
          <span>
            Sadar<span className="text-[#14b8a6]">Iklim</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden h-full items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cx(
                "relative flex h-full items-center px-3 text-sm transition-colors",
                isActive(l.href) ? "font-semibold text-white" : "text-white/65 hover:text-white",
              )}
            >
              {l.label}
              {isActive(l.href) && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-[#14b8a6]" aria-hidden />}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block">
            <ModeToggle />
          </div>
          {ready && user ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-right text-xs leading-tight">
                <span className="block font-semibold text-white">{user.displayName}</span>
                <span className="block text-white/60">{user.role === "bpbd_admin" ? "Petugas BPBD" : "Warga"}</span>
              </span>
              <button
                onClick={logout}
                aria-label="Keluar"
                className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-navy hover:bg-teal-soft md:inline-block"
            >
              Masuk
            </Link>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-seluler"
            aria-label="Buka menu"
            className="grid size-9 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

    </header>

      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cx(
          "fixed inset-0 z-[1100] bg-navy/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        id="menu-seluler"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        className={cx(
          "fixed inset-y-0 left-0 z-[1200] flex w-[min(84vw,320px)] flex-col bg-navy text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-4">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <LogoMark className="size-9 shrink-0" />
            <span>
              Sadar<span className="text-[#14b8a6]">Iklim</span>
            </span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
            className="grid size-9 place-items-center rounded-lg text-white hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 px-1 sm:hidden">
            <ModeToggle />
          </div>
          <nav aria-label="Navigasi seluler" className="grid gap-0.5">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "rounded-lg px-3 py-3 text-sm",
                  isActive(l.href) ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/10",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="shrink-0 border-t border-white/10 px-4 py-4 text-sm">
          {ready && user ? (
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-semibold">{user.displayName}</span>
                <span className="block text-xs text-white/60">{user.role === "bpbd_admin" ? "Petugas BPBD" : "Warga"}</span>
              </span>
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                aria-label="Keluar"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg bg-white px-3.5 py-2.5 text-center font-semibold text-navy hover:bg-teal-soft"
            >
              Masuk
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
