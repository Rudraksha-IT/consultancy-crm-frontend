import { FeeTypeStudentsRoute } from "@/components/features/accounts/FeeTypeStudentsRoute";

type FeeTypeStudentsPageProps = { params: Promise<{ id: string }> };

/** One Fee Type's Students, `/accounts/fees-by-type/<id>` (ticket 08). */
export default async function FeeTypeStudentsRoutePage({ params }: FeeTypeStudentsPageProps) {
  const { id } = await params;
  return <FeeTypeStudentsRoute idText={id} />;
}
