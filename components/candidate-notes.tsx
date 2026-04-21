"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, SentIcon } from "@hugeicons/core-free-icons";
import {
  type CandidateNote,
  getCandidateNotes,
  addCandidateNote,
  deleteCandidateNote,
} from "@/src/lib/candidate-actions";
import { cn } from "@/lib/utils";

interface CandidateNotesProps {
  candidateId: string;
}

export function CandidateNotes({ candidateId }: CandidateNotesProps) {
  const t = useTranslations("sheet");
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, startAddNote] = useTransition();
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (isLoaded || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCandidateNotes(candidateId);
      if (result.ok) {
        setNotes(result.notes);
        setIsLoaded(true);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [candidateId, isLoaded, isLoading]);

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return;
    startAddNote(async () => {
      setError(null);
      const result = await addCandidateNote(candidateId, newNote);
      if (result.ok) {
        setNotes((prev) => [result.note, ...prev]);
        setNewNote("");
      } else {
        setError(result.error);
      }
    });
  }, [candidateId, newNote]);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    setDeletingNoteId(noteId);
    setError(null);
    try {
      const result = await deleteCandidateNote(noteId);
      if (result.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        setError(result.error);
      }
    } finally {
      setDeletingNoteId(null);
    }
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Load notes on first interaction
  if (!isLoaded && !isLoading) {
    return (
      <section className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("notesTitle")}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadNotes}
          className="w-full"
        >
          {t("loadNotes")}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("notesTitle")}
      </h3>

      {/* Add note form */}
      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t("notePlaceholder")}
          className={cn(
            "min-h-[4rem] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-xs",
            "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          )}
          disabled={isAddingNote}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAddNote}
          disabled={isAddingNote || !newNote.trim()}
          className="h-auto self-end"
          aria-label={t("addNote")}
        >
          {isAddingNote ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <HugeiconsIcon icon={SentIcon} className="h-4 w-4" strokeWidth={2} />
          )}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Spinner className="h-5 w-5" />
        </div>
      )}

      {/* Notes list */}
      {!isLoading && notes.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("noNotes")}</p>
      )}

      {!isLoading && notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group relative rounded-md border border-border/60 bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="whitespace-pre-wrap text-xs text-foreground">
                    {note.content}
                  </p>
                  <p className="text-[0.625rem] text-muted-foreground">
                    {note.author_name} — {formatDate(note.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDeleteNote(note.id)}
                  disabled={deletingNoteId === note.id}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={t("deleteNote")}
                >
                  {deletingNoteId === note.id ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <HugeiconsIcon
                      icon={Delete02Icon}
                      className="h-3.5 w-3.5 text-destructive"
                      strokeWidth={2}
                    />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
