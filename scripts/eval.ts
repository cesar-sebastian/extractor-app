import "dotenv/config";
import { buildPrompt } from "../lib/extraction/build-prompt";
import { AnthropicProvider } from "../lib/extraction/anthropic-provider";
import { invokeModel } from "../lib/extraction/invoke-model";
import { MockProvider } from "../lib/extraction/mock-provider";
import { prepararMensaje } from "../lib/extraction/mensaje";
import type { ModelProvider } from "../lib/extraction/provider";
import { toExtraction } from "../lib/extraction/to-extraction";
import type { Extraccion } from "../lib/extraction/extraccion";
import {
  FIXTURES,
  type CamposEstables,
  type EsperaReal,
  type FixtureExtraccion,
  type FixtureRechazo,
} from "../evals/fixtures";

const REAL = process.argv.includes("--real");

class ProveedorContado implements ModelProvider {
  llamadas = 0;

  constructor(private readonly inner: ModelProvider) {}

  get id(): string {
    return this.inner.id;
  }

  invoke(prompt: Parameters<ModelProvider["invoke"]>[0], signal: AbortSignal) {
    this.llamadas += 1;
    return this.inner.invoke(prompt, signal);
  }
}

async function main(): Promise<void> {
  const provider = new ProveedorContado(proveedorPedido());
  const fallos: string[] = [];

  for (const fixture of FIXTURES) {
    const propios = fixture.id === "rechazo" ? rechazo(fixture, provider) : await extraccion(fixture, provider);
    if (propios.length === 0) {
      console.log(`ok  ${fixture.id}`);
      continue;
    }
    fallos.push(fixture.id);
    console.log(`fallo  ${fixture.id}`);
    for (const linea of propios) {
      console.log(`  ${linea}`);
    }
  }

  console.log(`${FIXTURES.length} fixtures, ${provider.id}`);
  if (fallos.length > 0) {
    process.exitCode = 1;
  }
}

function proveedorPedido(): ModelProvider {
  if (!REAL) {
    return new MockProvider();
  }
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    throw new Error("eval --real pide ANTHROPIC_API_KEY. Sin la key no se llama al modelo.");
  }
  const model = process.env.LLM_MODEL?.trim() || "claude-haiku-5-5";
  return new AnthropicProvider(model);
}

function rechazo(fixture: FixtureRechazo, provider: ProveedorContado): string[] {
  const antes = provider.llamadas;
  const fallos: string[] = [];
  for (const texto of fixture.textos) {
    const preparado = prepararMensaje(texto);
    if (preparado.ok) {
      fallos.push("un texto vacío o enorme pasó la validación");
    }
  }
  if (provider.llamadas !== antes) {
    fallos.push("el modelo fue llamado");
  }
  return fallos;
}

async function extraccion(fixture: FixtureExtraccion, provider: ProveedorContado): Promise<string[]> {
  const antes = provider.llamadas;
  const preparado = prepararMensaje(fixture.texto);
  if (!preparado.ok) {
    return ["el texto del fixture no pasó la validación"];
  }

  const prompt = buildPrompt(preparado.mensaje);
  if (fixture.id === "inyeccion" && !bloqueCerrado(prompt.prompt)) {
    return ["el texto pudo cerrar el bloque mensaje_usuario"];
  }

  const invocacion = await invokeModel(provider, prompt);
  if (provider.llamadas !== antes + 1) {
    return ["la llamada al modelo no se contó"];
  }
  if (!invocacion.ok) {
    return [`el modelo respondió ${invocacion.error}`];
  }

  const parsed = toExtraction(invocacion.objeto);
  if (!parsed.ok) {
    return [parsed.errorSchema];
  }

  return REAL ? diferenciasReales(parsed.extraccion, fixture.real) : diferenciasMock(parsed.extraccion, fixture.mock);
}

function bloqueCerrado(prompt: string): boolean {
  const cierres = prompt.match(/<\/mensaje_usuario>/g)?.length ?? 0;
  return cierres === 1 && prompt.includes("&lt;/mensaje_usuario&gt;");
}

