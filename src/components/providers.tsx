"use client";

import type { ReactNode } from "react";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
