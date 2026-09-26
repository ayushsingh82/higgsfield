import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getCurrentUserId } from "@/lib/auth";
import { uploadObject, getPublicUrl } from "@/lib/storage";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

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
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: `unsupported file type "${file.type || "unknown"}" — use PNG, JPEG, or WebP` },
      { status: 400 }
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: `file too large — 10MB max, got ${(file.size / 1024 / 1024).toFixed(1)}MB` }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const key = `uploads/${userId}/${randomUUID()}.${ext}`;
  await uploadObject(key, file, file.type);

  return NextResponse.json({ url: getPublicUrl(key) }, { status: 201 });
}
