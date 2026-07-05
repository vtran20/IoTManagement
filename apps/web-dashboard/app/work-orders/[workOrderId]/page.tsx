import { WorkOrderDetail } from "./work-order-detail";

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = await params;
  return <WorkOrderDetail workOrderId={workOrderId} />;
}
