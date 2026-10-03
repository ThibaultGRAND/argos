import { app, BrowserWindow, Notification } from 'electron'
import type { AppPresence, Notifier } from '../../core/domain/ports/notifier'

/** Notifications natives du système (F14). */
export class ElectronNotifier implements Notifier {
  show(title: string, body: string, onClick: () => void): void {
    if (!Notification.isSupported()) return
    const notification = new Notification({ title, body, silent: false })
    notification.on('click', onClick)
    notification.show()
  }
}

/** Fenêtre au premier plan et badge sur l'icône (macOS, certains bureaux Linux). */
export class ElectronAppPresence implements AppPresence {
  isFocused(): boolean {
    return BrowserWindow.getFocusedWindow() !== null
  }

  setBadge(count: number): void {
    app.setBadgeCount(count)
  }
}
