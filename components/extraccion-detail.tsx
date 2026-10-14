import type { ExtraccionDetalle } from "@/lib/db/extracciones";

export function ExtraccionDetail({ extraccion }: { extraccion: ExtraccionDetalle }) {
  const salida = extraccion.salida;

  return (
    <article className="stack">
      <p>Estado: {extraccion.estado}</p>
      <h2>Mensaje</h2>
      <p>{extraccion.textoEntrada ?? "El texto ya no está guardado."}</p>
      {extraccion.estado === "fallida" ? (
        <p className="error">{extraccion.errorSchema ?? "No se pudo estructurar la respuesta."}</p>
      ) : null}
      {salida ? (
        <dl className="fields">
          <div>
            <dt>Resumen</dt>
            <dd>{salida.resumen}</dd>
          </div>
          <div>
            <dt>Categoría</dt>
            <dd>{salida.categoria}</dd>
          </div>
          <div>
            <dt>Urgencia</dt>
            <dd>{salida.urgencia}</dd>
          </div>
          <div>
            <dt>Pedido</dt>
            <dd>{salida.pedido ?? "No está en el mensaje"}</dd>
          </div>
          <div>
            <dt>Número de orden</dt>
            <dd>{salida.numeroDeOrden ?? "No está en el mensaje"}</dd>
          </div>
          <div>
            <dt>Confianza</dt>
            <dd className={`confianza confianza-${salida.confianza}`}>{salida.confianza}</dd>
          </div>
          <div>
            <dt>Incertidumbres</dt>
            <dd>
              {salida.incertidumbres.length === 0
                ? "Ninguna"
                : salida.incertidumbres.join(", ")}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="note">
        {extraccion.promptVersion} · {extraccion.modelId} · {extraccion.tokensEntrada} tokens de
        entrada · {extraccion.tokensSalida} de salida · {extraccion.duracionMs} ms
      </p>
    </article>
  );
}
