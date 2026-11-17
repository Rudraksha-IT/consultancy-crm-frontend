import { EditDetailsRoute } from "@/components/features/students/edit/EditDetailsRoute";

type EditDetailsPageProps = { params: Promise<{ id: string }> };

/** One Student's Edit details page, `/students/<id>/edit` (issue 81). */
export default async function EditDetailsPage({ params }: EditDetailsPageProps) {
  const { id } = await params;
  return <EditDetailsRoute idText={id} />;
}
