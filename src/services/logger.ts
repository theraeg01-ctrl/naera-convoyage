/**
 * Journalisation technique. Les messages détaillés restent côté serveur ;
 * l'utilisateur ne voit que des messages compréhensibles.
 */
export function logTechnicalError(context: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (process.env.NODE_ENV === "production") {
    console.error(`[naera] ${context} — ${detail}`);
    return;
  }
  console.error(`[naera] ${context}`, error);
}

export function logInfo(context: string, message: string): void {
  if (process.env.NODE_ENV !== "production") console.info(`[naera] ${context} — ${message}`);
}
