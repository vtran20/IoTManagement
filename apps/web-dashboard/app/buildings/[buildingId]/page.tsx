import { BuildingDetail } from "./building-detail";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;
  return <BuildingDetail buildingId={buildingId} />;
}
