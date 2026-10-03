import en from './en.json'
import fr from './fr.json'

/** Le français est la référence : l'anglais doit avoir exactement les mêmes clés (test de parité). */
export type MessageSchema = typeof fr

export const catalogs: Readonly<Record<'fr' | 'en', MessageSchema>> = { fr, en }
