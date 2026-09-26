import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { chargeCredits, refundCredits, InsufficientCreditsError } from "./credits";

let userId: string;

beforeEach(async () => {
  const user = await prisma.user.create({
    data: {
      email: `credits-test-${crypto.randomUUID()}@example.com`,
      passwordHash: "not-a-real-hash",
      credits: 20,
    },
  });
  userId = user.id;
});

afterEach(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("chargeCredits / refundCredits", () => {
  it("deducts credits when the balance covers the cost", async () => {
    await chargeCredits(userId, 10);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(10);
  });

  it("throws InsufficientCreditsError and leaves the balance untouched when it doesn't", async () => {
    await expect(chargeCredits(userId, 21)).rejects.toBeInstanceOf(InsufficientCreditsError);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(20);
  });

  it("cannot be charged down to a negative balance even at exactly the boundary", async () => {
    await chargeCredits(userId, 20); // exactly the full balance — should succeed
    let user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(0);

    await expect(chargeCredits(userId, 1)).rejects.toBeInstanceOf(InsufficientCreditsError);
    user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(0);
  });

  it("refund puts the balance back", async () => {
    await chargeCredits(userId, 10);
    await refundCredits(userId, 10);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(20);
  });

  it("never goes negative under concurrent over-charging (the atomicity claim this whole thing rests on)", async () => {
    // Balance is 20; fire ten concurrent charges of 3 each (30 total demand
    // against 20 available). At most 6 can succeed (6*3=18 <= 20 < 7*3=21).
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => chargeCredits(userId, 3))
    );
    const succeeded = attempts.filter((a) => a.status === "fulfilled").length;
    const failed = attempts.filter(
      (a) => a.status === "rejected" && a.reason instanceof InsufficientCreditsError
    ).length;

    expect(succeeded).toBeLessThanOrEqual(6);
    expect(succeeded + failed).toBe(10);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.credits).toBe(20 - succeeded * 3);
    expect(user.credits).toBeGreaterThanOrEqual(0);
  });
});
