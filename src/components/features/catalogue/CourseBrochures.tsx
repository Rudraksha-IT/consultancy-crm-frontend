"use client";

import { Banner } from "@/components/ui/Banner";
import { Icon } from "@/components/ui/Icon";
import { CATALOGUE_TEXT as TEXT } from "@/constants/catalogue";
import { fetchCourseFileLink, type CourseFile } from "@/lib/api";
import { formatFileSize } from "@/lib/catalogue";

import { useOpenLink } from "./useOpenLink";

type CourseBrochuresProps = {
  courseName: string;
  files: readonly CourseFile[];
  /** "Email it to Sita": shown when there is a Student who can be emailed. */
  email?: { firstName: string; onEmail: () => void } | undefined;
};

/**
 * A Course's PDF brochures in small (ticket 10): under the Course picked in Add application and
 * under each of a Student's Applications. Each name opens the PDF; "Email it to <first name>"
 * where a Student can be emailed. Nothing is shown while the Course has none. Wraps on a phone,
 * with every link 44 tall.
 */
export function CourseBrochures({ courseName, files, email }: CourseBrochuresProps) {
  const link = useOpenLink(TEXT.linkFailed);
  if (files.length === 0) return null;
  return (
    <div className="grid gap-2">
      <div
        role="group"
        aria-label={TEXT.brochuresOf(courseName)}
        className="text-secondary text-ink-2 flex min-w-0 flex-wrap items-center gap-x-2"
      >
        <Icon name="file" size="sm" />
        <span>{TEXT.brochuresLabel(files.length)}</span>
        {files.map((file, index) => (
          <span key={file.id} className="inline-flex min-w-0 items-center gap-x-2">
            {index > 0 && <span aria-hidden="true">·</span>}
            <button
              type="button"
              title={`${file.fileName}, ${formatFileSize(file.size)}`}
              aria-label={TEXT.openFile(file.name)}
              onClick={() => {
                void link.open(() => fetchCourseFileLink(file.id, "open"));
              }}
              className="min-h-control text-accent cursor-pointer text-left break-words underline-offset-4 hover:underline"
            >
              {file.name}
            </button>
          </span>
        ))}
        {email !== undefined && (
          <button
            type="button"
            onClick={email.onEmail}
            className="min-h-control text-accent inline-flex cursor-pointer items-center gap-1.5 font-semibold underline-offset-4 hover:underline"
          >
            <Icon name="send" size="sm" />
            {TEXT.emailBrochures(files.length, email.firstName)}
          </button>
        )}
      </div>
      {link.failure !== null && <Banner tone="problem">{link.failure}</Banner>}
    </div>
  );
}
