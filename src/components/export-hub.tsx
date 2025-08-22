"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Download,
  Globe,
  Smartphone,
  Palette,
  Settings2,
  FileCode2,
  Image as ImageIcon,
  FileType2,
  Frame,
  Boxes,
  Box,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Link as LinkIcon,
  Webhook,
  Loader2,
  RefreshCcw,
  Shield,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

type ExportProfileKey = "web" | "mobile" | "handoff" | "custom"

export interface ExportItem {
  id: string
  name: string
  bytes: number
  tags?: string[]
}

type SvgOptimize = "none" | "standard" | "aggressive"

interface ExportFormats {
  svg: { enabled: boolean; optimize: SvgOptimize; stripFill: boolean }
  png: { enabled: boolean; sizes: number[]; background: "transparent" | "light" | "dark" }
  ico: { enabled: boolean }
  sprite: { enabled: boolean; layout: "horizontal" | "vertical" | "packed" }
  font: { enabled: boolean; includeLigatures: boolean }
  components: { enabled: boolean; targets: Array<"react" | "vue" | "svelte"> }
}

export interface ExportConfig {
  profile: ExportProfileKey
  formats: ExportFormats
  naming: { pattern: string; lowercase: boolean }
  colorMappingEnabled: boolean
  colorMap: Array<{ token: string; hex: string }>
  delivery: {
    apiEnabled: boolean
    apiBaseUrl?: string
    apiToken?: string
    cdnCacheSeconds?: number
  }
  webhook?: {
    enabled: boolean
    url?: string
    secret?: string
    events: { completed: boolean; failed: boolean }
  }
  selection: string[] // item ids included in export
}

export interface ExportResult {
  batchId: string
  success: boolean
  processedCount: number
  totalCount: number
  archiveSizeBytes: number
}

interface ExportHubProps {
  items: ExportItem[]
  defaultProfile?: ExportProfileKey
  canUsePro?: boolean
  canUseTeams?: boolean
  className?: string
  style?: React.CSSProperties
  onExportStart?: (config: ExportConfig) => void
  onExportComplete?: (result: ExportResult) => void
}

const DEFAULT_PNG_SIZES = [16, 24, 32, 48, 64]
const ALL_PNG_SIZES = [16, 20, 24, 32, 48, 64, 96, 128, 256, 512]

