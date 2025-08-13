import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { parseMultipleReleaseNotes, toSupabasePayloads, CUTOFF_DATE } from '@/lib/parser/releaseParser'
import { supabase } from '@/lib/supabase/client'

export function ParserUploader() {
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [existingVersions, setExistingVersions] = useState<Record<string, string>>({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [isReplacing, setIsReplacing] = useState(false)
  const queryClient = useQueryClient()
  const parsedList = useMemo(() => {
    try {
      return raw.trim() ? parseMultipleReleaseNotes(raw) : []
    } catch (e: any) {
      return []
    }
  }, [raw])

  // Watch parsed versions to check for existing releases
  useEffect(() => {
    const versions = Array.from(new Set(parsedList.map((p) => p.version)))
    if (versions.length > 0) {
      refreshExistingVersions(versions)
    } else {
      setExistingVersions({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedList.map((p) => p.version).join('|')])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    try {
      const decodeWithFallback = async (file: File) => {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        const hasBomUtf8 = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
        const hasBomUtf16le = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe
        const hasBomUtf16be = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff

        const tryDecode = (label: string) => {
          try {
            return new TextDecoder(label, { fatal: false, ignoreBOM: false }).decode(bytes)
          } catch {
            return null
          }
        }

        let text = ''
        if (hasBomUtf8) text = tryDecode('utf-8') ?? ''
        else if (hasBomUtf16le) text = tryDecode('utf-16le') ?? ''
        else if (hasBomUtf16be) text = tryDecode('utf-16be') ?? ''
        else text = tryDecode('utf-8') ?? ''

        const replacementCount = (text.match(/\uFFFD/g) || []).length
        if (replacementCount > Math.max(3, text.length / 200)) {
          const alt = tryDecode('windows-1252') ?? tryDecode('iso-8859-1')
          if (alt) text = alt
        }
        return text
      }

      const text = await decodeWithFallback(f)
      setRaw(text)
    } catch (err: any) {
      setError(err.message ?? 'Failed to read file')
    }
  }

  async function refreshExistingVersions(versions: string[]) {
    try {
      const { data, error: selErr } = await supabase
        .from('releases')
        .select('id, version')
        .in('version', versions)
      if (selErr) throw selErr
      const map: Record<string, string> = {}
      for (const r of data ?? []) {
        map[(r as any).version] = (r as any).id
      }
      setExistingVersions(map)
    } catch (e) {
      setExistingVersions({})
    }
  }

  async function handleSave() {
    if (!parsedList || parsedList.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      const batchId = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const payloads = toSupabasePayloads(parsedList)
      for (const payload of payloads) {
        const version = payload.release.version
        let releaseId = existingVersions[version]
        if (!releaseId) {
          const { data: releaseData, error: rErr } = await supabase
            .from('releases')
            .insert({ version: version, release_date: payload.release.release_date, upload_batch_id: batchId } as any)
            .select('*')
          if (rErr) throw rErr
          releaseId = (releaseData?.[0] as any)?.id as string
        }
        if (!releaseId) throw new Error('No release ID available')
        const itemsPayload = payload.items.map((i) => ({ ...i, release_id: releaseId!, upload_batch_id: batchId })) as any
        if (itemsPayload.length > 0) {
          const { error: iErr } = await supabase.from('release_items').insert(itemsPayload)
          if (iErr) throw iErr
        }
      }
      setRaw('')
      setFileName(null)
      refreshExistingVersions(parsedList.map((p) => p.version))
      // Refresh any cached queries showing release items
      queryClient.invalidateQueries({ queryKey: ['release-items'] })
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteExisting() {
    if (!parsedList || parsedList.length === 0) return
    setIsDeleting(true)
    setError(null)
    try {
      const versions = parsedList.map((p) => p.version)
      const { data: existing, error: selErr } = await supabase
        .from('releases')
        .select('id, version')
        .in('version', versions)
      if (selErr) throw selErr
      const ids = (existing ?? []).map((r) => (r as any).id as string)
      if (ids.length === 0) return
      // With ON DELETE CASCADE, deleting releases will also remove related items
      const { error: delReleaseErr } = await supabase.from('releases').delete().in('id', ids)
      if (delReleaseErr) throw delReleaseErr
      setExistingVersions({})
      queryClient.invalidateQueries({ queryKey: ['release-items'] })
    } catch (e: any) {
      setError(e.message ?? 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleReplaceExisting() {
    if (!parsedList || parsedList.length === 0) return
    setIsReplacing(true)
    setError(null)
    try {
      await handleDeleteExisting()
      await handleSave()
    } catch (e: any) {
      setError(e.message ?? 'Failed to replace')
    } finally {
      setIsReplacing(false)
    }
  }

  function handleExportJson() {
    if (!parsedList || parsedList.length === 0) return
    const fileBase = fileName?.replace(/\.[^.]+$/, '') || 'release-notes'
    const blob = new Blob([JSON.stringify(parsedList, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBase}-parsed.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">Release Notes Uploader</div>
      <div className="flex items-center gap-2">
        <label className="rounded-md border border-[#6B46C1]/40 bg-[#6B46C1]/20 px-3 py-2 text-sm text-white hover:border-[#6B46C1]/60 transition cursor-pointer">
          <input type="file" accept=".txt,.json,text/plain,application/json" className="hidden" onChange={handleFile} />
          Upload .txt or .json
        </label>
        {fileName && <div className="text-xs text-zinc-400">{fileName}</div>}
        <button
          onClick={handleExportJson}
          disabled={!parsedList || parsedList.length === 0}
          className="ml-auto rounded-md border border-emerald-700 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-200 hover:border-emerald-600 transition"
        >
          Export JSON
        </button>
      </div>
      <textarea
        className="w-full h-48 rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-white"
        placeholder={"Paste the release notes text here"}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={parsedList.length === 0 || isSaving}
          className="rounded-md border border-[#6B46C1]/40 bg-[#6B46C1]/20 px-3 py-2 text-sm text-white hover:border-[#6B46C1]/60 transition"
        >
          Save to DB
        </button>
        <button
          onClick={handleDeleteExisting}
          disabled={parsedList.length === 0 || isDeleting}
          className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200 hover:border-red-800 transition"
        >
          Delete existing versions
        </button>
        <button
          onClick={handleReplaceExisting}
          disabled={parsedList.length === 0 || isReplacing}
          className="rounded-md border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200 hover:border-amber-800 transition"
        >
          Replace existing versions
        </button>
      </div>
      {parsedList && parsedList.length > 0 && (
        <div className="rounded-lg border border-zinc-800 p-3 text-sm">
          <div className="text-zinc-300">Detected releases: <span className="text-white">{parsedList.length}</span> <span className="text-xs text-zinc-400">(cutoff: {CUTOFF_DATE})</span></div>
          <div className="mt-3 max-h-72 overflow-auto divide-y divide-zinc-800">
            {parsedList.map((p, i) => (
              <div key={i} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="text-white">{p.version}</div>
                  <div className="text-xs text-zinc-400">{new Date(p.releaseDate).toLocaleDateString()}</div>
                </div>
                <div className="mt-1 text-xs">
                  {existingVersions[p.version] ? (
                    <span className="text-amber-300">Already exists in DB</span>
                  ) : (
                    <span className="text-emerald-300">New</span>
                  )}
                  <span className="text-zinc-400"> • Items:</span> <span className="text-zinc-200">{p.items.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


