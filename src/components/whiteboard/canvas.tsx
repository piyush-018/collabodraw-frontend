// @ts-nocheck
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Undo2, Redo2, Trash2, Download } from 'lucide-react'
import type { Tool } from '@/lib/whiteboard-types'
import { socket } from '../../lib/socket' 
import { useParams } from 'next/navigation'
import { jsPDF } from 'jspdf';

type Point = { x: number; y: number }

type Shape =
  | { id: number; type: 'draw'; points: Point[]; color: string; strokeWidth: number }
  | { id: number; type: 'laser'; points: Point[]; color: string; strokeWidth: number; timestamp: number }
  | { id: number; type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; strokeWidth: number }
  | { id: number; type: 'rectangle'; x: number; y: number; w: number; h: number; color: string; strokeWidth: number }
  | { id: number; type: 'circle'; cx: number; cy: number; rx: number; ry: number; color: string; strokeWidth: number }
  | { id: number; type: 'text'; x: number; y: number; text: string; color: string }
  | { id: number; type: 'sticky'; x: number; y: number; text: string; color: string }
  | { id: number; type: 'image'; x: number; y: number; w: number; h: number; dataUrl: string }

type Reaction = { id: string; x: number; y: number; emoji: string; timestamp: number }

let nextId = 1
const SELECTED_STROKE = 'oklch(0.72 0.15 240)'
const COLORS = ['#ffffff', '#ef4444', '#3b82f6', '#10b981', '#f59e0b']
const imageCache = new Map<string, HTMLImageElement>();
function shapeBounds(shape: Shape): { x: number; y: number; w: number; h: number } {
  if (shape.type === 'draw' || shape.type === 'laser') {
    const xs = shape.points.map((p) => p.x)
    const ys = shape.points.map((p) => p.y)
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
  }
  if (shape.type === 'line') {
    return { x: Math.min(shape.x1, shape.x2), y: Math.min(shape.y1, shape.y2), w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) }
  }
  if (shape.type === 'rectangle') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
  if (shape.type === 'circle') return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, w: shape.rx * 2, h: shape.ry * 2 }
  if (shape.type === 'sticky') return { x: shape.x, y: shape.y, w: 150, h: 150 }
  if (shape.type === 'image') return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
  return { x: shape.x, y: shape.y - 16, w: shape.text.length * 9 + 8, h: 22 }
}

function hitTest(shape: Shape, p: Point, pad = 6): boolean {
  const b = shapeBounds(shape)
  return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad
}

