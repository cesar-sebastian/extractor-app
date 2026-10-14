"use client";

import { useState, type FormEvent } from "react";

type FormError = "invalid_body" | "rate_limit" | "timeout" | "provider" | "sin_texto" | "network";

const messages: Record<FormError, string> = {
  invalid_body: "La aclaración tiene que entrar, junto con el mensaje, en 4000 caracteres.",
  rate_limit: "Llegaste a 10 extracciones en esta hora.",
  timeout: "El modelo no respondió a tiempo. La aclaración sigue en el formulario.",
  provider: "El modelo no respondió. La aclaración sigue en el formulario.",
  sin_texto: "El mensaje original ya no está guardado, así que no se puede aclarar.",
  network: "No se pudo enviar. La aclaración sigue en el formulario.",
};

export function AclaracionForm({ extraccionId }: { extraccionId: string }) {
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("texto");
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/extracciones/${extraccionId}/aclaraciones`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texto: text }),
      });

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      if (response.ok && isCreated(payload)) {
        window.location.assign(`/extracciones/${payload.id}`);
        return;
      }

      setError(formError(payload, response.status));
      setPending(false);
    } catch {
      setError("network");
      setPending(false);
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <h2>Aclaración</h2>
      <label>
        Sumá un dato que el mensaje no decía
        <textarea name="texto" rows={3} disabled={pending} />
      </label>
      {error ? <p className="error">{messages[error]}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Aclarando…" : "Aclarar"}
      </button>
    </form>
  );
}

function isCreated(payload: unknown): payload is { id: string } {
  return (
    payload !== null &&
    typeof payload === "object" &&
    "id" in payload &&
    typeof payload.id === "string"
  );
}

function formError(payload: unknown, status: number): FormError {
  const code =
    payload !== null && typeof payload === "object" && "error" in payload ? payload.error : undefined;
  if (
    code === "invalid_body" ||
    code === "rate_limit" ||
    code === "timeout" ||
    code === "provider" ||
    code === "sin_texto"
  ) {
    return code;
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 504) {
    return "timeout";
  }
  if (status === 409) {
    return "sin_texto";
  }
  if (status === 400) {
    return "invalid_body";
  }
  return "provider";
}