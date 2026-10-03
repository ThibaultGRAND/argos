export type Platform = 'darwin' | 'win32' | 'linux'

export interface AppInfo {
  readonly version: string
  readonly platform: Platform
}
