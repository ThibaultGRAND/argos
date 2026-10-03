<script setup lang="ts">
import { computed } from 'vue'
import { argos } from '../../services/argos'
import { renderMarkdown } from '../../utils/markdown'

/** Texte Markdown d'une réponse de l'agent, habillé avec les tokens C1. */
const props = defineProps<{ text: string }>()

// Le HTML est produit par markdown-it avec le HTML brut désactivé : il ne peut contenir que du Markdown rendu.
const html = computed(() => renderMarkdown(props.text))

function onClick(event: MouseEvent): void {
  const link = (event.target as HTMLElement).closest('a[data-external]')
  if (!(link instanceof HTMLAnchorElement)) return
  event.preventDefault()
  void argos.invoke('links.open', { url: link.href })
}
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- contenu rendu par markdown-it sans HTML brut (voir utils/markdown.ts) -->
  <div class="markdown" @click="onClick" v-html="html" />
</template>

<style scoped>
.markdown {
  line-height: 1.6;
  overflow-wrap: anywhere;
  user-select: text;
}

.markdown :deep(> :first-child) {
  margin-top: 0;
}

.markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.markdown :deep(p),
.markdown :deep(ul),
.markdown :deep(ol),
.markdown :deep(pre),
.markdown :deep(table),
.markdown :deep(blockquote) {
  margin: 0 0 12px;
}

.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3),
.markdown :deep(h4) {
  margin: 20px 0 8px;
  font-weight: 600;
  line-height: 1.3;
}

.markdown :deep(h1) {
  font-size: 20px;
}

.markdown :deep(h2) {
  font-size: 17px;
}

.markdown :deep(h3),
.markdown :deep(h4) {
  font-size: 15px;
}

.markdown :deep(ul),
.markdown :deep(ol) {
  padding-left: 22px;
}

.markdown :deep(li) {
  margin: 3px 0;
}

.markdown :deep(li > p) {
  margin: 0;
}

.markdown :deep(strong) {
  font-weight: 600;
  color: var(--tx);
}

.markdown :deep(code) {
  padding: 1px 5px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--raised);
  font-family: var(--font-mono);
  font-size: 0.86em;
}

.markdown :deep(pre) {
  padding: 12px 14px;
  overflow-x: auto;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--term);
}

.markdown :deep(pre code) {
  padding: 0;
  border: 0;
  background: none;
  font-size: 12.5px;
  line-height: 1.55;
  white-space: pre;
}

.markdown :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 13px;
}

.markdown :deep(th),
.markdown :deep(td) {
  padding: 6px 12px 6px 0;
  border-bottom: 1px solid var(--rule);
  text-align: left;
  vertical-align: top;
}

.markdown :deep(th) {
  border-bottom-color: var(--rule2);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tx3);
}

.markdown :deep(blockquote) {
  padding-left: 12px;
  border-left: 2px solid var(--rule2);
  color: var(--tx2);
}

.markdown :deep(hr) {
  margin: 18px 0;
  border: 0;
  border-top: 1px solid var(--rule);
}

.markdown :deep(a) {
  color: var(--acc);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
</style>
