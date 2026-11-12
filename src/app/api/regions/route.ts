import { NextResponse } from "next/server";
import wilayah from "@/data/wilayah.json";

const tree: Record<string, string[][]> = wilayah;

export async function GET(request: Request) {
  const parent = new URL(request.url).searchParams.get("parent") ?? "";
  if (!/^(\d{2}(\.\d{2}){0,2})?$/.test(parent)) {
    return NextResponse.json({ status: "ERROR", message: "Kode induk wilayah tidak valid" }, { status: 400 });
  }
  const items = (tree[parent] ?? []).map(([code, name]) => ({ code, name }));
  return NextResponse.json({ status: "OK", items }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
