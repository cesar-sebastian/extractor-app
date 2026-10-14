"use client";

import { useState, type FormEvent } from "react";

type LoginError = "invalid_body" | "invalid_credentials" | "too_many_attempts" | "network";

const messages: Record<LoginError, string> = {
  invalid_body: "Enter the email and the password.",
  invalid_credentials: "Wrong email or password.",
  too_many_attempts: "Too many attempts for this email. Try again in 15 minutes.",
  network: "Could not sign in. The text stays in the form.",
};

export function LoginForm() {
  const [error, setError] = useState<LoginError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    const password = new FormData(form).get("password");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        window.location.assign("/");
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      if (
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        (payload.error === "invalid_body" ||
          payload.error === "invalid_credentials" ||
          payload.error === "too_many_attempts")
      ) {
        setError(payload.error);
        return;
      }

      setError("network");
    } catch {
      setError("network");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <label>
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="error">{messages[error]}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
