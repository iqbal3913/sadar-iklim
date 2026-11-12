import type { Metadata } from "next";
import { RoleGate } from "@/components/role-gate";
import { CommandCenter } from "@/features/command-center/command-center";

export const metadata: Metadata = { title: "Command Center" };

export default function CommandCenterPage() {
  return (
    <RoleGate roles={["bpbd_admin"]}>
      <CommandCenter />
    </RoleGate>
  );
}
