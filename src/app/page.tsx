"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

import Header from "@/components/header";
import HeroSearch from "@/components/hero-search";
import IconGrid from "@/components/icon-grid";
import IconEditor from "@/components/icon-editor";
import CollectionManager from "@/components/collection-manager";
import ExportHub from "@/components/export-hub";
import PricingSection from "@/components/pricing-section";
import IconDetailModal from "@/components/icon-detail-modal";
import Footer from "@/components/footer";

import type { IconItem, IconResult, Filters } from "@/components/icon-grid";
import type { IconCollection } from "@/components/collection-manager";
import type { ExportItem, ExportConfig, ExportResult } from "@/components/export-hub";
import type { IconDetail } from "@/components/icon-detail-modal";

// Mock data
const MOCK_ICONS: IconItem[] = [
  {
    id: "arrow-right",
    name: "arrow-right",
    tags: ["navigation", "direction"],
    license: { type: "Free", status: "free" },
    meta: { style: "Outline", stroke: 1.5, alignment: "center", sizeVariants: [16, 24, 32] },
  },
  {
    id: "home",
    name: "home",
    tags: ["navigation", "building"],
    license: { type: "Free", status: "free" },
    meta: { style: "Outline", stroke: 2, alignment: "center", sizeVariants: [16, 24, 32] },
  },
  {
    id: "heart",
    name: "heart",
    tags: ["social", "favorite"],
    license: { type: "Pro", status: "pro" },
    meta: { style: "Filled", stroke: 1, alignment: "center", sizeVariants: [16, 24, 32] },
  },
];

const MOCK_COLLECTIONS: IconCollection[] = [
  {
    id: "col_1",
    name: "Core Navigation",
    icons: [
      { id: "arrow-right", name: "arrow-right", svg: "<svg>...</svg>", strokeWeight: 1.5, gridAligned: true },
      { id: "home", name: "home", svg: "<svg>...</svg>", strokeWeight: 2, gridAligned: true },
    ],
    shared: false,
    collaborators: [],
    updatedAt: new Date().toISOString(),
  },
];

const MOCK_EXPORT_ITEMS: ExportItem[] = [
  { id: "arrow-right", name: "arrow-right", bytes: 842 },
  { id: "home", name: "home", bytes: 1024 },
  { id: "heart", name: "heart", bytes: 756 },
];

function createMockIconDetail(id: string): IconDetail {
  return {
    id,
    name: id,
    Icon: ({ size = 24, strokeWidth = 2, className, ...props }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        <path d="M3 12h18M12 3v18" />
      </svg>
    ),
    tags: ["navigation", "ui"],
    keywords: ["arrow", "direction", "navigate"],
    style: {
      family: "Outline Icons",
      strokeWidth: 1.5,
      corner: "rounded",
      endpoints: "round",
      grid: "24",
      contrast: "medium",
    },
    version: {
      current: "2.1.0",
      history: [
        { version: "2.1.0", date: "2024-01-15", changes: "Improved stroke consistency" },
        { version: "2.0.0", date: "2023-12-01", changes: "Updated to new design system" },
      ],
    },
    license: {
      type: "free",
      attributionRequired: true,
      name: "Free (with attribution)",
    },
    technical: {
      viewBox: "0 0 24 24",
      defaultSize: 24,
      paths: 2,
      anchorPoints: 8,
      exportedAs: ["svg", "png"],
    },
    consistencyScore: 92,
    recommendations: [
      "Icon follows design system guidelines",
      "Proper grid alignment maintained",
      "Stroke weight is consistent",
    ],
  };
}

