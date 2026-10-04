import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NewReviewCommentDto, ReviewCommentDto, ReviewDiffDto, ReviewRangeDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

/** État d'affichage de la review de la session ouverte (F07, refonte du 2026-10-04). */
export const useReviewStore = defineStore('review', () => {
  const sessionExternalId = ref<string | undefined>()
  const range = ref<ReviewRangeDto>({ kind: 'session' })
  const diff = ref<ReviewDiffDto | undefined>()
  const comments = ref<ReviewCommentDto[]>([])
  const loading = ref(false)
  /** Onglet affiché dans la session ; la review s'ouvre aussi depuis le panneau D et les lignes des tours. */
  const tab = ref<'report' | 'review'>('report')
  /** Fichier à montrer à l'ouverture de la review. */
  const focusFile = ref<string | undefined>()

  const pending = computed(() => comments.value.filter((comment) => comment.sentAt === null))

  async function load(externalId: string | undefined, nextRange?: ReviewRangeDto): Promise<void> {
    if (externalId !== sessionExternalId.value) range.value = { kind: 'session' }
    sessionExternalId.value = externalId
    if (nextRange !== undefined) range.value = nextRange
    if (externalId === undefined) {
      diff.value = undefined
      comments.value = []
      return
    }
    loading.value = true
    try {
      const [loadedDiff, loadedComments] = await Promise.all([
        // Copie simple : un objet réactif de Vue ne traverse pas le pont IPC.
        argos.invoke('review.diff', { sessionExternalId: externalId, range: { ...range.value } }),
        argos.invoke('review.comments.list', { sessionExternalId: externalId }),
      ])
      if (sessionExternalId.value !== externalId) return
      diff.value = unwrap<'review.diff'>(loadedDiff)
      comments.value = unwrap<'review.comments.list'>(loadedComments)
    } finally {
      loading.value = false
    }
  }

  /** Ouvre l'onglet Review sur une plage, éventuellement sur un fichier. */
  async function open(nextRange: ReviewRangeDto, file?: string): Promise<void> {
    tab.value = 'review'
    focusFile.value = file
    await load(sessionExternalId.value, nextRange)
  }

  /** Coche ou décoche « Relu » sur un fichier ; l'affichage suit tout de suite, puis la marque est enregistrée. */
  async function toggleFileReviewed(path: string): Promise<void> {
    const externalId = sessionExternalId.value
    const file = diff.value?.files.find((candidate) => candidate.path === path)
    if (externalId === undefined || file === undefined) return
    const reviewed = !file.reviewed
    file.reviewed = reviewed
    try {
      const result = reviewed
        ? await argos.invoke('review.files.mark', { sessionExternalId: externalId, path, blob: file.blob })
        : await argos.invoke('review.files.unmark', { sessionExternalId: externalId, path })
      unwrap<'review.files.mark'>(result)
    } catch (error) {
      file.reviewed = !reviewed
      throw error
    }
  }

  async function markReviewed(): Promise<void> {
    const toId = diff.value?.toId
    if (toId == null) return
    unwrap<'review.markReviewed'>(await argos.invoke('review.markReviewed', { snapshotId: toId }))
  }

  async function addComment(input: Omit<NewReviewCommentDto, 'sessionExternalId'>): Promise<void> {
    const externalId = sessionExternalId.value
    if (externalId === undefined) return
    const comment = unwrap<'review.comments.add'>(
      await argos.invoke('review.comments.add', { ...input, sessionExternalId: externalId }),
    )
    comments.value = [...comments.value, comment]
  }

  async function deleteComment(id: string): Promise<void> {
    unwrap<'review.comments.delete'>(await argos.invoke('review.comments.delete', { id }))
    comments.value = comments.value.filter((comment) => comment.id !== id)
  }

  async function send(sessionId: number): Promise<void> {
    const externalId = sessionExternalId.value
    if (externalId === undefined) return
    unwrap<'review.send'>(await argos.invoke('review.send', { sessionId, sessionExternalId: externalId }))
    comments.value = unwrap<'review.comments.list'>(
      await argos.invoke('review.comments.list', { sessionExternalId: externalId }),
    )
  }

  /** Nouvelle capture (tour, retour, relu) : la review se recalcule sur la plage choisie. */
  function watchSnapshots(): void {
    argos.on('snapshots.updated', ({ sessionExternalId: changed }) => {
      if (changed === sessionExternalId.value) void load(changed)
    })
  }

  return {
    sessionExternalId,
    range,
    diff,
    comments,
    pending,
    loading,
    tab,
    focusFile,
    load,
    open,
    toggleFileReviewed,
    markReviewed,
    addComment,
    deleteComment,
    send,
    watchSnapshots,
  }
})
