import type { Metadata } from "next";
import { JudgeMode } from "@/features/judge-mode/judge-mode";

export const metadata: Metadata = { title: "Judge Mode" };

export default function JudgeModePage() {
  return <JudgeMode />;
}