function bytesToHuman(n: number) {
  if (n < 1024) return `${n} B`
  const kb = n / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

function estimatePerSvg(bytes: number, optimize: SvgOptimize) {
  const factor = optimize === "aggressive" ? 0.78 : optimize === "standard" ? 0.88 : 1
  return Math.max(350, Math.round(bytes * factor))
}
function estimatePerPng(bytes: number, size: number) {
  // crude heuristic scaling: png roughly scales with area compared to 24px baseline
  const baseline = 24
  const scale = (size / baseline) ** 1.6
  const factor = 1.15 // rasterization/headroom
  return Math.max(900, Math.round(bytes * scale * factor))
}
function estimateIco(bytes: number) {
  return Math.max(3_000, Math.round(bytes * 0.65) + 1024)
}
function estimateComponent(bytes: number) {
  // very small wrapper per icon
  return Math.max(220, Math.round(bytes * 0.05))
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}

const profilePresets: Record<Exclude<ExportProfileKey, "custom">, Partial<ExportFormats> & { naming?: Partial<ExportHubState["naming"]> }> = {
  web: {
    svg: { enabled: true, optimize: "standard", stripFill: false },
    png: { enabled: false, sizes: DEFAULT_PNG_SIZES, background: "transparent" },
    ico: { enabled: false },
    sprite: { enabled: true, layout: "packed" },
    font: { enabled: false, includeLigatures: false },
    components: { enabled: true, targets: ["react"] },
    naming: { pattern: "{name}", lowercase: true },
  },
  mobile: {
    svg: { enabled: false, optimize: "standard", stripFill: false },
    png: { enabled: true, sizes: [24, 48, 96, 128], background: "transparent" },
    ico: { enabled: false },
    sprite: { enabled: false, layout: "packed" },
    font: { enabled: false, includeLigatures: false },
    components: { enabled: true, targets: ["react"] },
    naming: { pattern: "{name}@{size}", lowercase: true },
  },
  handoff: {
    svg: { enabled: true, optimize: "none", stripFill: false },
    png: { enabled: true, sizes: [1, 2, 3].map((x) => x * 24), background: "light" },
    ico: { enabled: false },
    sprite: { enabled: false, layout: "packed" },
    font: { enabled: false, includeLigatures: false },
    components: { enabled: false, targets: [] },
    naming: { pattern: "{name}-{size}-{theme}", lowercase: false },
  },
}

type ExportHubState = {
  profile: ExportProfileKey
  formats: ExportFormats
  naming: { pattern: string; lowercase: boolean }
  colorMappingEnabled: boolean
  colorMap: Array<{ token: string; hex: string }>
  delivery: { apiEnabled: boolean; apiBaseUrl?: string; apiToken?: string; cdnCacheSeconds?: number }
  webhook: { enabled: boolean; url?: string; secret?: string; events: { completed: boolean; failed: boolean } }
  selection: Record<string, boolean>
}

export default function ExportHub(props: ExportHubProps) {
  const { items, className, style, defaultProfile = "web", canUsePro = false, canUseTeams = false, onExportStart, onExportComplete } = props

  const initialSelection: Record<string, boolean> = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    items.forEach((i) => (map[i.id] = true))
    return map
  }, [items])

  const [state, setState] = React.useState<ExportHubState>(() => ({
    profile: defaultProfile,
    formats: {
      svg: { enabled: true, optimize: "standard", stripFill: false },
      png: { enabled: false, sizes: DEFAULT_PNG_SIZES, background: "transparent" },
      ico: { enabled: false },
      sprite: { enabled: false, layout: "packed" },
      font: { enabled: false, includeLigatures: false },
      components: { enabled: true, targets: ["react"] },
    },
    naming: { pattern: "{name}", lowercase: true },
    colorMappingEnabled: false,
    colorMap: [{ token: "brand.primary", hex: "#ee5144" }],
    delivery: { apiEnabled: false, apiBaseUrl: "", apiToken: "", cdnCacheSeconds: 3600 },
    webhook: { enabled: false, url: "", secret: "", events: { completed: true, failed: true } },
    selection: initialSelection,
  }))

  React.useEffect(() => {
    // apply default preset on mount if not custom
    if (defaultProfile !== "custom") {
      applyPreset(defaultProfile)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(key: Exclude<ExportProfileKey, "custom">) {
    const preset = profilePresets[key]
    setState((prev) => ({
      ...prev,
      profile: key,
      formats: {
        svg: preset.svg ? { ...prev.formats.svg, ...preset.svg } : prev.formats.svg,
        png: preset.png ? { ...prev.formats.png, ...preset.png } : prev.formats.png,
        ico: preset.ico ? { ...prev.formats.ico, ...preset.ico } : prev.formats.ico,
        sprite: preset.sprite ? { ...prev.formats.sprite, ...preset.sprite } : prev.formats.sprite,
        font: preset.font ? { ...prev.formats.font, ...preset.font } : prev.formats.font,
        components: preset.components ? { ...prev.formats.components, ...preset.components } : prev.formats.components,
      },
      naming: { ...prev.naming, ...(preset.naming || {}) },
    }))
    toast.success(`Applied ${key} profile`)
  }

  const selectedItems = React.useMemo(() => items.filter((i) => state.selection[i.id]), [items, state.selection])

  const estimates = React.useMemo(() => {
    const perFormat: Record<string, number> = {}
    let total = 0
    if (state.formats.svg.enabled) {
      const svgBytes = sum(selectedItems.map((i) => estimatePerSvg(i.bytes, state.formats.svg.optimize)))
      perFormat["SVG"] = svgBytes
      total += svgBytes
    }
    if (state.formats.png.enabled) {
      const sizes = state.formats.png.sizes
      const pngBytes = sum(
        selectedItems.map((i) => sum(sizes.map((s) => estimatePerPng(i.bytes, s))))
      )
      perFormat[`PNG ×${sizes.length}`] = pngBytes
      total += pngBytes
    }
    if (state.formats.ico.enabled) {
      const icoBytes = sum(selectedItems.map((i) => estimateIco(i.bytes)))
      perFormat["ICO"] = icoBytes
      total += icoBytes
    }
    if (state.formats.sprite.enabled) {
      const spriteOverhead = 5_000
      const spriteBytes = Math.round(sum(selectedItems.map((i) => estimatePerSvg(i.bytes, "standard") * 0.1)) + spriteOverhead)
      perFormat["Sprite"] = spriteBytes
      total += spriteBytes
    }
    if (state.formats.font.enabled) {
      const base = 30_000
      const perIcon = selectedItems.length * 600
      const fontBytes = base + perIcon
      perFormat["Icon Font"] = fontBytes
      total += fontBytes
    }
    if (state.formats.components.enabled) {
      const frameworks = state.formats.components.targets.length
      const componentsBytes = frameworks * sum(selectedItems.map((i) => estimateComponent(i.bytes)))
      perFormat[`Components ×${frameworks}`] = componentsBytes
      total += componentsBytes
    }
    return { perFormat, total }
  }, [selectedItems, state.formats])

  const mobileWarning = React.useMemo(() => {
    const isMobile = state.profile === "mobile"
    const heavyPng = state.formats.png.enabled && state.formats.png.sizes.some((s) => s >= 128)
    const largeBundle = estimates.total > 500_000
    return isMobile && (heavyPng || largeBundle)
  }, [state.profile, state.formats.png.enabled, state.formats.png.sizes, estimates.total])

  // Batch progress simulation
  const [isExporting, setIsExporting] = React.useState(false)
  const [progressById, setProgressById] = React.useState<Record<string, number>>({})
  const [batchProgress, setBatchProgress] = React.useState(0)

  const exportingCount = React.useMemo(() => selectedItems.length, [selectedItems])

  function startExport() {
    if (!selectedItems.length) {
      toast.error("Select at least one item to export")
      return
    }
    const config: ExportConfig = {
      profile: state.profile,
      formats: state.formats,
      naming: state.naming,
      colorMappingEnabled: state.colorMappingEnabled,
      colorMap: state.colorMap,
      delivery: state.delivery,
      webhook: state.webhook.enabled
        ? { enabled: true, url: state.webhook.url, secret: state.webhook.secret, events: state.webhook.events }
        : { enabled: false, url: "", secret: "", events: { completed: false, failed: false } },
      selection: selectedItems.map((i) => i.id),
    }
    onExportStart?.(config)
    setIsExporting(true)
    setBatchProgress(0)
    const initProgress: Record<string, number> = {}
    selectedItems.forEach((i) => (initProgress[i.id] = 0))
    setProgressById(initProgress)

    // simulate export
    const start = Date.now()
    const total = selectedItems.length
    const timer = setInterval(() => {
      setProgressById((prev) => {
        const next: Record<string, number> = { ...prev }
        Object.keys(next).forEach((id) => {
          if (next[id] < 100) {
            const step = 8 + Math.round(Math.random() * 12)
            next[id] = Math.min(100, next[id] + step)
          }
        })
        const overall = Math.round((sum(Object.values(next)) / (total * 100)) * 100)
        setBatchProgress(overall)
        if (overall >= 100) {
          clearInterval(timer)
          setIsExporting(false)
          const elapsed = Date.now() - start
          toast.success(`Export complete in ${(elapsed / 1000).toFixed(1)}s`)
          onExportComplete?.({
            batchId: `batch_${start}`,
            success: true,
            processedCount: total,
            totalCount: total,
            archiveSizeBytes: estimates.total,
          })
        }
        return next
      })
    }, 250)
  }

  function resetProgress() {
    setIsExporting(false)
    setProgressById({})
    setBatchProgress(0)
  }

  function toggleSize(sz: number) {
    setState((prev) => {
      const sizes = new Set(prev.formats.png.sizes)
      if (sizes.has(sz)) sizes.delete(sz)
      else sizes.add(sz)
      return { ...prev, formats: { ...prev.formats, png: { ...prev.formats.png, sizes: Array.from(sizes).sort((a, b) => a - b) } }, profile: "custom" }
    })
  }

  const exampleName = React.useMemo(() => {
    const name = state.naming.lowercase ? "arrow-right" : "Arrow-Right"
    const size = state.formats.png.sizes[0] || 24
    const theme = state.formats.png.background
    const sample = state.naming.pattern
      .replaceAll("{name}", name)
      .replaceAll("{size}", String(size))
      .replaceAll("{theme}", theme)
    return sample
  }, [state.naming, state.formats.png.sizes, state.formats.png.background])

  const canExport = selectedItems.length > 0 && (state.formats.svg.enabled || state.formats.png.enabled || state.formats.ico.enabled || state.formats.sprite.enabled || state.formats.font.enabled || (state.formats.components.enabled && state.formats.components.targets.length > 0))

  return (
    <section className={["bg-card text-foreground rounded-lg border shadow-sm", "p-4 sm:p-6 md:p-8", "transition-colors"].join(" ") + (className ? ` ${className}` : "")} style={style} aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight font-heading">Export Hub</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure formats, optimize output, and deliver via download, API/CDN, or webhooks.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge className="bg-secondary text-secondary-foreground border">Stable</Badge>
            <Badge variant="outline" className="border-input text-muted-foreground">v2</Badge>
          </div>
        </div>

        <Tabs defaultValue="profiles" className="w-full mt-4">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="profiles" aria-label="Export profiles">Profiles</TabsTrigger>
            <TabsTrigger value="custom" aria-label="Custom configuration">Custom</TabsTrigger>
            <TabsTrigger value="batch" aria-label="Batch processing">Batch</TabsTrigger>
            <TabsTrigger value="delivery" aria-label="Delivery options">Delivery</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <Card className="bg-card border transition hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" aria-hidden />
                      Web development
                    </CardTitle>
                    <CardDescription className="mt-1">Optimized SVGs, sprite sheet, React components.</CardDescription>
                  </div>
                  {state.profile === "web" ? <Badge className="bg-primary text-primary-foreground">Active</Badge> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm text-muted-foreground list-disc pl-5">
                    <li>SVG (standard optimization)</li>
                    <li>Packed sprite sheet</li>
                    <li>React components</li>
                  </ul>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Naming: {profilePresets.web.naming?.pattern}</div>
                  <Button size="sm" onClick={() => applyPreset("web")} variant={state.profile === "web" ? "default" : "secondary"}>Apply</Button>
                </CardFooter>
              </Card>

              <Card className="bg-card border transition hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" aria-hidden />
                      iOS / Android
                    </CardTitle>
                    <CardDescription className="mt-1">PNG densities and optional React Native components.</CardDescription>
                  </div>
                  {state.profile === "mobile" ? <Badge className="bg-primary text-primary-foreground">Active</Badge> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm text-muted-foreground list-disc pl-5">
                    <li>PNG (24–128px)</li>
                    <li>Transparent background</li>
                    <li>React components</li>
                  </ul>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Naming: {profilePresets.mobile.naming?.pattern}</div>
                  <Button size="sm" onClick={() => applyPreset("mobile")} variant={state.profile === "mobile" ? "default" : "secondary"}>Apply</Button>
                </CardFooter>
              </Card>

              <Card className="bg-card border transition hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" aria-hidden />
                      Design handoff
                    </CardTitle>
                    <CardDescription className="mt-1">Original SVGs plus reference PNGs for QA.</CardDescription>
                  </div>
                  {state.profile === "handoff" ? <Badge className="bg-primary text-primary-foreground">Active</Badge> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm text-muted-foreground list-disc pl-5">
                    <li>SVG (no optimization)</li>
                    <li>PNG (1x/2x/3x)</li>
                    <li>Light previews</li>
                  </ul>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Naming: {profilePresets.handoff.naming?.pattern}</div>
                  <Button size="sm" onClick={() => applyPreset("handoff")} variant={state.profile === "handoff" ? "default" : "secondary"}>Apply</Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    Output formats
                  </CardTitle>
                  <CardDescription>Select one or more formats and fine-tune settings.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="fmt-svg"
                          checked={state.formats.svg.enabled}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, svg: { ...prev.formats.svg, enabled: Boolean(v) } }, profile: "custom" }))}
                        />
                        <div>
                          <Label htmlFor="fmt-svg" className="cursor-pointer">SVG</Label>
                          <p className="text-xs text-muted-foreground">Resolution-independent, ideal for web.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Optimize</Label>
                        <Select
                          value={state.formats.svg.optimize}
                          onValueChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, svg: { ...prev.formats.svg, optimize: v as SvgOptimize } }, profile: "custom" }))}
                        >
                          <SelectTrigger className="w-[140px] bg-background">
                            <SelectValue placeholder="Optimization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="svg-stripfill"
                            checked={state.formats.svg.stripFill}
                            onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, svg: { ...prev.formats.svg, stripFill: v } }, profile: "custom" }))}
                          />
                          <Label htmlFor="svg-stripfill" className="text-xs">Strip fills</Label>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-input" />

                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="fmt-png"
                            checked={state.formats.png.enabled}
                            onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, png: { ...prev.formats.png, enabled: Boolean(v) } }, profile: "custom" }))}
                          />
                          <div>
                            <Label htmlFor="fmt-png" className="cursor-pointer">PNG</Label>
                            <p className="text-xs text-muted-foreground">Specify sizes for raster exports.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Background</Label>
                          <Select
                            value={state.formats.png.background}
                            onValueChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, png: { ...prev.formats.png, background: v as "transparent" | "light" | "dark" } }, profile: "custom" }))}
                          >
                            <SelectTrigger className="w-[160px] bg-background">
                              <SelectValue placeholder="Background" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transparent">Transparent</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {state.formats.png.enabled ? (
                        <div className="flex flex-wrap gap-2">
                          {ALL_PNG_SIZES.map((sz) => {
                            const on = state.formats.png.sizes.includes(sz)
                            return (
                              <button
                                key={sz}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleSize(sz)}
                                className={[
                                  "inline-flex items-center gap-1 rounded-md border text-xs px-2.5 py-1.5 transition",
                                  on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground hover:bg-accent"
                                ].join(" ")}
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                                {sz}px
                              </button>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>

                    <Separator className="bg-input" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="fmt-ico"
                          checked={state.formats.ico.enabled}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, ico: { ...prev.formats.ico, enabled: Boolean(v) } }, profile: "custom" }))}
                        />
                        <div>
                          <Label htmlFor="fmt-ico" className="cursor-pointer">ICO</Label>
                          <p className="text-xs text-muted-foreground">Windows favicon bundle.</p>
                        </div>
                      </div>
                      <FileType2 className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <Separator className="bg-input" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="fmt-sprite"
                          checked={state.formats.sprite.enabled}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, sprite: { ...prev.formats.sprite, enabled: Boolean(v) } }, profile: "custom" }))}
                        />
                        <div>
                          <Label htmlFor="fmt-sprite" className="cursor-pointer">Sprite sheet</Label>
                          <p className="text-xs text-muted-foreground">Pack icons into a single sheet.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Layout</Label>
                        <Select
                          value={state.formats.sprite.layout}
                          onValueChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, sprite: { ...prev.formats.sprite, layout: v as "horizontal" | "vertical" | "packed" } }, profile: "custom" }))}
                        >
                          <SelectTrigger className="w-[160px] bg-background">
                            <SelectValue placeholder="Layout" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horizontal">Horizontal</SelectItem>
                            <SelectItem value="vertical">Vertical</SelectItem>
                            <SelectItem value="packed">Packed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="bg-input" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="fmt-font"
                          checked={state.formats.font.enabled}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, font: { ...prev.formats.font, enabled: Boolean(v) } }, profile: "custom" }))}
                        />
                        <div>
                          <Label htmlFor="fmt-font" className="cursor-pointer">Icon font</Label>
                          <p className="text-xs text-muted-foreground">Single font file containing glyphs.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="font-lig"
                          checked={state.formats.font.includeLigatures}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, font: { ...prev.formats.font, includeLigatures: v } }, profile: "custom" }))}
                        />
                        <Label htmlFor="font-lig" className="text-xs">Ligatures</Label>
                      </div>
                    </div>

                    <Separator className="bg-input" />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="fmt-components"
                          checked={state.formats.components.enabled}
                          onCheckedChange={(v) => setState((prev) => ({ ...prev, formats: { ...prev.formats, components: { ...prev.formats.components, enabled: Boolean(v) } }, profile: "custom" }))}
                        />
                        <div>
                          <Label htmlFor="fmt-components" className="cursor-pointer">Framework components</Label>
                          <p className="text-xs text-muted-foreground">Generate component wrappers.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(["react", "vue", "svelte"] as const).map((fw) => {
                          const on = state.formats.components.targets.includes(fw)
                          return (
                            <button
                              key={fw}
                              type="button"
                              onClick={() =>
                                setState((prev) => {
                                  const set = new Set(prev.formats.components.targets)
                                  if (set.has(fw)) set.delete(fw)
                                  else set.add(fw)
                                  return { ...prev, formats: { ...prev.formats, components: { ...prev.formats.components, targets: Array.from(set) as Array<"react" | "vue" | "svelte"> } }, profile: "custom" }
                                })
                              }
                              className={[
                                "inline-flex items-center gap-1 rounded-md border text-xs px-2.5 py-1.5 transition",
                                on ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground hover:bg-accent"
                              ].join(" ")}
                              aria-pressed={on}
                            >
                              <FileCode2 className="h-3.5 w-3.5" />
                              {fw}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-card border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Frame className="h-5 w-5 text-primary" />
                      Naming & tokens
                    </CardTitle>
                    <CardDescription>Define file naming and optional color token mapping.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="naming-pattern">File naming pattern</Label>
                        <Input
                          id="naming-pattern"
                          className="bg-background"
                          value={state.naming.pattern}
                          onChange={(e) => setState((p) => ({ ...p, naming: { ...p.naming, pattern: e.target.value }, profile: "custom" }))}
                          placeholder="{name}-{size}-{theme}"
                        />
                        <p className="text-xs text-muted-foreground">Available: &#123;name&#125;, &#123;size&#125;, &#123;theme&#125;</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="invisible block">Lowercase</Label>
                        <div className="flex items-center gap-2 rounded-md border p-2.5 bg-background">
                          <Switch
                            id="lowercase"
                            checked={state.naming.lowercase}
                            onCheckedChange={(v) => setState((p) => ({ ...p, naming: { ...p.naming, lowercase: v }, profile: "custom" }))}
                          />
                          <Label htmlFor="lowercase" className="text-sm">Lowercase filenames</Label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-md border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Preview</span>
                        <Badge variant="outline" className="text-xs border-input">{exampleName}.svg</Badge>
                      </div>
                    </div>

                    <Separator className="bg-input" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            id="colormap-enabled"
                            checked={state.colorMappingEnabled}
                            onCheckedChange={(v) => setState((p) => ({ ...p, colorMappingEnabled: v, profile: "custom" }))}
                          />
                          <Label htmlFor="colormap-enabled">Enable color token mapping</Label>
                        </div>
                        <Badge variant="outline" className="border-input text-muted-foreground">Advanced</Badge>
                      </div>
                      {state.colorMappingEnabled ? (
                        <div className="space-y-2">
                          {state.colorMap.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_140px_40px] gap-2">
                              <Input
                                className="bg-background"
                                aria-label={`Token ${idx + 1}`}
                                value={row.token}
                                onChange={(e) =>
                                  setState((p) => {
                                    const copy = [...p.colorMap]
                                    copy[idx] = { ...copy[idx], token: e.target.value }
                                    return { ...p, colorMap: copy, profile: "custom" }
                                  })
                                }
                                placeholder="brand.primary"
                              />
                              <Input
                                className="bg-background"
                                aria-label={`Hex ${idx + 1}`}
                                value={row.hex}
                                onChange={(e) =>
                                  setState((p) => {
                                    const copy = [...p.colorMap]
                                    copy[idx] = { ...copy[idx], hex: e.target.value }
                                    return { ...p, colorMap: copy, profile: "custom" }
                                  })
                                }
                                placeholder="#000000"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="justify-center"
                                onClick={() =>
                                  setState((p) => {
                                    const copy = [...p.colorMap]
                                    copy.splice(idx, 1)
                                    return { ...p, colorMap: copy, profile: "custom" }
                                  })
                                }
                                aria-label="Remove color mapping row"
                              >
                                <Box className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setState((p) => ({ ...p, colorMap: [...p.colorMap, { token: "", hex: "" }], profile: "custom" }))}
                            >
                              Add mapping
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Boxes className="h-5 w-5 text-primary" />
                      Estimates & quality
                    </CardTitle>
                    <CardDescription>Preview export size and bundle impact.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-md border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Items selected</span>
                        <Badge variant="outline" className="border-input">{selectedItems.length}</Badge>
                      </div>
                      <Separator className="my-2 bg-input" />
                      <div className="space-y-1">
                        {Object.entries(estimates.perFormat).map(([label, val]) => (
                          <div key={label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium">{bytesToHuman(val)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2 bg-input" />
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Estimated total</span>
                        <span className="text-sm font-semibold">{bytesToHuman(estimates.total)}</span>
                      </div>
                    </div>

                    {mobileWarning ? (
                      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-700">Bundle impact warning for mobile</p>
                          <p className="text-xs text-amber-700/90">Consider reducing PNG sizes or using SVG where possible to keep app bundles lean.</p>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-md border bg-background p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        Exports use lossless processing and preserve accessibility attributes.
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setState((p) => ({ ...p, profile: "custom" }))}>Save as custom</Button>
                    <Button disabled={!canExport} onClick={startExport}>
                      {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Export now
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="mt-4">
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-primary" />
                  Batch processing
                </CardTitle>
                <CardDescription>Select items to include and track progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length === 0 ? (
                  <div className="rounded-md border bg-muted p-6 text-center text-sm text-muted-foreground">No items available.</div>
                ) : (
                  <div className="max-h-[320px] overflow-auto rounded-md border bg-background">
                    <div role="table" className="min-w-[560px]">
                      <div role="row" className="grid grid-cols-[minmax(120px,1fr)_120px_140px_80px] items-center gap-3 px-3 py-2 border-b bg-muted/50 text-xs text-muted-foreground">
                        <div role="columnheader">Item</div>
                        <div role="columnheader" className="text-right">Base size</div>
                        <div role="columnheader">Progress</div>
                        <div role="columnheader" className="text-right">Include</div>
                      </div>
                      {items.map((it) => {
                        const selected = !!state.selection[it.id]
                        const prog = progressById[it.id] ?? 0
                        return (
                          <div key={it.id} role="row" className="grid grid-cols-[minmax(120px,1fr)_120px_140px_80px] items-center gap-3 px-3 py-2 border-b">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm">{it.name}</span>
                                <span className="text-xs text-muted-foreground">#{it.id}</span>
                              </div>
                            </div>
                            <div className="text-right text-sm text-muted-foreground">{bytesToHuman(it.bytes)}</div>
                            <div className="flex items-center gap-2">
                              <Progress value={prog} className="h-2 bg-accent" />
                              {prog >= 100 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                            </div>
                            <div className="flex justify-end">
                              <Switch
                                checked={selected}
                                onCheckedChange={(v) => setState((p) => ({ ...p, selection: { ...p.selection, [it.id]: v }, profile: "custom" }))}
                                aria-label={`Include ${it.name}`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm">Overall progress</Label>
                      <Badge variant="outline" className="border-input">{batchProgress}%</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={resetProgress}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button onClick={startExport} disabled={!canExport || isExporting}>
                        {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                        Start export
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={batchProgress} className="h-2 bg-accent" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Estimated archive: {bytesToHuman(estimates.total)}</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => toast.message("Queued batch", { description: "Your export has been queued." })}>Queue</Button>
                  <Button disabled={!canExport} onClick={startExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export now
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="delivery" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-primary" />
                    Download & local use
                  </CardTitle>
                  <CardDescription>Directly download a ZIP archive of all exports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border bg-background p-3">
                    <div className="text-sm">
                      <div className="font-medium">Archive size (est.)</div>
                      <div className="text-xs text-muted-foreground">{bytesToHuman(estimates.total)}</div>
                    </div>
                    <Button disabled={!canExport} onClick={startExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Download ZIP
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    Includes manifest.json with checksums and metadata.
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    API / CDN delivery
                  </CardTitle>
                  <CardDescription>Automate delivery for CI and apps. Pro required.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="api-enabled"
                        checked={state.delivery.apiEnabled && canUsePro}
                        onCheckedChange={(v) => {
                          if (!canUsePro) {
                            toast.error("Pro required for API/CDN delivery")
                            return
                          }
                          setState((p) => ({ ...p, delivery: { ...p.delivery, apiEnabled: v } }))
                        }}
                      />
                      <Label htmlFor="api-enabled">Enable API delivery</Label>
                    </div>
                    {!canUsePro ? <Badge variant="outline" className="border-destructive text-destructive">Pro</Badge> : <Badge variant="outline" className="border-input">Enabled</Badge>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-base">API base URL</Label>
                      <Input
                        id="api-base"
                        className="bg-background"
                        placeholder="https://api.example.com"
                        disabled={!canUsePro}
                        value={state.delivery.apiBaseUrl}
                        onChange={(e) => setState((p) => ({ ...p, delivery: { ...p.delivery, apiBaseUrl: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="api-token">Access token</Label>
                      <Input
                        id="api-token"
                        className="bg-background"
                        placeholder="••••••••••"
                        disabled={!canUsePro}
                        value={state.delivery.apiToken}
                        onChange={(e) => setState((p) => ({ ...p, delivery: { ...p.delivery, apiToken: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cdn-ttl">CDN cache (seconds)</Label>
                      <Input
                        id="cdn-ttl"
                        type="number"
                        className="bg-background"
                        min={60}
                        step={60}
                        placeholder="3600"
                        disabled={!canUsePro}
                        value={state.delivery.cdnCacheSeconds || 3600}
                        onChange={(e) => setState((p) => ({ ...p, delivery: { ...p.delivery, cdnCacheSeconds: Number(e.target.value) } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endpoint test</Label>
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={!canUsePro}
                        onClick={() => {
                          if (!state.delivery.apiBaseUrl) {
                            toast.error("Enter API base URL")
                            return
                          }
                          toast.message("API check", { description: "Endpoint is reachable (simulated)." })
                        }}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Test connection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5 text-primary" />
                    Webhook (Teams)
                  </CardTitle>
                  <CardDescription>Notify your pipeline when exports complete or fail.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="wh-enabled"
                        checked={state.webhook.enabled && canUseTeams}
                        onCheckedChange={(v) => {
                          if (!canUseTeams) {
                            toast.error("Teams required for webhooks")
                            return
                          }
                          setState((p) => ({ ...p, webhook: { ...p.webhook, enabled: v } }))
                        }}
                      />
                      <Label htmlFor="wh-enabled">Enable webhook</Label>
                    </div>
                    {!canUseTeams ? <Badge variant="outline" className="border-destructive text-destructive">Teams</Badge> : <Badge variant="outline" className="border-input">Enabled</Badge>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="wh-url">Webhook URL</Label>
                      <Input
                        id="wh-url"
                        className="bg-background"
                        placeholder="https://hooks.example.com/exports"
                        disabled={!canUseTeams}
                        value={state.webhook.url}
                        onChange={(e) => setState((p) => ({ ...p, webhook: { ...p.webhook, url: e.target.value } }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wh-secret">Signing secret</Label>
                      <Input
                        id="wh-secret"
                        className="bg-background"
                        placeholder="••••••••••"
                        disabled={!canUseTeams}
                        value={state.webhook.secret}
                        onChange={(e) => setState((p) => ({ ...p, webhook: { ...p.webhook, secret: e.target.value } }))}
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-md border bg-background p-3 space-y-3">
                      <div className="text-sm font-medium">Events</div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="evt-completed"
                          disabled={!canUseTeams}
                          checked={state.webhook.events.completed}
                          onCheckedChange={(v) => setState((p) => ({ ...p, webhook: { ...p.webhook, events: { ...p.webhook.events, completed: Boolean(v) } } }))}
                        />
                        <Label htmlFor="evt-completed">export.completed</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="evt-failed"
                          disabled={!canUseTeams}
                          checked={state.webhook.events.failed}
                          onCheckedChange={(v) => setState((p) => ({ ...p, webhook: { ...p.webhook, events: { ...p.webhook.events, failed: Boolean(v) } } }))}
                        />
                        <Label htmlFor="evt-failed">export.failed</Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wh-preview">Payload preview</Label>
                      <Textarea
                        id="wh-preview"
                        className="bg-background min-h-[120px]"
                        readOnly
                        value={JSON.stringify(
                          {
                            id: "evt_123",
                            type: "export.completed",
                            ts: new Date().toISOString(),
                            items: selectedItems.map((i) => i.name),
                            bytes: estimates.total,
                          },
                          null,
                          2
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    disabled={!canUseTeams}
                    onClick={() => {
                      if (!state.webhook.url) {
                        toast.error("Enter webhook URL")
                        return
                      }
                      toast.message("Webhook test", { description: "Delivered test event (simulated)." })
                    }}
                  >
                    Send test event
                  </Button>
                  <Button
                    onClick={() => {
                      toast.success("Delivery options saved")
                    }}
                  >
                    Save delivery
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}