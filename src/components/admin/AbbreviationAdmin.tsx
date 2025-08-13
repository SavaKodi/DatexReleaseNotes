import { useMemo, useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useAbbreviations } from '@/hooks/useAbbreviations'
import { deleteAbbreviation, upsertAbbreviation } from '@/lib/abbreviations/service'

export function AbbreviationAdmin() {
  const qc = useQueryClient()
  const { data, isLoading } = useAbbreviations()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const createMut = useMutation({
    mutationFn: () => upsertAbbreviation({ key, value }),
    onSuccess: () => {
      setKey('')
      setValue('')
      qc.invalidateQueries({ queryKey: ['abbreviations'] })
    },
  })
  const delMut = useMutation({
    mutationFn: (id: string) => deleteAbbreviation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abbreviations'] }),
  })

  const rows = useMemo(() => data ?? [], [data])

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">Abbreviations</div>
      <div className="flex gap-2">
        <input
          placeholder="Key (e.g., LP)"
          className="w-40 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          placeholder="Value (e.g., License Plate)"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-white"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          onClick={() => createMut.mutate()}
          disabled={!key || !value || createMut.isPending}
          className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
        >
          Add
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-400">Loading…</div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-900/60">
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-200">{r.key}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.value}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => delMut.mutate(r.id)}
                      className="rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


