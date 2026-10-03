# Prompt — Brandbook Argos

À coller dans Claude Design, avec les fichiers SVG de ce dossier en pièces jointes.

---

Crée le brandbook d'**Argos**, une application de bureau (macOS d'abord) pour piloter des agents de code IA : Claude Code, Codex, Gemini CLI. Projet personnel et indépendant : n'utilise aucun design system existant, Argos a sa propre identité.

## Ce qu'est Argos
- Un **journal de bord et un poste de contrôle** des agents, pas un éditeur de code. On y lance des sessions, on lit ce que l'agent a fait, on reprend la main quand il attend une action, on revient à n'importe quel snapshot.
- Utilisateur : un développeur qui garde l'app ouverte toute la journée.
- Nom : Argos, le veilleur aux cent yeux de la mythologie grecque. Il surveille sans relâche et n'oublie rien.
- Personnalité : précise, sobre, fiable, calme. Le ton d'un carnet d'atelier ou d'un manuel d'ingénierie imprimé.

## Logo (validé, fourni en SVG)
- Symbole « Vesica » : un œil construit avec deux arcs de cercle (rayon 27 sur une grille de 48) qui se rejoignent en pointe. Une frise verticale le prolonge au-dessus et en dessous, sans le traverser. La pupille est un carré contour qui contient un petit carré plein : c'est le repère de snapshot utilisé dans l'app.
- Grille 48 × 48, trait de 3,2, angles en onglet (miter), aucun arrondi.
- Logotype : « Argos » en Schibsted Grotesk 700, approche −0,02 em, à droite du symbole.
- Fichiers joints : argos-symbole.svg (currentColor), argos-symbole-clair.svg, argos-symbole-sombre.svg, argos-logo-sur-sombre.svg, argos-logo-sur-clair.svg, argos-icone-app.svg, argos-icone-app-clair.svg.
- À documenter : construction sur la grille, zone de protection (proposez-la, par exemple la largeur de la pupille), taille minimale (16 px pour le symbole), versions (symbole seul, logo horizontal, icône d'app macOS), usages interdits (déformer, ajouter une couleur, un dégradé, une ombre, arrondir les angles, mettre le symbole dans un cube ou un hexagone).

## Couleurs — gris chauds, un seul accent
Thème sombre par défaut, thème clair soigné.

| Token | Sombre | Clair | Usage |
|---|---|---|---|
| --bg | #1C1A17 | #F4F0E8 | fond, page |
| --term | #161412 | #EBE5DA | blocs terminal |
| --sel | #25221E | #EBE5DA | élément sélectionné (fond) |
| --user | #2A2621 | #FBF9F4 | consigne de l'utilisateur |
| --rule | #33302B | #DCD5C8 | filet 1 px |
| --rule-strong | #4A453F | #BDB4A5 | filet fort, cadres, boutons à contour |
| --text | #ECE6DC | #1F1C18 | texte principal |
| --text-2 | #A89F93 | #5E574D | texte secondaire |
| --text-3 | #786F65 | #8A8276 | métadonnées |
| --accent | #D2694B | #A8442A | rouge brique : « Attend une action » et sélection, rien d'autre |

Statuts : En cours = point plein (texte), Attend une action = carré accent, Terminée = tiret (texte-3). Fournisseurs distingués par un pictogramme géométrique (▲ Claude, ◆ Codex, ⬢ Gemini), jamais par une couleur.

## Typographie (Google Fonts, licence libre)
- **Schibsted Grotesk** (400, 600, 700) : titres et texte.
- **IBM Plex Mono** (400, 500) : toutes les métadonnées (dates, chemins, modèles, compteurs, repères numérotés), en capitales espacées de 0,06–0,08 em pour les libellés.
- Proposez une échelle typographique pour une app de bureau (corps de 13 à 15 px, titres de session vers 30 px).

## Principes visuels
- Sensibilité de document technique imprimé : filets de 1 px plutôt qu'ombres, rayons de 2 à 4 px, angles nets.
- Repères numérotés en monospace (« A. Navigation », « 01 · 14:02 · UTILISATEUR »).
- Signature : la frise verticale des tours, avec un repère par snapshot.
- Couleur rare et utile ; beaucoup d'air autour des blocs, une information dense et alignée dedans ; chiffres alignés à droite.
- Formes isométriques réservées aux états vides, jamais décoratives.

## À éviter absolument
Violets, bleus électriques, dégradés, lueurs, glassmorphism et flou ; étincelles ✨, emojis, badges « AI » ; pilules arrondies et cartes à grand rayon avec ombre douce ; Inter ou toute sans-serif générique ; toute ressemblance avec Cursor, VSCode, ChatGPT ou Claude (pas de barre d'icônes verticale, pas d'onglets de fichiers, pas de bulles de chat) ; l'esthétique landing page.

## Livrable attendu
Un brandbook en pages (format paysage, imprimable en PDF), en français, avec le même soin éditorial que l'identité elle-même :
1. Couverture
2. Argos en une page : mission, personnalité, ton
3. Le symbole : idée, construction sur la grille, anatomie (contour, frise, pupille-snapshot)
4. Le logo : versions, zone de protection, tailles minimales, icône d'app
5. Usages interdits
6. Couleurs : tokens sombre et clair, règles de l'accent, statuts
7. Typographie : les deux familles, l'échelle, les libellés en monospace
8. Composants de base : boutons à contour, filets, repères numérotés, frise, pictogrammes fournisseurs
9. L'identité en situation : un écran de session sombre et sa version claire
10. Ton éditorial : exemples de libellés et de messages (vouvoiement, phrases courtes, pas de point d'exclamation)
