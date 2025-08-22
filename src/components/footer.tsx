"use client"

import * as React from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Github,
  Twitter,
  Linkedin,
  MessageSquare as Discord,
  Mail,
  ArrowRight,
} from "lucide-react"

type LinkItem = {
  label: string
  href?: string
  external?: boolean
}

type LinkGroup = {
  title: string
  links: LinkItem[]
}

type SocialItem = {
  label: "GitHub" | "X" | "LinkedIn" | "Discord" | "Email"
  href: string
  icon?: React.ReactNode
}

type Contact = {
  email?: string
  phone?: string
  addressLines?: string[]
}

export interface FooterProps {
  className?: string
  style?: React.CSSProperties
  /**
   * Control whether the footer contents are wrapped in an internal container.
   * Parent pages should typically manage outer layout; leave false to span full width.
   */
  contained?: boolean
  /**
   * Optional brand name to display in the footer.
   */
  brandName?: string
  /**
   * Optional brief tagline or description under the brand.
   */
  tagline?: string
  /**
   * Link groups for the footer. If omitted, non-clickable placeholders are shown.
   */
  groups?: {
    product?: LinkGroup
    company?: LinkGroup
    legal?: LinkGroup
    community?: LinkGroup
  }
  /**
   * Social links to render. Provide only the ones you need.
   */
  socials?: SocialItem[]
  /**
   * Contact information block.
   */
  contact?: Contact
  /**
   * Called on newsletter subscribe. If omitted, a default success toast is shown.
   */
  onSubscribe?: (email: string) => Promise<void> | void
  /**
   * Show "Built with" attribution row.
   */
  showAttribution?: boolean
}

function cx(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ")
}

const defaultGroups: FooterProps["groups"] = {
  product: {
    title: "Product",
    links: [
      { label: "API documentation" },
      { label: "Figma plugin" },
      { label: "Developer tools" },
    ],
  },
  company: {
    title: "Company",
    links: [{ label: "About" }, { label: "Blog" }, { label: "Pricing" }],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Terms of service" },
      { label: "Privacy policy" },
      { label: "Licensing guide" },
    ],
  },
  community: {
    title: "Community",
    links: [
      { label: "GitHub", href: "https://github.com", external: true },
      { label: "Discord", href: "https://discord.com", external: true },
      { label: "Support", href: "https://support.google.com", external: true },
    ],
  },
}

const defaultSocials: SocialItem[] = [
  { label: "GitHub", href: "https://github.com", icon: <Github className="size-4" aria-hidden="true" /> },
  { label: "X", href: "https://x.com", icon: <Twitter className="size-4" aria-hidden="true" /> },
  { label: "LinkedIn", href: "https://www.linkedin.com", icon: <Linkedin className="size-4" aria-hidden="true" /> },
  { label: "Discord", href: "https://discord.com", icon: <Discord className="size-4" aria-hidden="true" /> },
]

