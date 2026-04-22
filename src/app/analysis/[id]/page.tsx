import { AnalysisPageClient } from "@/components/AnalysisPageClient";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AnalysisPageClient id={id} />;
}
