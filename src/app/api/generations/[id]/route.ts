import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const generation = await prisma.generation.findUnique({ where: { id: params.id } });
  if (!generation) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(generation);
}
