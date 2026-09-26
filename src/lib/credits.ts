import { prisma } from "./db";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credits");
  }
}

/** Atomically checks and deducts credits; throws InsufficientCreditsError if the user can't afford `cost`. */
export async function chargeCredits(userId: string, cost: number): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: cost } },
    data: { credits: { decrement: cost } },
  });
  if (count === 0) throw new InsufficientCreditsError();
}

export async function refundCredits(userId: string, cost: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: cost } },
  });
}
