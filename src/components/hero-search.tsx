"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Search as SearchIcon,
  Info,
  Loader2,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type IconSource = "community" | "pro"
export type IconStyle = "outline" | "filled"
export type IconLicense = "free" | "pro"

export interface IconResult {
  id: string
  name: string
  source: IconSource
  style: IconStyle
  stroke: number
  radius: number
  license: IconLicense
}

export interface HeroSearchProps {
  className?: string
  layout?: "compact" | "spacious"
  defaultQuery?: string
  defaultFilters?: Partial<Filters>
  onSearch?: (query: string, filters: Filters) => Promise<IconResult[]>
  initialResults?: IconResult[]
  showPreview?: boolean
}

interface Filters {
  style: IconStyle
  stroke: 1 | 1.5 | 2
  radius: number
  license: IconLicense
  sources: IconSource[]
}

const DEFAULT_FILTERS: Filters = {
  style: "outline",
  stroke: 1.5,
  radius: 2,
  license: "free",
  sources: ["community", "pro"],
}

const MOCK_DATA: IconResult[] = [
  { id: "1", name: "arrow-right", source: "community", style: "outline", stroke: 1.5, radius: 2, license: "free" },
  { id: "2", name: "home", source: "community", style: "outline", stroke: 2, radius: 1, license: "free" },
  { id: "3", name: "heart", source: "pro", style: "filled", stroke: 1, radius: 3, license: "pro" },
  { id: "4", name: "camera", source: "pro", style: "outline", stroke: 1.5, radius: 2, license: "pro" },
  { id: "5", name: "bell", source: "community", style: "filled", stroke: 2, radius: 4, license: "free" },
  { id: "6", name: "star", source: "pro", style: "filled", stroke: 1.5, radius: 0, license: "pro" },
  { id: "7", name: "settings", source: "community", style: "outline", stroke: 1, radius: 2, license: "free" },
  { id: "8", name: "folder", source: "community", style: "filled", stroke: 2, radius: 2, license: "free" },
  { id: "9", name: "cloud", source: "pro", style: "outline", stroke: 1.5, radius: 1, license: "pro" },
  { id: "10", name: "check", source: "community", style: "outline", stroke: 1, radius: 0, license: "free" },
  { id: "11", name: "play", source: "pro", style: "filled", stroke: 2, radius: 6, license: "pro" },
  { id: "12", name: "mail", source: "community", style: "outline", stroke: 1.5, radius: 2, license: "free" },
]

