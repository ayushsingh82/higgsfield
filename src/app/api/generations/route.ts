import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { chargeCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { generateVideo, pickProviderModel } from "@/lib/videogen";
import { uploadObject, getSignedDownloadUrl } from "@/lib/storage";
import { serializeGeneration } from "@/lib/serialize";
import { GENERATION_COST } from "@/lib/constants";

export async function GET() {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const generations = await prisma.generation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(await Promise.all(generations.map(serializeGeneration)));
}

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    userId = await getCurrentUserId();
  } catch {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const prompt: string = body.prompt;
  // Storage key from POST /api/uploads, not a URL — the bucket is private,
  // so a fetchable URL is derived fresh (presigned) only when actually
  // needed, right before the generation call below, rather than stored.
  const referenceImageKey: string | undefined = body.referenceImageKey;
  const aspectRatio: string = body.aspectRatio ?? "16:9";
  const durationSec: number = body.durationSec ?? 4;

  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const { provider, model } = pickProviderModel(referenceImageKey);

  try {
    await chargeCredits(userId, GENERATION_COST);
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    throw e;
  }

  const generation = await prisma.generation.create({
    data: {
      userId,
      prompt,
      referenceImageKey: referenceImageKey ?? null,
      provider,
      model,
      aspectRatio,
      durationSec,
      creditsCost: GENERATION_COST,
      status: "PENDING",
    },
  });

  // Fired without awaiting: this is the in-process background task the
  // architecture in plan.md relies on. Requires an always-on host
  // (Render) — a serverless function would be killed before this resolves
  // on a slow (e.g. image-to-video) call.
  runGenerationJob(generation.id, { prompt, referenceImageKey }).catch((err) => {
    console.error(`generation ${generation.id} background job crashed`, err);
  });

  return NextResponse.json(await serializeGeneration(generation), { status: 202 });
}

async function runGenerationJob(generationId: string, params: { prompt: string; referenceImageKey?: string }) {
  await prisma.generation.update({ where: { id: generationId }, data: { status: "IN_PROGRESS" } });

  try {
    const referenceImageUrl = params.referenceImageKey
      ? await getSignedDownloadUrl(params.referenceImageKey)
      : undefined;
    const { video } = await generateVideo({ prompt: params.prompt, referenceImageUrl });
    const outputKey = `generations/${generationId}/${randomUUID()}.mp4`;
    await uploadObject(outputKey, video, "video/mp4");

    await prisma.generation.update({
      where: { id: generationId },
      data: { status: "COMPLETED", outputKey, completedAt: new Date() },
    });
  } catch (err) {
    const generation = await prisma.generation.update({
      where: { id: generationId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    });
    await refundCredits(generation.userId, generation.creditsCost);
  }
}
