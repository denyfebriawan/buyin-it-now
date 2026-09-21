import "dotenv/config";

import { prisma } from "../lib/prisma";

// Makes an account an admin, or takes admin away again. There is deliberately no
// way to become an admin from inside the app, so this is how the first admin
// is created.
//
//   npm run db:make-admin -- someone@example.com
//   npm run db:make-admin -- someone@example.com --revoke

const USAGE = "Usage: npm run db:make-admin -- <email> [--revoke]";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();

  if (!email) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }

  const target = revoke ? "CUSTOMER" : "ADMIN";

  const outcome = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });
    if (!user) return { kind: "no-such-account" as const };
    if (user.role === target) return { kind: "already" as const, email: user.email };

    if (revoke) {
      // Lock every admin row first. Two people revoking at the same moment then
      // take turns, and the second one sees the first one's result, so the last
      // admin can never be removed by accident.
      const admins = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM users WHERE role = 'ADMIN' FOR UPDATE
      `;
      if (admins.length <= 1) return { kind: "last-admin" as const };
    }

    await tx.user.update({ where: { id: user.id }, data: { role: target } });
    return { kind: "changed" as const, email: user.email };
  });

  switch (outcome.kind) {
    case "no-such-account":
      console.error(`No account with the email ${email}.`);
      process.exitCode = 1;
      break;
    case "already":
      console.log(
        `${outcome.email} is already ${revoke ? "a customer" : "an admin"}. Nothing changed.`,
      );
      break;
    case "last-admin":
      console.error(
        `Refusing: ${email} is the last admin. Make another account an admin first, so nobody gets locked out.`,
      );
      process.exitCode = 1;
      break;
    case "changed":
      console.log(
        `${outcome.email} is now ${revoke ? "a customer" : "an admin"}.`,
      );
      break;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
