import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

type OldUniversityEditPageProps = { params: Promise<{ id: string }> };

/** The old address of a University's edit page (issue 92), now under Configuration (ticket 10). */
export default async function OldUniversityEditPage({
  params,
}: OldUniversityEditPageProps): Promise<never> {
  const { id } = await params;
  const number = Number(id);
  redirect(/^[1-9][0-9]{0,9}$/.test(id) ? ROUTES.universityEdit(number) : ROUTES.universities);
}
