import { ClarificationForm } from "@/components/clarification-form";
import type { ExtractionDetail as ExtractionRow } from "@/lib/db/extractions";

export function ExtractionDetail({ extraction }: { extraction: ExtractionRow }) {
  const output = extraction.output;

  return (
    <article className="stack">
      {extraction.parentId ? (
        <p>
          <a href={`/extractions/${extraction.parentId}`}>Previous message</a>
        </p>
      ) : null}
      <p>Status: {extraction.status}</p>
      <h2>Message</h2>
      <p>{extraction.inputText ?? "The text is no longer stored."}</p>
      {extraction.status === "failed" ? (
        <p className="error">{extraction.errorSchema ?? "The response could not be structured."}</p>
      ) : null}
      {output?.confidence === "low" ? (
        <p className="error">Low confidence. This is not verified. Compare it with the message.</p>
      ) : null}
      {output ? (
        <dl className="fields">
          <div>
            <dt>Summary</dt>
            <dd>{output.summary}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{output.category}</dd>
          </div>
          <div>
            <dt>Urgency</dt>
            <dd>{output.urgency}</dd>
          </div>
          <div>
            <dt>Request</dt>
            <dd>{output.request ?? "Not in the message"}</dd>
          </div>
          <div>
            <dt>Order number</dt>
            <dd>{output.orderNumber ?? "Not in the message"}</dd>
          </div>
          <div>
            <dt>Confidence</dt>
            <dd className={`confidence confidence-${output.confidence}`}>{output.confidence}</dd>
          </div>
          <div>
            <dt>Uncertainties</dt>
            <dd>
              {output.uncertainties.length === 0 ? "None" : output.uncertainties.join(", ")}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="note">
        {extraction.promptVersion} · {extraction.modelId} · {extraction.inputTokens} input tokens ·{" "}
        {extraction.outputTokens} output · {extraction.durationMs} ms
      </p>
      {extraction.inputText ? <ClarificationForm extractionId={extraction.id} /> : null}
    </article>
  );
}
