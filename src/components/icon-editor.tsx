"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Circle,
  Copy,
  Download,
  Eye,
  Grid,
  Hand,
  Layers,
  Minus,
  MousePointer2,
  PenTool,
  Plus,
  Redo2,
  Save,
  Square,
  SunMoon,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
  Combine,
  Subtract,
  AlignCenterHorizontal,
  AlignCenterVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Tool = "select" | "pen" | "rect" | "circle" | "pan"

type ColorTokenKey =
  | "foreground"
  | "primary"
  | "muted-foreground"
  | "chart-3"
  | "chart-1"
  | "chart-5"
  | "accent-foreground"

const COLOR_TOKENS: { key: ColorTokenKey; label: string; cssVar: string }[] = [
  { key: "foreground", label: "Foreground", cssVar: "var(--foreground)" },
  { key: "primary", label: "Primary", cssVar: "var(--primary)" },
  { key: "muted-foreground", label: "Muted FG", cssVar: "var(--muted-foreground)" },
  { key: "chart-3", label: "Ink", cssVar: "var(--chart-3)" },
  { key: "chart-1", label: "Accent", cssVar: "var(--chart-1)" },
  { key: "chart-5", label: "Warm", cssVar: "var(--chart-5)" },
  { key: "accent-foreground", label: "Accent FG", cssVar: "var(--accent-foreground)" },
]

type ShapeType = "rect" | "circle" | "path" | "compound"

type BaseShape = {
  id: string
  type: ShapeType
  stroke: ColorTokenKey
  fill?: ColorTokenKey | "none"
  strokeWidth: number
  opacity: number
}

type RectShape = BaseShape & {
  type: "rect"
  x: number
  y: number
  width: number
  height: number
  rx: number
}

type CircleShape = BaseShape & {
  type: "circle"
  cx: number
  cy: number
  r: number
}

type PathShape = BaseShape & {
  type: "path"
  d: string
  closed: boolean
}

type CompoundShape = BaseShape & {
  type: "compound"
  paths: string[]
  mode: "union" | "subtract"
}

type AnyShape = RectShape | CircleShape | PathShape | CompoundShape

type LintIssue = {
  id: string
  severity: "error" | "warning" | "info"
  message: string
}

type PreviewBg = "none" | "tile" | "dark" | "light"

export interface IconEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  initialSVG?: string
  tokensLocked?: boolean
  onSave?: (svg: string) => void | Promise<void>
  name?: string
}

const VIEWPORT = 24

