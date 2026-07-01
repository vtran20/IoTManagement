import { UnitDetail } from "./unit-detail";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  return <UnitDetail unitId={unitId} />;
}
