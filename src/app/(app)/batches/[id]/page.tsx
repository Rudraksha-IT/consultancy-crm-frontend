import { BatchRoute } from "@/components/features/batches/BatchRoute";

type BatchPageProps = { params: Promise<{ id: string }> };

/** One class's page, `/batches/<id>` (issue 23). */
export default async function BatchPageRoute({ params }: BatchPageProps) {
  const { id } = await params;
  return <BatchRoute idText={id} />;
}