export default function IconEditor({
  open,
  onOpenChange,
  className,
  tokensLocked = true,
  initialSVG,
  onSave,
  name = "icon",
}: IconEditorProps) {
  const [tool, setTool] = useState<Tool>("select")
  const [zoom, setZoom] = useState(18) // pixels per unit at 100% (roughly)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [halfPixelAlign, setHalfPixelAlign] = useState(true)
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [cornerRadius, setCornerRadius] = useState(2)
  const [strokeToken, setStrokeToken] = useState<ColorTokenKey>("chart-3")
  const [fillToken, setFillToken] = useState<ColorTokenKey | "none">("none")
  const [opacity, setOpacity] = useState(1)
  const [shapes, setShapes] = useState<AnyShape[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewBg, setPreviewBg] = useState<PreviewBg>("tile")
  const [previewSize, setPreviewSize] = useState<"16" | "24" | "32">("24")

  // History
  const [history, setHistory] = useState<AnyShape[][]>([])
  const [future, setFuture] = useState<AnyShape[][]>([])

  const canvasRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const drawingPathPoints = useRef<{ x: number; y: number }[]>([])
  const panRef = useRef({ active: false, x: 0, y: 0, startX: 0, startY: 0 })

  const pushHistory = useCallback(
    (next: AnyShape[]) => {
      setHistory((h) => [...h, shapes])
      setFuture([])
      setShapes(next)
    },
    [shapes]
  )

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setFuture((f) => [shapes, ...f])
      setShapes(prev)
      return h.slice(0, -1)
    })
  }, [shapes])

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setHistory((h) => [...h, shapes])
      setShapes(next)
      return f.slice(1)
    })
  }, [shapes])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        handleRedo()
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length) {
          e.preventDefault()
          pushHistory(shapes.filter((s) => !selectedIds.includes(s.id)))
          setSelectedIds([])
        }
      }
      if (e.key === "Escape") {
        setSelectedIds([])
        if (tool !== "select") setTool("select")
      }
      if (e.key.toLowerCase() === "v") setTool("select")
      if (e.key.toLowerCase() === "p") setTool("pen")
      if (e.key.toLowerCase() === "r") setTool("rect")
      if (e.key.toLowerCase() === "c") setTool("circle")
      if (e.key.toLowerCase() === "h") setTool("pan")
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleUndo, handleRedo, selectedIds.length, shapes, pushHistory, tool])

  // Helpers
  const snap = useCallback(
    (n: number) => {
      if (!snapToGrid) return n
      if (halfPixelAlign) return Math.round(n * 2) / 2
      return Math.round(n)
    },
    [snapToGrid, halfPixelAlign]
  )

  const ptFromEvent = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const svg = canvasRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      const x = ((e as PointerEvent).clientX - rect.left) / (rect.width / VIEWPORT)
      const y = ((e as PointerEvent).clientY - rect.top) / (rect.height / VIEWPORT)
      return { x, y }
    },
    []
  )

  // Selection helpers
  const selectedShapes = useMemo(
    () => shapes.filter((s) => selectedIds.includes(s.id)),
    [shapes, selectedIds]
  )

  const updateSelected = useCallback(
    (updates: Partial<AnyShape>) => {
      if (!selectedIds.length) return
      const next = shapes.map((s) =>
        selectedIds.includes(s.id) ? ({ ...s, ...updates } as AnyShape) : s
      )
      pushHistory(next)
    },
    [selectedIds, shapes, pushHistory]
  )

  const setShape = useCallback(
    (id: string, updater: (shape: AnyShape) => AnyShape) => {
      const next = shapes.map((s) => (s.id === id ? updater(s) : s))
      pushHistory(next)
    },
    [shapes, pushHistory]
  )

  // Lint
  const lintIssues = useMemo<LintIssue[]>(() => {
    const issues: LintIssue[] = []
    for (const s of shapes) {
      if (s.strokeWidth % 0.5 !== 0) {
        issues.push({
          id: s.id,
          severity: "warning",
          message: "Stroke width should be a multiple of 0.5px for crisp rendering.",
        })
      }
      if ("x" in s) {
        if (s.x < 0 || s.y < 0 || s.x + s.width > VIEWPORT || s.y + s.height > VIEWPORT) {
          issues.push({
            id: s.id,
            severity: "warning",
            message: "Shape extends outside 24×24 viewport.",
          })
        }
      }
      if ("cx" in s) {
        if (s.cx - s.r < 0 || s.cy - s.r < 0 || s.cx + s.r > VIEWPORT || s.cy + s.r > VIEWPORT) {
          issues.push({
            id: s.id,
            severity: "warning",
            message: "Circle extends outside 24×24 viewport.",
          })
        }
      }
      // Token usage enforcement
      const strokeOk = COLOR_TOKENS.some((t) => t.key === s.stroke)
      if (!strokeOk && tokensLocked) {
        issues.push({
          id: s.id,
          severity: "error",
          message: "Stroke color must use design token.",
        })
      }
      if (s.fill && s.fill !== "none" && tokensLocked) {
        const fillOk = COLOR_TOKENS.some((t) => t.key === s.fill)
        if (!fillOk) {
          issues.push({
            id: s.id,
            severity: "error",
            message: "Fill color must use design token.",
          })
        }
      }
      // Pixel alignment
      const checkDecimals = (n: number) => Math.abs(n - Math.round(n)) > 0.0001
      if ("x" in s && (checkDecimals(s.x) || checkDecimals(s.y))) {
        issues.push({
          id: s.id,
          severity: "info",
          message: "Position has decimals; enable half-pixel alignment for crisper strokes.",
        })
      }
    }
    return issues
  }, [shapes, tokensLocked])

  // Canvas interactions
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!open) return
      const svg = canvasRef.current
      if (!svg) return
      ;(e.target as Element).setPointerCapture?.((e as unknown as PointerEvent).pointerId)
      const { x, y } = ptFromEvent(e)
      const sx = snap(x)
      const sy = snap(y)

      if (tool === "pan") {
        const container = containerRef.current
        if (!container) return
        panRef.current.active = true
        panRef.current.startX = e.clientX
        panRef.current.startY = e.clientY
        panRef.current.x = container.scrollLeft
        panRef.current.y = container.scrollTop
        return
      }

      if (tool === "select") {
        // Hit-test shapes (last on top)
        for (let i = shapes.length - 1; i >= 0; i--) {
          const s = shapes[i]
          let hit = false
          if (s.type === "rect") {
            hit = sx >= s.x && sx <= s.x + s.width && sy >= s.y && sy <= s.y + s.height
          } else if (s.type === "circle") {
            const dx = sx - s.cx
            const dy = sy - s.cy
            hit = Math.sqrt(dx * dx + dy * dy) <= s.r
          } else if (s.type === "path" || s.type === "compound") {
            // Fallback rough bbox check
            const bb = getPathBBox(s)
            hit = sx >= bb.x && sx <= bb.x + bb.width && sy >= bb.y && sy <= bb.y + bb.height
          }
          if (hit) {
            setSelectedIds((prev) =>
              e.shiftKey ? Array.from(new Set([...prev, s.id])) : [s.id]
            )
            // start dragging
            dragState.current = {
              active: true,
              id: s.id,
              start: { x: sx, y: sy },
              original: s,
            }
            return
          }
        }
        // Otherwise clear selection
        setSelectedIds([])
      }

      if (tool === "rect") {
        const id = crypto.randomUUID()
        const newRect: RectShape = {
          id,
          type: "rect",
          x: sx,
          y: sy,
          width: 0.5,
          height: 0.5,
          rx: cornerRadius,
          stroke: strokeToken,
          fill: fillToken,
          strokeWidth,
          opacity,
        }
        isDrawingRef.current = true
        pushHistory([...shapes, newRect])
        setSelectedIds([id])
        dragCreateRef.current = { id, startX: sx, startY: sy }
      }

      if (tool === "circle") {
        const id = crypto.randomUUID()
        const newC: CircleShape = {
          id,
          type: "circle",
          cx: sx,
          cy: sy,
          r: 0.25,
          stroke: strokeToken,
          fill: fillToken,
          strokeWidth,
          opacity,
        }
        isDrawingRef.current = true
        pushHistory([...shapes, newC])
        setSelectedIds([id])
        dragCreateRef.current = { id, startX: sx, startY: sy }
      }

      if (tool === "pen") {
        isDrawingRef.current = true
        drawingPathPoints.current.push({ x: sx, y: sy })
        if (drawingPathPoints.current.length === 1) {
          const id = crypto.randomUUID()
          const p: PathShape = {
            id,
            type: "path",
            d: `M ${sx} ${sy}`,
            closed: false,
            stroke: strokeToken,
            fill: "none",
            strokeWidth,
            opacity,
          }
          pushHistory([...shapes, p])
          setSelectedIds([id])
        } else {
          const id = selectedIds[0]
          const p = shapes.find((s) => s.id === id && s.type === "path") as PathShape | undefined
          if (p) {
            const d = `${p.d} L ${sx} ${sy}`
            setShape(id, (sh) => ({ ...(sh as PathShape), d }))
          }
        }
      }
    },
    [
      open,
      ptFromEvent,
      snap,
      tool,
      shapes,
      pushHistory,
      cornerRadius,
      strokeToken,
      fillToken,
      strokeWidth,
      opacity,
      selectedIds,
      setShape,
    ]
  )

  const dragState = useRef<{
    active: boolean
    id: string
    start: { x: number; y: number }
    original: AnyShape
  } | null>(null)

  const dragCreateRef = useRef<{ id: string; startX: number; startY: number } | null>(null)

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const { x, y } = ptFromEvent(e)
      const sx = snap(x)
      const sy = snap(y)

      if (tool === "pan" && panRef.current.active) {
        const container = containerRef.current
        if (!container) return
        const dx = e.clientX - panRef.current.startX
        const dy = e.clientY - panRef.current.startY
        container.scrollLeft = panRef.current.x - dx
        container.scrollTop = panRef.current.y - dy
        return
      }

      if (dragState.current?.active) {
        const { id, start, original } = dragState.current
        const dx = sx - start.x
        const dy = sy - start.y
        const moved = moveShape(original, dx, dy, snap)
        setShape(id, () => moved)
        return
      }

      if (isDrawingRef.current && dragCreateRef.current) {
        const { id, startX, startY } = dragCreateRef.current
        const s = shapes.find((sh) => sh.id === id)
        if (!s) return
        if (s.type === "rect") {
          const nx = Math.min(startX, sx)
          const ny = Math.min(startY, sy)
          const nw = Math.max(0.5, Math.abs(sx - startX))
          const nh = Math.max(0.5, Math.abs(sy - startY))
          setShape(id, (sh) => ({ ...(sh as RectShape), x: nx, y: ny, width: nw, height: nh }))
        }
        if (s.type === "circle") {
          const r = Math.max(0.25, Math.hypot(sx - startX, sy - startY))
          setShape(id, (sh) => ({ ...(sh as CircleShape), r }))
        }
      }
    },
    [ptFromEvent, snap, setShape, shapes, tool]
  )

  const onPointerUp = useCallback(() => {
    if (tool === "pan") {
      panRef.current.active = false
    }
    dragState.current = null
    if (tool === "pen") {
      // keep drawing until double-click or Enter to close
    }
    isDrawingRef.current = false
    dragCreateRef.current = null
  }, [tool])

  // Double click to close path
  const onDoubleClick = useCallback(() => {
    if (tool === "pen") {
      const id = selectedIds[0]
      const p = shapes.find((s) => s.id === id && s.type === "path") as PathShape | undefined
      if (p) {
        const d = `${p.d} Z`
        setShape(id, (sh) => ({ ...(sh as PathShape), d, closed: true }))
        drawingPathPoints.current = []
        isDrawingRef.current = false
        setTool("select")
      }
    }
  }, [tool, selectedIds, shapes, setShape])

  // Move with arrow keys
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (!selectedIds.length) return
      const delta = (e.shiftKey ? 2 : 1) * (e.altKey ? 0.5 : 1)
      let moved = false
      const next = shapes.map((s) => {
        if (!selectedIds.includes(s.id)) return s
        if (e.key === "ArrowLeft") {
          moved = true
          return moveShape(s, -delta, 0, snap)
        }
        if (e.key === "ArrowRight") {
          moved = true
          return moveShape(s, delta, 0, snap)
        }
        if (e.key === "ArrowUp") {
          moved = true
          return moveShape(s, 0, -delta, snap)
        }
        if (e.key === "ArrowDown") {
          moved = true
          return moveShape(s, 0, delta, snap)
        }
        return s
      })
      if (moved) {
        e.preventDefault()
        pushHistory(next)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, selectedIds, shapes, pushHistory, snap])

  // Boolean ops (basic grouping/compound path)
  const booleanUnion = useCallback(() => {
    if (selectedShapes.length < 2) return
    const paths = selectedShapes.map((s) => asPathD(s)).filter(Boolean) as string[]
    if (!paths.length) return
    const id = crypto.randomUUID()
    const union: CompoundShape = {
      id,
      type: "compound",
      paths,
      mode: "union",
      stroke: strokeToken,
      fill: fillToken,
      strokeWidth,
      opacity,
    }
    const remaining = shapes.filter((s) => !selectedIds.includes(s.id))
    pushHistory([...remaining, union])
    setSelectedIds([id])
  }, [selectedIds, selectedShapes, shapes, pushHistory, strokeToken, fillToken, strokeWidth, opacity])

  const booleanSubtract = useCallback(() => {
    if (selectedShapes.length < 2) return
    const paths = selectedShapes.map((s) => asPathD(s)).filter(Boolean) as string[]
    if (!paths.length) return
    const id = crypto.randomUUID()
    const compound: CompoundShape = {
      id,
      type: "compound",
      paths,
      mode: "subtract",
      stroke: strokeToken,
      fill: fillToken,
      strokeWidth,
      opacity,
    }
    const remaining = shapes.filter((s) => !selectedIds.includes(s.id))
    pushHistory([...remaining, compound])
    setSelectedIds([id])
  }, [selectedIds, selectedShapes, shapes, pushHistory, strokeToken, fillToken, strokeWidth, opacity])

  // Align center tools
  const alignCenter = useCallback(
    (axis: "x" | "y") => {
      if (!selectedIds.length) return
      const next = shapes.map((s) => {
        if (!selectedIds.includes(s.id)) return s
        if (s.type === "rect") {
          if (axis === "x") {
            const nx = snap((VIEWPORT - s.width) / 2)
            return { ...s, x: nx }
          } else {
            const ny = snap((VIEWPORT - s.height) / 2)
            return { ...s, y: ny }
          }
        }
        if (s.type === "circle") {
          if (axis === "x") return { ...s, cx: snap(VIEWPORT / 2) }
          else return { ...s, cy: snap(VIEWPORT / 2) }
        }
        if (s.type === "path" || s.type === "compound") {
          const bb = getPathBBox(s)
          if (axis === "x") {
            const dx = snap((VIEWPORT - bb.width) / 2 - bb.x)
            return translatePathShape(s, dx, 0, snap)
          } else {
            const dy = snap((VIEWPORT - bb.height) / 2 - bb.y)
            return translatePathShape(s, 0, dy, snap)
          }
        }
        return s
      })
      pushHistory(next)
    },
    [selectedIds, shapes, snap, pushHistory]
  )

  // Save / Export
  const svgString = useMemo(() => {
    return buildSVG(shapes)
  }, [shapes])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(svgString)
      toast.success("Copied SVG to clipboard")
    } catch {
      toast.error("Failed to copy SVG")
    }
  }, [svgString])

  const handleDownloadSVG = useCallback(() => {
    const blob = new Blob([svgString], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${name}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }, [svgString, name])

  const exportPNG = useCallback(
    async (size: number) => {
      try {
        const svg = buildSVG(shapes).replace(
          /<svg /,
          `<svg width="${size}" height="${size}" `
        )
        const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)
        const img = new Image()
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Canvas not supported")
        await new Promise<void>((res, rej) => {
          img.onload = () => res()
          img.onerror = () => rej(new Error("Failed to load SVG"))
          img.src = url
        })
        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        const pngUrl = canvas.toDataURL("image/png")
        const a = document.createElement("a")
        a.href = pngUrl
        a.download = `${name}-${size}.png`
        a.click()
        toast.success(`Exported ${size}px PNG`)
      } catch {
        toast.error("PNG export failed")
      }
    },
    [shapes, name]
  )

  const handleSave = useCallback(async () => {
    try {
      const svg = buildSVG(shapes)
      if (onSave) await onSave(svg)
      toast.success("Icon saved")
      onOpenChange(false)
    } catch {
      toast.error("Save failed")
    }
  }, [onSave, shapes, onOpenChange])

  // Initial load (optional: future parsing of initialSVG)
  useEffect(() => {
    if (open && initialSVG && shapes.length === 0) {
      // Basic import as compound path (best-effort)
      const dMatches = initialSVG.match(/d="([^"]+)"/g)
      if (dMatches && dMatches.length) {
        const paths = dMatches.map((m) => m.replace(/^d="/, "").replace(/"$/, ""))
        const id = crypto.randomUUID()
        const imported: CompoundShape = {
          id,
          type: "compound",
          paths,
          mode: "union",
          stroke: "chart-3",
          fill: "none",
          strokeWidth: 1,
          opacity: 1,
        }
        setShapes([imported])
        setSelectedIds([id])
        setHistory([])
        setFuture([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // UI
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[min(800px,96vw)] p-6 gap-6 border bg-card text-foreground",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle>Icon Editor - {name}</DialogTitle>
          <DialogDescription>
            Create and edit icons with consistent styling tokens
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            A simple icon editor placeholder. Click Save when ready.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions
function buildSVG(shapes: AnyShape[]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M12 3v18"/></svg>`
}