<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DiffLineDto, FileDiffDto, ReviewCommentDto } from '@shared/contract'
import { openInEditor } from '../../services/editor'
import { useNoticesStore } from '../../stores/notices'
import { useReviewStore } from '../../stores/review'
import { joinProjectPath } from '../../utils/format'

/**
 * Diff d'un fichier : numéros de ligne avant / après, commentaires sur une ligne (F07), « Annuler ce fichier ».
 * `snapshotId` nul : fichier non commentable (autres modifications).
 */
const props = defineProps<{ file: FileDiffDto; projectPath: string; snapshotId: string | null; restorable: boolean }>()
const emit = defineEmits<{ restore: [] }>()
const { t } = useI18n()
const review = useReviewStore()
const notices = useNoticesStore()

const open = ref(true)
const editing = ref<string | undefined>()
const draft = ref('')

const lineKey = (line: DiffLineDto): string => (line.type === 'del' ? `old:${line.oldNumber}` : `new:${line.newNumber}`)

const commentsByLine = computed(() => {
  const map = new Map<string, ReviewCommentDto[]>()
  for (const comment of review.comments) {
    if (comment.filePath !== props.file.path) continue
    const key = `${comment.side}:${comment.line}`
    map.set(key, [...(map.get(key) ?? []), comment])
  }
  return map
})

function startComment(line: DiffLineDto): void {
  editing.value = lineKey(line)
  draft.value = ''
}

function saveComment(line: DiffLineDto): void {
  const body = draft.value.trim()
  const snapshotId = props.snapshotId
  const number = line.type === 'del' ? line.oldNumber : line.newNumber
  if (body === '' || snapshotId === null || number === null) return
  void notices.attempt(async () => {
    await review.addComment({
      snapshotId,
      filePath: props.file.path,
      line: number,
      side: line.type === 'del' ? 'old' : 'new',
      excerpt: line.text,
      body,
    })
    editing.value = undefined
    draft.value = ''
  })
}

function onDraftKeydown(event: KeyboardEvent, line: DiffLineDto): void {
  if (event.key === 'Escape') editing.value = undefined
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) saveComment(line)
}

function openAt(line?: number): void {
  if (props.file.status === 'deleted') return
  void notices.attempt(() => openInEditor(joinProjectPath(props.projectPath, props.file.path), line))
}
</script>

<template>
  <section class="file">
    <header class="file__header">
      <button type="button" class="file__toggle" :aria-expanded="open" @click="open = !open">
        <span class="file__caret" aria-hidden="true">{{ open ? '▾' : '▸' }}</span>
        <span class="file__path">
          <template v-if="file.oldPath">{{ file.oldPath }} → </template>{{ file.path }}
        </span>
      </button>
      <span class="file__status" :class="`file__status--${file.status}`">{{ t(`review.status.${file.status}`) }}</span>
      <span class="file__delta"
        ><span class="file__add">+{{ file.additions }}</span> −{{ file.deletions }}</span
      >
      <button v-if="file.status !== 'deleted'" type="button" class="file__open" @click="openAt()">
        {{ t('review.openFile') }}
      </button>
      <button v-if="restorable" type="button" class="file__open file__open--danger" @click="emit('restore')">
        {{ t('snapshots.restoreFile') }}
      </button>
    </header>
    <p v-if="file.alsoOutside" class="file__mention">{{ t('snapshots.alsoOutside') }}</p>

    <div v-if="open" class="file__body">
      <p v-if="file.binary" class="file__note">{{ t('review.binary') }}</p>
      <table v-else class="diff">
        <tbody v-for="(hunk, hunkIndex) in file.hunks" :key="hunkIndex">
          <tr class="diff__hunk">
            <td colspan="4">@@ −{{ hunk.oldStart }} +{{ hunk.newStart }} @@ {{ hunk.section }}</td>
          </tr>
          <template v-for="(line, lineIndex) in hunk.lines" :key="`${hunkIndex}-${lineIndex}`">
            <tr class="diff__line" :class="`diff__line--${line.type}`">
              <td class="diff__number">{{ line.oldNumber ?? '' }}</td>
              <td
                class="diff__number diff__number--link"
                :title="line.newNumber === null ? undefined : t('review.lineTitle', { line: line.newNumber })"
                @click="line.newNumber !== null && openAt(line.newNumber)"
              >
                {{ line.newNumber ?? '' }}
              </td>
              <td class="diff__gutter">
                <button
                  v-if="snapshotId !== null"
                  type="button"
                  class="diff__add-comment"
                  :title="t('review.addComment')"
                  :aria-label="t('review.addComment')"
                  @click="startComment(line)"
                >
                  +
                </button>
                <span class="diff__marker">{{ line.type === 'add' ? '+' : line.type === 'del' ? '−' : '' }}</span>
              </td>
              <td class="diff__text">{{ line.text }}</td>
            </tr>
            <tr v-for="comment in commentsByLine.get(lineKey(line)) ?? []" :key="comment.id" class="diff__comment-row">
              <td colspan="4">
                <div class="comment" :class="{ 'comment--sent': comment.sentAt !== null }">
                  <p class="comment__body">{{ comment.body }}</p>
                  <span v-if="comment.sentAt !== null" class="comment__sent">{{ t('review.sent') }}</span>
                  <button
                    v-else
                    type="button"
                    class="comment__delete"
                    @click="notices.attempt(() => review.deleteComment(comment.id))"
                  >
                    {{ t('review.delete') }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="editing === lineKey(line)" class="diff__comment-row">
              <td colspan="4">
                <div class="comment comment--editing">
                  <textarea
                    v-model="draft"
                    class="comment__field"
                    rows="3"
                    autofocus
                    :placeholder="t('review.commentPlaceholder')"
                    @keydown="onDraftKeydown($event, line)"
                  />
                  <div class="comment__actions">
                    <button type="button" class="comment__button" @click="editing = undefined">
                      {{ t('review.cancel') }}
                    </button>
                    <button
                      type="button"
                      class="comment__button comment__button--primary"
                      :disabled="draft.trim() === ''"
                      @click="saveComment(line)"
                    >
                      {{ t('review.save') }}
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <p v-if="file.truncated" class="file__note">{{ t('review.truncatedFile') }}</p>
    </div>
  </section>
</template>

<style scoped>
.file {
  margin: 14px 0;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

.file__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--rule);
  background: var(--raised);
  font-family: var(--font-mono);
  font-size: 12px;
}

