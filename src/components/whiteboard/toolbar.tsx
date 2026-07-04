'use client'

import { MousePointer2, Pencil, Minus, Square, Circle, Type, Eraser, Wand2, StickyNote } from 'lucide-react'
import type { Tool } from '@/lib/whiteboard-types'
import { cn } from '@/lib/utils'

const tools: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'draw', label: 'Freehand Draw', icon: Pencil },
  { id: 'laser', label: 'Laser Pointer (W)', icon: Wand2 },
  // 🔴 NAYA: Sticky Note Tool Add Kiya
  { id: 'sticky', label: 'Voice Sticky Note (S)', icon: StickyNote },
  { id: 'line', label: 'Straight Line (L)', icon: Minus },
  { id: 'rectangle', label: 'Rectangle (R)', icon: Square },
  { id: 'circle', label: 'Circle (C)', icon: Circle },
  { id: 'text', label: 'Text (T)', icon: Type },
  { id: 'eraser', label: 'Eraser (E)', icon: Eraser },
]

export function Toolbar({
  activeTool,
  onToolChange,
}: {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
}) {
  return (
    <aside
      aria-label="Drawing tools"
      className="absolute left-4 top-1/2 z-20 -translate-y-1/2"
    >
      <div
        role="toolbar"
        aria-orientation="vertical"
        className="flex flex-col gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg"
      >
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={activeTool === id}
            onClick={() => onToolChange(id)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              activeTool === id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </aside>
  )
}