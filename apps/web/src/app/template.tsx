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

  // All other pages get the sidebar + minimal topbar
  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <span>Cortex</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>
              {getPageLabel(pathname)}
            </span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.statusDot} />
            <span className={styles.statusLabel}>synced</span>
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

function getPageLabel(pathname: string): string {
  if (pathname === "/") return "Search";
  if (pathname.startsWith("/entities/")) return "Entity";
  if (pathname.startsWith("/entities")) return "Entities";
  if (pathname.startsWith("/timeline")) return "Timeline";
  if (pathname.startsWith("/sources")) return "Sources";
  if (pathname.startsWith("/office-hours")) return "Office Hours";
  if (pathname.startsWith("/dream")) return "Dream Cycle";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Knowledge Base";
}
