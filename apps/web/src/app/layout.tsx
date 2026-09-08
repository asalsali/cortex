import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import DemoBanner from "@/components/DemoBanner";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Cortex - The Company Brain",
  description: "A living company knowledge base that remembers how you got here.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
