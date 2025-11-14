"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// --- (NEW) Import Crown for the new button ---
import {
  Loader2,
  UserPlus,
  X,
  Crown,
  Shield,
  ShieldAlert,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSession } from "next-auth/react";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch data");
    }
    return res.json();
  });

type AdminUser = {
  _id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AdminData = {
  owner: AdminUser;
  admins: AdminUser[];
};

export function ManageAdminsCard({ tournamentId }: { tournamentId: string }) {
  const { mutate } = useSWRConfig();
  const { data: session } = useSession();
  const [emailInput, setEmailInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  // --- (MODIFIED) Store which user is being actioned ---
  const [actionUser, setActionUser] = useState<string | null>(null);

  const {
    data: adminData,
    isLoading,
    error,
  } = useSWR<AdminData>(
    `/api/tournaments/${tournamentId}/admins`,
    fetcher
  );

  const isOwner = session?.user?.id === adminData?.owner?._id;

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setIsAdding(true);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add admin");
      }

      toast.success(data.message);
      setEmailInput("");
      mutate(`/api/tournaments/${tournamentId}/admins`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (userIdToRemove: string) => {
    setActionUser(userIdToRemove);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdToRemove }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to remove admin");
      }

      toast.success(data.message);
      mutate(`/api/tournaments/${tournamentId}/admins`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionUser(null);
    }
  };

  // --- (NEW) Handle Transfer Ownership ---
  const handleTransferOwnership = async (newOwnerId: string) => {
    setActionUser(newOwnerId);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/admins/transfer-ownership`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newOwnerId }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to transfer ownership");
      }

      toast.success(data.message);
      mutate(`/api/tournaments/${tournamentId}/admins`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionUser(null);
    }
  };

  const getInitials = (name?: string | null) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Admins</CardTitle>
        <CardDescription>
          {isOwner
            ? "Add or remove co-admins for this tournament. Admins have full edit access."
            : "You are a co-admin for this tournament. Only the owner can manage the admin list."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isOwner && (
          <form onSubmit={handleAddAdmin} className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter user's email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={isAdding}
            />
            <Button type="submit" disabled={isAdding || !emailInput}>
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </form>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-medium">Current Admins</h4>
          {isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading admins...
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">
              Failed to load admin list.
            </div>
          ) : (
            <ul className="space-y-3">
              {adminData?.owner && (
                <li className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={adminData.owner.image || undefined} />
                      <AvatarFallback>
                        {getInitials(adminData.owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <span className="font-medium">
                        {adminData.owner.name}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {adminData.owner.email}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    <Crown className="h-4 w-4" />
                    Owner
                  </div>
                </li>
              )}
              {adminData?.admins.map((admin) => (
                <li
                  key={admin._id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={admin.image || undefined} />
                      <AvatarFallback>
                        {getInitials(admin.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <span className="font-medium">{admin.name}</span>
                      <span className="ml-2 text-muted-foreground">
                        {admin.email}
                      </span>
                    </div>
                  </div>
                  {isOwner ? (
                    // --- (NEW) Owner's Action Buttons ---
                    <div className="flex items-center gap-1">
                      {/* Transfer Ownership Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                            disabled={actionUser === admin._id}
                          >
                            <Crown className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              <div className="flex items-center gap-2">
                                <ShieldAlert className="h-6 w-6 text-amber-500" />
                                Transfer Ownership?
                              </div>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to make{" "}
                              <strong>{admin.name}</strong> the new owner?
                              <br />
                              <strong className="text-destructive-foreground">
                                You will lose ownership
                              </strong>{" "}
                              and become a co-admin. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={buttonVariants({
                                variant: "destructive",
                              })}
                              onClick={() =>
                                handleTransferOwnership(admin._id)
                              }
                            >
                              Yes, Transfer Ownership
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      {/* Remove Admin Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={actionUser === admin._id}
                          >
                            {actionUser === admin._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {admin.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this admin? They
                              will immediately lose all edit access to this
                              tournament.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className={buttonVariants({
                                variant: "destructive",
                              })}
                              onClick={() => handleRemoveAdmin(admin._id)}
                            >
                              Remove Admin
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    // --- (Unchanged) Non-owner view ---
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      Admin
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}