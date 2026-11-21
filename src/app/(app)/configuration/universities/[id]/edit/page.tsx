import { UniversityEditRoute } from "@/components/features/catalogue/UniversityEditRoute";

type UniversityEditPageProps = { params: Promise<{ id: string }> };

/** One University's edit page, `/configuration/universities/<id>/edit` (issue 92, ticket 10). */
export default async function UniversityEditPage({ params }: UniversityEditPageProps) {
  const { id } = await params;
  return <UniversityEditRoute idText={id} />;
}
