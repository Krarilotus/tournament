"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";

// Define the shape of the JSON file we expect
type ExportedData = {
  version: string;
  data: {
    tournament: { name: string };
    participants: unknown[];
    teams: unknown[];
    rounds: unknown[];
    matches: unknown[];
  };
};

export function ImportTournamentDialog() {
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileContent, setFileContent] = useState<ExportedData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileContent(null);
      setFileName("");
      setError("");
      return;
    }

    setFileName(file.name);
    setError("");

    try {
      const text = await file.text();
      const json = JSON.parse(text) as ExportedData;

      // Basic validation of the file structure
      if (
        !json.version ||
        !json.data ||
        !json.data.tournament ||
        !json.data.participants
      ) {
        throw new Error("Invalid file format.");
      }
      setFileContent(json);
    } catch (err) {
      console.error("File read error:", err);
      setError(
        "Failed to read or parse file. Is this a valid tournament export?"
      );
      setFileContent(null);
    }
  };

  const handleImport = async () => {
    if (!fileContent) return;

    setIsImporting(true);
    setError("");

    try {
      const res = await fetch("/api/tournaments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileContent), // Send the whole parsed JSON
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to import tournament.");
      }

      const newTournament = await res.json();
      toast.success("Tournament imported successfully!");
      setOpen(false);
      // Redirect to the new tournament's page
      router.push(`/dashboard/${newTournament._id}/rounds`);
      router.refresh(); // Force refresh of the dashboard list
    } catch (err: any) {
      console.error("Import error:", err);
      setError(err.message || "An unknown error occurred during import.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setFileContent(null);
    setFileName("");
    setError("");
    setIsImporting(false);
    // This is a bit of a hack to clear the file input
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Tournament</DialogTitle>
          <DialogDescription>
            Upload a `.json` file that was previously exported from Tournament
            Manager.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="file-upload">Tournament File (.json)</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>

          {fileContent && !error && (
            <div className="rounded-md border bg-muted p-4 text-sm">
              <p className="font-semibold">Import Summary:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                <li>
                  Tournament:{" "}
                  <strong>{fileContent.data.tournament.name}</strong>
                </li>
                <li>Version: {fileContent.version}</li>
                <li>
                  {fileContent.data.participants.length} participants
                </li>
                <li>{fileContent.data.teams.length} teams</li>
                <li>{fileContent.data.rounds.length} rounds</li>
              </ul>
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!fileContent || isImporting}
          >
            {isImporting ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}