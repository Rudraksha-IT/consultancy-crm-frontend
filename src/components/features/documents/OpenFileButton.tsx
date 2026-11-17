import { Icon } from "@/components/ui/Icon";
import { DOCUMENT_TEXT } from "@/constants/documents";

type OpenFileButtonProps = {
  fileName: string;
  onOpen: () => void;
};

/** A file's name, which opens the file (shown as text, never as markup). */
export function OpenFileButton({ fileName, onOpen }: OpenFileButtonProps) {
  return (
    <button
      type="button"
      aria-label={DOCUMENT_TEXT.open(fileName)}
      onClick={onOpen}
      className="min-h-control text-ink-2 hover:text-accent inline-flex w-fit min-w-0 cursor-pointer items-center gap-1.5 text-left underline-offset-4 hover:underline"
    >
      <Icon name="file" size="sm" />
      <span className="break-all">{fileName}</span>
    </button>
  );
}
