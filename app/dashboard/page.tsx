import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile, DeliveryLog } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SettingsIcon,
  EyeIcon,
  NewspaperIcon,
  TruckIcon,
  ArrowRightIcon,
} from "lucide-react";

function statusBadge(status: DeliveryLog["status"]) {
  const variants: Record<
    DeliveryLog["status"],
    { variant: "default" | "destructive" | "secondary"; label: string }
  > = {
    success: { variant: "default", label: "Delivered" },
    failed: { variant: "destructive", label: "Failed" },
    retrying: { variant: "secondary", label: "Retrying" },
  };
  const { variant, label } = variants[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default async function DashboardPage() {
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

  const { data: latestDelivery } = await supabase
    .from("delivery_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("delivered_at", { ascending: false })
    .limit(1)
    .single<DeliveryLog>();

  const todayArticleCount = latestDelivery?.article_count ?? 0;
  const displayName =
    profile?.display_name || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Here is an overview of your AI news digest.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Latest Delivery
            </CardTitle>
            <TruckIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latestDelivery ? (
              <div className="space-y-1">
                {statusBadge(latestDelivery.status)}
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(latestDelivery.delivered_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No deliveries yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Articles Today
            </CardTitle>
            <NewspaperIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayArticleCount}</div>
            <p className="text-xs text-muted-foreground">
              In your latest digest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Digest Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {latestDelivery ? "Digest delivered" : "No digest available"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SettingsIcon className="size-4" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure your Slack webhook, delivery time, and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/dashboard/settings" />}
              >
                Go to Settings
                <ArrowRightIcon className="size-3" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <EyeIcon className="size-4" />
                Preview
              </CardTitle>
              <CardDescription>
                Generate and preview your next digest before it is delivered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/dashboard/preview" />}
              >
                Preview Digest
                <ArrowRightIcon className="size-3" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NewspaperIcon className="size-4" />
                History
              </CardTitle>
              <CardDescription>
                View past deliveries and their statuses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/dashboard/history" />}
              >
                View History
                <ArrowRightIcon className="size-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
