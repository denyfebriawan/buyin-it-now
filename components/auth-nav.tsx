import Link from "next/link";

import { logout } from "@/app/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

// The part of the header that depends on who is looking. This is display only:
// the real protection is requireUser() on protected pages and actions, so a
// stale header can never grant access to anything.
export async function AuthNav() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Log in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Sign up
        </Link>
      </>
    );
  }

  const firstName = user.name.split(" ")[0];

  return (
    <>
      <Link
        href="/account"
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "max-w-40",
        })}
      >
        <span className="truncate">Hi, {firstName}</span>
      </Link>
      {/* A form (a POST), never a link: see the comment on logout(). */}
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Log out
        </Button>
      </form>
    </>
  );
}
