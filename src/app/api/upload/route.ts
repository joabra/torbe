import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Inloggning krävs" }, { status: 401 });
  }
  const role = (session.user as { role?: string })?.role;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = formData.get("folder") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Ingen fil" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Ogiltigt filformat. Tillåtna: JPG, PNG, WEBP, GIF" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Filen är för stor (max 10 MB)" }, { status: 400 });
  }

  // Admins kan ladda upp till tips/, alla inloggade kan ladda upp till photos/
  const allowedFolder = role === "ADMIN" && folder === "tips" ? "tips" : "photos";

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${allowedFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
