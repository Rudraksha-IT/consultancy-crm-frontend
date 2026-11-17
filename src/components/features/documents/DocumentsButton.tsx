import { Button } from "@/components/ui/Button";
import { DOCUMENT_TEXT } from "@/constants/documents";

/** How far a Student's checklist is, as the Homes and the Visas list show it. */
export type DocumentCount = { done: number; total: number; rejected: number; waiting: number };

type DocumentsButtonProps = {
  studentName: string;
  documents: DocumentCount;
  onOpen: () => void;
};

/** "5/9 documents", opening the Student's checklist; what needs looking at is read out too. */
export function DocumentsButton({ studentName, documents, onOpen }: DocumentsButtonProps) {
  const { done, total, rejected, waiting } = documents;
  return (
    <Button icon="file" onClick={onOpen}>
      <span aria-hidden="true">
        <b className="tabular-nums">
          {done}/{total}
        </b>{" "}
        {DOCUMENT_TEXT.countWord}
      </span>
      <span className="sr-only">
        {DOCUMENT_TEXT.countFor(studentName, done, total, rejected, waiting)}
      </span>
    </Button>
  );
}
