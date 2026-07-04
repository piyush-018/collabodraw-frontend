'use client'

import { useEffect, useState } from 'react'
import { Share2 } from 'lucide-react'
import { socket } from '@/lib/socket'

export function Navbar() {
  // Default 1 kyunki aap khud toh hamesha room mein rahenge hi
  const [onlineCount, setOnlineCount] = useState(1)

  useEffect(() => {
    const handleUsersCount = (count: number) => {
      setOnlineCount(count)
    }

    // Backend se aane wale real-time count ko suno
    socket.on('users-count', handleUsersCount)

    return () => {
      socket.off('users-count', handleUsersCount)
    }
  }, [])

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2.5">
        <div className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <h1 className="text-sm font-medium tracking-tight text-foreground">
          CollaboDraw Studio
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center" aria-label={`${onlineCount} collaborators online`}>
          <span className="mr-3 hidden text-xs text-muted-foreground sm:block">
            {onlineCount} online
          </span>
          <div className="flex -space-x-2">
            {/* Dynamically avatars render karna based on actual count (Max 3) */}
            {Array.from({ length: Math.min(onlineCount, 3) }).map((_, i) => (
              <span
                key={i}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold text-white ${
                  ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500'][i]
                }`}
              >
                {['U1', 'U2', 'U3'][i]}
              </span>
            ))}
            {/* Agar 3 se zyada log hain toh +X dikhayenge */}
            {onlineCount > 3 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-foreground">
                +{onlineCount - 3}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          Share
        </button>
      </div>
    </header>
  )
}