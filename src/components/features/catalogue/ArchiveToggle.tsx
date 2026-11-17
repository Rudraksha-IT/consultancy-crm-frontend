import { Button } from "@/components/ui/Button";

type ArchiveToggleProps = {
  isArchived: boolean;
  /** "Archive course" / "Restore course", or the University's. */
  words: { archive: string; restore: string };
  onToggle: () => void;
};

/** Archive or Restore on an edit page; it takes effect on Save (issue 92). */
export function ArchiveToggle({ isArchived, words, onToggle }: ArchiveToggleProps) {
  return (
    <Button
      variant={isArchived ? "secondary" : "ghost"}
      size="sm"
      icon={isArchived ? "restore" : "trash"}
      onClick={onToggle}
    >
      {isArchived ? words.restore : words.archive}
    </Button>
  );
}
