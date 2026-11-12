import { NextResponse } from "next/server";
import { getForecast } from "@/lib/bmkg/client";
import { envConfig } from "@/lib/env-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const adm4 = new URL(request.url).searchParams.get("adm4") ?? envConfig.bmkgAdm4;
  if (!/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/.test(adm4)) {
    return NextResponse.json({ status: "ERROR", message: "Kode wilayah adm4 tidak valid" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getForecast(adm4));
  } catch (error) {
    return NextResponse.json(
      { status: "ERROR", message: error instanceof Error ? error.message : "Prakiraan BMKG tidak dapat diambil" },
      { status: 502 },
    );
  }
}
