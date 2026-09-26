import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { chargeCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { generateVideo, pickProviderModel } from "@/lib/videogen";
import { uploadObject } from "@/lib/storage";

const GENERATION_COST = 10;

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  const body = await req.json();
  const prompt: string = body.prompt;
  const referenceImageUrl: string | undefined = body.referenceImageUrl;
  const aspectRatio: string = body.aspectRatio ?? "16:9";
  const durationSec: number = body.durationSec ?? 4;

  if (!prompt) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

  const { provider, model } = pickProviderModel(referenceImageUrl);

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
      referenceImageKey: referenceImageUrl ?? null,
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
  // (Railway/Render/Fly.io) — a serverless function would be killed before
  // this resolves on a slow (e.g. image-to-video) call.
  runGenerationJob(generation.id, { prompt, referenceImageUrl }).catch((err) => {
    console.error(`generation ${generation.id} background job crashed`, err);
  });

  return NextResponse.json(generation, { status: 202 });
}

async function runGenerationJob(generationId: string, params: { prompt: string; referenceImageUrl?: string }) {
  await prisma.generation.update({ where: { id: generationId }, data: { status: "IN_PROGRESS" } });

  try {
    const { video } = await generateVideo(params);
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
