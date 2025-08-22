"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Share2,
  Wand2,
  Download,
  MoreHorizontal,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Users,
  Link,
  ShieldCheck,
  GripVertical,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CSSProperties = React.CSSProperties;

export type IconItem = {
  id: string;
  name: string;
  svg: string;
  strokeWeight?: number; // in px (e.g., 1, 1.5, 2)
  gridAligned?: boolean;
  tags?: string[];
};

export type IconCollection = {
  id: string;
  name: string;
  icons: IconItem[];
  shared?: boolean;
  collaborators?: string[];
  updatedAt?: string;
};

export type ExportProfileId = "web-svg" | "mobile-png" | "react-components";

export type ExportProfile = {
  id: ExportProfileId;
  name: string;
  description: string;
};

type AuditIssue =
  | { type: "duplicate"; message: string; iconIds: string[] }
  | { type: "stroke-weight"; message: string; iconIds: string[]; targetWeight: number }
  | { type: "off-grid"; message: string; iconIds: string[] };

type AuditResult = {
  duplicates: { hash: string; iconIds: string[] }[];
  mixedStroke: { targetWeight: number; iconIds: string[] } | null;
  offGrid: string[];
  totalIssues: number;
};

export interface CollectionManagerProps {
  className?: string;
  style?: CSSProperties;
  collections?: IconCollection[];
  onCollectionsChange?: (collections: IconCollection[]) => void;
  exportProfiles?: ExportProfile[];
  onExport?: (opts: {
    profile: ExportProfileId;
    collections: IconCollection[];
  }) => Promise<void> | void;
  readOnly?: boolean;
  enableCollaboration?: boolean;
  layout?: "compact" | "comfortable";
}

function hashString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function computeAudit(collection: IconCollection): AuditResult {
  const map = new Map<string, string[]>();
  for (const icon of collection.icons) {
    const key = hashString(icon.svg.trim());
    const arr = map.get(key) ?? [];
    arr.push(icon.id);
    map.set(key, arr);
  }
  const duplicates = Array.from(map.entries())
    .map(([hash, iconIds]) => ({ hash, iconIds }))
    .filter((d) => d.iconIds.length > 1);

  const weights = collection.icons
    .map((i) => i.strokeWeight)
    .filter((w): w is number => typeof w === "number");

  let mixedStroke: AuditResult["mixedStroke"] = null;
  if (weights.length > 0) {
    const freq = new Map<number, number>();
    for (const w of weights) freq.set(w, (freq.get(w) ?? 0) + 1);
    let targetWeight = weights[0];
    let best = 0;
    for (const [w, c] of freq.entries()) {
      if (c > best) {
        best = c;
        targetWeight = w;
      }
    }
    const differing = collection.icons
      .filter((i) => typeof i.strokeWeight === "number" && i.strokeWeight !== targetWeight)
      .map((i) => i.id);
    if (differing.length > 0) {
      mixedStroke = { targetWeight, iconIds: differing };
    }
  }

  const offGrid = collection.icons.filter((i) => i.gridAligned === false).map((i) => i.id);

  const totalIssues =
    duplicates.reduce((acc, d) => acc + (d.iconIds.length - 1), 0) +
    (mixedStroke ? mixedStroke.iconIds.length : 0) +
    offGrid.length;

  return { duplicates, mixedStroke, offGrid, totalIssues };
}

function readiness(result: AuditResult): number {
  // Simple score: 100 if no issues; else base 100 - min(80, issues weight)
  if (result.totalIssues === 0) return 100;
  const penalty =
    result.duplicates.reduce((a, d) => a + (d.iconIds.length - 1) * 10, 0) +
    (result.mixedStroke ? result.mixedStroke.iconIds.length * 5 : 0) +
    result.offGrid.length * 5;
  return Math.max(20, 100 - Math.min(80, penalty));
}

const DEFAULT_EXPORTS: ExportProfile[] = [
  { id: "web-svg", name: "Web SVG", description: "Optimized inline SVGs for web" },
  { id: "mobile-png", name: "Mobile PNG", description: "@1x/@2x/@3x rasterized sets" },
  { id: "react-components", name: "React Components", description: "Tree-shakeable icon components" },
];

type DraggingState =
  | null
  | {
      iconId: string;
      fromCollectionId: string;
    };

