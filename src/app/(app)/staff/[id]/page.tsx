import { EmployeeProgressPage } from "@/components/features/staffProgress/EmployeeProgressPage";

type EmployeePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

/**
 * One employee's page under Employees, `/staff/<id>`, on its Progress tab (issue 84), or on
 * Work from home with `?tab=wfh` (issue 87).
 */
export default async function EmployeePage({ params, searchParams }: EmployeePageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  return (
    <EmployeeProgressPage idText={id} initialTab={typeof tab === "string" ? tab : undefined} />
  );
}
