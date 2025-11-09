// app/(dashboard)/dashboard/[id]/(control-panel)/_components/ParticipantStatusToggle.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTransition } from "react";

interface Props {
  participantId: string;
  isActive: boolean;
  onParticipantsChanged?: () => void;
}

export function ParticipantStatusToggle({
  participantId,
  isActive,
  onParticipantsChanged,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleChange = async (newStatus: boolean) => {
    const toastId = toast.loading("Updating participant...");
    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      toast.success(
        `Participant ${newStatus ? "activated" : "deactivated"}.`,
        {
          id: toastId,
        }
      );

      // ✅ tell parent: data has changed
      startTransition(() => {
        onParticipantsChanged?.();
      });
    } catch (error) {
      console.error(error);
      toast.error("Update failed. Please try again.", { id: toastId });
    }
  };

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleChange}
      disabled={isPending}
      aria-label="Toggle participant status"
    />
  );
}
