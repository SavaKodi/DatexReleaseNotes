export const HARDCODED_ADMIN_PASSWORD = 'Savata619' as const

export const ADMIN_AUTH_STORAGE_KEY = 'admin_unlocked'

export function validateAdminPassword(input: string): boolean {
  return input === HARDCODED_ADMIN_PASSWORD
}


