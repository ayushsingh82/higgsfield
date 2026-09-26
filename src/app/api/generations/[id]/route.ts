import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { serializeGeneration } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const generation = await prisma.generation.findUnique({ where: { id } });
  if (!generation || generation.userId !== userId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(serializeGeneration(generation));
}
