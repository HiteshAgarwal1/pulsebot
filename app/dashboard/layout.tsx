import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserConfig } from "@/lib/types";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboardIcon,
  SettingsIcon,
  TagsIcon,
  HistoryIcon,
  EyeIcon,
  ShieldIcon,
  LogOutIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
  { title: "Topics", href: "/dashboard/topics", icon: TagsIcon },
  { title: "History", href: "/dashboard/history", icon: HistoryIcon },
  { title: "Preview", href: "/dashboard/preview", icon: EyeIcon },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: config } = await supabase
    .from("user_configs")
    .select("id")
    .eq("user_id", user.id)
    .single<Pick<UserConfig, "id">>();

  const hasConfig = !!config;
  const isAdmin = profile?.role === "admin";
  const displayName = profile?.display_name || user.email || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                    📡
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Pulsebot</span>
                    <span className="text-xs text-muted-foreground">
                      AI News Digest
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarSeparator />

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Admin Panel"
                        render={<Link href="/admin" />}
                      >
                        <ShieldIcon className="size-4" />
                        <span>Admin Panel</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <form action="/api/auth/signout" method="POST">
                  <SidebarMenuButton
                    render={<button type="submit" className="w-full" />}
                    tooltip="Sign Out"
                  >
                    <LogOutIcon className="size-4" />
                    <span>Sign Out</span>
                  </SidebarMenuButton>
                </form>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
            <SidebarTrigger />
            <ThemeToggle />
          </header>

          {!hasConfig && (
            <div className="border-b bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-700 dark:text-amber-400"
                >
                  Setup Required
                </Badge>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Complete your configuration to start receiving AI news
                  digests.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/dashboard/settings" />}
                >
                  Go to Settings
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  );
}
