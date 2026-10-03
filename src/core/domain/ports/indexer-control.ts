/** Commandes envoyées au processus d'indexation. */
export interface IndexerControl {
  /** Vide l'index puis réimporte tout ; les données propres à Argos (argos.db) ne sont pas touchées. */
  requestRebuild(): void
}
