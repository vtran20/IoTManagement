import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "../components/query-provider";
import "./styles.css";

export const metadata: Metadata = {
  title: "IoT Management",
  description: "Smart utilities dashboard for building owners",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
