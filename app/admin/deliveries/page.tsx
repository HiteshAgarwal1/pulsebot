"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCwIcon, RotateCcwIcon } from "lucide-react";

interface DeliveryRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  delivered_at: string;
  article_count: number | null;
  status: "success" | "failed" | "retrying";
  error_message: string | null;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/deliveries?scope=today");
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  function handleRefresh() {
    setRefreshing(true);
    fetchDeliveries();
  }

  async function handleRetry(userId: string, deliveryId: string) {
    setRetrying(deliveryId);
    try {
      await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      await fetchDeliveries();
    } finally {
      setRetrying(null);
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case "success":
        return <Badge variant="default">Success</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "retrying":
        return <Badge variant="secondary">Retrying</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground">
            Today&apos;s delivery monitor
          </p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground">
            {deliveries.length} deliveries today
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCwIcon
            className={`size-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Email</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  {d.user_email || d.user_id || "Unknown"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(d.delivered_at).toLocaleTimeString()}
                </TableCell>
                <TableCell>{d.article_count ?? "--"}</TableCell>
                <TableCell>{statusBadge(d.status)}</TableCell>
                <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                  {d.error_message || "--"}
                </TableCell>
                <TableCell className="text-right">
                  {d.status === "failed" && d.user_id && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => handleRetry(d.user_id!, d.id)}
                      disabled={retrying === d.id}
                    >
                      <RotateCcwIcon
                        className={`size-3 mr-1 ${retrying === d.id ? "animate-spin" : ""}`}
                      />
                      {retrying === d.id ? "Retrying..." : "Retry"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {deliveries.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No deliveries today
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
