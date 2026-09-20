import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

// The database's unique index on email is the real duplicate check. Looking the
// email up first would leave a gap where two simultaneous sign-ups both pass
// the lookup, so we insert and translate the "unique violation" error (P2002).
export async function createUser(input: CreateUserInput) {
  try {
    const user = await prisma.user.create({
      data: input,
      // Never select passwordHash, so it cannot leak by accident.
      select: { id: true, name: true, email: true, role: true },
    });
    return { ok: true as const, user };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false as const, reason: "email-taken" as const };
    }
    throw error;
  }
}
