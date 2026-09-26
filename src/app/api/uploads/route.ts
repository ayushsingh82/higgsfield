import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUserId } from "@/lib/auth";
import { uploadObject, getPublicUrl } from "@/lib/storage";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const key = `uploads/${userId}/${randomUUID()}.${ext}`;
  await uploadObject(key, file, file.type || "application/octet-stream");

  return NextResponse.json({ url: getPublicUrl(key) }, { status: 201 });
}
