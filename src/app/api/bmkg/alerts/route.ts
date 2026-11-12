import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/bmkg/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const province = (new URL(request.url).searchParams.get("province") ?? "").slice(0, 60);
  try {
    return NextResponse.json(await getAlerts(province));
  } catch (error) {
    return NextResponse.json(
      { status: "ERROR", message: error instanceof Error ? error.message : "Peringatan dini BMKG tidak dapat diambil" },
      { status: 502 },
    );
  }
}
