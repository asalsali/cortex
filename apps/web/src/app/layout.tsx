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
            <div className={styles.wrapper}>
              <Sidebar />
              <div className={styles.main}>
                <header className={styles.topbar}>
                  <div className={styles.breadcrumb}>
                    <span>Cortex</span>
                    <span className={styles.breadcrumbSep}>/</span>
                    <span className={styles.breadcrumbCurrent}>Knowledge Base</span>
                  </div>
                  <div className={styles.topbarRight}>
                    <div className={styles.statusDot} />
                    <span className={styles.statusLabel}>Last sync 2h ago</span>
                  </div>
                </header>
                <main className={styles.content}>
                  <DemoBanner />
                  {children}
                </main>
              </div>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
