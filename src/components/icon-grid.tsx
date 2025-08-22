"use client"

import * as React from "react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Button
} from "@/components/ui/button"
import {
  Badge
} from "@/components/ui/badge"
import {
  Checkbox
} from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Skeleton
} from "@/components/ui/skeleton"
import {
  Separator
} from "@/components/ui/separator"
import {
  Edit3,
  FolderPlus,
  Download,
  MoreHorizontal,
  ShieldCheck,
  AlertCircle,
  Info,
  Loader2
} from "lucide-react"

export type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

export interface IconItem {
  id: string
  name: string
  component?: IconComponent
  src?: string
  tags?: string[]
  license?: {
    type: string
    status?: "free" | "pro" | "restricted" | string
  }
  meta?: {
    style?: string // e.g. "Outline" | "Solid" | "Duotone"
    stroke?: number // e.g. 1.5 | 2
    alignment?: string // e.g. "center" | "inner" | "outer"
    sizeVariants?: number[] // e.g. [16, 24, 32, 48]
  }
}

export interface IconGridProps {
  items: IconItem[]
  isLoading?: boolean
  isLoadingMore?: boolean
  error?: string | null
  hasMore?: boolean
  disableInfiniteScroll?: boolean
  onRetry?: () => void
  onLoadMore?: () => void | Promise<void>
  onEdit?: (item: IconItem) => void
  onAddToCollection?: (ids: string[]) => void
  onExport?: (ids: string[]) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  layout?: "comfortable" | "compact"
  className?: string
  style?: React.CSSProperties
}