export default function Footer({
  className,
  style,
  contained = false,
  brandName,
  tagline,
  groups = defaultGroups,
  socials = defaultSocials,
  contact,
  onSubscribe,
  showAttribution = true,
}: FooterProps) {
  const [email, setEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Enter a valid email address")
      return
    }
    try {
      setSubmitting(true)
      if (onSubscribe) {
        await onSubscribe(email)
      } else {
        // Simulate a successful subscribe as a sensible default
        await new Promise((r) => setTimeout(r, 600))
      }
      toast.success("You're subscribed. Welcome aboard!")
      setEmail("")
    } catch (err) {
      toast.error("Subscription failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function renderItem(item: LinkItem) {
    if (item.href) {
      const rel = item.external ? "noreferrer noopener" : undefined
      const target = item.external ? "_blank" : undefined
      return (
        <a
          key={item.label}
          href={item.href}
          rel={rel}
          target={target}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
        >
          {item.label}
        </a>
      )
    }
    return (
      <span
        key={item.label}
        aria-disabled="true"
        className="text-sm text-muted-foreground/70 cursor-not-allowed select-none"
        title="Link unavailable"
      >
        {item.label}
      </span>
    )
  }

  return (
    <footer
      role="contentinfo"
      aria-label="Footer"
      className={cx(
        "bg-secondary border-t",
        "text-foreground",
        className
      )}
      style={style}
    >
      <div className={cx(contained ? "mx-auto w-full max-w-7xl px-6" : "", "py-12 sm:py-14")}>
        {/* Top: Brand + Newsletter + Social */}
        <div className="grid gap-8 md:gap-10 lg:gap-12 md:grid-cols-3">
          <div className="space-y-4">
            {brandName ? (
              <>
                <div className="inline-flex items-center gap-2">
                  <div className="size-8 rounded-md bg-card shadow-sm ring-1 ring-border" aria-hidden="true" />
                  <span className="font-heading text-lg font-semibold tracking-tight">
                    {brandName}
                  </span>
                </div>
                {tagline ? (
                  <p className="text-sm text-muted-foreground max-w-prose">
                    {tagline}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground max-w-prose">
                Subscribe to our newsletter for product updates, best practices,
                and resources for builders.
              </p>
            )}

            {contact ? (
              <div className="mt-4 space-y-1">
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
                    aria-label={`Email ${brandName ?? "support"}`}
                  >
                    <Mail className="size-4" aria-hidden="true" />
                    {contact.email}
                  </a>
                ) : null}
                {contact.phone ? (
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                ) : null}
                {contact.addressLines?.length ? (
                  <address className="not-italic text-sm text-muted-foreground">
                    {contact.addressLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </address>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-lg border"
              aria-label="Newsletter signup form"
            >
              <div className="flex-1">
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <Input
                  id="newsletter-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  required
                  className="bg-card"
                  aria-describedby="newsletter-help"
                />
                <p id="newsletter-help" className="mt-2 text-xs text-muted-foreground">
                  We'll only send thoughtful updates. Unsubscribe anytime.
                </p>
              </div>
              <Button
                type="submit"
                aria-label="Subscribe to newsletter"
                disabled={submitting}
                className="shrink-0"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-full border-2 border-primary border-r-transparent animate-spin" aria-hidden="true" />
                    Subscribing…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Subscribe
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                )}
              </Button>
            </form>

            {socials?.length ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {socials.map((s, i) => (
                  <a
                    key={`${s.label}-${i}`}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={s.label}
                    className="inline-flex items-center justify-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
                  >
                    {s.icon ??
                      (s.label === "GitHub" ? <Github className="size-4" aria-hidden="true" /> :
                        s.label === "X" ? <Twitter className="size-4" aria-hidden="true" /> :
                          s.label === "LinkedIn" ? <Linkedin className="size-4" aria-hidden="true" /> :
                            s.label === "Discord" ? <Discord className="size-4" aria-hidden="true" /> :
                              <Mail className="size-4" aria-hidden="true" />)}
                    <span className="sr-only">{s.label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Middle: Link groups */}
        <div className="mt-10 md:mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {groups?.product ? (
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">
                {groups.product.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {groups.product.links.map((l) => (
                  <li key={l.label}>{renderItem(l)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups?.company ? (
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">
                {groups.company.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {groups.company.links.map((l) => (
                  <li key={l.label}>{renderItem(l)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups?.legal ? (
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">
                {groups.legal.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {groups.legal.links.map((l) => (
                  <li key={l.label}>{renderItem(l)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups?.community ? (
            <div>
              <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">
                {groups.community.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {groups.community.links.map((l) => (
                  <li key={l.label}>{renderItem(l)}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Bottom: Legal + Attribution */}
        <div className="mt-10 md:mt-12 pt-6 border-t text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="order-2 sm:order-1">
              © {new Date().getFullYear()} {brandName ?? "Your Company"}. All rights reserved.
            </p>
            {showAttribution ? (
              <p className="order-1 sm:order-2">
                Built with
                {" "}
                <a
                  href="https://nextjs.org"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Next.js
                </a>
                ,{" "}
                <a
                  href="https://ui.shadcn.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  shadcn/ui
                </a>
                , and{" "}
                <a
                  href="https://tailwindcss.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline underline-offset-4 hover:text-foreground transition-colors"
                >
                  Tailwind CSS
                </a>
                .
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  )
}