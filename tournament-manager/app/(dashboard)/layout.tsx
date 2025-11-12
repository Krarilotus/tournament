// app/(dashboard)/dashboard/layout.tsx
import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Trophy, Settings, PlusCircle } from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen w-full">
      <div className="hidden md:block fixed inset-y-0 left-0 w-[220px] lg:w-[280px] border-r bg-muted/40">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <Trophy className="h-6 w-6" />
              <span>Tournament Manager</span>
            </Link>
          </div>
          <nav className="flex-1 overflow-auto px-4 py-4 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Home className="h-4 w-4" />
              My Tournaments
            </Link>
            <Link
              href="/dashboard/create"
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <PlusCircle className="h-4 w-4" />
              Create New
            </Link>
            <Link
              href="/dashboard/account"
              className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </Link>
          </nav>
        </div>
      </div>

      <div className="md:ml-[220px] lg:ml-[280px] flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          {/* mobile nav */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <div className="flex h-16 items-center border-b px-6">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 font-semibold"
                >
                  <Trophy className="h-6 w-6" />
                  <span>Tournament Manager</span>
                </Link>
              </div>
              <nav className="grid gap-2 p-4 text-lg font-medium">
                <Link
                  href="/dashboard"
                  className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary"
                >
                  <Home className="h-5 w-5" />
                  My Tournaments
                </Link>
                <Link
                  href="/dashboard/create"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary"
                >
                  <PlusCircle className="h-5 w-5" />
                  Create New
                </Link>
                <Link
                  href="/dashboard/account"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary"
                >
                  <Settings className="h-5 w-5" />
                  Account Settings
                </Link>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>

        <Footer />
      </div>
    </div>
  );
}
