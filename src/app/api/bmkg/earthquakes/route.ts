import { NextResponse } from "next/server";
import { getEarthquakes } from "@/lib/bmkg/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getEarthquakes());
  } catch (error) {
    return NextResponse.json(
      { status: "ERROR", message: error instanceof Error ? error.message : "Data gempa BMKG tidak dapat diambil" },
      { status: 502 },
    );
  }
}
