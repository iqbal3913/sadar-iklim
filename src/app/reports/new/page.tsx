import type { Metadata } from "next";
import { RoleGate } from "@/components/role-gate";
import { NewReportForm } from "@/features/reports/new-report-form";

export const metadata: Metadata = { title: "Buat laporan" };

export default function NewReportPage() {
  return (
    <RoleGate>
      <NewReportForm />
    </RoleGate>
  );
}
