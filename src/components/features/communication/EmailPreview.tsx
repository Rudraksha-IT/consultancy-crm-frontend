"use client";

import clsx from "clsx";
import Image from "next/image";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Icon } from "@/components/ui/Icon";
import { COMMUNICATION_TEXT as TEXT } from "@/constants/communication";
import type { Attachable } from "@/lib/api";
import { formatFileSize } from "@/lib/catalogue";

type EmailPreviewProps = {
  subject: string;
  body: string;
  /** The files going with it, shown under the sender as an inbox shows them. */
  files: readonly Attachable[];
  /** Who it is shown as going to, e.g. "to Sita Gurung" or "to each Student, one by one". */
  toLine: string;
  /** Whose copy this is, e.g. "Sita" or "each Student". */
  whose: string;
  /** Hidden at narrow widths while Write is chosen. */
  isHiddenWhenNarrow: boolean;
};

/**
 * The email as the Student receives it (issue 04): the subject line, the sender and where replies
 * go, then the office's logo (or name) on its colour, the message and the contact footer. Every
 * part is shown as words, never as HTML.
 */
export function EmailPreview({
  subject,
  body,
  files,
  toLine,
  whose,
  isHiddenWhenNarrow,
}: EmailPreviewProps) {
  return (
    <section
      aria-label={TEXT.preview}
      className={clsx(
        "bg-fill max-phone:p-4 min-h-0 overflow-y-auto overscroll-contain p-6",
        isHiddenWhenNarrow && "max-tablet:hidden",
      )}
    >
      <p className="text-small text-ink-2 font-semibold">{TEXT.previewOf(whose)}</p>
      <Envelope subject={subject} toLine={toLine} />
      <AttachedNames files={files} />
      <article className="bg-paper border-rule rounded-panel mt-4 overflow-hidden border">
        <div className="bg-accent h-1" aria-hidden />
        <div className="border-rule border-b px-6 py-4">
          <OfficeMark />
        </div>
        <div className="text-body grid gap-3 px-6 py-5 break-words">
          {body.trim() === "" ? (
            <p className="text-ink-3">{TEXT.messageShowsHere}</p>
          ) : (
            blocksOf(body).map((block, index) => <Block key={index} block={block} />)
          )}
        </div>
        <ContactFooter />
      </article>
    </section>
  );
}

/** The subject line, the sender and where replies go, as an inbox shows them. */
function Envelope({ subject, toLine }: { subject: string; toLine: string }) {
  const { consultancy } = useCurrentStaff();
  const contact = consultancy.officeDetails.contactEmail;
  return (
    <div className="mt-3 grid gap-1">
      <h3 className="text-card-title break-words">
        {subject.trim() === "" ? <span className="text-ink-3">{TEXT.noSubjectYet}</span> : subject}
      </h3>
      <p className="text-secondary text-ink-2 break-words">
        <b className="text-ink">{consultancy.name}</b> {"<no-reply>"}
      </p>
      <p className="text-small text-ink-3 break-words">
        {contact === "" ? toLine : `${toLine} · ${TEXT.repliesGoTo(contact)}`}
      </p>
    </div>
  );
}

/** The files attached, each with its size, read-only. */
function AttachedNames({ files }: { files: readonly Attachable[] }) {
  if (files.length === 0) return null;
  return (
    <ul aria-label={TEXT.attachedFiles} className="mt-3 flex flex-wrap gap-2">
      {files.map((file) => (
        <li
          key={`${file.kind}-${file.id}`}
          className="rounded-chip bg-paper border-rule text-small flex max-w-full min-w-0 items-center gap-2 border px-2.5 py-1"
        >
          <Icon name="file" size="sm" />
          <span className="text-ink min-w-0 truncate">{file.fileName}</span>
          <span className="text-ink-2 flex-none">{formatFileSize(file.size)}</span>
        </li>
      ))}
    </ul>
  );
}

/** The office's name and contact details, and where to write instead of replying. */
function ContactFooter() {
  const { consultancy } = useCurrentStaff();
  const details = consultancy.officeDetails;
  const lines = [
    details.phone === "" ? "" : TEXT.phoneLine(details.phone),
    details.addressLine1,
    details.addressLine2,
    details.website,
  ].filter((line) => line !== "");
  return (
    <footer className="bg-fill text-small text-ink-2 grid gap-1 px-6 py-4 break-words">
      <p className="text-ink font-semibold">{consultancy.name}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {details.contactEmail !== "" && (
        <p className="text-ink-3 mt-2">
          {TEXT.noReplyLine} {TEXT.writeTo(details.contactEmail)}
        </p>
      )}
    </footer>
  );
}

/** The office's logo, or its name when it has none (as the email itself does). */
function OfficeMark() {
  const { consultancy } = useCurrentStaff();
  if (consultancy.logo === null) {
    return <p className="text-card-title text-accent font-bold">{consultancy.name}</p>;
  }
  return (
    <Image
      src={consultancy.logo.url}
      alt={consultancy.name}
      width={0}
      height={0}
      unoptimized
      className="h-mark max-w-logo w-auto object-contain"
    />
  );
}

type Block = { kind: "paragraph"; lines: string[] } | { kind: "list"; items: string[] };

const LIST_LINE = /^\s*[-*•]\s+/;

/** Plain text as the email lays it out: blank lines part paragraphs, "- " lines make a list. */
function blocksOf(text: string): Block[] {
  return text
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split("\n").filter((line) => line.trim() !== ""))
    .filter((lines) => lines.length > 0)
    .map((lines): Block =>
      lines.every((line) => LIST_LINE.test(line))
        ? { kind: "list", items: lines.map((line) => line.replace(LIST_LINE, "")) }
        : { kind: "paragraph", lines },
    )
    .flatMap(splitTrailingList);
}

/** "Bring these:" followed by dash lines is a paragraph, then the list. */
function splitTrailingList(block: Block): Block[] {
  if (block.kind === "list") return [block];
  const first = block.lines.findIndex((line) => LIST_LINE.test(line));
  if (first <= 0 || !block.lines.slice(first).every((line) => LIST_LINE.test(line))) {
    return [block];
  }
  return [
    { kind: "paragraph", lines: block.lines.slice(0, first) },
    { kind: "list", items: block.lines.slice(first).map((line) => line.replace(LIST_LINE, "")) },
  ];
}

function Block({ block }: { block: Block }) {
  if (block.kind === "list") {
    return (
      <ul className="grid list-disc gap-1 pl-6">
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p className="whitespace-pre-line">{block.lines.join("\n")}</p>;
}
