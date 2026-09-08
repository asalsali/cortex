// Landing page uses its own layout (no sidebar, no topbar)
import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cortex - The Company Brain",
  description: "A living company knowledge base that remembers how you got here.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
