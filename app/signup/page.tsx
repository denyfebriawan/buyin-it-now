import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/signup-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage() {
  // Same reasoning as the login page: check the user, not just the cookie.
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <SignupForm />
    </div>
  );
}
