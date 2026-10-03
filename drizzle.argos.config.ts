import { defineConfig } from 'drizzle-kit'

/** Migrations de argos.db. Chaque migration générée est relue avant d'être appliquée (CLAUDE.md §5.2). */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/infrastructure/database/argos/schema.ts',
  out: './src/infrastructure/database/argos/migrations',
})
