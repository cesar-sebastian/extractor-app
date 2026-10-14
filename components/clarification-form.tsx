"use client";

import { useState, type FormEvent } from "react";

type FormError = "invalid_body" | "rate_limit" | "timeout" | "provider" | "missing_text" | "network";

const messages: Record<FormError, string> = {
  invalid_body: "The clarification, together with the message, has to fit in 4000 characters.",
  rate_limit: "You reached 10 extractions this hour.",
  timeout: "The model did not answer in time. The clarification is still in the form.",
  provider: "The model did not answer. The clarification is still in the form.",
  missing_text: "The original message is no longer stored, so it cannot be clarified.",
  network: "Could not send. The clarification is still in the form.",
};

export function ClarificationForm({ extractionId }: { extractionId: string }) {
  const [error, setError] = useState<FormError | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get("text");
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/extractions/${extractionId}/clarifications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      const payload: unknown = await response.json().catch(() => null);
      if (response.ok && isCreated(payload)) {
        window.location.assign(`/extractions/${payload.id}`);
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
      <h2>Clarification</h2>
      <label>
        Add a fact the message did not state
        <textarea name="text" rows={3} disabled={pending} />
      </label>
      {error ? <p className="error">{messages[error]}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? "Clarifying…" : "Clarify"}
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
    code === "missing_text"
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
    return "missing_text";
  }
  if (status === 400) {
    return "invalid_body";
  }
  return "provider";
}
