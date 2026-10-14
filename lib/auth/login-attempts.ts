// Failed logins per email, in memory. Same limit as the extraction counter:
// with two processes each one keeps its own count.
const MAX_FALLOS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fallos = new Map<string, number[]>();

function recientes(email: string, now: number): number[] {
  const lista = (fallos.get(email) ?? []).filter((at) => now - at < WINDOW_MS);
  if (lista.length === 0) {
    fallos.delete(email);
  } else {
    fallos.set(email, lista);
  }
  return lista;
}

export function loginBloqueado(email: string, now = Date.now()): boolean {
  return recientes(email, now).length >= MAX_FALLOS;
}

export function registrarFallo(email: string, now = Date.now()): void {
  fallos.set(email, [...recientes(email, now), now]);
}

export function limpiarFallos(email: string): void {
  fallos.delete(email);
}
