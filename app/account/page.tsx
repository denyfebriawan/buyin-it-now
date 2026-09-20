import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  // Anonymous visitors never get past this line: they are redirected to /login.
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Signed in as {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
