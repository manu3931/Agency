/* Two assertions, so the function tests need nothing from the network. */
export function assert(cond: unknown, msg = 'assertion failed'): asserts cond { if (!cond) throw new Error(msg); }
export function assertEquals(a: unknown, b: unknown, msg?: string): void {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(msg || `expected ${y}, got ${x}`);
}
