import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  // Already logged in, so there is nothing to do here. This checks the user
  // (not just the cookie) on purpose: a valid cookie for a deleted account
  // must not lock someone out of the login page.
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <LoginForm />
    </div>
  );
}
