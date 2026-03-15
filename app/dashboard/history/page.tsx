import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { DeliveryLog } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const PAGE_SIZE = 10;

function statusBadge(status: DeliveryLog["status"]) {
  const map: Record<
    DeliveryLog["status"],
    { variant: "default" | "destructive" | "secondary"; label: string }
  > = {
    success: { variant: "default", label: "Success" },
    failed: { variant: "destructive", label: "Failed" },
    retrying: { variant: "secondary", label: "Retrying" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: logs, count } = await supabase
    .from("delivery_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("delivered_at", { ascending: false })
    .range(from, to)
    .returns<DeliveryLog[]>();

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const items = logs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Delivery History</h1>
        <p className="text-muted-foreground">
          View your past digest deliveries and their statuses.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>
            {count ?? 0} total deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No delivery history yet. Your digest deliveries will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {new Date(log.delivered_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{log.article_count ?? 0}</TableCell>
                    <TableCell>{statusBadge(log.status)}</TableCell>
                    <TableCell>
                      {log.digest_snapshot ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm text-primary hover:underline">
                            View digest
                          </summary>
                          <div className="mt-2 space-y-2 rounded-md border bg-muted/50 p-3">
                            <p className="text-sm font-medium">
                              {log.digest_snapshot.tldr}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {log.digest_snapshot.categoriesCovered.map(
                                (cat) => (
                                  <Badge
                                    key={cat}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {cat}
                                  </Badge>
                                )
                              )}
                            </div>
                            <ul className="space-y-1">
                              {log.digest_snapshot.articles
                                .slice(0, 5)
                                .map((article, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <a
                                      href={article.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {article.title}
                                    </a>{" "}
                                    - {article.source}
                                  </li>
                                ))}
                              {log.digest_snapshot.articles.length > 5 && (
                                <li className="text-xs text-muted-foreground">
                                  ...and{" "}
                                  {log.digest_snapshot.articles.length - 5} more
                                </li>
                              )}
                            </ul>
                          </div>
                        </details>
                      ) : log.error_message ? (
                        <span className="text-xs text-destructive">
                          {log.error_message}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          --
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/history?page=${page - 1}`} />
                    }
                  >
                    <ChevronLeftIcon className="size-4" />
                    Previous
                  </Button>
                )}
                {page < totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/history?page=${page + 1}`} />
                    }
                  >
                    Next
                    <ChevronRightIcon className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
