import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CMSUser } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  Loader2,
  Trash2,
  Shield,
  Edit,
  Users,
  Mail,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CMSUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteUser, setDeleteUser] = useState<CMSUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "editor">("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resetPasswordEmail, setResetPasswordEmail] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCurrentUserRole();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("cms_users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const fetchCurrentUserRole = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserEmail(user.email || null);

    const { data } = await supabase
      .from("cms_users")
      .select("role")
      .eq("email", user.email)
      .single();

    if (data) {
      setCurrentUserRole(data.role);
    }
  };

  const handleInviteUser = async () => {
    if (!newUserEmail.trim()) {
      setInviteError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserEmail)) {
      setInviteError("Please enter a valid email address");
      return;
    }

    setInviting(true);
    setInviteError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/.netlify/functions/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          role: newUserRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to invite user");
      }

      await fetchUsers();
      setShowAddDialog(false);
      setNewUserEmail("");
      setNewUserRole("editor");
    } catch (err) {
      console.error("Invite error:", err);
      setInviteError(
        err instanceof Error ? err.message : "Failed to invite user",
      );
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    setDeletingUser(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/.netlify/functions/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: deleteUser.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      await fetchUsers();
      setDeleteUser(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete user. You may not have permission.",
      );
    } finally {
      setDeletingUser(false);
    }
  };

  const handleResetPassword = async (userEmail: string) => {
    setSendingReset(userEmail);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin + "/admin/reset-password",
      });

      if (error) {
        throw error;
      }

      setResetPasswordEmail(userEmail);
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to send password reset email.",
      );
    } finally {
      setSendingReset(null);
    }
  };

  const isAdmin = currentUserRole === "admin";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">
            Manage CMS users and their roles
          </p>
        </div>
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new CMS user. They'll
                  receive a link to set their password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUserRole}
                    onValueChange={(v) =>
                      setNewUserRole(v as "admin" | "editor")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Editor
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Editors can manage pages, settings, and redirects. Admins can
                    also manage users.
                  </p>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-500">{inviteError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInviteUser} disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Invite...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Role Legend */}
      <div className="flex gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
          <span>Full access including user management</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Edit className="h-3 w-3 mr-1" />
            Editor
          </Badge>
          <span>Can manage content, settings, and redirects</span>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CMS Users ({users.length})
          </CardTitle>
          <CardDescription>
            Users who have access to this CMS admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found. Invite someone to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-28">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email}
                      {user.email === currentUserEmail && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                          <Edit className="h-3 w-3 mr-1" />
                          Editor
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.user_id ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-300"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-300"
                        >
                          Pending Invite
                        </Badge>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Reset Password - only for active users who aren't the current user */}
                          {user.user_id && user.email !== currentUserEmail && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user.email)}
                              disabled={sendingReset === user.email}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Send password reset email"
                            >
                              {sendingReset === user.email ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <KeyRound className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {/* Delete user - not for current user */}
                          {user.email !== currentUserEmail && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUser(user)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Remove user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteUser?.email}</strong> from the CMS? They will no
              longer be able to access the admin panel. Their authentication
              account will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog
        open={!!resetPasswordEmail}
        onOpenChange={() => setResetPasswordEmail(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Password Reset Email Sent</AlertDialogTitle>
            <AlertDialogDescription>
              A password reset link has been sent to{" "}
              <strong>{resetPasswordEmail}</strong>. They will receive an email
              with instructions to set a new password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setResetPasswordEmail(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