.file__toggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.file__caret,
.file__delta,
.file__open {
  color: var(--tx3);
}

.file__path {
  overflow: hidden;
  color: var(--tx);
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: text;
}

.file__status {
  padding: 0 6px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  font-size: 10px;
  text-transform: uppercase;
  color: var(--tx2);
}

.file__status--deleted {
  border-color: var(--acc);
  color: var(--acc);
}

.file__add {
  color: var(--code-string);
}

.file__open {
  border: 0;
  background: none;
  font: inherit;
  cursor: pointer;
}

.file__open:hover {
  color: var(--tx);
}

.file__open--danger:hover {
  color: var(--acc);
}

.file__mention {
  margin: 0;
  padding: 4px 12px;
  border-bottom: 1px solid var(--rule);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--caution);
}

.file__note {
  margin: 0;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--tx3);
}

.file__body {
  overflow-x: auto;
}

.diff {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.diff__hunk td {
  padding: 2px 12px;
  background: var(--term);
  color: var(--tx3);
}

.diff__number {
  width: 1%;
  padding: 0 8px;
  color: var(--tx3);
  text-align: right;
  white-space: nowrap;
  user-select: none;
}

.diff__number--link {
  cursor: pointer;
}

.diff__number--link:hover {
  color: var(--acc);
}

.diff__gutter {
  position: relative;
  width: 1%;
  padding: 0 6px 0 4px;
  white-space: nowrap;
}

.diff__marker {
  color: var(--tx3);
}

.diff__add-comment {
  position: absolute;
  left: -10px;
  display: none;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: var(--radius);
  background: var(--acc);
  color: var(--bg);
  font-weight: 600;
  line-height: 18px;
  cursor: pointer;
}

.diff__line:hover .diff__add-comment {
  display: inline-block;
}

.diff__text {
  padding-right: 12px;
  white-space: pre;
  user-select: text;
}

.diff__line--add {
  background: color-mix(in srgb, var(--code-string) 24%, transparent);
}

.diff__line--del {
  background: color-mix(in srgb, var(--acc) 20%, transparent);
}

.diff__comment-row td {
  padding: 6px 12px 6px 80px;
  background: var(--bg);
}

.comment {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid var(--rule2);
  border-left: 2px solid var(--acc);
  border-radius: var(--radius);
  background: var(--raised);
  font-family: var(--font-text);
  font-size: 13px;
}

.comment--sent {
  border-left-color: var(--rule2);
  opacity: 0.75;
}

.comment--editing {
  flex-direction: column;
  align-items: stretch;
}

.comment__body {
  flex: 1;
  margin: 0;
  white-space: pre-wrap;
  user-select: text;
}

.comment__sent,
.comment__delete {
  border: 0;
  background: none;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--tx3);
}

.comment__delete {
  cursor: pointer;
}

.comment__delete:hover {
  color: var(--acc);
}

.comment__field {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--input);
  font: inherit;
  resize: vertical;
  user-select: text;
}

.comment__actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.comment__button {
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--rule2);
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.comment__button--primary {
  border-color: var(--acc);
  background: var(--acc);
  color: var(--bg);
}

.comment__button:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
