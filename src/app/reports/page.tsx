import type { Metadata } from "next";
import { ReportList } from "@/features/reports/report-list";

export const metadata: Metadata = { title: "Laporan" };

export default function ReportsPage() {
  return <ReportList />;
}
