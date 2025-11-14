"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import Link from "next/link";

// This is the type for the lightweight tournament list
type TournamentOption = {
  _id: string;
  name: string;
};

export function ExportTournamentDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return; // Don't fetch unless the dialog is open

    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/tournaments");
        if (!res.ok) throw new Error("Failed to fetch tournaments");
        const data = (await res.json()) as TournamentOption[];
        setTournaments(data);
      } catch (err) {
        toast.error("Could not load tournament list.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Tournament</DialogTitle>
          <DialogDescription>
            Select a tournament to download its full JSON backup.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Select
              onValueChange={setSelectedId}
              disabled={tournaments.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tournament..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
                {tournaments.length === 0 && (
                  <SelectItem value="none" disabled>
                    No tournaments found.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            asChild
            disabled={!selectedId || isLoading}
            // This is a "trick" - we render a Link as a Button.
            // When clicked, it just follows the 'href' and triggers the download.
            // We also add onClick to close the dialog.
          >
            <Link
              href={
                selectedId ? `/api/tournaments/${selectedId}/export` : "#"
              }
              download
              onClick={() => {
                if (selectedId) setOpen(false);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}