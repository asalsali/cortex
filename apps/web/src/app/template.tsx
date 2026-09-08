"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DemoBanner from "@/components/DemoBanner";
import styles from "./layout.module.css";

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Landing, sign-in, sign-up pages get no app shell
  if (
    pathname.startsWith("/landing") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up")
  ) {
    return <>{children}</>;
  }

  // All other pages get the sidebar + topbar
  return (
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
  );
}
