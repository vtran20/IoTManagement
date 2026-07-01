import { MeterDetail } from "./meter-detail";

export default async function MeterDetailPage({
  params,
}: {
  params: Promise<{ meterId: string }>;
}) {
  const { meterId } = await params;
  return <MeterDetail meterId={meterId} />;
}
