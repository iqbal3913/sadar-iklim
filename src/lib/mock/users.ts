import type { DemoUser } from "../types";

export const demoCredentials: Record<"bpbd" | "warga", DemoUser & { password: string }> = {
  bpbd: {
    email: "petugas.demo@sadariklim.example",
    password: "demo-bpbd-2026",
    displayName: "Petugas BPBD Demo",
    role: "bpbd_admin",
  },
  warga: {
    email: "warga.demo@sadariklim.example",
    password: "demo-warga-2026",
    displayName: "Warga Demo",
    role: "citizen",
  },
};
