import { Icon } from "@/components/ui/Icon";
import { DOCUMENT_TEXT } from "@/constants/documents";
import { isZipFileName } from "@/lib/documents";

import type { LinkAction } from "./useDocumentLink";

type OpenFileButtonProps = {
  fileName: string;
  /** Called with "download" for a zip, which is never opened in the browser (ticket 09). */
  onOpen: (action: LinkAction) => void;
};

/** A file's name, which opens the file, or saves it when it is a zip (shown as text, never markup). */
export function OpenFileButton({ fileName, onOpen }: OpenFileButtonProps) {
  const isZip = isZipFileName(fileName);
  return (
    <button
      type="button"
      aria-label={isZip ? DOCUMENT_TEXT.download(fileName) : DOCUMENT_TEXT.open(fileName)}
      onClick={() => {
        onOpen(isZip ? "download" : "open");
      }}
      className="min-h-control text-ink-2 hover:text-accent inline-flex w-fit min-w-0 cursor-pointer items-center gap-1.5 text-left underline-offset-4 hover:underline"
    >
      <Icon name={isZip ? "zip" : "file"} size="sm" />
      <span className="break-all">{fileName}</span>
    </button>
  );
}
