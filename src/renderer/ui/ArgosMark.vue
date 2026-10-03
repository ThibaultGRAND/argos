<script setup lang="ts">
/**
 * Symbole d'Argos « Vesica » (brand/argos-symbole.svg) : œil en deux arcs, frise verticale, pupille-snapshot.
 * Couleur du texte courant (suit le thème). Grille 48, trait 3,2, angles en onglet ; jamais dans une forme (brandbook).
 */
</script>

<template>
  <svg class="mark" viewBox="0 0 48 48" role="img" aria-label="Argos">
    <path
      d="M3 24 A27 27 0 0 1 45 24 A27 27 0 0 1 3 24 Z"
      fill="none"
      stroke="currentColor"
      stroke-width="3.2"
      stroke-linejoin="miter"
      stroke-miterlimit="10"
    />
    <line x1="24" y1="1" x2="24" y2="11" stroke="currentColor" stroke-width="3.2" />
    <line x1="24" y1="37" x2="24" y2="47" stroke="currentColor" stroke-width="3.2" />
    <rect x="17" y="17" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" />
    <rect x="21.5" y="21.5" width="5" height="5" fill="currentColor" />
  </svg>
</template>

<style scoped>
.mark {
  width: 18px;
  height: 18px;
  color: var(--tx);
}
</style>
