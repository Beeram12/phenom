"use client";

import { MotionConfig } from "framer-motion";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border !border-line !bg-white !text-ink !shadow-lift !font-sans",
            description: "!text-muted",
            actionButton: "!bg-terracotta-600 !text-white !rounded-lg",
          },
        }}
      />
    </MotionConfig>
  );
}
