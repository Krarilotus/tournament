// app/(dashboard)/dashboard/[id]/(control-panel)/_components/AddParticipantDialog.tsx

"use client";
import { useState } from "react";

import { useForm, useFieldArray } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { batchAddParticipantsSchema } from "@/lib/validators";

import { Button } from "@/components/ui/button";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { PlusCircle, Trash2 } from "lucide-react";
type ParticipantBatchForm = z.infer<typeof batchAddParticipantsSchema>;
type AddParticipantDialogProps = {
  tournamentId: string;
  onParticipantsChanged?: () => void;
};
export function AddParticipantDialog({
  tournamentId,
  onParticipantsChanged,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<ParticipantBatchForm>({
    resolver: zodResolver(batchAddParticipantsSchema),
    defaultValues: {
      participants: [{ name: "", customId: "" }],
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState,
    getValues,
    setValue,
  } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "participants",
  });
  const onSubmit = async (values: ParticipantBatchForm) => {
    // Ignore empty-name rows
    const filtered = values.participants.filter(
      (p) => p.name && p.name.trim() !== ""
    );
    if (filtered.length === 0) {
      toast.error("Please enter at least one participant name.");
      return;
    }
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: filtered }),
      });
      if (!res.ok) {
        throw new Error("Failed to add participants");
      }
      toast.success("Participants added!");
      reset({ participants: [{ name: "", customId: "" }] });
      setOpen(false);
      onParticipantsChanged?.();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred. Please try again.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Participants
        </Button>
      </DialogTrigger>
      {/* --- MODIFIED: Fixed height dialog --- */}
      <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Add New Participants</DialogTitle>
          <DialogDescription>
            Type or paste names row by row. Empty rows will be ignored.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* --- MODIFIED: Form layout for scrolling content --- */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 overflow-y-auto space-y-4 px-6"
          >
            {/* Table-like header */}
            <div className="space-y-1 sticky top-0 bg-background pt-2">
              <div className="grid grid-cols-[1.6fr_1.4fr_auto] text-xs text-muted-foreground px-1">
                <span>Name</span>
                <span>Custom ID (optional)</span>
                <span className="text-right">Actions</span>
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-0.5">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-[1.6fr_1.4fr_auto] items-center gap-1 border-b border-muted/40 py-1"
                >
                  {/* Name cell */}
                  <FormField
                    control={control}
                    name={`participants.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Player One"
                            className="h-8 border-none shadow-none px-1 focus-visible:ring-0"
                            // Multi-line paste support
                            onPaste={(e) => {
                              const text = e.clipboardData.getData("text") ?? "";
                              const rawLines = text.split(/\r?\n/).map((l) => l.trim());
                              const lines = rawLines.filter(Boolean);

                              // If it's just one line, let the browser handle it normally
                              if (lines.length <= 1) {
                                return;
                              }

                              e.preventDefault();

                              const current = getValues("participants") || [];
                              const rows = [...current];

                              for (let i = 0; i < lines.length; i++) {
                                const rowIndex = index + i;
                                if (!rows[rowIndex]) {
                                  rows[rowIndex] = { name: "", customId: "" };
                                }

                                const line = lines[i];

                                // Split by TAB: "Alic\tsteve" -> ["Alic", "steve"]
                                const [namePart, customIdPart] = line.split("\t");

                                rows[rowIndex] = {
                                  ...rows[rowIndex],
                                  name: namePart?.trim() ?? "",
                                  customId:
                                    customIdPart && customIdPart.trim() !== ""
                                      ? customIdPart.trim()
                                      : rows[rowIndex].customId ?? "",
                                };
                              }

                              // Ensure there is at least one empty row at the end
                              const last = rows[rows.length - 1];
                              const lastName =
                                typeof last?.name === "string" ? last.name.trim() : "";
                              if (last && lastName !== "") {
                                rows.push({ name: "", customId: "" });
                              }

                              setValue("participants", rows);
                            }}
                            // Only create a new row when leaving the last one with a non-empty name
                            onBlur={(e) => {
                              field.onBlur();
                              const value = e.target.value.trim();
                              const rows = getValues("participants") || [];
                              const isLast =
                                index === rows.length - 1;
                              if (!isLast) return;
                              const last = rows[rows.length - 1];
                              const lastName =
                                typeof last?.name === "string"
                                  ? last.name.trim()
                                  : "";
                              if (lastName !== "") {
                                append({ name: "", customId: "" });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* Custom ID cell */}
                  <FormField
                    control={control}
                    name={`participants.${index}.customId`}
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., GameHandle"
                            className="h-8 border-none shadow-none px-1 focus-visible:ring-0"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* Delete cell */}
                  <div className="flex justify-end pr-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">
                        Remove participant
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {/* --- END Rows --- */}
          </form>
          {/* --- END Form --- */}
        </Form>
        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Adding..." : "Add Participants"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}