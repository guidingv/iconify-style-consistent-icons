"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type NavItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

type User = {
  name?: string;
  email?: string;
  imageUrl?: string;
};

export interface HeaderProps {
  className?: string;
  fixed?: boolean;
  navItems?: NavItem[];
  user?: User;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onSignOut?: () => void;
  logoHref?: string;
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function BrandMark() {
  return (
    <div className="relative flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-primary/90 shadow-sm ring-1 ring-primary/30"
      >
        <span className="block h-2 w-2 rounded-sm bg-white/90" />
      </span>
      <span className="flex items-baseline font-heading text-[15px] font-bold leading-none tracking-tight text-foreground">
        <span>iconsforfree</span>
        <span className="ml-0.5 text-primary">.</span>
        <span className="ml-1 text-muted-foreground">com</span>
      </span>
    </div>
  );
}

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const base =
    "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors";
  const inactive =
    "text-muted-foreground hover:text-foreground hover:bg-accent";
  const active =
    "text-foreground bg-accent";
  if (item.href) {
    return (
      <Link
        href={item.href}
        aria-current={item.active ? "page" : undefined}
        className={cn(base, item.active ? active : inactive)}
        onClick={onNavigate}
      >
        {item.label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        item.onClick?.();
        onNavigate?.();
      }}
      className={cn(base, item.active ? active : inactive)}
      aria-pressed={item.active || false}
    >
      {item.label}
    </button>
  );
}

export default function Header({
  className,
  fixed = true,
  navItems = [],
  user,
  onSignIn,
  onSignUp,
  onSignOut,
  logoHref,
}: HeaderProps) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const initials =
    (user?.name || user?.email || "?")
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const Wrapper = fixed ? "div" : "div";

  return (
    <Wrapper
      className={cn(
        "z-50",
        fixed ? "fixed inset-x-0 top-0" : "",
        className
      )}
      role="banner"
      aria-label="Site header"
    >
      <header
        className={cn(
          "w-full bg-card/95 backdrop-saturate-150 supports-[backdrop-filter]:backdrop-blur",
          "border-b border-border",
          scrolled ? "shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(0,0,0,0.08)]" : "shadow-none"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Left: Mobile menu + Brand */}
          <div className="flex min-w-0 items-center gap-3">
            {navItems.length > 0 ? (
              <div className="md:hidden">
                <MobileNav
                  navItems={navItems}
                  user={user}
                  onSignIn={onSignIn}
                  onSignUp={onSignUp}
                  onSignOut={onSignOut}
                />
              </div>
            ) : null}

            {logoHref ? (
              <Link href={logoHref} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
                <BrandMark />
              </Link>
            ) : (
              <div className="select-none">
                <BrandMark />
              </div>
            )}
          </div>

          {/* Center: Desktop nav */}
          <nav
            aria-label="Primary"
            className="hidden md:flex md:min-w-0 md:flex-1 md:items-center md:justify-center"
          >
            {navItems.length > 0 ? (
              <ul className="flex items-center gap-1">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <NavLink item={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {!user ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onSignIn}
                  className="text-foreground hover:text-foreground"
                >
                  Log in
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onSignUp}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring"
                >
                  Sign up
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group inline-flex items-center gap-2 px-2"
                    aria-label="Open user menu"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 ring-1 ring-border">
                        {user.imageUrl ? (
                          <AvatarImage src={user.imageUrl} alt={user.name || "User"} />
                        ) : null}
                        <AvatarFallback className="bg-accent text-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-medium text-foreground md:inline">
                        {user.name || user.email || "Account"}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56"
                >
                  <DropdownMenuLabel className="space-y-0.5">
                    <div className="text-sm font-medium text-foreground">
                      {user.name || "Signed in"}
                    </div>
                    {user.email ? (
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    ) : null}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
      {/* Spacer to offset fixed header, can be controlled by parent if needed */}
      {fixed ? <div aria-hidden="true" className="h-16" /> : null}
    </Wrapper>
  );
}

function MobileNav({
  navItems,
  user,
  onSignIn,
  onSignUp,
  onSignOut,
}: {
  navItems: NavItem[];
  user?: User;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  const handleNavigate = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="h-9 w-9"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[300px] bg-card p-0"
        aria-label="Mobile navigation"
      >
        <div className="flex flex-col">
          <div className="border-b border-border px-4 pb-3 pt-4">
            <BrandMark />
          </div>
          <nav className="px-2 py-3">
            {navItems.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.label}>
                    <NavLink item={item} onNavigate={handleNavigate} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-2 py-2 text-sm text-muted-foreground">
                Navigation
              </div>
            )}
          </nav>
          <div className="mt-auto border-t border-border p-4">
            {!user ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOpen(false);
                    onSignIn?.();
                  }}
                >
                  Log in
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setOpen(false);
                    onSignUp?.();
                  }}
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    {user.imageUrl ? (
                      <AvatarImage src={user.imageUrl} alt={user.name || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-accent text-foreground">
                      {(user.name || user.email || "?")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {user.name || "Signed in"}
                    </div>
                    {user.email ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onSignOut?.();
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}