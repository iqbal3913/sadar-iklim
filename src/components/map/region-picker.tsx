"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { Button, Field, inputCls } from "../ui";

interface Option {
  code: string;
  name: string;
}

const levels = ["Provinsi", "Kota atau kabupaten", "Kecamatan", "Kelurahan atau desa"] as const;

async function fetchChildren(parent: string): Promise<Option[]> {
  const res = await fetch(`/api/regions?parent=${encodeURIComponent(parent)}`);
  const body = await res.json().catch(() => null);
  return res.ok && body?.items ? body.items : [];
}

function prefixes(adm4: string | null): string[] {
  if (!adm4) return ["", "", "", ""];
  const parts = adm4.split(".");
  return [parts[0] ?? "", parts.slice(0, 2).join("."), parts.slice(0, 3).join("."), adm4];
}

export function RegionPicker() {
  const { adm4, setAdm4, snapshot } = useAppState();
  const current = adm4 ?? snapshot.region?.adm4 ?? null;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["", "", "", ""]);
  const [lists, setLists] = useState<Option[][]>([[], [], [], []]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const chain = prefixes(current);
    setSelected(chain);
    setLoading(true);
    let active = true;
    Promise.all(["", ...chain.slice(0, 3)].map((parent, i) => (i === 0 || parent ? fetchChildren(parent) : []))).then(
      (result) => {
        if (!active) return;
        setLists(result);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = async (level: number, code: string) => {
    setSelected((s) => s.map((v, i) => (i === level ? code : i > level ? "" : v)));
    setLists((l) => l.map((items, i) => (i > level ? [] : items)));
    if (code && level < 3) {
      const children = await fetchChildren(code);
      setLists((l) => l.map((items, i) => (i === level + 1 ? children : items)));
    }
  };

  const label = snapshot.region ? snapshot.region.village : "Pilih wilayah";

  return (
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex max-w-[11rem] items-center gap-2 rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-[var(--shadow-lift)] ring-1 ring-line hover:bg-canvas sm:max-w-[16rem]"
      >
        <MapPin className="size-4 shrink-0 text-teal" aria-hidden />
        <span className="truncate">{label}</span>
      </button>

      {open && (
        <div className="thin-scroll absolute right-0 top-full mt-2 max-h-[calc(max(65vh,400px)-4.5rem)] w-[min(20rem,calc(100vw-4rem))] space-y-3 overflow-y-auto rounded-xl lg:max-h-[calc(100dvh-12rem)] bg-surface p-4 shadow-[var(--shadow-lift)] ring-1 ring-line">
          <p className="text-xs text-muted">Prakiraan cuaca dan peringatan dini BMKG akan mengikuti wilayah yang dipilih</p>
          {levels.map((name, i) => (
            <Field key={name} label={name}>
              <select
                className={inputCls}
                value={selected[i]}
                disabled={loading || (i > 0 && !selected[i - 1])}
                onChange={(e) => choose(i, e.target.value)}
              >
                <option value="">{`Pilih ${name.toLowerCase()}`}</option>
                {lists[i].map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          ))}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setAdm4(null);
                setOpen(false);
              }}
              className="text-xs font-semibold text-muted hover:text-ink"
            >
              Wilayah bawaan
            </button>
            <Button
              type="button"
              disabled={selected[3].length !== 13}
              onClick={() => {
                setAdm4(selected[3]);
                setOpen(false);
              }}
            >
              Terapkan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
