import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/http";

export async function POST(req: NextRequest) {
  const body = await parseJsonBody<{ email?: string; password?: string }>(req);
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "account already exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, passwordHash } });
  await createSession(user.id);

  return NextResponse.json({ id: user.id, email: user.email, credits: user.credits }, { status: 201 });
}
