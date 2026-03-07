import { NextResponse } from "next/server";
import { getPollArchive } from "@/lib/community";

export async function GET() {
  const archive = await getPollArchive(6);
  return NextResponse.json(archive);
}
