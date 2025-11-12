"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tournamentId: string;
  roundId: string;
  disabled?: boolean;
  onDeleted: () => void;
}

export function DeleteRoundButton({
  tournamentId,
  roundId,
  disabled,
  onDeleted,
}: Props) {
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (loading) return;

    const confirmed = window.confirm(
      "Delete this round and all its matches/results? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${roundId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to delete round");
      }

      toast.success("Round deleted.");
      onDeleted();
    } catch (err: any) {
      console.error("Failed to delete round:", err);
      toast.error(err.message || "Failed to delete round");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-red-500 hover:text-red-600"
      onClick={handleDelete}
      disabled={disabled || loading}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete round</span>
    </Button>
  );
}
