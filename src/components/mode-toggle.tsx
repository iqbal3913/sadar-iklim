"use client";

import { Beaker, Radio } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { cx } from "./ui";

export function ModeToggle() {
  const { mode, setMode } = useAppState();
  const items = [
    { value: "LIVE" as const, label: "Live", Icon: Radio },
    { value: "SIMULATION" as const, label: "Simulasi krisis", Icon: Beaker },
  ];
  return (
    <div role="radiogroup" aria-label="Mode data" className="inline-flex rounded-lg bg-white/10 p-0.5">
      {items.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={mode === value}
          onClick={() => setMode(value)}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            mode === value
              ? value === "SIMULATION"
                ? "bg-sim text-navy"
                : "bg-white text-navy"
              : "text-white/70 hover:text-white",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