export default function HeroSearch(props: HeroSearchProps) {
  const {
    className,
    layout = "spacious",
    defaultQuery = "",
    defaultFilters,
    onSearch,
    initialResults,
    showPreview = true,
  } = props

  const [query, setQuery] = useState(defaultQuery)
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, ...defaultFilters })
  const [results, setResults] = useState<IconResult[]>(initialResults ?? [])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(Boolean(defaultQuery) || Boolean(initialResults?.length))

  const debouncedQuery = useDebounce(query, 300)
  const debouncedFilters = useDebouncedFilters(filters, 300)

  // Real-time search whenever query or filters change
  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      try {
        const r = onSearch
          ? await onSearch(debouncedQuery, debouncedFilters)
          : await mockSearch(debouncedQuery, debouncedFilters)
        if (active) {
          setResults(r)
          setHasSearched(true)
        }
      } catch (e) {
        if (active) {
          toast("Something went wrong while searching.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    return () => {
      active = false
    }
  }, [debouncedQuery, debouncedFilters, onSearch])

  const countText = useMemo(() => {
    if (loading && !results.length) return "Searching…"
    if (!hasSearched) return ""
    return `${results.length} result${results.length === 1 ? "" : "s"}`
  }, [loading, results.length, hasSearched])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Immediate search on submit (already debounced search handles typing)
    setHasSearched(true)
  }

  function handleClear() {
    setQuery("")
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    toast("Filters reset")
  }

  function toggleSource(src: IconSource, checked: boolean) {
    const next = checked ? Array.from(new Set([...filters.sources, src])) : filters.sources.filter(s => s !== src)
    if (next.length === 0) {
      toast("At least one source must be selected")
      return
    }
    setFilters(f => ({ ...f, sources: next }))
  }

  function onLicenseChange(next: IconLicense) {
    setFilters(f => ({ ...f, license: next }))
    if (next === "free") {
      toast("Free icons require attribution.")
    } else {
      toast("Pro icons require no attribution.")
    }
  }

  const paddingY = layout === "spacious" ? "py-8 sm:py-10" : "py-4 sm:py-6"

  return (
    <section
      className={cn(
        "w-full bg-background text-foreground",
        paddingY,
        className,
      )}
      aria-label="Icon search hero section"
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground">
            FIND ICONS FAST
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Search and refine by style, weight, radius, license, and source. Instant results with clear attribution guidance.
          </p>
        </div>

        <div className="rounded-2xl border bg-card shadow-sm p-4 sm:p-6">
          <form role="search" aria-label="Search icons" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex w-full items-center gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder='Search icons, e.g., "arrow", "home", "play"...'
                  aria-label="Search icons"
                  className="h-14 sm:h-16 rounded-xl pl-11 pr-11 text-base sm:text-lg bg-popover focus-visible:ring-2 focus-visible:ring-ring"
                />
                {query.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <Button
                type="submit"
                className="h-14 sm:h-16 px-5 sm:px-6 rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition"
              >
                <SearchIcon className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Advanced filters
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-4 w-4" aria-hidden="true" />
                      {filters.license === "free" ? "Free icons require attribution" : "Pro icons need no attribution"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-popover border rounded-lg shadow-sm">
                    <p className="text-sm">
                      {filters.license === "free"
                        ? "Include a link back to the source when using free icons."
                        : "Use Pro icons without credit in commercial projects."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <fieldset className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Style
                </legend>
                <RadioGroup
                  value={filters.style}
                  onValueChange={(v) => setFilters(f => ({ ...f, style: v as IconStyle }))}
                  className="grid grid-cols-2 gap-2"
                  aria-label="Icon style"
                >
                  <div>
                    <RadioGroupItem value="outline" id="style-outline" className="peer sr-only" />
                    <Label
                      htmlFor="style-outline"
                      className="inline-flex items-center justify-center w-full rounded-lg border px-3 py-2 text-sm transition cursor-pointer
                      peer-data-[state=checked]:bg-secondary peer-data-[state=checked]:text-foreground hover:bg-accent"
                    >
                      Outline
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="filled" id="style-filled" className="peer sr-only" />
                    <Label
                      htmlFor="style-filled"
                      className="inline-flex items-center justify-center w-full rounded-lg border px-3 py-2 text-sm transition cursor-pointer
                      peer-data-[state=checked]:bg-secondary peer-data-[state=checked]:text-foreground hover:bg-accent"
                    >
                      Filled
                    </Label>
                  </div>
                </RadioGroup>
              </fieldset>

              <fieldset className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stroke width
                </legend>
                <RadioGroup
                  value={String(filters.stroke)}
                  onValueChange={(v) => setFilters(f => ({ ...f, stroke: Number(v) as 1 | 1.5 | 2 }))}
                  className="grid grid-cols-4 gap-2"
                  aria-label="Stroke width"
                >
                  {["1", "1.5", "2", "2"].map((v, i) => {
                    const label = i < 3 ? v : "2+" // present a larger weight chip feel
                    const value = i < 3 ? v : "2"
                    const id = `stroke-${i}`
                    return (
                      <div key={id}>
                        <RadioGroupItem value={value} id={id} className="peer sr-only" />
                        <Label
                          htmlFor={id}
                          className="inline-flex items-center justify-center w-full rounded-lg border px-3 py-2 text-sm transition cursor-pointer
                          peer-data-[state=checked]:bg-secondary peer-data-[state=checked]:text-foreground hover:bg-accent"
                        >
                          {label}px
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </fieldset>

              <fieldset className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Corner radius
                </legend>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[filters.radius]}
                    onValueChange={(v) => setFilters(f => ({ ...f, radius: clamp(v[0] ?? 0, 0, 8) }))}
                    min={0}
                    max={8}
                    step={1}
                    aria-label="Corner radius"
                    className="flex-1"
                  />
                  <Badge variant="secondary" className="rounded-md">
                    r{filters.radius}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Adjust rounding for a softer or sharper look.
                </p>
              </fieldset>

              <fieldset className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  License
                </legend>
                <RadioGroup
                  value={filters.license}
                  onValueChange={(v) => onLicenseChange(v as IconLicense)}
                  className="grid grid-cols-2 gap-2"
                  aria-label="License type"
                >
                  <div>
                    <RadioGroupItem value="free" id="license-free" className="peer sr-only" />
                    <Label
                      htmlFor="license-free"
                      className="inline-flex items-center justify-between w-full rounded-lg border px-3 py-2 text-sm transition cursor-pointer
                      peer-data-[state=checked]:bg-secondary hover:bg-accent"
                    >
                      <span>Free</span>
                      <Badge variant="secondary" className="ml-2">Attrib</Badge>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="pro" id="license-pro" className="peer sr-only" />
                    <Label
                      htmlFor="license-pro"
                      className="inline-flex items-center justify-between w-full rounded-lg border px-3 py-2 text-sm transition cursor-pointer
                      peer-data-[state=checked]:bg-secondary hover:bg-accent"
                    >
                      <span>Pro</span>
                      <Badge className="ml-2 bg-primary text-primary-foreground">No-Attrib</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </fieldset>

              <fieldset className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source
                </legend>
                <div className="grid grid-cols-2 gap-2" role="group" aria-label="Icon sources">
                  <label
                    htmlFor="source-community"
                    className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-accent transition"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Checkbox
                        id="source-community"
                        checked={filters.sources.includes("community")}
                        onCheckedChange={(c) => toggleSource("community", Boolean(c))}
                        aria-label="Community source"
                      />
                      Community
                    </div>
                  </label>
                  <label
                    htmlFor="source-pro"
                    className="inline-flex items-center justify-between rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-accent transition"
                  >
                    <div className="inline-flex items-center gap-2">
                      <Checkbox
                        id="source-pro"
                        checked={filters.sources.includes("pro")}
                        onCheckedChange={(c) => toggleSource("pro", Boolean(c))}
                        aria-label="Pro source"
                      />
                      Pro
                    </div>
                    <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </label>
                </div>
              </fieldset>

              <div className="rounded-xl border bg-popover p-3 sm:p-4">
                <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tips
                </legend>
                <p className="text-sm text-muted-foreground">
                  Use short, specific keywords. Combine filters to quickly narrow down results.
                </p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Pro icons are optimized for production use.
                </div>
              </div>
            </div>
          </form>

          <Separator className="my-4" />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex items-center gap-3">
              <div className="inline-flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
                ) : (
                  <SearchIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="text-sm text-muted-foreground" aria-live="polite">
                  {countText}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <Badge variant="secondary" className="rounded-md">{capitalize(filters.style)}</Badge>
                <Badge variant="secondary" className="rounded-md">{filters.stroke}px</Badge>
                <Badge variant="secondary" className="rounded-md">r{filters.radius}</Badge>
                <Badge variant="secondary" className="rounded-md">{filters.license === "free" ? "Free+Attrib" : "Pro"}</Badge>
                <Badge variant="secondary" className="rounded-md">
                  {filters.sources.join(" + ").replace("community", "Community").replace("pro", "Pro")}
                </Badge>
              </div>
            </div>
            <div className="inline-flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={resetFilters}
                className="h-9 rounded-lg hover:bg-accent"
              >
                Reset filters
              </Button>
            </div>
          </div>

          {showPreview ? (
            <div className="mt-4">
              {loading ? (
                <PreviewSkeleton />
              ) : results.length === 0 && hasSearched ? (
                <EmptyState onReset={resetFilters} />
              ) : (
                <ResultsPreview results={results.slice(0, 8)} filters={filters} />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function ResultsPreview({ results, filters }: { results: IconResult[]; filters: Filters }) {
  return (
    <div
      role="region"
      aria-label="Search results preview"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4"
    >
      {results.map((r) => (
        <div
          key={r.id}
          className="group relative aspect-square rounded-xl border bg-popover overflow-hidden"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <IconPlaceholder style={filters.style} stroke={filters.stroke} />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className="flex items-center justify-between rounded-lg bg-card/80 backdrop-blur px-2 py-1">
              <span className="truncate text-xs text-foreground">{r.name}</span>
              <span className="text-[10px] text-muted-foreground">{r.source === "pro" ? "Pro" : "Community"}</span>
            </div>
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
            <div className="absolute inset-0 ring-1 ring-border rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

function IconPlaceholder({ style, stroke }: { style: IconStyle; stroke: number }) {
  // Simple geometry to hint at the selected style and stroke
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="text-foreground"
    >
      {style === "filled" ? (
        <g fill="currentColor">
          <rect x="10" y="10" width="28" height="28" rx="8" opacity="0.12" />
          <circle cx="24" cy="24" r="8" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
          <rect x="10" y="10" width="28" height="28" rx="8" />
          <path d="M18 24h12M24 18v12" />
        </g>
      )}
    </svg>
  )
}

function PreviewSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl border bg-popover overflow-hidden">
          <div className="h-full w-full animate-pulse bg-muted" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 sm:gap-4 rounded-xl border bg-popover p-6"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <SearchIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-medium">No icons found</p>
        <p className="text-sm text-muted-foreground">
          Try different keywords or adjust your filters.
        </p>
      </div>
      <div className="inline-flex items-center gap-2">
        <Button variant="secondary" className="rounded-lg" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  )
}

async function mockSearch(q: string, f: Filters): Promise<IconResult[]> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 250))
  const query = q.trim().toLowerCase()
  let data = MOCK_DATA.slice()

  if (query) {
    data = data.filter((d) => d.name.includes(query))
  }
  data = data.filter((d) => d.style === f.style)
  data = data.filter((d) => d.license === f.license)
  data = data.filter((d) => f.sources.includes(d.source))
  // Stroke filtering: allow approximate 0.25 tolerance for demo
  data = data.filter((d) => Math.abs(d.stroke - f.stroke) <= 0.25)

  return data
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function capitalize(s: string) {
  return s.slice(0, 1).toUpperCase() + s.slice(1)
}

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function useDebouncedFilters(filters: Filters, delay = 300) {
  const [debounced, setDebounced] = useState(filters)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(filters), delay)
    return () => clearTimeout(t)
  }, [filters, delay])
  return debounced
}