import React from 'react'

type Props = {
  children?: React.ReactNode
}

export function AnimatedBackground({ children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 animated-gradient opacity-40" />
        <div className="absolute -inset-20 flex items-center justify-center">
          <img
            src={"/2025_Datex_Purple.png"}
            alt="Datex 2025 Purple"
            className="select-none opacity-[0.16] max-w-none w-[120vw] md:w-[100vw] animate-bg-pan animate-logo-float mix-blend-screen will-change-transform"
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
            }}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(107,70,193,0.12),rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
      </div>
      {children}
    </div>
  )
}


