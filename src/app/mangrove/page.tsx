import type { Metadata } from "next";
import { RoleGate } from "@/components/role-gate";
import { MangrovePage } from "@/features/mangrove-audit/mangrove-page";

export const metadata: Metadata = { title: "Eco-Audit mangrove" };

export default function Page() {
  return (
    <RoleGate>
      <MangrovePage />
    </RoleGate>
  );
}
