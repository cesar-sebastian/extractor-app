import type { PromptArmado } from "./build-prompt";
import type { InvocacionExitosa, ModelProvider } from "./provider";

// Whole word on both ends: "orden 1234" or "reorden 123" must not match,
// or the mock would report an order number the text does not contain.
const ORDEN_FIJA = /\borden\s+123\b/i;

export class MockProvider implements ModelProvider {
  readonly id = "mock";

  invoke(prompt: PromptArmado): Promise<InvocacionExitosa> {
    const tieneOrden = ORDEN_FIJA.test(prompt.prompt);
    return Promise.resolve({
      modelId: this.id,
      tokensEntrada: 0,
      tokensSalida: 0,
      objeto: {
        resumen: tieneOrden
          ? "El cliente consulta por la orden 123."
          : "El cliente escribió un mensaje de soporte.",
        categoria: tieneOrden ? "envio" : "otro",
        urgencia: "media",
        pedido: tieneOrden ? "Revisar la orden 123" : null,
        numeroDeOrden: tieneOrden ? "123" : null,
        confianza: tieneOrden ? "alta" : "baja",
        incertidumbres: tieneOrden ? [] : ["No aparece un número de orden en el mensaje"],
      },
    });
  }
}
