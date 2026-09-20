import type { Metadata } from "next";

import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <SignupForm />
    </div>
  );
}