export default function HomePage() {
  // App state
  const [currentView, setCurrentView] = useState<"search" | "collections" | "export" | "pricing">("search");
  const [searchResults, setSearchResults] = useState<IconItem[]>([]);
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [collections, setCollections] = useState<IconCollection[]>(MOCK_COLLECTIONS);
  
  // Modal states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailIconId, setDetailIconId] = useState<string | null>(null);

  // User state
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Navigation items
  const navItems = [
    { label: "Search", active: currentView === "search", onClick: () => setCurrentView("search") },
    { label: "Collections", active: currentView === "collections", onClick: () => setCurrentView("collections") },
    { label: "Export", active: currentView === "export", onClick: () => setCurrentView("export") },
    { label: "Pricing", active: currentView === "pricing", onClick: () => setCurrentView("pricing") },
  ];

  // Search functionality
  const handleSearch = useCallback(async (query: string, filters: Filters) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let results = MOCK_ICONS;
    if (query) {
      results = results.filter(icon => 
        icon.name.toLowerCase().includes(query.toLowerCase()) ||
        icon.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
    }
    
    // Apply filters
    results = results.filter(icon => {
      if (filters.license === "free" && icon.license?.status !== "free") return false;
      if (filters.license === "pro" && icon.license?.status !== "pro") return false;
      return true;
    });
    
    setSearchResults(results);
    return results as IconResult[];
  }, []);

  // Icon actions
  const handleIconEdit = useCallback((iconId: string) => {
    setEditingIconId(iconId);
    setEditorOpen(true);
  }, []);

  const handleIconDetail = useCallback((iconId: string) => {
    setDetailIconId(iconId);
    setDetailModalOpen(true);
  }, []);

  const handleAddToCollection = useCallback((iconIds: string[]) => {
    if (collections.length === 0) {
      toast.error("Create a collection first");
      return;
    }
    
    const firstCollection = collections[0];
    const newIcons = iconIds.map(id => ({
      id,
      name: id,
      svg: "<svg>...</svg>",
      strokeWeight: 1.5,
      gridAligned: true,
    }));
    
    const updatedCollection = {
      ...firstCollection,
      icons: [...firstCollection.icons, ...newIcons],
      updatedAt: new Date().toISOString(),
    };
    
    setCollections(prev => prev.map(col => col.id === firstCollection.id ? updatedCollection : col));
    toast.success(`Added ${iconIds.length} icon(s) to ${firstCollection.name}`);
  }, [collections]);

  const handleExport = useCallback((iconIds: string[]) => {
    toast.success(`Exporting ${iconIds.length} icon(s)`);
  }, []);

  // Auth handlers
  const handleSignIn = useCallback(() => {
    setUser({ name: "John Doe", email: "john@example.com" });
    toast.success("Signed in successfully");
  }, []);

  const handleSignUp = useCallback(() => {
    setUser({ name: "Jane Smith", email: "jane@example.com" });
    toast.success("Account created successfully");
  }, []);

  const handleSignOut = useCallback(() => {
    setUser(null);
    toast.success("Signed out");
  }, []);

  // Export hub handlers
  const handleExportStart = useCallback((config: ExportConfig) => {
    toast.success("Export started");
  }, []);

  const handleExportComplete = useCallback((result: ExportResult) => {
    toast.success(`Export completed: ${result.processedCount} items`);
  }, []);

  // Pricing handlers
  const handleStartFree = useCallback(() => {
    toast.success("Free plan activated");
  }, []);

  const handleUpgrade = useCallback((plan: string, seats?: number) => {
    toast.success(`Upgraded to ${plan}${seats ? ` with ${seats} seats` : ""}`);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header
        navItems={navItems}
        user={user}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onSignOut={handleSignOut}
        logoHref="/"
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {currentView === "search" && (
          <>
            <HeroSearch
              onSearch={handleSearch}
              showPreview={true}
            />
            
            {searchResults.length > 0 && (
              <IconGrid
                items={searchResults}
                selectedIds={selectedIconIds}
                onSelectionChange={setSelectedIconIds}
                onEdit={(item) => handleIconEdit(item.id)}
                onAddToCollection={(ids) => handleAddToCollection(ids)}
                onExport={(ids) => handleExport(ids)}
              />
            )}
          </>
        )}

        {currentView === "collections" && (
          <CollectionManager
            collections={collections}
            onCollectionsChange={setCollections}
            onExport={({ collections }) => {
              const totalIcons = collections.reduce((sum, col) => sum + col.icons.length, 0);
              toast.success(`Exported ${totalIcons} icons from ${collections.length} collection(s)`);
            }}
          />
        )}

        {currentView === "export" && (
          <ExportHub
            items={MOCK_EXPORT_ITEMS}
            onExportStart={handleExportStart}
            onExportComplete={handleExportComplete}
            canUsePro={!!user}
            canUseTeams={!!user}
          />
        )}

        {currentView === "pricing" && (
          <PricingSection
            onStartFree={handleStartFree}
            onUpgrade={handleUpgrade}
            brandName="iconsforfree.com"
            brandUrl="https://iconsforfree.com"
          />
        )}
      </main>

      <Footer
        brandName="iconsforfree.com"
        tagline="Free icons for designers and developers. No attribution required with Pro."
        contained={false}
        onSubscribe={async (email) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          toast.success("Subscribed successfully!");
        }}
      />

      {/* Modals */}
      <IconEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        name={editingIconId || "icon"}
        onSave={async (svg) => {
          toast.success("Icon saved successfully");
        }}
      />

      {detailIconId && (
        <IconDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          icon={createMockIconDetail(detailIconId)}
          onEdit={handleIconEdit}
          onAddToCollection={(id) => handleAddToCollection([id])}
          onExport={(opts, icon) => {
            toast.success(`Exporting ${icon.name} as ${opts.format.toUpperCase()}`);
          }}
          onSelectRelated={(iconId) => {
            setDetailIconId(iconId);
          }}
        />
      )}
    </div>
  );
}