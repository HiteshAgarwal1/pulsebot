import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [
    { count: totalUsers },
    { count: activeUsers },
    { data: todayDigest },
    { count: todayArticles },
    { data: todayDeliveries },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("user_configs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("daily_digests")
      .select("*")
      .eq("digest_date", today)
      .maybeSingle(),
    supabase
      .from("articles")
      .select("*", { count: "exact", head: true })
      .gte("published_at", `${today}T00:00:00`)
      .lt("published_at", `${today}T23:59:59`),
    supabase
      .from("delivery_logs")
      .select("status")
      .gte("delivered_at", `${today}T00:00:00`),
  ]);

  const successCount =
    todayDeliveries?.filter((d) => d.status === "success").length ?? 0;
  const failedCount =
    todayDeliveries?.filter((d) => d.status === "failed").length ?? 0;
  const totalDeliveries = successCount + failedCount;
  const successRate =
    totalDeliveries > 0
      ? Math.round((successCount / totalDeliveries) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">
          System status for {format(new Date(), "MMMM d, yyyy")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl">{totalUsers ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {activeUsers ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today&apos;s Digest</CardDescription>
            <CardTitle className="text-3xl">
              {todayDigest ? (
                <Badge variant="default">Generated</Badge>
              ) : (
                <Badge variant="secondary">Pending</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {todayDigest
                ? `${(todayDigest.categories_covered as string[] | null)?.length ?? 0} categories covered`
                : "Not yet generated today"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Articles Today</CardDescription>
            <CardTitle className="text-3xl">{todayArticles ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Fetched and processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delivery Rate</CardDescription>
            <CardTitle className="text-3xl">
              {totalDeliveries > 0 ? `${successRate}%` : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {successCount} success / {failedCount} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {todayDigest && (
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s TL;DR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {todayDigest.tldr}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
