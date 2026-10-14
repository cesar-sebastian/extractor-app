"use client";

import { useState, type FormEvent } from "react";

type FormError = "invalid_body" | "rate_limit" | "timeout" | "provider" | "network";

const messages: Record<FormError, string> = {
  invalid_body: "El mensaje tiene que tener entre 1 y 4000 caracteres.",
  rate_limit: "Llegaste a 10 extracciones en esta hora.",
  timeout: "El modelo no respondió a tiempo. El mensaje sigue en el formulario.",
  provider: "El modelo no respondió. El mensaje sigue en el formulario.",
  network: "No se pudo enviar. El mensaje sigue en el formulario.",
};

export function ExtractionDraftForm() {
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("texto");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/extracciones", {
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
      <label>
        Mensaje del cliente
        <textarea name="texto" rows={8} disabled={pending} />
      </label>
      {error ? <p className="error">{messages[error]}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Extrayendo…" : "Extraer"}
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
    payload !== null && typeof payload === "object" && "error" in payload
      ? payload.error
      : undefined;
  if (code === "invalid_body" || code === "rate_limit" || code === "timeout" || code === "provider") {
    return code;
  }
  if (status === 429) {
    return "rate_limit";
  }
  if (status === 504) {
    return "timeout";
  }
  if (status === 400) {
    return "invalid_body";
  }
  return "provider";
}
