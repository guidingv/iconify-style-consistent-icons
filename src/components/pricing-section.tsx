"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Check,
  X,
  Copy,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Users,
  Info,
  ArrowRight,
  Download,
  Globe,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type PlanKey = "free" | "pro" | "teams";
type AttributionFormat = "html" | "markdown" | "text";

interface PricingSectionProps {
  className?: string;
  style?: React.CSSProperties;
  currency?: "USD" | "EUR" | "GBP";
  defaultProjectName?: string;
  defaultAssetName?: string;
  defaultAttributionFormat?: AttributionFormat;
  defaultSeats?: number;
  brandName?: string;
  brandUrl?: string;
  onStartFree?: () => void;
  onUpgrade?: (plan: Exclude<PlanKey, "free">, seats?: number) => void;
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const FEATURES: {
  key: string;
  label: string;
  icon?: React.ElementType;
  help?: string;
  plans: Record<PlanKey, boolean | string | number>;
}[] = [
  {
    key: "commercial",
    label: "Commercial use",
    icon: Globe,
    help: "Use in commercial projects, client work, and monetized apps.",
    plans: { free: true, pro: true, teams: true },
  },
  {
    key: "attribution",
    label: "Attribution required",
    icon: ShieldCheck,
    help: "A visible credit linking back to the source is required on the Free plan.",
    plans: { free: true, pro: false, teams: false },
  },
  {
    key: "exports",
    label: "Advanced export formats",
    icon: Download,
    help: "Export to SVG, PNG, PDF. Batch export and presets included on Pro/Teams.",
    plans: { free: "PNG only (up to 2K)", pro: "SVG, PNG, PDF (up to 8K)", teams: "All formats + batch/CLI" },
  },
  {
    key: "seats",
    label: "Team seats",
    icon: Users,
    help: "Number of users included in the subscription.",
    plans: { free: 1, pro: 1, teams: "3 included (add more)" },
  },
  {
    key: "redistribute",
    label: "Redistribution",
    icon: Lock,
    help: "Embed assets in shipped products/binaries. Raw asset resale is not allowed.",
    plans: { free: false, pro: true, teams: true },
  },
];

const QUOTAS: {
  key: string;
  label: string;
  plans: Record<PlanKey, string>;
}[] = [
  { key: "assets", label: "Assets/month", plans: { free: "20", pro: "Unlimited", teams: "Unlimited" } },
  { key: "projects", label: "Projects", plans: { free: "2", pro: "Unlimited", teams: "Unlimited" } },
  { key: "support", label: "Support", plans: { free: "Community", pro: "Priority email", teams: "Priority + SLA" } },
];

const PLAN_COPY: Record<
  PlanKey,
  {
    name: string;
    tagline: string;
    price: (currency: string, seats?: number) => string;
    highlight?: boolean;
    cta: string;
    subcta?: string;
  }
> = {
  free: {
    name: "Free",
    tagline: "Free + Attribution",
    price: (c) => `${new Intl.NumberFormat("en-US", { style: "currency", currency: c as any }).format(0)}/mo`,
    cta: "Start Free",
    subcta: "Requires visible attribution",
  },
  pro: {
    name: "Pro",
    tagline: "No Attribution Required",
    price: (c) => `${new Intl.NumberFormat("en-US", { style: "currency", currency: c as any }).format(19)}/mo`,
    cta: "Upgrade to Pro",
    subcta: "Advanced exports and unlimited projects",
    highlight: true,
  },
  teams: {
    name: "Teams",
    tagline: "Scale with your team",
    price: (c, seats = 3) => {
      const base = 49;
      const extra = Math.max(0, seats - 3) * 15;
      const total = base + extra;
      return `${new Intl.NumberFormat("en-US", { style: "currency", currency: c as any }).format(total)}/mo`;
    },
    cta: "Start Teams",
    subcta: "3 seats included, add more anytime",
  },
};

export default function PricingSection({
  className,
  style,
  currency = "USD",
  defaultProjectName = "Acme Marketing Site",
  defaultAssetName = "Hero Illustration",
  defaultAttributionFormat = "html",
  defaultSeats = 5,
  brandName = "YourApp",
  brandUrl = "https://yourapp.com",
  onStartFree,
  onUpgrade,
}: PricingSectionProps) {
  const [seats, setSeats] = React.useState<number>(Math.max(3, defaultSeats));
  const [format, setFormat] = React.useState<AttributionFormat>(defaultAttributionFormat);
  const [project, setProject] = React.useState(defaultProjectName);
  const [asset, setAsset] = React.useState(defaultAssetName);
  const [projectUrl, setProjectUrl] = React.useState("https://example.com");
  const [showDetails, setShowDetails] = React.useState(true);

  const formatter = React.useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency }),
    [currency]
  );

  const attributionSnippet = React.useMemo(() => {
    const baseText = `“${asset}” used in ${project} via ${brandName}`;
    const license = `Free license with attribution`;
    const link = brandUrl;
    if (format === "html") {
      return `<span>Asset “${escapeHtml(asset)}” in <a href="${escapeHtml(projectUrl)}" rel="noopener noreferrer">${escapeHtml(
        project
      )}</a> via <a href="${escapeHtml(link)}" rel="noopener noreferrer">${escapeHtml(
        brandName
      )}</a> — ${license}</span>`;
    }
    if (format === "markdown") {
      return `Asset “${asset}” in [${project}](${projectUrl}) via [${brandName}](${link}) — ${license}`;
    }
    return `${baseText} — ${license} — ${projectUrl}`;
  }, [asset, project, projectUrl, brandName, brandUrl, format]);

  function copy(text: string, label: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Unable to copy. Please try again."));
  }

  function handleStartFree() {
    if (onStartFree) onStartFree();
    else toast.success("Free plan activated. You can upgrade anytime.");
  }

  function handleUpgrade(plan: Exclude<PlanKey, "free">) {
    if (onUpgrade) onUpgrade(plan, plan === "teams" ? seats : undefined);
    else toast.message(`Upgrade to ${plan === "pro" ? "Pro" : "Teams"}`, {
      description: plan === "pro" ? "No attribution. Unlimited projects and advanced exports." : `Includes ${seats} seats.`,
    });
  }

  return (
    <section
      className={cn(
        "w-full bg-background text-foreground",
        "rounded-none",
        className
      )}
      style={style}
      aria-label="Pricing and licensing"
    >
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Transparent licensing
          </div>
          <h2 className="text-2xl leading-tight sm:text-3xl font-heading">
            Simple, worry-free pricing
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a plan and build with confidence. No legalese—just clear allowances, quotas, and examples.
          </p>
        </header>

        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="bg-secondary">
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <PricingCard
                plan="free"
                currency={currency}
                formatter={formatter}
                onClickPrimary={handleStartFree}
              >
                <ul className="mt-4 space-y-3">
                  <FeatureLine ok text="Commercial use" />
                  <FeatureLine ok text="20 assets/month" />
                  <FeatureLine ok text="2 projects" />
                  <FeatureLine ok text="PNG export up to 2K" />
                  <FeatureLine ok={false} text="Redistribution in binaries" />
                  <FeatureLine warn text="Requires attribution" />
                </ul>
                <CardFooter className="mt-6 px-0">
                  <Button className="w-full bg-primary text-primary-foreground hover:opacity-95" onClick={handleStartFree}>
                    Start Free
                  </Button>
                </CardFooter>
                <p className="mt-2 text-xs text-muted-foreground">
                  Use freely with a visible credit. Generate attribution below.
                </p>
              </PricingCard>

              <PricingCard
                plan="pro"
                highlight
                currency={currency}
                formatter={formatter}
                badge="Most popular"
                onClickPrimary={() => handleUpgrade("pro")}
              >
                <ul className="mt-4 space-y-3">
                  <FeatureLine ok text="Commercial use" />
                  <FeatureLine ok text="Unlimited assets & projects" />
                  <FeatureLine ok text="SVG, PNG, PDF up to 8K" />
                  <FeatureLine ok text="Redistribution in binaries" />
                  <FeatureLine ok text="Priority email support" />
                  <FeatureLine ok text="No attribution required" />
                </ul>
                <CardFooter className="mt-6 px-0">
                  <Button className="w-full bg-primary text-primary-foreground hover:opacity-95" onClick={() => handleUpgrade("pro")}>
                    Upgrade to Pro
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Button>
                </CardFooter>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ship without credits. Advanced export formats included.
                </p>
              </PricingCard>

              <PricingCard
                plan="teams"
                currency={currency}
                formatter={formatter}
                onClickPrimary={() => handleUpgrade("teams")}
                footer={
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="seats" className="text-xs text-muted-foreground">
                        Seats
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => setSeats((s) => Math.max(3, s - 1))}
                          aria-label="Decrease seats"
                        >
                          -
                        </Button>
                        <Input
                          id="seats"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="h-8 w-16 text-center"
                          value={seats}
                          onChange={(e) => {
                            const n = parseInt(e.target.value || "0", 10);
                            setSeats(Number.isFinite(n) ? Math.max(3, n) : 3);
                          }}
                          aria-label="Seat count"
                        />
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => setSeats((s) => s + 1)}
                          aria-label="Increase seats"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="mt-3 w-full bg-primary text-primary-foreground hover:opacity-95"
                      onClick={() => handleUpgrade("teams")}
                    >
                      Start Teams
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatter.format(49)} includes 3 seats, then {formatter.format(15)}/seat.
                    </p>
                  </div>
                }
              >
                <ul className="mt-4 space-y-3">
                  <FeatureLine ok text="Commercial use" />
                  <FeatureLine ok text="Unlimited assets & projects" />
                  <FeatureLine ok text="All export formats + batch/CLI" />
                  <FeatureLine ok text="Redistribution in binaries" />
                  <FeatureLine ok text="Priority support + SLA" />
                  <FeatureLine ok text="No attribution required" />
                </ul>
              </PricingCard>
            </div>

            <Card className="mt-6 border border-border bg-card">
              <CardHeader className="flex flex-col gap-1">
                <CardTitle className="text-base">Eliminate legal anxiety</CardTitle>
                <CardDescription>
                  Toggle details to compare allowances side-by-side. We use clear language and visual examples.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="toggle-details"
                      checked={showDetails}
                      onCheckedChange={setShowDetails}
                      aria-label="Toggle detailed comparison"
                    />
                    <Label htmlFor="toggle-details" className="text-sm">
                      Show detailed comparison
                    </Label>
                  </div>
                </div>
                {showDetails && (
                  <ComparisonTable currency={currency} seats={seats} />
                )}
              </CardContent>
            </Card>

            <TrustBar />
          </TabsContent>

          <TabsContent value="attribution" className="mt-6">
            <AttributionGenerator
              brandName={brandName}
              brandUrl={brandUrl}
              project={project}
              setProject={setProject}
              projectUrl={projectUrl}
              setProjectUrl={setProjectUrl}
              asset={asset}
              setAsset={setAsset}
              format={format}
              setFormat={setFormat}
              snippet={attributionSnippet}
              copySnippet={() => copy(attributionSnippet, "Attribution")}
              onUpgrade={() => handleUpgrade("pro")}
            />
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">What’s allowed on each plan</CardTitle>
                <CardDescription>
                  Clear, human-friendly terms. If you’re unsure, contact us and we’ll help you pick the right plan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Allowance
                    title="Free (with attribution)"
                    items={[
                      { ok: true, text: "Personal and commercial projects" },
                      { ok: true, text: "Up to 20 assets/month" },
                      { ok: true, text: "PNG export up to 2K" },
                      { ok: "warn", text: "Visible credit on site/app or in description" },
                      { ok: false, text: "Embedding in closed-source binaries" },
                    ]}
                  />
                  <Allowance
                    title="Pro (no attribution)"
                    items={[
                      { ok: true, text: "Unlimited projects and assets" },
                      { ok: true, text: "SVG/PNG/PDF up to 8K" },
                      { ok: true, text: "Redistribution in binaries" },
                      { ok: true, text: "Priority email support" },
                      { ok: false, text: "Reselling raw assets" },
                    ]}
                  />
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-3">
                  <PlacementExample
                    title="Web page footer"
                    caption="Place a small text link in the footer or credits section."
                  />
                  <PlacementExample
                    title="Video description"
                    caption="Include the attribution line in the YouTube/Vimeo description."
                  />
                  <PlacementExample
                    title="Slide deck"
                    caption="Add a small credit on the title or end slide."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function PricingCard({
  plan,
  currency,
  formatter,
  children,
  highlight,
  badge,
  onClickPrimary,
  footer,
}: {
  plan: PlanKey;
  currency: string;
  formatter: Intl.NumberFormat;
  children: React.ReactNode;
  highlight?: boolean;
  badge?: string;
  onClickPrimary?: () => void;
  footer?: React.ReactNode;
}) {
  const copy = PLAN_COPY[plan];
  const price =
    plan === "teams" ? PLAN_COPY[plan].price(currency) : copy.price(currency);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative border border-border bg-card shadow-sm",
          highlight ? "ring-1 ring-primary" : "hover:shadow-md transition-shadow"
        )}
      >
        {badge && (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 bg-secondary text-secondary-foreground"
          >
            {badge}
          </Badge>
        )}
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{copy.name}</CardTitle>
              <CardDescription className="mt-1">{copy.tagline}</CardDescription>
            </div>
            {plan === "pro" && <Sparkles className="h-5 w-5 text-primary" aria-hidden />}
            {plan === "teams" && <Users className="h-5 w-5 text-primary" aria-hidden />}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold">{price}</span>
            {plan === "teams" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" aria-label="Teams pricing info" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover text-popover-foreground">
                    {formatter.format(49)} includes 3 seats, then {formatter.format(15)}/seat.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">{children}</CardContent>
        {footer ? (
          <CardFooter className="px-6 pb-6">{footer}</CardFooter>
        ) : (
          <CardFooter className="px-6 pb-6">
            <Button
              className="w-full bg-primary text-primary-foreground hover:opacity-95"
              onClick={onClickPrimary}
            >
              {copy.cta}
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}

function FeatureLine({ ok, warn, text }: { ok?: boolean; warn?: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {ok ? (
        <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
      ) : warn ? (
        <Info className="mt-0.5 h-4 w-4 text-chart-5" aria-hidden />
      ) : (
        <X className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
      )}
      <span className={cn("leading-5", !ok && !warn ? "text-muted-foreground" : undefined)}>{text}</span>
    </div>
  );
}

function ComparisonTable({ currency, seats }: { currency: string; seats: number }) {
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border">
      <div role="table" aria-label="Feature comparison" className="w-full">
        <div role="rowgroup">
          <div
            role="row"
            className="grid grid-cols-4 items-center bg-muted/60 px-4 py-3 text-sm font-medium"
          >
            <div role="columnheader" className="text-muted-foreground">
              Features
            </div>
            <div role="columnheader">Free</div>
            <div role="columnheader">Pro</div>
            <div role="columnheader">Teams</div>
          </div>
        </div>
        <div role="rowgroup" className="divide-y divide-border bg-card">
          {FEATURES.map((f) => (
            <div key={f.key} role="row" className="grid grid-cols-4 items-center px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                {f.icon ? <f.icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
                <span>{f.label}</span>
                {f.help && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground" aria-label={`${f.label} info`} />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-popover text-popover-foreground">
                        {f.help}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center">
                <PlanValue value={f.plans.free} />
              </div>
              <div className="flex items-center">
                <PlanValue value={f.plans.pro} />
              </div>
              <div className="flex items-center">
                <PlanValue value={f.plans.teams} />
              </div>
            </div>
          ))}
          {QUOTAS.map((q) => (
            <div key={q.key} role="row" className="grid grid-cols-4 items-center px-4 py-3 text-sm">
              <div className="text-foreground">{q.label}</div>
              <div className="text-muted-foreground">{q.plans.free}</div>
              <div className="text-foreground">{q.plans.pro}</div>
              <div className="text-foreground">{q.plans.teams}</div>
            </div>
          ))}
          <div role="row" className="grid grid-cols-4 items-center px-4 py-3 text-sm">
            <div className="text-foreground">Monthly price</div>
            <div className="text-foreground">{PLAN_COPY.free.price(currency)}</div>
            <div className="text-foreground">{PLAN_COPY.pro.price(currency)}</div>
            <div className="text-foreground">{PLAN_COPY.teams.price(currency, seats)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanValue({ value }: { value: boolean | string | number }) {
  if (typeof value === "boolean") {
    return value ? (
      <div className="inline-flex items-center gap-1.5 text-foreground">
        <Check className="h-4 w-4 text-primary" aria-hidden />
        <span className="sr-only">Included</span>
      </div>
    ) : (
      <div className="inline-flex items-center gap-1.5 text-muted-foreground">
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">Not included</span>
      </div>
    );
  }
  return <span className="text-foreground">{value}</span>;
}

function TrustBar() {
  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-medium">Trusted by teams shipping fast</p>
          <p className="text-sm text-muted-foreground">
            “Clear licenses and great exports. We upgraded to Pro in a day.” — Product Designer, SaaS
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <LogoDot label="Nova" />
          <LogoDot label="Pixel" />
          <LogoDot label="Orbit" />
          <LogoDot label="Peak" />
          <LogoDot label="Loop" />
          <LogoDot label="Forge" />
        </div>
      </div>
    </div>
  );
}

function LogoDot({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      className="flex h-9 items-center justify-center rounded-md border border-border bg-secondary text-xs font-medium text-secondary-foreground"
    >
      {label}
    </div>
  );
}

function AttributionGenerator({
  brandName,
  brandUrl,
  project,
  setProject,
  projectUrl,
  setProjectUrl,
  asset,
  setAsset,
  format,
  setFormat,
  snippet,
  copySnippet,
  onUpgrade,
}: {
  brandName: string;
  brandUrl: string;
  project: string;
  setProject: (v: string) => void;
  projectUrl: string;
  setProjectUrl: (v: string) => void;
  asset: string;
  setAsset: (v: string) => void;
  format: AttributionFormat;
  setFormat: (v: AttributionFormat) => void;
  snippet: string;
  copySnippet: () => void;
  onUpgrade: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Generate attribution</CardTitle>
          <CardDescription>
            Free plan requires a visible credit. Customize your project details and copy the snippet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="asset">Asset name</Label>
              <Input
                id="asset"
                placeholder="e.g., Hero Illustration"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                placeholder="e.g., Acme Marketing Site"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectUrl">Project URL</Label>
              <Input
                id="projectUrl"
                placeholder="https://example.com"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={format === "html" ? "default" : "outline"}
                  className={cn("h-8", format === "html" ? "bg-primary text-primary-foreground" : "")}
                  onClick={() => setFormat("html")}
                >
                  HTML
                </Button>
                <Button
                  type="button"
                  variant={format === "markdown" ? "default" : "outline"}
                  className={cn("h-8", format === "markdown" ? "bg-primary text-primary-foreground" : "")}
                  onClick={() => setFormat("markdown")}
                >
                  Markdown
                </Button>
                <Button
                  type="button"
                  variant={format === "text" ? "default" : "outline"}
                  className={cn("h-8", format === "text" ? "bg-primary text-primary-foreground" : "")}
                  onClick={() => setFormat("text")}
                >
                  Text
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="snippet">Your attribution</Label>
            <Textarea
              id="snippet"
              readOnly
              value={snippet}
              className="min-h-[96px] font-mono text-xs"
              aria-describedby="snippet-help"
            />
            <p id="snippet-help" className="text-xs text-muted-foreground">
              Paste near your footer, About/Credits page, or video description. Keep the link clickable if possible.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={copySnippet}
                aria-label="Copy attribution"
              >
                <Copy className="h-4 w-4" aria-hidden />
                Copy
              </Button>
              <Button
                type="button"
                className="gap-1.5 bg-primary text-primary-foreground hover:opacity-95"
                onClick={onUpgrade}
              >
                Remove attribution (Pro)
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
            <ClipboardCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Required for Free plan
          </div>
          <p className="text-xs text-muted-foreground">
            “No attribution required” is included in Pro and Teams.
          </p>
        </CardFooter>
      </Card>

      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proper placement examples</CardTitle>
          <CardDescription>
            Visual examples showing acceptable attribution placement. Keep it readable and visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <AttributionMock
            title="Footer credit"
            label={`${brandName} credit in footer`}
            snippet={snippet}
          />
          <AttributionMock
            title="About/Credits page"
            label={`Credits section with ${brandName}`}
            snippet={snippet}
          />
          <AttributionMock title="Video description" label="Attribution in description" snippet={snippet} />
          <AttributionMock title="Slide deck" label="End slide credit" snippet={snippet} />
        </CardContent>
      </Card>
    </div>
  );
}

function AttributionMock({
  title,
  label,
  snippet,
}: {
  title: string;
  label: string;
  snippet: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  navigator.clipboard
                    .writeText(snippet)
                    .then(() => toast.success("Sample attribution copied"))
                    .catch(() => toast.error("Unable to copy"));
                }}
                aria-label="Copy sample"
              >
                <Copy className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-popover text-popover-foreground">Copy this example</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="relative overflow-hidden rounded-md border border-border bg-secondary p-3">
        <div className="h-20 rounded-md bg-accent" aria-hidden />
        <div className="mt-2 rounded-md bg-card p-2">
          <div className="h-2 w-2/3 rounded bg-accent" aria-hidden />
          <div className="mt-1 h-2 w-1/2 rounded bg-accent" aria-hidden />
        </div>
        <div className="mt-2 rounded-md bg-card p-2">
          <div className="h-2 w-1/2 rounded bg-accent" aria-hidden />
          <div className="mt-1 h-2 w-1/3 rounded bg-accent" aria-hidden />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1 text-xs">
          <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="truncate" title={label}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

function Allowance({
  title,
  items,
}: {
  title: string;
  items: { ok: boolean | "warn"; text: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            {i.ok === true ? (
              <Check className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
            ) : i.ok === "warn" ? (
              <Info className="mt-0.5 h-4 w-4 text-chart-5" aria-hidden />
            ) : (
              <X className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            <span className={cn(i.ok === false ? "text-muted-foreground" : undefined)}>{i.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PlacementExample({ title, caption }: { title: string; caption: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="relative overflow-hidden rounded-md border border-border bg-secondary p-3">
        <div className="h-16 rounded-md bg-accent" aria-hidden />
        <div className="mt-2 rounded-md bg-card p-2">
          <div className="h-2 w-2/3 rounded bg-accent" aria-hidden />
          <div className="mt-1 h-2 w-1/2 rounded bg-accent" aria-hidden />
          <div className="mt-1 h-2 w-1/3 rounded bg-accent" aria-hidden />
        </div>
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded bg-card/95 px-2 py-1 text-[10px] shadow-sm ring-1 ring-border">
          <Check className="h-3 w-3 text-primary" aria-hidden />
          Attribution
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}