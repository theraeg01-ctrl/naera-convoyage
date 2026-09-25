/** Lecture / écriture d'une valeur par chemin pointé (« pricing.fixedFees.0.amount »). */
export function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

export function setPath(target: object, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop();
  if (last === undefined) return;
  let current = target as Record<string, unknown>;
  for (const key of keys) {
    const next = current[key];
    if (next === null || typeof next !== "object") throw new Error(`Chemin invalide : ${path}`);
    current = next as Record<string, unknown>;
  }
  if (!(last in current)) throw new Error(`Chemin invalide : ${path}`);
  current[last] = value;
}
