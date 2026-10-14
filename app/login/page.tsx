import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="page">
      <h1>Extractor</h1>
      <p>Sign in with the demo user.</p>
      <LoginForm />
    </main>
  );
}
