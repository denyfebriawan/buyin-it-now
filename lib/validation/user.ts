import * as z from "zod";

// A Postgres INTEGER holds at most 2^31 - 1.
const MAX_INT = 2_147_483_647;

// Turns a user id from the URL ("12", a "before" pagination bookmark) into 12.
// Anything else ("abc", "0", "-1", "1.5", a number too big for the database)
// returns null, which the page treats as "no such user" or "no bookmark".
export function parseUserId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= MAX_INT ? id : null;
}

// The promote/demote forms send only which user. Digits only, same rule as
// every other id field in the app.
export const userIdSchema = z.object({
  userId: z
    .string({ error: "Invalid user." })
    .regex(/^\d+$/, "Invalid user.")
    .transform(Number)
    .pipe(z.number().min(1, "Invalid user.").max(MAX_INT, "Invalid user.")),
});
