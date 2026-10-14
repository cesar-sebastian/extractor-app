import type { PromptArmado } from "./build-prompt";
import type { InvocacionExitosa, ModelProvider } from "./provider";

const ORDEN_FIJA = "orden 123";

export class MockProvider implements ModelProvider {
  readonly id = "mock";

  invoke(prompt: PromptArmado): Promise<InvocacionExitosa> {
    const tieneOrden = prompt.prompt.toLowerCase().includes(ORDEN_FIJA);
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
