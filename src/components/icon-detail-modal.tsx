"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pencil,
  Plus,
  Check,
  Download,
  ExternalLink,
  History,
  ShieldCheck,
  Sparkles,
  Gauge,
  Info,
  Palette,
  Ruler,
  Link2,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

export type IconRelated = {
  id: string;
  name: string;
  Icon: IconComponent;
};

export type IconDetail = {
  id: string;
  name: string;
  Icon: IconComponent;
  tags?: string[];
  keywords?: string[];
  style: {
    family: string;
    strokeWidth?: number;
    corner?: "rounded" | "sharp" | "mixed";
    endpoints?: "butt" | "round" | "square";
    grid?: "16" | "20" | "24";
    contrast?: "low" | "medium" | "high";
  };
  version: {
    current: string;
    history: { version: string; date: string; changes: string }[];
  };
  license: {
    type: "free" | "pro" | "custom";
    attributionRequired: boolean;
    name?: string;
  };
  technical?: {
    viewBox?: string;
    defaultSize?: number;
    paths?: number;
    anchorPoints?: number;
    exportedAs?: ("svg" | "png")[];
  };
  related?: IconRelated[];
  consistencyScore?: number; // 0-100
  recommendations?: string[];
};

export type ExportOptions = {
  format: "svg" | "png";
  size: number; // px
  strokeWidth?: number;
  color?: string; // hex
  padding?: number; // px
  background?: "transparent" | "light" | "dark";
};

interface IconDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: IconDetail;
  inCollection?: boolean;
  onEdit?: (iconId: string) => void;
  onAddToCollection?: (iconId: string) => void;
  onRemoveFromCollection?: (iconId: string) => void;
  onExport?: (opts: ExportOptions, icon: IconDetail) => void;
  onSelectRelated?: (iconId: string) => void;
  className?: string;
}

const previewSizes = [16, 20, 24, 32, 48, 64];

