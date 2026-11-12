"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

export function ConfirmButton({
  label,
  question,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button variant="secondary" onClick={() => setAsking(true)} className="text-danger">
        <Trash2 className="size-4" aria-hidden /> {label}
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label={question} className="flex flex-wrap items-center gap-2 rounded-lg bg-danger-soft px-3 py-2">
      <p className="text-sm font-medium text-danger">{question}</p>
      <Button variant="danger" onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Batal
      </Button>
    </div>
  );
}
