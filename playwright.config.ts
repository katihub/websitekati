import { defineConfig, devices } from '@playwright/test'

/**
 * LES PARCOURS NAVIGATEUR PERMANENTS.
 *
 * Ils tournent contre le BUILD DE PRODUCTION (`next start`), pas contre `next
 * dev` : c'est ce que voit un client, et c'est ce que la CI construit deja.
 * Le backend est simule a la frontiere reseau (`e2e/support/api.ts`) : les
 * ecrans, leurs formulaires et les appels qu'ils emettent sont reels, les
 * reponses sont fixees. Le parcours sur vraies donnees reste celui du backend
 * (`pnpm recette:marketplace`) et de `qa/marketplace-flows.mjs`.
 *
 *   npm run build && npm run e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3311)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Africa/Douala',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'bureau', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