export default function IconGrid({
  items,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  disableInfiniteScroll,
  onRetry,
  onLoadMore,
  onEdit,
  onAddToCollection,
  onExport,
  selectedIds,
  onSelectionChange,
  layout = "comfortable",
  className,
  style,
}: IconGridProps) {
  const [internalSelected, setInternalSelected] = React.useState<string[]>(selectedIds ?? [])
  const isControlled = selectedIds !== undefined
  const selected = isControlled ? selectedIds! : internalSelected

  React.useEffect(() => {
    if (isControlled) {
      setInternalSelected(selectedIds!)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, selectedIds?.join("|")])

  const updateSelection = React.useCallback(
    (next: string[]) => {
      if (!isControlled) setInternalSelected(next)
      onSelectionChange?.(next)
    },
    [isControlled, onSelectionChange],
  )

  const toggleSelect = React.useCallback(
    (id: string) => {
      const set = new Set(selected)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      updateSelection(Array.from(set))
    },
    [selected, updateSelection],
  )

  const selectAllVisible = React.useCallback(
    (checked: boolean | string) => {
      if (checked) {
        updateSelection(Array.from(new Set([...selected, ...items.map((i) => i.id)])))
      } else {
        updateSelection(selected.filter((id) => !items.some((i) => i.id === id)))
      }
    },
    [items, selected, updateSelection],
  )

  const clearSelection = React.useCallback(() => updateSelection([]), [updateSelection])

  const onBulkAdd = React.useCallback(() => {
    if (!selected.length) return
    if (onAddToCollection) onAddToCollection(selected)
    else toast.success(`Added ${selected.length} icon${selected.length > 1 ? "s" : ""} to collection`)
  }, [onAddToCollection, selected])

  const onBulkExport = React.useCallback(() => {
    if (!selected.length) return
    if (onExport) onExport(selected)
    else toast.success(`Exported ${selected.length} icon${selected.length > 1 ? "s" : ""}`)
  }, [onExport, selected])

  // Infinite scroll sentinel
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  React.useEffect(() => {
    if (disableInfiniteScroll) return
    if (!hasMore) return
    if (!sentinelRef.current) return
    const el = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && !isLoadingMore && !isLoading) {
          onLoadMore?.()
        }
      },
      { rootMargin: "200px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [disableInfiniteScroll, hasMore, isLoading, isLoadingMore, onLoadMore])

  // Compute selection indeterminate for visible
  const visibleIds = React.useMemo(() => items.map((i) => i.id), [items])
  const visibleSelectedCount = React.useMemo(
    () => selected.filter((id) => visibleIds.includes(id)).length,
    [selected, visibleIds],
  )
  const visibleAllSelected = items.length > 0 && visibleSelectedCount === items.length
  const visibleIndeterminate = visibleSelectedCount > 0 && !visibleAllSelected

  return (
    <TooltipProvider delayDuration={200}>
      <section
        className={cn(
          "w-full bg-background",
          className,
        )}
        style={style}
        aria-busy={isLoading ? "true" : "false"}
      >
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              aria-label="Select all visible icons"
              checked={visibleAllSelected ? true : visibleIndeterminate ? "indeterminate" : false}
              onCheckedChange={selectAllVisible}
            />
            <div className="text-sm text-muted-foreground">
              {items.length > 0 ? `${items.length} result${items.length > 1 ? "s" : ""}` : "No results"}
              {selected.length > 0 && (
                <span className="ml-2 text-foreground font-medium">
                  • {selected.length} selected
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selected.length > 0 ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onBulkAdd}
                  className="bg-secondary text-foreground hover:bg-accent"
                >
                  <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add to collection
                </Button>
                <Button
                  size="sm"
                  onClick={onBulkExport}
                  className="bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-muted-foreground hover:bg-accent"
                >
                  Clear
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : items.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <>
            <ul
              className={cn(
                "grid gap-3",
                layout === "compact"
                  ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
              )}
              role="list"
              aria-label="Icon results"
            >
              {isLoading && items.length === 0
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={`s-${i}`} />)
                : items.map((item) => (
                    <li key={item.id} role="listitem">
                      <IconCard
                        item={item}
                        selected={selected.includes(item.id)}
                        onToggleSelect={() => toggleSelect(item.id)}
                        onEdit={() => {
                          if (onEdit) onEdit(item)
                          else toast.message("Open in editor", { description: item.name })
                        }}
                        onAdd={() => {
                          if (onAddToCollection) onAddToCollection([item.id])
                          else toast.success(`Added "${item.name}" to collection`)
                        }}
                        onExport={() => {
                          if (onExport) onExport([item.id])
                          else toast.success(`Exported "${item.name}"`)
                        }}
                        layout={layout}
                      />
                    </li>
                  ))}
              {isLoadingMore &&
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`sm-${i}`} />)}
            </ul>

            {hasMore ? (
              disableInfiniteScroll ? (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => onLoadMore?.()}
                    disabled={Boolean(isLoadingMore)}
                    className="bg-secondary text-foreground hover:bg-accent"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : (
                <div ref={sentinelRef} className="h-10 w-px" aria-hidden="true" />
              )
            ) : null}
          </>
        )}
      </section>
    </TooltipProvider>
  )
}

