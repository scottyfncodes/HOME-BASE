"use client";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { authClient } from "@/core/auth/client";
import { Button } from "@/components/ui/button";

export function SignOutButton(props: ComponentProps<typeof Button>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      {...props}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
    />
  );
}
