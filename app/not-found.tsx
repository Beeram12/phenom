import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 px-8 py-14 text-center">
        <p className="font-display text-terracotta-500 text-6xl">404</p>
        <h1 className="text-2xl font-semibold">This page isn&apos;t on the menu</h1>
        <p className="text-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <Link href="/menu" className="btn-primary">
          Browse the menu
        </Link>
      </div>
    </div>
  );
}