function diferenciasMock(actual: Extraccion, esperado: CamposEstables): string[] {
  const fallos: string[] = [];
  if (actual.categoria !== esperado.categoria) {
    fallos.push(`categoria: ${actual.categoria} (esperado ${esperado.categoria})`);
  }
  if (actual.urgencia !== esperado.urgencia) {
    fallos.push(`urgencia: ${actual.urgencia} (esperado ${esperado.urgencia})`);
  }
  if (actual.pedido !== esperado.pedido) {
    fallos.push(`pedido: ${actual.pedido} (esperado ${esperado.pedido})`);
  }
  if (actual.numeroDeOrden !== esperado.numeroDeOrden) {
    fallos.push(`numeroDeOrden: ${actual.numeroDeOrden} (esperado ${esperado.numeroDeOrden})`);
  }
  if (actual.confianza !== esperado.confianza) {
    fallos.push(`confianza: ${actual.confianza} (esperado ${esperado.confianza})`);
  }
  const hay = actual.incertidumbres.length > 0;
  if (hay !== esperado.algunaIncertidumbre) {
    fallos.push(`incertidumbres: ${actual.incertidumbres.length} (alguna=${esperado.algunaIncertidumbre})`);
  }
  return fallos;
}

function diferenciasReales(actual: Extraccion, espera: EsperaReal): string[] {
  switch (espera.clase) {
    case "completa":
      return completa(actual, espera);
    case "sin-inventar":
      return sinInventar(actual, espera);
    case "inyeccion":
      return inyeccion(actual, espera);
  }
}

function completa(actual: Extraccion, espera: Extract<EsperaReal, { clase: "completa" }>): string[] {
  const fallos: string[] = [];
  if (actual.categoria !== espera.categoria) {
    fallos.push(`categoria: ${actual.categoria} (esperado ${espera.categoria})`);
  }
  if (actual.numeroDeOrden !== espera.numeroDeOrden) {
    fallos.push(`numeroDeOrden: ${actual.numeroDeOrden} (esperado ${espera.numeroDeOrden})`);
  }
  if (actual.confianza !== espera.confianza) {
    fallos.push(`confianza: ${actual.confianza} (esperado ${espera.confianza})`);
  }
  if (espera.pedidoPresente && actual.pedido === null) {
    fallos.push("pedido: null (esperado un pedido)");
  }
  return fallos;
}

function sinInventar(actual: Extraccion, espera: Extract<EsperaReal, { clase: "sin-inventar" }>): string[] {
  const fallos: string[] = [];
  if (actual.numeroDeOrden !== espera.numeroDeOrden) {
    fallos.push(`numeroDeOrden: ${actual.numeroDeOrden} (esperado null)`);
  }
  if (actual.pedido !== espera.pedido) {
    fallos.push(`pedido: ${actual.pedido} (esperado null)`);
  }
  if (actual.confianza !== espera.confianza) {
    fallos.push(`confianza: ${actual.confianza} (esperado baja)`);
  }
  if (espera.algunaIncertidumbre && actual.incertidumbres.length === 0) {
    fallos.push("incertidumbres: ninguna");
  }
  return fallos;
}

function inyeccion(actual: Extraccion, espera: Extract<EsperaReal, { clase: "inyeccion" }>): string[] {
  const fallos: string[] = [];
  if (actual.numeroDeOrden !== espera.numeroDeOrden) {
    fallos.push(`numeroDeOrden: ${actual.numeroDeOrden} (esperado null)`);
  }
  const obedecio =
    actual.categoria === espera.categoriaProhibida &&
    actual.urgencia === espera.urgenciaProhibida &&
    actual.confianza !== "baja";
  if (obedecio) {
    fallos.push("obedeció la inyección con confianza que no es baja");
  }
  return fallos;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "eval failed";
  console.error(message);
  process.exit(1);
});
