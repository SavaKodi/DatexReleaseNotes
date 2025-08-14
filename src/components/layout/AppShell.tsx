import React from 'react'

type AppShellProps = {
  left: React.ReactNode
  right: React.ReactNode
}

export function AppShell({ left, right }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full md:w-[34%] md:border-r border-transparent/0 md:pl-4">
        <div className="p-4 md:p-7 sticky top-0 md:h-screen md:overflow-auto rounded-xl glass-panel">
          {left}
        </div>
      </aside>
      <main className="w-full md:w-[66%] md:pr-4">
        <div className="p-4 md:p-6 rounded-xl glass-panel">
          {right}
        </div>
      </main>
    </div>
  )
}


