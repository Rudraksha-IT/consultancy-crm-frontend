import { StudentProfileRoute } from "@/components/features/students/profile/StudentProfileRoute";

type StudentPageProps = { params: Promise<{ id: string }> };

/** One Student's page, `/students/<id>` (issue 10). */
export default async function StudentPage({ params }: StudentPageProps) {
  const { id } = await params;
  return <StudentProfileRoute idText={id} />;
}
