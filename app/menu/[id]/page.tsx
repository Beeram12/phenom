import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemDetail } from "@/components/ItemDetail";
import { MENU, getMenuItem } from "@/data/menu";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return MENU.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = getMenuItem(id);
  if (!item) return { title: "Dish not found" };
  return { title: item.name, description: item.description };
}

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  const item = getMenuItem(id);
  if (!item) notFound();
  return <ItemDetail item={item} />;
}
