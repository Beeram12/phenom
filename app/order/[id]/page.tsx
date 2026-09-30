import type { Metadata } from "next";
import { OrderStatusView } from "@/components/OrderStatusView";

export const metadata: Metadata = { title: "Order status" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderStatusView orderId={decodeURIComponent(id)} />;
}
