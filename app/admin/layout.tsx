import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import {
  LayoutDashboardIcon,
  UsersIcon,
  SendIcon,
  NewspaperIcon,
  BookOpenIcon,
  SettingsIcon,
  ScrollTextIcon,
  ArrowLeftIcon,
} from "lucide-react";

const ADMIN_NAV = [
  { title: "Overview", href: "/admin", icon: LayoutDashboardIcon },
  { title: "Users", href: "/admin/users", icon: UsersIcon },
  { title: "Deliveries", href: "/admin/deliveries", icon: SendIcon },
  { title: "Articles", href: "/admin/articles", icon: NewspaperIcon },
  { title: "Digests", href: "/admin/digests", icon: BookOpenIcon },
  { title: "Config", href: "/admin/config", icon: SettingsIcon },
  { title: "Logs", href: "/admin/logs", icon: ScrollTextIcon },
];

export default async function AdminLayout({
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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r bg-background">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            PB
          </div>
          <span className="font-semibold text-sm">Admin Panel</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-0.5">
            {ADMIN_NAV.map((item) => (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t p-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4 shrink-0" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
