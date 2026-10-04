import { z } from 'zod'

/** Un tour qui a modifié des fichiers (refonte F06) : sa capture et celle qui le précède. */
export const TurnChangeSchema = z.object({
  snapshotId: z.string(),
  beforeSnapshotId: z.string(),
  /** Début de la consigne qui a lancé le tour ; `null` pour un tour enregistré avant la refonte. */
  label: z.string().nullable(),
  createdAt: z.string(),
  filesChanged: z.number().int(),
  linesAdded: z.number().int(),
  linesRemoved: z.number().int(),
})
export type TurnChangeDto = z.infer<typeof TurnChangeSchema>

export const ChangedFileSchema = z.object({
  path: z.string(),
  oldPath: z.string().nullable(),
  status: z.enum(['added', 'modified', 'deleted', 'renamed']),
  binary: z.boolean(),
  additions: z.number().int(),
  deletions: z.number().int(),
  /** Fichier de l'agent aussi modifié hors de ses tours. */
  alsoOutside: z.boolean(),
})
export type ChangedFileDto = z.infer<typeof ChangedFileSchema>

/** Panneau D. Modifications et lignes des tours dans le compte rendu. */
export const SessionChangesSchema = z.object({
  available: z.boolean(),
  tracked: z.boolean(),
  /** Première capture de la session : point de départ de « Annuler ce fichier » dans le panneau D. */
  startId: z.string().nullable(),
  agentFiles: z.array(ChangedFileSchema),
  otherFiles: z.array(ChangedFileSchema),
  truncated: z.boolean(),
  turns: z.array(TurnChangeSchema),
  /** Présent quand le dernier retour peut être annulé. */
  undoableId: z.string().nullable(),
})
export type SessionChangesDto = z.infer<typeof SessionChangesSchema>

export const RestoreInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('before-turn'), snapshotId: z.string() }),
  z.object({ kind: z.literal('session-start'), sessionExternalId: z.string() }),
  z.object({ kind: z.literal('undo'), sessionExternalId: z.string() }),
  z.object({ kind: z.literal('files'), snapshotId: z.string(), paths: z.array(z.string().max(4096)).min(1).max(200) }),
])
export type RestoreInputDto = z.infer<typeof RestoreInputSchema>

export const SnapshotsUpdatedSchema = z.object({ sessionExternalId: z.string() })
