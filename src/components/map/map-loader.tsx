"use client";

import dynamic from "next/dynamic";

export const MapLoader = dynamic(() => import("./map-view"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-72 place-items-center rounded-xl bg-line/50 text-sm text-muted" aria-busy="true">
      Memuat peta
    </div>
  ),
});

export type { LayerKey } from "./map-view";
