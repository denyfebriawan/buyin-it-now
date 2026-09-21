"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// A submit button that disables itself while its form is being submitted.
// useFormStatus reads the status of the nearest parent <form>, so this must be
// rendered INSIDE the form it belongs to (not in the component that renders the
// form). Only this tiny button is a Client Component; the page around it stays
// on the server.
export function SubmitButton({
  disabled,
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return <Button type="submit" disabled={disabled || pending} {...props} />;
}
