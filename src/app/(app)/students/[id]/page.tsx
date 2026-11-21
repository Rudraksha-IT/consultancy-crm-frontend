import { StudentProfileRoute } from "@/components/features/students/profile/StudentProfileRoute";

type StudentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** One Student's page, `/students/<id>` (issue 10); `?tab=fees` opens it on that tab. */
export default async function StudentPage({ params, searchParams }: StudentPageProps) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  return <StudentProfileRoute idText={id} {...(typeof tab === "string" && { tabText: tab })} />;
}
