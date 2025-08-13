import { useEffect, useState } from 'react'
import { ADMIN_AUTH_STORAGE_KEY, validateAdminPassword } from '@/lib/auth/admin'

type Props = {
  children: React.ReactNode
}

export function AdminGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, unlocked ? 'true' : 'false')
    } catch {}
  }, [unlocked])

  if (unlocked) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
      <div className="text-lg font-semibold">Admin Access</div>
      <input
        type="password"
        placeholder="Enter admin password"
        className="w-72 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-white"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setError(null)
            setUnlocked(validateAdminPassword(input))
            if (!validateAdminPassword(input)) setError('Wrong password')
          }
        }}
      />
      {error && <div className="text-sm text-red-400">{error}</div>}
      <button
        onClick={() => {
          setError(null)
          setUnlocked(validateAdminPassword(input))
          if (!validateAdminPassword(input)) setError('Wrong password')
        }}
        className="rounded-md border border-[#6B46C1]/40 bg-[#6B46C1]/20 px-3 py-2 text-sm text-white hover:border-[#6B46C1]/60 transition"
      >
        Unlock
      </button>
    </div>
  )
}