function translateShape(shape: Shape, dx: number, dy: number): Shape {
  if (shape.type === 'draw' || shape.type === 'laser') return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
  if (shape.type === 'line') return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy }
  if (shape.type === 'rectangle') return { ...shape, x: shape.x + dx, y: shape.y + dy }
  if (shape.type === 'circle') return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy }
  if (shape.type === 'sticky') return { ...shape, x: shape.x + dx, y: shape.y + dy }
  if (shape.type === 'image') return { ...shape, x: shape.x + dx, y: shape.y + dy }
  return { ...shape, x: shape.x + dx, y: shape.y + dy }
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, selected: boolean) {
  ctx.strokeStyle = selected ? SELECTED_STROKE : (shape.color || '#ffffff')
  ctx.fillStyle = selected ? SELECTED_STROKE : (shape.color || '#ffffff')
  ctx.lineWidth = shape.type !== 'text' ? (shape.strokeWidth || 2) : 1
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (shape.type === 'laser') {
    const age = Date.now() - shape.timestamp;
    ctx.strokeStyle = '#ff0055'; 
    ctx.shadowBlur = 40;         
    ctx.shadowColor = '#ff0055'; 
    ctx.lineWidth = 10;          

    if (age > 1500) {
      const isBlinkingOut = Math.floor(age / 200) % 2 === 0;
      ctx.globalAlpha = isBlinkingOut ? 0.1 : 0.9;
    } else {
      ctx.globalAlpha = 0.8 + Math.random() * 0.2; 
    }
  }

  if ((shape.type === 'draw' || shape.type === 'laser') && shape.points.length > 1) {
    ctx.beginPath()
    ctx.moveTo(shape.points[0].x, shape.points[0].y)
    for (const p of shape.points.slice(1)) ctx.lineTo(p.x, p.y)
    ctx.stroke()
  } else if (shape.type === 'line') {
    ctx.beginPath()
    ctx.moveTo(shape.x1, shape.y1)
    ctx.lineTo(shape.x2, shape.y2)
    ctx.stroke()
  } else if (shape.type === 'rectangle') {
    ctx.strokeRect(shape.x, shape.y, shape.w, shape.h)
  } else if (shape.type === 'circle') {
    ctx.beginPath()
    ctx.ellipse(shape.cx, shape.cy, Math.abs(shape.rx), Math.abs(shape.ry), 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (shape.type === 'text') {
    ctx.font = '15px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(shape.text, shape.x, shape.y)
  } else if (shape.type === 'sticky') {
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillStyle = shape.color === '#ffffff' ? '#fef08a' : shape.color;
    ctx.fillRect(shape.x, shape.y, 150, 150);
    
    
    ctx.shadowBlur = 0; 
    ctx.fillStyle = '#171717'; 
    ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    
    const words = shape.text.split(' ');
    let line = '';
    let cy = shape.y + 15; 
    
    // ... sticky note ka text wrap loop ...
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 130 && i > 0) {
        ctx.fillText(line, shape.x + 10, cy);
        line = words[i] + ' ';
        cy += 20; 
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, shape.x + 10, cy);
    
  } else if (shape.type === 'image') {
    // 🔴 NAYA: Image yahan aayega, sticky ke PURE block ke baad!
    let img = imageCache.get(shape.id.toString());
    if (!img) {
      img = new window.Image(); 
      img.src = shape.dataUrl;
      imageCache.set(shape.id.toString(), img);
    }
    if (img.complete) {
      ctx.drawImage(img, shape.x, shape.y, shape.w, shape.h);
    }
  }

  // Yeh lines pehle se thi, inko waisa hi rehne dein
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;

  if (selected) {
    const b = shapeBounds(shape)
    ctx.save()
    ctx.strokeStyle = SELECTED_STROKE
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(b.x - 8, b.y - 8, b.w + 16, b.h + 16)
    ctx.restore()
  }
}
  


export function Canvas({ tool, boardId }: { tool: Tool, boardId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [textInput, setTextInput] = useState<{ x: number; y: number } | null>(null)
  const [isListening, setIsListening] = useState(false)
  
  const [reactions, setReactions] = useState<Reaction[]>([])
  const localCursorRef = useRef<Point>({ x: 0, y: 0 })
  
  const [activeColor, setActiveColor] = useState(COLORS[0])
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [history, setHistory] = useState<Shape[][]>([[]])
  const [historyStep, setHistoryStep] = useState(0)

  const peerDraftsRef = useRef<Record<string, Shape>>({})
  const cursorsRef = useRef<Record<string, Point & { color: string }>>({})
  const [, setRenderTrigger] = useState(0)

  const draftRef = useRef<Shape | null>(null)
  const dragRef = useRef<{ id: number; last: Point } | null>(null)
  const isDownRef = useRef(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
    
    for (const shape of shapes) drawShape(ctx, shape, shape.id === selectedId)
    for (const shape of Object.values(peerDraftsRef.current)) drawShape(ctx, shape, false)
    if (draftRef.current) drawShape(ctx, draftRef.current, false)
    
    ctx.restore()
  }, [shapes, selectedId])

  useEffect(() => {
    const interval = setInterval(() => {
      setReactions(prev => prev.filter(r => Date.now() - r.timestamp < 1000));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const hasLaser = shapes.some(s => s.type === 'laser') || draftRef.current?.type === 'laser';
    if (!hasLaser) return;

    const interval = setInterval(() => {
      redraw();
    }, 50);

    return () => clearInterval(interval);
  }, [shapes, redraw]);

  useEffect(() => {
    const joinRoom = () => {
      socket.emit('join-board', boardId);
    };

    if (socket.connected) {
      joinRoom(); 
    } else {
      socket.on('connect', joinRoom); 
    }

    // 🔴 NAYA: Server se True Persistence receive karna
    const handleStateSync = (savedShapes: Shape[]) => {
      setShapes(savedShapes);
      pushHistory(savedShapes); // Undo/Redo theek rakhne ke liye
      if (savedShapes.length > 0) {
        const maxId = Math.max(...savedShapes.map(s => s.id));
        if (maxId >= nextId) nextId = maxId + 1;
      }
    };

    const handleDraw = (incomingShapes: Shape[]) => {
      setShapes(incomingShapes)
      if (incomingShapes.length > 0) {
        const maxId = Math.max(...incomingShapes.map(s => s.id))
        if (maxId >= nextId) nextId = maxId + 1
      }
    }

    const handleCursorMove = (data: any) => {
      cursorsRef.current[data.socketId] = { x: data.x, y: data.y, color: data.color }
      if (data.reaction) {
        setReactions(prev => [...prev, { id: Math.random().toString(), x: data.x, y: data.y, emoji: data.reaction, timestamp: Date.now() }])
      }
      setRenderTrigger(prev => prev + 1)
    }

    const handleDraftUpdate = (data: any) => {
      peerDraftsRef.current[data.socketId] = data.shape
      redraw() 
    }

    const handleDraftEnd = (data: any) => {
      delete peerDraftsRef.current[data.socketId]
      redraw()
    }

    const handleUserDisconnect = (socketId: string) => {
      delete cursorsRef.current[socketId]
      delete peerDraftsRef.current[socketId]
      setRenderTrigger(prev => prev + 1)
      redraw()
    }

    // Connect Server Listeners
    socket.on('board-state-sync', handleStateSync)
    socket.on('draw', handleDraw)
    socket.on('cursor-move', handleCursorMove)
    socket.on('draft-update', handleDraftUpdate)
    socket.on('draft-end', handleDraftEnd)
    socket.on('user-disconnected', handleUserDisconnect)

    return () => { 
      socket.off('connect', joinRoom)
      socket.off('board-state-sync', handleStateSync)
      socket.off('draw', handleDraw) 
      socket.off('cursor-move', handleCursorMove)
      socket.off('draft-update', handleDraftUpdate)
      socket.off('draft-end', handleDraftEnd)
      socket.off('user-disconnected', handleUserDisconnect)
    }
  }, [boardId, redraw])

  // 🔴 NAYA: LocalStorage hataya, ab sirf state update aur emit ho raha hai
  const syncShapes = useCallback((updater: React.SetStateAction<Shape[]>) => {
    setShapes((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      socket.emit('draw', { boardId, shapes: next })
      return next
    })
  }, [boardId])

  const pushHistory = (newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newShapes)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyStep > 0) {
      const step = historyStep - 1
      setHistoryStep(step)
      syncShapes(history[step])
    }
  }

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const step = historyStep + 1
      setHistoryStep(step)
      syncShapes(history[step])
    }
  }

  const handleClear = () => {
    syncShapes([])
    pushHistory([])
  }

  const handleExport = (format: 'png' | 'jpeg' | 'pdf' = 'png') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return
    
    ctx.fillStyle = '#09090b' 
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    ctx.drawImage(canvas, 0, 0)

    if (format === 'png' || format === 'jpeg') {
      const link = document.createElement('a')
      link.download = `CollaboDraw-${boardId}.${format}`
      link.href = tempCanvas.toDataURL(`image/${format}`)
      link.click()
    } else if (format === 'pdf') {
      const imgData = tempCanvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
      pdf.save(`CollaboDraw-${boardId}.pdf`)
    }
  }
  // 🔴 NAYA: Aggressive Client-Side Compression Logic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Force max width to 800px to prevent lag
        const MAX_WIDTH = 800;
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (img.width > MAX_WIDTH) {
          const scaleSize = MAX_WIDTH / img.width;
          targetWidth = MAX_WIDTH;
          targetHeight = img.height * scaleSize;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // Compress to 50% Quality JPEG (~30KB payload)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
        
        const newShape: Shape = {
          id: nextId++,
          type: 'image',
          x: 100, // Default drop position
          y: 100,
          w: targetWidth / 2, // Scale down visibly on board
          h: targetHeight / 2,
          dataUrl: compressedDataUrl
        };
        
        const newShapes = [...shapes, newShape];
        syncShapes(newShapes);
        pushHistory(newShapes);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be uploaded again if needed
    e.target.value = ''; 
  };

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = `${container.clientWidth}px`
      canvas.style.height = `${container.clientHeight}px`
      redraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [redraw])

  useEffect(() => { redraw() }, [redraw])

  const getPoint = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (textInput) return
    const p = getPoint(e)
    canvasRef.current?.setPointerCapture(e.pointerId)
    isDownRef.current = true

    if (tool === 'draw') {
      draftRef.current = { id: nextId++, type: 'draw', points: [p], color: activeColor, strokeWidth }
    } else if (tool === 'laser') {
      draftRef.current = { id: nextId++, type: 'laser', points: [p], color: activeColor, strokeWidth, timestamp: Date.now() }
    } else if (tool === 'line') {
      draftRef.current = { id: nextId++, type: 'line', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: activeColor, strokeWidth }
    } else if (tool === 'rectangle') {
      draftRef.current = { id: nextId++, type: 'rectangle', x: p.x, y: p.y, w: 0, h: 0, color: activeColor, strokeWidth }
    } else if (tool === 'circle') {
      draftRef.current = { id: nextId++, type: 'circle', cx: p.x, cy: p.y, rx: 0, ry: 0, color: activeColor, strokeWidth }
    } else if (tool === 'text') {
      setTextInput(p)
      isDownRef.current = false
    } else if (tool === 'sticky') {
      isDownRef.current = false; 
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Oops! Voice dictation only works in Chrome or Edge browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; 
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        setIsListening(false);
        const transcript = event.results[0][0].transcript;
        
        const newShape: Shape = { 
          id: nextId++, 
          type: 'sticky', 
          x: p.x, 
          y: p.y, 
          text: transcript, 
          color: activeColor 
        };
        const newShapes = [...shapes, newShape];
        syncShapes(newShapes);
        pushHistory(newShapes);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
        alert("Couldn't hear you clearly. Please try again!");
      };
      
      recognition.start();

    } else if (tool === 'eraser') {
      const newShapes = shapes.filter((s) => !hitTest(s, p))
      syncShapes(newShapes)
      pushHistory(newShapes)
    } else if (tool === 'select') {
      const hit = [...shapes].reverse().find((s) => hitTest(s, p))
      setSelectedId(hit?.id ?? null)
      if (hit) dragRef.current = { id: hit.id, last: p }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = getPoint(e)
    localCursorRef.current = p 
    socket.emit('cursor-move', { boardId, x: p.x, y: p.y, color: activeColor })

    if (!isDownRef.current) return

    if (tool === 'eraser') {
      syncShapes((prev) => prev.filter((s) => !hitTest(s, p)))
      return
    }

    if (tool === 'select' && dragRef.current) {
      const { id, last } = dragRef.current
      const dx = p.x - last.x
      const dy = p.y - last.y
      dragRef.current = { id, last: p }
      syncShapes((prev) => prev.map((s) => (s.id === id ? translateShape(s, dx, dy) : s)))
      return
    }

    const draft = draftRef.current
    if (!draft) return
    if (draft.type === 'draw' || draft.type === 'laser') {
      draft.points.push(p)
    } else if (draft.type === 'line') {
      draft.x2 = p.x
      draft.y2 = p.y
    } else if (draft.type === 'rectangle') {
      draft.w = p.x - draft.x
      draft.h = p.y - draft.y
    } else if (draft.type === 'circle') {
      draft.rx = p.x - draft.cx
      draft.ry = p.y - draft.cy
    }
    
    socket.emit('draft-update', { boardId, shape: draft })
    redraw()
  }

  const handlePointerUp = () => {
    isDownRef.current = false
    dragRef.current = null
    const draft = draftRef.current
    draftRef.current = null
    
    socket.emit('draft-end', { boardId })

    if (tool === 'select' || tool === 'eraser') {
      pushHistory(shapes)
      return
    }

    if (!draft) return
    const b = shapeBounds(draft)
    
    if (draft.type === 'laser') {
      if (draft.points.length > 1) {
        const newShapes = [...shapes, draft]
        syncShapes(newShapes) 
        
        setTimeout(() => {
          syncShapes(prev => prev.filter(s => s.id !== draft.id))
        }, 2000)
      }
    } else if (draft.type === 'draw' ? draft.points.length > 1 : b.w > 2 || b.h > 2) {
      const newShapes = [...shapes, draft]
      syncShapes(newShapes)
      pushHistory(newShapes)
    } else {
      redraw()
    }
  }

  const commitText = (value: string) => {
    if (textInput && value.trim()) {
      const newShapes = [...shapes, { id: nextId++, type: 'text' as const, x: textInput.x, y: textInput.y, text: value.trim(), color: activeColor }]
      syncShapes(newShapes)
      pushHistory(newShapes)
    }
    setTextInput(null)
  }

  useEffect(() => {
    const handleActionKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!e.ctrlKey && !e.metaKey && !textInput) {
        const EMOJI_MAP: Record<string, string> = { '1': '🔥', '2': '❤️', '3': '🚀', '4': '👀' };
        if (EMOJI_MAP[e.key]) {
          const p = localCursorRef.current;
          const emoji = EMOJI_MAP[e.key];
          setReactions(prev => [...prev, { id: Math.random().toString(), x: p.x, y: p.y, emoji, timestamp: Date.now() }]);
          socket.emit('cursor-move', { boardId, x: p.x, y: p.y, color: activeColor, reaction: emoji });
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault(); 
          handleExport();     
        } else if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo(); 
          } else {
            handleUndo(); 
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();   
        }
      }
    };

    window.addEventListener('keydown', handleActionKeys);
    return () => window.removeEventListener('keydown', handleActionKeys);
  }, [textInput, activeColor, boardId, handleExport, handleRedo, handleUndo]); 

  const cursor = tool === 'select' ? 'cursor-default' : tool === 'text' ? 'cursor-text' : 'cursor-crosshair'

  return (
    <div className="relative flex-1 overflow-hidden bg-background flex justify-center">
      
      <style>{`
        @keyframes floatEmoji {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-10px) scale(1.5); opacity: 1; }
          100% { transform: translateY(-60px) scale(1); opacity: 0; }
        }
      `}</style>

      {isListening && (
        <div className="absolute top-20 z-50 flex items-center gap-2 rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg animate-pulse">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          Listening to your voice...
        </div>
      )}

      <div className="absolute top-4 z-50 flex items-center gap-4 rounded-xl border border-border bg-card/80 backdrop-blur-md px-4 py-2 shadow-lg">
        <div className="flex gap-2 border-r border-border pr-4">
          <button onClick={handleUndo} disabled={historyStep === 0} className="p-2 hover:bg-muted rounded-md disabled:opacity-50 transition-colors"><Undo2 size={18} /></button>
          <button onClick={handleRedo} disabled={historyStep === history.length - 1} className="p-2 hover:bg-muted rounded-md disabled:opacity-50 transition-colors"><Redo2 size={18} /></button>
          <button onClick={handleClear} className="p-2 hover:bg-destructive/20 text-destructive rounded-md transition-colors"><Trash2 size={18} /></button>
          {/* NAYA: Export Options */}
          <div className="flex gap-1 bg-muted/50 rounded-md p-1 ml-2">
            <button onClick={() => handleExport('png')} className="px-2 py-1 text-[10px] font-bold bg-background rounded hover:text-primary transition-colors">PNG</button>
            <button onClick={() => handleExport('jpeg')} className="px-2 py-1 text-[10px] font-bold bg-background rounded hover:text-primary transition-colors">JPG</button>
            <button onClick={() => handleExport('pdf')} className="px-2 py-1 text-[10px] font-bold bg-background rounded hover:text-primary transition-colors">PDF</button>
          </div>
        </div>
        {/* 🔴 NAYA: Image Upload Button */}
          <div className="flex gap-1 bg-muted/50 rounded-md p-1 ml-2">
            <label className="cursor-pointer px-3 py-1 text-[10px] font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center">
              + IMAGE
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>
        <div className="flex gap-2 items-center border-r border-border pr-4">
          {COLORS.map(c => (
            <button key={c} onClick={() => setActiveColor(c)} className={`w-6 h-6 rounded-full transition-transform ${activeColor === c ? 'scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Stroke</span>
          <input type="range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-24 cursor-pointer accent-primary" />
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ backgroundImage: 'radial-gradient(oklch(1 0 0 / 8%) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          className={`absolute inset-0 touch-none ${cursor}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={(e) => {
            const p = getPoint(e as any);
            const hit = [...shapes].reverse().find((s) => hitTest(s, p));
            if (hit && hit.type === 'sticky') {
              const newText = prompt("Edit your sticky note:", hit.text);
              if (newText !== null && newText.trim() !== '') {
                const updatedShapes = shapes.map(s => s.id === hit.id ? { ...s, text: newText } : s);
                syncShapes(updatedShapes);
                pushHistory(updatedShapes);
              }
            }
          }}
        />
        
        {Object.entries(cursorsRef.current).map(([id, pos]) => (
          <div key={id} className="absolute pointer-events-none z-50" style={{ left: pos.x, top: pos.y }}>
            <svg width="20" height="20" viewBox="0 0 24 36" fill={pos.color} stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.65376 21.1597L2.06344 3.73147C1.49257 0.96025 5.03478 -1.02677 7.1593 1.09772L22.1863 16.1247C24.3108 18.2492 22.3238 21.7914 19.5526 21.2205L14.733 20.2269C14.1951 20.116 13.6391 20.2526 13.2205 20.6015L9.67491 23.5564C9.25628 23.9054 8.70034 24.0419 8.16246 23.9311L5.65376 21.1597Z"/>
            </svg>
          </div>
        ))}

        {reactions.map(r => (
          <div 
            key={r.id} 
            className="absolute pointer-events-none z-50 text-4xl" 
            style={{ 
              left: r.x - 20, 
              top: r.y - 40, 
              animation: 'floatEmoji 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' 
            }}
          >
            {r.emoji}
          </div>
        ))}

        {textInput && (
          <input
            autoFocus
            className="absolute z-10 rounded border border-border bg-card px-2 py-1 text-[15px] text-foreground outline-none focus:border-ring"
            style={{ left: textInput.x, top: textInput.y - 16, color: activeColor }}
            onBlur={(e) => commitText(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'Enter') commitText(e.currentTarget.value)
              if (e.key === 'Escape') setTextInput(null)
            }}
          />
        )}
      </div>
    </div>
  )
}