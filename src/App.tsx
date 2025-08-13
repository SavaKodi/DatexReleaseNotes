import { ThemeProvider } from '@/components/layout/ThemeProvider'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-5xl p-6">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold" style={{ color: '#6B46C1' }}>
              Datex FootPrint Release Notes
            </h1>
          </header>
          <main>
            <p className="opacity-80">Scaffold ready. DB connected via Supabase client.</p>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}

export default App
