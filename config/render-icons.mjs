/**
 * Génère les icônes de l'app à partir de brand/argos-icone-app.svg, avec une vraie transparence :
 *  - build/icon.png     : 1024 px, dessin pleine page (Windows, Linux) ;
 *  - build/icon-mac.png : 1024 px, dessin réduit à 824 px au centre (grille des icônes macOS).
 * Lancement : `npm run icons` (rendu par Electron dans une fenêtre invisible et transparente).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow } from 'electron'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'brand', 'argos-icone-app.svg'), 'utf8').replace(
  /<metadata>[\s\S]*?<\/metadata>/,
  '',
)
const SIZE = 1024
const MAC_ARTWORK = 824

function page(svg, artwork) {
  const offset = (SIZE - artwork) / 2
  return `<!doctype html><html><head><style>
    html, body { margin: 0; width: ${SIZE}px; height: ${SIZE}px; background: transparent; overflow: hidden; }
    svg { position: absolute; left: ${offset}px; top: ${offset}px; width: ${artwork}px; height: ${artwork}px; }
  </style></head><body>${svg}</body></html>`
}

async function render(window, artwork, output) {
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(page(source, artwork))}`)
  await new Promise((resolve) => setTimeout(resolve, 300))
  const image = await window.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  const resized = image.getSize().width === SIZE ? image : image.resize({ width: SIZE, height: SIZE, quality: 'best' })
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, resized.toPNG())
  console.log(`${output} (${resized.getSize().width} px)`)
}

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  // Une seule fenêtre invisible et transparente pour les deux rendus.
  const window = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true },
  })
  try {
    await render(window, SIZE, join(root, 'build', 'icon.png'))
    await render(window, MAC_ARTWORK, join(root, 'build', 'icon-mac.png'))
    app.exit(0)
  } catch (error) {
    console.error(error)
    app.exit(1)
  }
})
