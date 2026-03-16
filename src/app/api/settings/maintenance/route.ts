import { NextResponse } from "next/server";
import { getMaintenance } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const maintenance = await getMaintenance();
    return NextResponse.json({ maintenance });
  } catch {
    return NextResponse.json({ maintenance: false }, { status: 200 });
  }
}
