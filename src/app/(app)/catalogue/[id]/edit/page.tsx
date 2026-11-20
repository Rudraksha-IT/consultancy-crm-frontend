import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { parseRecordId } from "@/lib/recordId";

type OldUniversityEditPageProps = { params: Promise<{ id: string }> };

/** The old address of a University's edit page (issue 92), now under Configuration (ticket 10). */
export default async function OldUniversityEditPage({
  params,
}: OldUniversityEditPageProps): Promise<never> {
  const { id } = await params;
  const universityId = parseRecordId(id);
  redirect(universityId === null ? ROUTES.universities : ROUTES.universityEdit(universityId));
}
