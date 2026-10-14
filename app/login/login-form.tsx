"use client";

import { useState, type FormEvent } from "react";

type LoginError = "invalid_body" | "invalid_credentials" | "too_many_attempts" | "network";

const messages: Record<LoginError, string> = {
  invalid_body: "Completá el email y la contraseña.",
  invalid_credentials: "Email o contraseña incorrectos.",
  too_many_attempts: "Demasiados intentos con este email. Probá de nuevo en 15 minutos.",
  network: "No se pudo entrar. El texto queda en el formulario.",
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
        Contraseña
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="error">{messages[error]}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
