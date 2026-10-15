import { redirect } from "next/navigation";
import { getSessionOrNull } from "@/core/auth/session";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSessionOrNull()) redirect("/home");
  return <AuthForm mode="sign-up" />;
}
