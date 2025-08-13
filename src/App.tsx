import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { AppShell } from '@/components/layout/AppShell'
import { AnimatedBackground } from '@/components/layout/AnimatedBackground'
import { useState } from 'react'
import type { SearchFilters } from '@/types/search'
import { DefaultFilters } from '@/types/search'
import { SearchPanel } from '@/components/search/SearchPanel'
import { ResultsPanel } from '@/components/results/ResultsPanel'
import { AbbreviationAdmin } from '@/components/admin/AbbreviationAdmin'
import { ParserUploader } from '@/components/admin/ParserUploader'
import { AdminGate } from '@/components/admin/AdminGate'

function App() {
  const [filters, setFilters] = useState<SearchFilters>(DefaultFilters)
  const [tab, setTab] = useState<'search' | 'admin'>('search')
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AnimatedBackground>
        <div className="min-h-screen text-white">
          <header className="px-4 py-5 md:px-8 sticky top-0 z-10 glass-panel border border-[#6B46C1]/10 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={"/2025_Datex_Purple.png"}
                    alt="Datex logo"
                    className="h-8 w-auto object-contain select-none pointer-events-none drop-shadow-[0_6px_20px_rgba(107,70,193,0.35)] animate-logo-float"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: '#cdb7ff' }}>
                    Release Notes
                  </h1>
                </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab('search')}
                  className={`rounded-md px-4 py-2 text-sm border transition backdrop-blur-sm ${tab === 'search' ? 'border-[#6B46C1]/50 bg-[#6B46C1]/20 text-white shadow-[0_0_0_1px_rgba(107,70,193,0.15)]' : 'border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:border-zinc-700'}`}
                >
                  Search
                </button>
                <button
                  onClick={() => setTab('admin')}
                  className={`rounded-md px-4 py-2 text-sm border transition backdrop-blur-sm ${tab === 'admin' ? 'border-[#6B46C1]/50 bg-[#6B46C1]/20 text-white shadow-[0_0_0_1px_rgba(107,70,193,0.15)]' : 'border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:border-zinc-700'}`}
                >
                  Admin
                </button>
              </div>
            </div>
          </header>
          {tab === 'search' ? (
            <AppShell
              left={
                <SearchPanel
                  value={filters}
                  onChange={setFilters}
                  onClear={() => setFilters(DefaultFilters)}
                />
              }
              right={
                <ResultsPanel
                  filters={filters}
                  onSortChange={(s) => setFilters((f) => ({ ...f, sort: s }))}
                />
              }
            />
          ) : (
            <div className="p-4 md:p-6">
              <AdminGate>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <AbbreviationAdmin />
                  <ParserUploader />
                </div>
              </AdminGate>
            </div>
          )}
        </div>
      </AnimatedBackground>
    </ThemeProvider>
  )
}

export default App
