"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { hashPassword } from "@/lib/password";
import { createUser } from "@/lib/users";
import { signupSchema } from "@/lib/validation/auth";

// What the form receives back. It never includes the password: only the name
// and email are sent back so the user does not have to retype them.
export type SignupState =
  | {
      errors?: { name?: string[]; email?: string[]; password?: string[] };
      values?: { name: string; email: string };
    }
  | undefined;

// This function is reachable by a direct POST request, not only through our
// form, so it validates everything itself.
export async function signup(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
      },
    };
  }

  const { name, email, password } = parsed.data;
  const result = await createUser({
    name,
    email,
    passwordHash: await hashPassword(password),
  });

  if (!result.ok) {
    return {
      errors: { email: ["An account with this email already exists."] },
      values: { name, email },
    };
  }

  // redirect() works by throwing, so it must stay outside any try/catch.
  redirect("/");
}