type SelectState = Record<string, Set<string>>; // collectionId -> selected icon ids

export default function CollectionManager({
  className,
  style,
  collections: controlledCollections,
  onCollectionsChange,
  exportProfiles = DEFAULT_EXPORTS,
  onExport,
  readOnly = false,
  enableCollaboration = true,
  layout = "comfortable",
}: CollectionManagerProps) {
  const isControlled = typeof controlledCollections !== "undefined";
  const [uncontrolledCollections, setUncontrolledCollections] = useState<IconCollection[]>(
    controlledCollections ?? []
  );
  useEffect(() => {
    if (isControlled) setUncontrolledCollections(controlledCollections ?? []);
  }, [controlledCollections, isControlled]);

  const collections = isControlled ? controlledCollections ?? [] : uncontrolledCollections;

  const updateCollections = useCallback(
    (next: IconCollection[]) => {
      if (!isControlled) setUncontrolledCollections(next);
      onCollectionsChange?.(next);
    },
    [isControlled, onCollectionsChange]
  );

  const [newName, setNewName] = useState("");
  const [dragging, setDragging] = useState<DraggingState>(null);
  const [hoverDrop, setHoverDrop] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectState>({});
  const [auditExpanded, setAuditExpanded] = useState<Record<string, boolean>>({});

  const audits = useMemo(() => {
    const map = new Map<string, AuditResult>();
    for (const col of collections) {
      map.set(col.id, computeAudit(col));
    }
    return map;
  }, [collections]);

  const handleCreate = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      toast.error("Please enter a collection name.");
      return;
    }
    const id = `col_${Date.now().toString(36)}`;
    const next = [...collections, { id, name, icons: [], shared: false, collaborators: [], updatedAt: new Date().toISOString() }];
    updateCollections(next);
    setNewName("");
    toast.success("Collection created.");
  }, [collections, newName, updateCollections]);

  const handleRename = useCallback(
    (id: string, name: string) => {
      const next = collections.map((c) => (c.id === id ? { ...c, name, updatedAt: new Date().toISOString() } : c));
      updateCollections(next);
      setRenamingId(null);
      toast.success("Collection renamed.");
    },
    [collections, updateCollections]
  );

  const handleDelete = useCallback(
    (id: string) => {
      const next = collections.filter((c) => c.id !== id);
      updateCollections(next);
      toast.success("Collection deleted.");
    },
    [collections, updateCollections]
  );

  const setSelectedForCollection = useCallback((collectionId: string, updater: (prev: Set<string>) => Set<string>) => {
    setSelected((prev) => {
      const next = new Set(prev[collectionId] ?? []);
      const updated = updater(next);
      return { ...prev, [collectionId]: updated };
    });
  }, []);

  const clearSelected = useCallback((collectionId: string) => {
    setSelected((prev) => ({ ...prev, [collectionId]: new Set() }));
  }, []);

  const moveIcon = useCallback(
    (iconId: string, fromId: string, toId: string) => {
      if (readOnly || fromId === toId) return;
      const next = collections.map((col) => {
        if (col.id === fromId) {
          const icon = col.icons.find((i) => i.id === iconId);
          return { ...col, icons: col.icons.filter((i) => i.id !== iconId), updatedAt: new Date().toISOString() };
        }
        return col;
      });
      const icon = collections.find((c) => c.id === fromId)?.icons.find((i) => i.id === iconId);
      if (!icon) return;
      updateCollections(
        next.map((col) =>
          col.id === toId ? { ...col, icons: [...col.icons, icon], updatedAt: new Date().toISOString() } : col
        )
      );
      toast.success("Icon moved.");
    },
    [collections, readOnly, updateCollections]
  );

  const removeIcons = useCallback(
    (collectionId: string, ids: string[]) => {
      if (readOnly) return;
      const next = collections.map((col) =>
        col.id === collectionId ? { ...col, icons: col.icons.filter((i) => !ids.includes(i.id)), updatedAt: new Date().toISOString() } : col
      );
      updateCollections(next);
      toast.success(`Removed ${ids.length} icon${ids.length > 1 ? "s" : ""}.`);
    },
    [collections, readOnly, updateCollections]
  );

  const harmonizeStroke = useCallback(
    (collectionId: string, weight: number) => {
      if (readOnly) return;
      const next = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              icons: col.icons.map((i) => ({ ...i, strokeWeight: weight })),
              updatedAt: new Date().toISOString(),
            }
          : col
      );
      updateCollections(next);
      toast.success(`Stroke harmonized to ${weight}px.`);
    },
    [collections, readOnly, updateCollections]
  );

  const alignToGrid = useCallback(
    (collectionId: string, ids?: string[]) => {
      if (readOnly) return;
      const next = collections.map((col) =>
        col.id === collectionId
          ? {
              ...col,
              icons: col.icons.map((i) => (ids ? (ids.includes(i.id) ? { ...i, gridAligned: true } : i) : { ...i, gridAligned: true })),
              updatedAt: new Date().toISOString(),
            }
          : col
      );
      updateCollections(next);
      toast.success("Icons aligned to grid.");
    },
    [collections, readOnly, updateCollections]
  );

  const deduplicate = useCallback(
    (collectionId: string) => {
      if (readOnly) return;
      const col = collections.find((c) => c.id === collectionId);
      if (!col) return;
      const seen = new Set<string>();
      const deduped: IconItem[] = [];
      for (const i of col.icons) {
        const h = hashString(i.svg.trim());
        if (seen.has(h)) continue;
        seen.add(h);
        deduped.push(i);
      }
      updateCollections(
        collections.map((c) => (c.id === collectionId ? { ...c, icons: deduped, updatedAt: new Date().toISOString() } : c))
      );
      toast.success("Duplicates removed.");
    },
    [collections, updateCollections, readOnly]
  );

  const runExport = useCallback(
    async (profile: ExportProfileId, targetCollections: IconCollection[]) => {
      const total = targetCollections.reduce((acc, c) => acc + c.icons.length, 0);
      if (total === 0) {
        toast.error("No icons to export.");
        return;
      }
      try {
        if (onExport) {
          await onExport({ profile, collections: targetCollections });
        } else {
          // Fallback demo behavior
          await new Promise((r) => setTimeout(r, 600));
        }
        toast.success("Export completed.");
      } catch (e) {
        toast.error("Export failed.");
      }
    },
    [onExport]
  );

  const handleShareToggle = useCallback(
    (collectionId: string, shared: boolean) => {
      if (readOnly) return;
      updateCollections(
        collections.map((c) => (c.id === collectionId ? { ...c, shared, updatedAt: new Date().toISOString() } : c))
      );
      toast.message(shared ? "Sharing enabled" : "Sharing disabled");
    },
    [collections, updateCollections, readOnly]
  );

  const addCollaborator = useCallback(
    (collectionId: string, email: string) => {
      if (readOnly) return;
      const emailNorm = email.trim().toLowerCase();
      if (!emailNorm || !emailNorm.includes("@")) {
        toast.error("Enter a valid email.");
        return;
      }
      updateCollections(
        collections.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                collaborators: Array.from(new Set([...(c.collaborators ?? []), emailNorm])),
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
      toast.success("Collaborator added.");
    },
    [collections, updateCollections, readOnly]
  );

  const [inviteEmail, setInviteEmail] = useState("");

  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full rounded-lg",
        // Keep root neutral; interactive surfaces use bg-card below
        className
      )}
      style={style}
      aria-label="Icon collection manager"
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-card shadow-sm border p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="text-base sm:text-lg font-semibold">Collections</h3>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground">
                        Total:{" "}
                        <span className="font-medium text-foreground">{collections.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Number of collections</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection name"
                className="bg-secondary/50 border-input"
                aria-label="New collection name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                disabled={readOnly}
              />
              <Button
                onClick={handleCreate}
                className="gap-2"
                disabled={readOnly}
                aria-label="Create collection"
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
        </div>

        <div className={cn("flex flex-col gap-4")}>
          {collections.length === 0 ? (
            <EmptyState readOnly={readOnly} />
          ) : (
            collections.map((col) => {
              const audit = audits.get(col.id)!;
              const collabEnabled = enableCollaboration;
              const readinessScore = readiness(audit);
              const selectedIds = Array.from(selected[col.id] ?? []);
              const selectionCount = selectedIds.length;
              const selectedIcons = col.icons.filter((i) => (selected[col.id] ?? new Set()).has(i.id));

              return (
                <div key={col.id} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {renamingId === col.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                defaultValue={col.name}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = (e.currentTarget as HTMLInputElement).value.trim();
                                    if (val) handleRename(col.id, val);
                                  } else if (e.key === "Escape") {
                                    setRenamingId(null);
                                  }
                                }}
                                onBlur={(e) => {
                                  const val = e.currentTarget.value.trim();
                                  if (val) handleRename(col.id, val);
                                  else setRenamingId(null);
                                }}
                                className="h-8 bg-secondary/50"
                                aria-label="Edit collection name"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold truncate">{col.name}</h4>
                              <Badge variant="secondary" className="rounded-full">
                                {col.icons.length} icons
                              </Badge>
                              {col.shared ? (
                                <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">
                                  Shared
                                </Badge>
                              ) : null}
                            </div>
                          )}
                          <div className="flex-1" />
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
                                      audit.totalIssues === 0
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-accent text-foreground border-border"
                                    )}
                                    aria-label={`Consistency ${audit.totalIssues === 0 ? "Pass" : "Issues found"}`}
                                  >
                                    {audit.totalIssues === 0 ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                    )}
                                    <span>
                                      {audit.totalIssues === 0 ? "Consistent" : `${audit.totalIssues} issues`}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                  {audit.totalIssues === 0
                                    ? "No duplicates, stroke weight consistent, all aligned."
                                    : "Run Auto-fix to resolve issues quickly."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Collection menu">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Collection</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setRenamingId(col.id)} disabled={readOnly}>
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (selectionCount > 0) {
                                      removeIcons(col.id, selectedIds);
                                      clearSelected(col.id);
                                    }
                                  }}
                                  disabled={readOnly || selectionCount === 0}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove selected
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(col.id)}
                                  disabled={readOnly}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete collection
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-md border bg-secondary/30 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Export readiness</span>
                              <span className="text-xs font-medium">{readinessScore}%</span>
                            </div>
                            <Progress
                              value={readinessScore}
                              className="mt-2 h-2"
                              aria-label="Export readiness"
                            />
                          </div>
                          <div className="rounded-md border bg-secondary/30 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Duplicates</span>
                              <Badge variant="outline" className="rounded-full">
                                {audit.duplicates.reduce((a, d) => a + (d.iconIds.length - 1), 0)}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {audit.duplicates.length > 0 ? "Keep one per match" : "None detected"}
                            </div>
                          </div>
                          <div className="rounded-md border bg-secondary/30 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Stroke weights</span>
                              <Badge variant="outline" className="rounded-full">
                                {audit.mixedStroke ? `→ ${audit.mixedStroke.targetWeight}px` : "Consistent"}
                              </Badge>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {audit.mixedStroke ? `${audit.mixedStroke.iconIds.length} differ` : "All match"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        className="gap-2"
                        onClick={() => {
                          const was = !!auditExpanded[col.id];
                          setAuditExpanded((prev) => ({ ...prev, [col.id]: !was }));
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        {auditExpanded[col.id] ? "Hide audit" : "Run audit"}
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuLabel>Profiles</DropdownMenuLabel>
                          {exportProfiles.map((p) => (
                            <DropdownMenuItem key={p.id} onClick={() => runExport(p.id, [col])}>
                              <div className="flex flex-col">
                                <span className="text-sm">{p.name}</span>
                                <span className="text-xs text-muted-foreground">{p.description}</span>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2" disabled={readOnly}>
                            <Wand2 className="h-4 w-4" />
                            Auto-fix
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Quick fixes</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => deduplicate(col.id)} disabled={readOnly}>
                            Remove duplicates
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              harmonizeStroke(col.id, audit.mixedStroke ? audit.mixedStroke.targetWeight : 2)
                            }
                            disabled={readOnly}
                          >
                            Harmonize stroke to {audit.mixedStroke ? audit.mixedStroke.targetWeight : 2}px
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => alignToGrid(col.id)} disabled={readOnly}>
                            Align all to grid
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {collabEnabled && (
                        <ShareDialog
                          collection={col}
                          onToggleShare={(shared) => handleShareToggle(col.id, shared)}
                          onInvite={(email) => addCollaborator(col.id, email)}
                          inviteEmail={inviteEmail}
                          setInviteEmail={setInviteEmail}
                        />
                      )}

                      {selectionCount > 0 && (
                        <>
                          <Separator orientation="vertical" className="h-6" />
                          <div className="text-sm text-muted-foreground">
                            {selectionCount} selected
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              harmonizeStroke(col.id, 2);
                              clearSelected(col.id);
                            }}
                            disabled={readOnly}
                          >
                            Harmonize 2px
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              alignToGrid(col.id, selectedIds);
                              clearSelected(col.id);
                            }}
                            disabled={readOnly}
                          >
                            Align to grid
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {auditExpanded[col.id] ? (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <AuditPanel
                        audit={audit}
                        onFixDuplicates={() => deduplicate(col.id)}
                        onFixStroke={() =>
                          harmonizeStroke(col.id, audit.mixedStroke ? audit.mixedStroke.targetWeight : 2)
                        }
                        onFixGrid={() => alignToGrid(col.id)}
                        disabled={readOnly}
                      />
                    </div>
                  ) : null}

                  <Separator />

                  <div className="p-3 sm:p-4">
                    <div
                      className={cn(
                        "grid gap-2 sm:gap-3",
                        layout === "compact"
                          ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
                          : "grid-cols-3 sm:grid-cols-5 md:grid-cols-7"
                      )}
                      role="list"
                      aria-label={`Icons in ${col.name}`}
                      onDragOver={(e) => {
                        if (!dragging) return;
                        e.preventDefault();
                        setHoverDrop(col.id);
                      }}
                      onDragLeave={() => {
                        setHoverDrop((prev) => (prev === col.id ? null : prev));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragging) moveIcon(dragging.iconId, dragging.fromCollectionId, col.id);
                        setDragging(null);
                        setHoverDrop(null);
                      }}
                    >
                      {col.icons.length === 0 ? (
                        <div className="col-span-full">
                          <div
                            className={cn(
                              "flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground",
                              hoverDrop === col.id ? "bg-accent/50" : "bg-secondary/30"
                            )}
                          >
                            Drag icons here to add to this collection
                          </div>
                        </div>
                      ) : (
                        col.icons.map((icon) => {
                          const checked = (selected[col.id] ?? new Set()).has(icon.id);
                          return (
                            <IconTile
                              key={icon.id}
                              icon={icon}
                              selected={checked}
                              onToggleSelected={(next) => {
                                setSelectedForCollection(col.id, (prev) => {
                                  const s = new Set(prev);
                                  if (next) s.add(icon.id);
                                  else s.delete(icon.id);
                                  return s;
                                });
                              }}
                              draggable={!readOnly}
                              onDragStart={() => setDragging({ iconId: icon.id, fromCollectionId: col.id })}
                              onDragEnd={() => {
                                setDragging(null);
                                setHoverDrop(null);
                              }}
                              onRemove={() => removeIcons(col.id, [icon.id])}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {collections.length > 0 ? (
          <div className="rounded-lg bg-card shadow-sm border p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <div className="text-sm">
                  Export all collections
                  <div className="text-xs text-muted-foreground">Choose a profile</div>
                </div>
              </div>
              <div className="flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Profiles</DropdownMenuLabel>
                  {exportProfiles.map((p) => (
                    <DropdownMenuItem key={p.id} onClick={() => runExport(p.id, collections)}>
                      <div className="flex flex-col">
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.description}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ readOnly }: { readOnly?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <Plus className="h-6 w-6 text-foreground" />
      </div>
      <h4 className="mt-4 text-lg font-semibold">Create your first collection</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Organize icons, run consistency audits, and export for web, mobile, or React.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button disabled={readOnly} className="gap-2">
          <Plus className="h-4 w-4" />
          New collection
        </Button>
      </div>
    </div>
  );
}

function AuditPanel({
  audit,
  onFixDuplicates,
  onFixStroke,
  onFixGrid,
  disabled,
}: {
  audit: AuditResult;
  onFixDuplicates: () => void;
  onFixStroke: () => void;
  onFixGrid: () => void;
  disabled?: boolean;
}) {
  const dupCount = audit.duplicates.reduce((a, d) => a + (d.iconIds.length - 1), 0);
  return (
    <div className="rounded-lg border bg-secondary/30 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <div className="text-sm font-medium">Audit results</div>
        <div className="text-xs text-muted-foreground">Issues: {audit.totalIssues}</div>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Duplicates</div>
              <div className="text-xs text-muted-foreground">
                {dupCount > 0 ? `${dupCount} duplicates found` : "No duplicates"}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onFixDuplicates} disabled={disabled || dupCount === 0}>
              Fix
            </Button>
          </div>
          {audit.duplicates.length > 0 && (
            <ul className="mt-2 space-y-1 max-h-24 overflow-auto pr-2">
              {audit.duplicates.map((d, idx) => (
                <li key={d.hash} className="text-xs text-muted-foreground">
                  Match {idx + 1}: {d.iconIds.length} items
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Stroke weights</div>
              <div className="text-xs text-muted-foreground">
                {audit.mixedStroke
                  ? `${audit.mixedStroke.iconIds.length} inconsistent → ${audit.mixedStroke.targetWeight}px`
                  : "All consistent"}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onFixStroke} disabled={disabled || !audit.mixedStroke}>
              Fix
            </Button>
          </div>
        </div>
        <div className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium">Grid alignment</div>
              <div className="text-xs text-muted-foreground">
                {audit.offGrid.length > 0 ? `${audit.offGrid.length} off grid` : "All aligned"}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onFixGrid} disabled={disabled || audit.offGrid.length === 0}>
              Fix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareDialog({
  collection,
  onToggleShare,
  onInvite,
  inviteEmail,
  setInviteEmail,
}: {
  collection: IconCollection;
  onToggleShare: (shared: boolean) => void;
  onInvite: (email: string) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
}) {
  const link = `https://example.com/collections/${collection.id}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share collection</DialogTitle>
          <DialogDescription>
            Invite collaborators and manage access. Collaborators can organize icons and run audits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-secondary/30 p-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`share-${collection.id}`}
                checked={!!collection.shared}
                onCheckedChange={(v) => onToggleShare(v)}
              />
              <Label htmlFor={`share-${collection.id}`}>Enable sharing</Label>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-link">Share link</Label>
            <div className="flex items-center gap-2">
              <Input id="share-link" value={link} readOnly className="bg-secondary/50" />
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success("Link copied.");
                }}
                aria-label="Copy share link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Invite collaborator</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-secondary/50"
              />
              <Button
                onClick={() => {
                  onInvite(inviteEmail);
                  setInviteEmail("");
                }}
              >
                Invite
              </Button>
            </div>
            {(collection.collaborators ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {collection.collaborators?.length} collaborator{(collection.collaborators?.length ?? 0) > 1 ? "s" : ""} invited
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Link className="h-3.5 w-3.5" />
            Only people with the link can access.
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IconTile({
  icon,
  selected,
  onToggleSelected,
  draggable,
  onDragStart,
  onDragEnd,
  onRemove,
}: {
  icon: IconItem;
  selected?: boolean;
  onToggleSelected?: (checked: boolean) => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const title = icon.name;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-2 transition-colors",
        hovered ? "shadow-sm" : "",
        selected ? "ring-2 ring-primary ring-offset-0" : "hover:bg-secondary/30"
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="listitem"
      aria-label={title}
    >
      <div className="absolute left-1 top-1">
        <Checkbox
          checked={!!selected}
          onCheckedChange={(v) => onToggleSelected?.(!!v)}
          aria-label="Select icon"
          className="data-[state=unchecked]:opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Icon menu">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(icon.name);
                toast.success("Icon name copied.");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy name
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="aspect-square rounded-md bg-secondary/40 border flex items-center justify-center overflow-hidden relative">
        <div
          className="pointer-events-none"
          dangerouslySetInnerHTML={{ __html: icon.svg }}
          aria-hidden
        />
        <div className="absolute left-1 bottom-1">
          <div className="flex items-center gap-1">
            {typeof icon.strokeWeight === "number" && (
              <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-[10px]">
                {icon.strokeWeight}px
              </Badge>
            )}
            {icon.gridAligned === false ? (
              <Badge className="rounded-full px-1.5 py-0 text-[10px] bg-amber-100 text-amber-900 hover:bg-amber-100">
                Off-grid
              </Badge>
            ) : null}
          </div>
        </div>
        {draggable && (
          <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="inline-flex items-center gap-1 rounded-full bg-accent/80 px-1.5 py-0.5 text-[10px] text-foreground">
              <GripVertical className="h-3 w-3" />
              Drag
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 truncate text-xs text-foreground" title={title}>
        {title}
      </div>
    </div>
  );
}