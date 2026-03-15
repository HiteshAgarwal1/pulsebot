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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldIcon, ShieldOffIcon, TrashIcon } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  created_at: string;
  user_config: {
    is_active: boolean;
    delivery_time: string;
  } | null;
  last_delivery: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function toggleActive(userId: string, currentActive: boolean) {
    setActionLoading(userId);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_active",
          user_id: userId,
          is_active: !currentActive,
        }),
      });
      await fetchUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    setActionLoading(userId);
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_role",
          user_id: userId,
          role: currentRole === "admin" ? "user" : "admin",
        }),
      });
      await fetchUsers();
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string) {
    setActionLoading(userId);
    try {
      await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      setDeleteTarget(null);
      await fetchUsers();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage all registered users</p>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          {users.length} registered user{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last Delivery</TableHead>
              <TableHead>Signed Up</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.display_name || "--"}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.user_config?.is_active ?? false}
                    onCheckedChange={() =>
                      toggleActive(
                        user.id,
                        user.user_config?.is_active ?? false
                      )
                    }
                    disabled={actionLoading === user.id}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {user.last_delivery
                    ? new Date(user.last_delivery).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={actionLoading === user.id}
                      title={
                        user.role === "admin"
                          ? "Demote to user"
                          : "Promote to admin"
                      }
                    >
                      {user.role === "admin" ? (
                        <ShieldOffIcon className="size-4" />
                      ) : (
                        <ShieldIcon className="size-4" />
                      )}
                    </Button>

                    <Dialog
                      open={deleteTarget?.id === user.id}
                      onOpenChange={(open) =>
                        setDeleteTarget(open ? user : null)
                      }
                    >
                      <DialogTrigger
                        render={
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            title="Delete user"
                          />
                        }
                      >
                        <TrashIcon className="size-4" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete User</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>{user.email}</strong>? This action cannot be
                            undone. All user data including configs and delivery
                            logs will be permanently removed.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteUser(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
