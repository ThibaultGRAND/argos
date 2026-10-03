import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NewReviewCommentDto, ReviewCommentDto, ReviewDiffDto } from '@shared/contract'
import { argos, unwrap } from '../services/argos'

/** État d'affichage de la review de la session ouverte (F07). */
export const useReviewStore = defineStore('review', () => {
  const sessionExternalId = ref<string | undefined>()
  const diff = ref<ReviewDiffDto | undefined>()
  const comments = ref<ReviewCommentDto[]>([])
  const loading = ref(false)

  const pending = computed(() => comments.value.filter((comment) => comment.sentAt === null))

  async function load(externalId: string | undefined, fromId?: string, toId?: string): Promise<void> {
    sessionExternalId.value = externalId
    if (externalId === undefined) {
      diff.value = undefined
      comments.value = []
      return
    }
    loading.value = true
    try {
      const [loadedDiff, loadedComments] = await Promise.all([
        argos.invoke('review.diff', {
          sessionExternalId: externalId,
          ...(fromId === undefined ? {} : { fromId }),
          ...(toId === undefined ? {} : { toId }),
        }),
        argos.invoke('review.comments.list', { sessionExternalId: externalId }),
      ])
      if (sessionExternalId.value !== externalId) return
      diff.value = unwrap<'review.diff'>(loadedDiff)
      comments.value = unwrap<'review.comments.list'>(loadedComments)
    } finally {
      loading.value = false
    }
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

  /** Nouveau snapshot : la review se recalcule sur le dernier snapshot si l'utilisateur n'a pas choisi d'autre plage. */
  function watchSnapshots(): void {
    argos.on('snapshots.updated', ({ sessionExternalId: changed }) => {
      if (changed === sessionExternalId.value) void load(changed)
    })
  }

  return { sessionExternalId, diff, comments, pending, loading, load, addComment, deleteComment, send, watchSnapshots }
})