function SkeletonCard() {
  return (
    <div className="relative rounded-lg border bg-card p-3">
      <div className="absolute left-2 top-2 h-4 w-4 rounded border bg-secondary" />
      <div className="flex gap-2">
        {[16, 24, 32].map((s) => (
          <div key={s} className="flex h-16 w-full items-center justify-center rounded-md bg-muted">
            <Skeleton className="h-6 w-6 rounded-sm" />
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

interface IconCardProps {
  item: IconItem
  selected: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onAdd: () => void
  onExport: () => void
  layout: "comfortable" | "compact"
}

const IconCard = React.memo(function IconCard({
  item,
  selected,
  onToggleSelect,
  onEdit,
  onAdd,
  onExport,
  layout,
}: IconCardProps) {
  const { name, component: IconComponent, src, license, meta } = item
  const sizes = React.useMemo(() => {
    const base = meta?.sizeVariants && meta.sizeVariants.length > 0 ? meta.sizeVariants : [16, 24, 32, 48]
    return layout === "compact" ? base.slice(0, 3) : base.slice(0, 4)
  }, [layout, meta?.sizeVariants])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      onToggleSelect()
    }
  }

  const licenseIcon =
    license?.status === "restricted" ? (
      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
    ) : (
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
    )

  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 transition",
        "bg-card hover:border-input hover:shadow-sm focus-within:border-input",
        selected ? "ring-2 ring-ring" : "ring-0",
      )}
      role="button"
      aria-pressed={selected}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        // Avoid toggling when clicking on action buttons or checkbox
        const target = e.target as HTMLElement
        if (target.closest("[data-ignore-card-click]")) return
        onToggleSelect()
      }}
    >
      <div className="absolute left-2 top-2 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect()}
          aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
          data-ignore-card-click
        />
      </div>

      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <div className="flex items-center gap-1 rounded-md bg-secondary/80 p-1 backdrop-blur">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-foreground hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
                aria-label={`Edit ${name}`}
                data-ignore-card-click
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-foreground hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd()
                }}
                aria-label={`Add ${name} to collection`}
                data-ignore-card-click
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add to collection</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-foreground hover:bg-accent"
                aria-label="More actions"
                data-ignore-card-click
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onExport()
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd()
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add to collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex gap-2">
        {sizes.map((s, idx) => (
          <div
            key={`${item.id}-${s}-${idx}`}
            className={cn(
              "flex h-20 flex-1 items-center justify-center rounded-md border bg-muted",
              "transition-colors",
              "group-hover:bg-accent",
            )}
            aria-label={`${name} preview at ${s}px`}
          >
            <div className="flex items-center justify-center" style={{ width: s, height: s }}>
              {IconComponent ? (
                <IconComponent
                  width={s}
                  height={s}
                  strokeWidth={meta?.stroke ?? 2}
                  aria-hidden="true"
                  className="text-foreground"
                />
              ) : src ? (
                <Image
                  src={src}
                  alt={`${name} icon`}
                  width={s}
                  height={s}
                  className="opacity-90"
                />
              ) : (
                <div
                  className="h-full w-full rounded-sm bg-accent"
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium text-foreground" title={name}>
            {name}
          </div>
          <div className="shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 bg-secondary text-foreground"
                >
                  {licenseIcon}
                  <span className="text-[11px] leading-none">
                    {license?.type ?? "License"}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">{license?.type ?? "Unknown license"}</div>
                  <div className="text-muted-foreground">
                    {license?.status ? `Status: ${license.status}` : "Status unknown"}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {meta?.style ? (
            <MetaPill label={meta.style} title="Style compliance" />
          ) : null}
          {typeof meta?.stroke === "number" ? (
            <MetaPill label={`${meta.stroke}px stroke`} title="Stroke width" />
          ) : null}
          {meta?.alignment ? (
            <MetaPill label={`${meta.alignment} stroke`} title="Stroke alignment" />
          ) : null}
        </div>
      </div>
    </div>
  )
})

function MetaPill({ label, title }: { label: string; title?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border bg-accent px-2 py-0.5 text-xs text-foreground"
      title={title}
    >
      <Info className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-10 text-center">
      <div className="mb-3 rounded-full bg-accent p-3">
        <ShieldCheck className="h-6 w-6 text-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-lg font-semibold">No icons found</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Try adjusting your search or filters. Icons will appear here with previews, metadata, and quick actions.
      </p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
      <div className="mb-3 rounded-full bg-accent p-3">
        <AlertCircle className="h-6 w-6 text-foreground" aria-hidden="true" />
      </div>
      <h3 className="font-heading text-lg font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-4">
        <Button
          onClick={() => {
            if (onRetry) onRetry()
            else toast.message("Retrying...")
          }}
          className="bg-secondary text-foreground hover:bg-accent"
        >
          Try again
        </Button>
      </div>
    </div>
  )
}