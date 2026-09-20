"use server";

import { redirect } from "next/navigation";
import * as z from "zod";

import { getDummyHash, hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { createUser, getUserByEmail } from "@/lib/users";
import { LOGIN_ERROR, loginSchema, signupSchema } from "@/lib/validation/auth";

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

  await createSession(result.user.id);

  // redirect() works by throwing, so it must stay outside any try/catch.
  redirect("/");
}

// Unlike sign-up, login reports one deliberately vague message no matter what
// went wrong, so the form never reveals whether an email has an account.
export type LoginState =
  | {
      error?: string;
      values?: { email: string };
    }
  | undefined;

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const typedEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { error: LOGIN_ERROR, values: { email: typedEmail } };
  }

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);

  // Verify even when there is no such user, against a dummy hash. Skipping the
  // check would make an unknown email answer much faster than a wrong
  // password, and that timing difference would reveal which emails have accounts.
  const passwordHash = user?.passwordHash ?? (await getDummyHash());
  const passwordMatches = await verifyPassword(passwordHash, password);

  if (!user || !passwordMatches) {
    return { error: LOGIN_ERROR, values: { email: typedEmail } };
  }

  await createSession(user.id);

  redirect("/");
}