function SectionHeader({
  title,
  subtitle,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-2", className)}>
      {icon ? (
        <div className="mt-0.5 text-[color:var(--chart-3)]">{icon}</div>
      ) : null}
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium leading-none text-foreground">{title}</h3>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function KVP({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-accent/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm text-foreground",
          mono && "font-mono tracking-tight"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function IconDetailModal({
  open,
  onOpenChange,
  icon,
  inCollection,
  onEdit,
  onAddToCollection,
  onRemoveFromCollection,
  onExport,
  onSelectRelated,
  className,
}: IconDetailModalProps) {
  const [tab, setTab] = React.useState<"preview" | "export" | "details">(
    "preview"
  );

  const [exportOpts, setExportOpts] = React.useState<ExportOptions>({
    format: "svg",
    size: 24,
    strokeWidth: icon.style.strokeWidth ?? 2,
    color: "#2f3033",
    padding: 0,
    background: "transparent",
  });

  const attributionText = React.useMemo(() => {
    const licenseName =
      icon.license.name ??
      (icon.license.type === "free" ? "Free (with attribution)" : "Pro");
    return `${icon.name} icon — ${icon.style.family} • ${licenseName}. Please attribute the creator and source.`;
  }, [icon]);

  const score = Math.max(
    0,
    Math.min(100, icon.consistencyScore ?? 92)
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        target?.getAttribute("role") === "combobox";
      if (typing) return;

      if (e.key.toLowerCase() === "e") {
        onEdit?.(icon.id);
        toast("Opening in editor…");
      } else if (e.key.toLowerCase() === "a") {
        if (inCollection) {
          onRemoveFromCollection?.(icon.id);
          toast("Removed from collection");
        } else {
          onAddToCollection?.(icon.id);
          toast("Added to collection");
        }
      } else if (e.key.toLowerCase() === "x") {
        setTab("export");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, icon.id, inCollection, onAddToCollection, onRemoveFromCollection, onEdit]);

  const IconEl = icon.Icon;

  const handleCopy = async (text: string, label = "Copied") => {
    try {
      await navigator.clipboard.writeText(text);
      toast(label);
    } catch {
      toast("Copy failed");
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(exportOpts, icon);
    } else {
      toast("Preparing export…");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[min(100vw-2rem,1000px)] bg-popover p-0 shadow-sm outline-none",
          "rounded-[var(--radius)]",
          className
        )}
        aria-label={`${icon.name} details`}
      >
        <div className="flex flex-col">
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary/70">
                  <IconEl
                    aria-hidden="true"
                    className="text-foreground/90"
                    size={24}
                    strokeWidth={icon.style.strokeWidth ?? 2}
                  />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate text-lg font-semibold">
                    {icon.name}
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-accent text-foreground">
                        {icon.style.family}
                      </Badge>
                      {icon.tags?.slice(0, 3).map((t) => (
                        <Badge
                          key={t}
                          className="bg-secondary text-[11px] font-medium text-foreground"
                        >
                          {t}
                        </Badge>
                      ))}
                      {icon.tags && icon.tags.length > 3 ? (
                        <span className="text-xs text-muted-foreground">
                          +{icon.tags.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        className="bg-card text-foreground hover:bg-accent"
                        onClick={() => {
                          onEdit?.(icon.id);
                          toast("Opening in editor…");
                        }}
                        aria-label="Open in editor (E)"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card text-foreground">
                      Shortcut E
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={inCollection ? "default" : "secondary"}
                        className={cn(
                          inCollection ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-accent"
                        )}
                        onClick={() => {
                          if (inCollection) {
                            onRemoveFromCollection?.(icon.id);
                            toast("Removed from collection");
                          } else {
                            onAddToCollection?.(icon.id);
                            toast("Added to collection");
                          }
                        }}
                        aria-label={
                          inCollection ? "Remove from collection (A)" : "Add to collection (A)"
                        }
                      >
                        {inCollection ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        {inCollection ? "In collection" : "Add"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card text-foreground">
                      Shortcut A
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        className="bg-card text-foreground hover:bg-accent"
                        onClick={() => setTab("export")}
                        aria-label="Export (X)"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card text-foreground">
                      Shortcut X
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="px-6 pb-6">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <TabsList className="bg-secondary">
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="export">Export</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="mt-6">
                <div className="space-y-6">
                  <SectionHeader
                    title="Preview on light and dark"
                    subtitle="Consistent at small and large sizes"
                    icon={<EyeDotIcon />}
                  />
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Light surface
                        </span>
                        <SunMini />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {previewSizes.map((s) => (
                          <div
                            key={`light-${s}`}
                            className="flex flex-col items-center justify-center gap-2 rounded-md border bg-secondary/50 p-3"
                          >
                            <IconEl
                              aria-hidden="true"
                              size={s}
                              strokeWidth={icon.style.strokeWidth ?? 2}
                              className="text-foreground"
                            />
                            <span className="text-xs text-muted-foreground">{s}px</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-[var(--surface-dark)] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[color:var(--color-card)]/70">
                          Dark surface
                        </span>
                        <MoonMini />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-4">
                        {previewSizes.map((s) => (
                          <div
                            key={`dark-${s}`}
                            className="flex flex-col items-center justify-center gap-2 rounded-md border border-[color:var(--color-card)]/10 bg-[var(--surface-dim)] p-3"
                          >
                            <IconEl
                              aria-hidden="true"
                              size={s}
                              strokeWidth={icon.style.strokeWidth ?? 2}
                              className="text-[color:var(--color-card)]"
                            />
                            <span className="text-xs text-[color:var(--color-card)]/70">{s}px</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-lg border bg-card p-4">
                      <SectionHeader
                        title="Style consistency"
                        subtitle="Automated checks on stroke, corners, and grid"
                        icon={<Gauge className="h-4 w-4" />}
                        className="mb-3"
                      />
                      <div className="space-y-4">
                        <div aria-label="Consistency score" className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Score</span>
                            <span className="text-sm font-medium text-foreground">{score}/100</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-accent">
                            <div
                              className="h-2 rounded-full bg-[color:var(--chart-1)] transition-[width]"
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                          {(icon.recommendations?.length
                            ? icon.recommendations
                            : [
                                "Maintain consistent stroke width across all icons.",
                                "Align to the 24px grid and snap endpoints.",
                                "Use rounded caps and joins for this set.",
                              ]
                          ).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-card p-4">
                      <SectionHeader
                        title="Quick actions"
                        subtitle="Editing and collection management"
                        icon={<Sparkles className="h-4 w-4" />}
                        className="mb-3"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          className="justify-start bg-secondary text-foreground hover:bg-accent"
                          variant="secondary"
                          onClick={() => {
                            onEdit?.(icon.id);
                            toast("Opening in editor…");
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Open in editor
                        </Button>
                        <Button
                          className={cn(
                            "justify-start",
                            inCollection
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "bg-secondary text-foreground hover:bg-accent"
                          )}
                          variant={inCollection ? "default" : "secondary"}
                          onClick={() => {
                            if (inCollection) {
                              onRemoveFromCollection?.(icon.id);
                              toast("Removed from collection");
                            } else {
                              onAddToCollection?.(icon.id);
                              toast("Added to collection");
                            }
                          }}
                        >
                          {inCollection ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          {inCollection ? "In collection" : "Add to collection"}
                        </Button>
                        <Button
                          className="justify-start bg-secondary text-foreground hover:bg-accent"
                          variant="secondary"
                          onClick={() => setTab("export")}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export options
                        </Button>
                        <Button
                          className="justify-start bg-secondary text-foreground hover:bg-accent"
                          variant="secondary"
                          onClick={() =>
                            handleCopy(
                              icon.keywords?.join(", ") || icon.tags?.join(", ") || icon.name,
                              "Copied metadata"
                            )
                          }
                        >
                          <Tag className="mr-2 h-4 w-4" />
                          Copy tags
                        </Button>
                      </div>
                    </div>
                  </div>

                  {icon.related && icon.related.length > 0 ? (
                    <div className="rounded-lg border bg-card p-4">
                      <SectionHeader
                        title="Related icons"
                        subtitle="Matches based on style parameters"
                        icon={<Palette className="h-4 w-4" />}
                        className="mb-3"
                      />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {icon.related.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => onSelectRelated?.(r.id)}
                            className="group flex flex-col items-center gap-2 rounded-md border bg-secondary/60 p-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                            aria-label={`Open related icon ${r.name}`}
                          >
                            <div className="flex h-14 w-full items-center justify-center rounded-md bg-card">
                              <r.Icon
                                aria-hidden="true"
                                className="text-foreground group-hover:scale-105 transition-transform"
                                size={24}
                              />
                            </div>
                            <span className="w-full truncate text-xs text-foreground">
                              {r.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="Export settings"
                      subtitle="Customize format, size, stroke, and color"
                      icon={<Ruler className="h-4 w-4" />}
                    />
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="format">Format</Label>
                          <Select
                            value={exportOpts.format}
                            onValueChange={(v: "svg" | "png") =>
                              setExportOpts((p) => ({ ...p, format: v }))
                            }
                          >
                            <SelectTrigger id="format" className="bg-card">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="svg">SVG</SelectItem>
                              <SelectItem value="png">PNG</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="size">Size (px)</Label>
                          <Input
                            id="size"
                            type="number"
                            min={8}
                            max={1024}
                            step={1}
                            className="bg-card"
                            value={exportOpts.size}
                            onChange={(e) =>
                              setExportOpts((p) => ({
                                ...p,
                                size: Number(e.target.value || 24),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="stroke">Stroke width</Label>
                          <Input
                            id="stroke"
                            type="number"
                            min={0.5}
                            max={6}
                            step={0.5}
                            className="bg-card"
                            value={exportOpts.strokeWidth ?? 2}
                            onChange={(e) =>
                              setExportOpts((p) => ({
                                ...p,
                                strokeWidth: Number(e.target.value || 2),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="color">Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="color"
                              type="color"
                              className="h-9 w-12 bg-card p-1"
                              value={exportOpts.color}
                              onChange={(e) =>
                                setExportOpts((p) => ({
                                  ...p,
                                  color: e.target.value,
                                }))
                              }
                              aria-label="Icon color"
                            />
                            <Input
                              type="text"
                              className="bg-card"
                              value={exportOpts.color}
                              onChange={(e) =>
                                setExportOpts((p) => ({
                                  ...p,
                                  color: e.target.value,
                                }))
                              }
                              aria-label="Hex color"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="padding">Padding (px)</Label>
                          <Input
                            id="padding"
                            type="number"
                            min={0}
                            max={128}
                            step={1}
                            className="bg-card"
                            value={exportOpts.padding ?? 0}
                            onChange={(e) =>
                              setExportOpts((p) => ({
                                ...p,
                                padding: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Background</Label>
                          <Select
                            value={exportOpts.background}
                            onValueChange={(v: "transparent" | "light" | "dark") =>
                              setExportOpts((p) => ({ ...p, background: v }))
                            }
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Background" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              <SelectItem value="transparent">Transparent</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="preserve"
                          aria-label="Preserve viewBox"
                          checked
                          disabled
                        />
                        <Label
                          htmlFor="preserve"
                          className="text-sm text-muted-foreground"
                        >
                          ViewBox preserved (24 × 24)
                        </Label>
                      </div>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button
                        onClick={handleExport}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </DialogFooter>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="Live preview"
                      subtitle="Exact output at selected settings"
                      icon={<Info className="h-4 w-4" />}
                    />
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-md border p-6",
                        exportOpts.background === "transparent" && "bg-[linear-gradient(45deg,#f1f2f4_25%,transparent_25%,transparent_75%,#f1f2f4_75%),linear-gradient(45deg,#f1f2f4_25%,transparent_25%,transparent_75%,#f1f2f4_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px]",
                        exportOpts.background === "light" && "bg-secondary",
                        exportOpts.background === "dark" && "bg-[var(--surface-dark)]"
                      )}
                      style={{ padding: exportOpts.padding }}
                    >
                      <IconEl
                        aria-hidden="true"
                        width={exportOpts.size}
                        height={exportOpts.size}
                        strokeWidth={exportOpts.strokeWidth}
                        className={cn(
                          exportOpts.background === "dark"
                            ? "text-[color:var(--color-card)]"
                            : "text-foreground"
                        )}
                        style={{ color: exportOpts.color }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <KVP label="Format" value={exportOpts.format.toUpperCase()} />
                      <KVP label="Size" value={`${exportOpts.size}px`} />
                      <KVP label="Stroke" value={`${exportOpts.strokeWidth}`} />
                      <KVP label="Color" value={exportOpts.color} mono />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="License"
                      subtitle={
                        icon.license.attributionRequired
                          ? "Attribution required for free use"
                          : "No attribution required"
                      }
                      icon={<ShieldCheck className="h-4 w-4" />}
                    />
                    <div className="space-y-3">
                      <p className="text-sm text-foreground">
                        Type:{" "}
                        <span className="font-medium">
                          {icon.license.type.toUpperCase()}
                        </span>
                      </p>
                      {icon.license.attributionRequired ? (
                        <div className="space-y-2">
                          <Label htmlFor="attr">Generated attribution</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="attr"
                              readOnly
                              value={attributionText}
                              className="bg-secondary"
                            />
                            <Button
                              variant="secondary"
                              className="bg-card text-foreground hover:bg-accent"
                              onClick={() => handleCopy(attributionText, "Attribution copied")}
                            >
                              Copy
                            </Button>
                          </div>
                          <div className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2">
                            <span className="text-xs text-muted-foreground">
                              Remove attribution for commercial use
                            </span>
                            <Button
                              asChild
                              className="h-8 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                            >
                              <a href="/pricing">
                                Upgrade <ExternalLink className="ml-1 h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-md bg-secondary/60 p-3 text-sm text-foreground">
                          This icon is licensed for use without attribution.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="Technical specs"
                      subtitle="For developers and QA"
                      icon={<Info className="h-4 w-4" />}
                    />
                    <div className="grid gap-2">
                      <KVP
                        label="ViewBox"
                        value={icon.technical?.viewBox ?? "0 0 24 24"}
                        mono
                      />
                      <KVP
                        label="Default size"
                        value={`${icon.technical?.defaultSize ?? 24}px`}
                      />
                      <KVP label="Paths" value={icon.technical?.paths ?? "1-3"} />
                      <KVP
                        label="Anchor points"
                        value={icon.technical?.anchorPoints ?? "≤ 64"}
                      />
                      <KVP
                        label="Exports"
                        value={(icon.technical?.exportedAs ?? ["svg", "png"])
                          .map((x) => x.toUpperCase())
                          .join(", ")}
                      />
                    </div>
                    <div className="mt-3 rounded-md bg-secondary/60 p-3">
                      <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
                        <li>Use aria-hidden="true" when decorative.</li>
                        <li>Provide descriptive aria-label or title for meaningful icons.</li>
                        <li>Icons inherit currentColor. Set color via CSS or style.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="Style parameters"
                      subtitle="Ensure consistency across your set"
                      icon={<Palette className="h-4 w-4" />}
                    />
                    <div className="grid gap-2">
                      <KVP label="Family" value={icon.style.family} />
                      <KVP
                        label="Stroke"
                        value={`${icon.style.strokeWidth ?? 2}`}
                      />
                      <KVP label="Corners" value={icon.style.corner ?? "rounded"} />
                      <KVP label="Caps/Joins" value={icon.style.endpoints ?? "round"} />
                      <KVP label="Grid" value={`${icon.style.grid ?? "24"}px`} />
                      <KVP
                        label="Contrast"
                        value={(icon.style.contrast ?? "medium").toString()}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-md bg-secondary/60 p-3 text-sm">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        Keep stroke width and cap style consistent across related icons.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-lg border bg-card p-4">
                    <SectionHeader
                      title="Version history"
                      subtitle={`Current v${icon.version.current}`}
                      icon={<History className="h-4 w-4" />}
                    />
                    <ul className="space-y-3">
                      {icon.version.history.map((v) => (
                        <li key={v.version} className="rounded-md bg-secondary/60 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">
                              v{v.version}
                            </span>
                            <span className="text-xs text-muted-foreground">{v.date}</span>
                          </div>
                          <p className="mt-1 text-sm text-foreground">{v.changes}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EyeDotIcon() {
  return (
    <div className="relative h-4 w-4">
      <div className="absolute inset-0 rounded-full border border-[color:var(--color-border)] bg-secondary" />
      <div className="absolute left-1 top-1 h-2 w-2 rounded-full bg-[color:var(--chart-3)]" />
    </div>
  );
}

function SunMini() {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400/80" />
      <span className="text-xs">Light</span>
    </div>
  );
}

function MoonMini() {
  return (
    <div className="flex items-center gap-1 text-[color:var(--color-card)]/70">
      <span className="inline-flex h-2 w-2 rounded-full bg-blue-300/80" />
      <span className="text-xs">Dark</span>
    </div>
  );
}