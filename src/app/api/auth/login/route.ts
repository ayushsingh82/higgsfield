import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { parseJsonBody } from "@/lib/http";

export async function POST(req: NextRequest) {
  const body = await parseJsonBody<{ email?: string; password?: string }>(req);
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ id: user.id, email: user.email, credits: user.credits });
}
