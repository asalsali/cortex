"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UserButton from "./UserButton";
import IngestModal from "./IngestModal";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/", label: "Search" },
  { href: "/entities", label: "Entities" },
  { href: "/timeline", label: "Timeline" },
  { href: "/sources", label: "Sources" },
  { href: "/dream", label: "Dream Cycle" },
];

const systemItems = [
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [ingestOpen, setIngestOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Cortex</span>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>Knowledge</div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? styles.navItemActive : styles.navItem}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>Actions</div>
            <button
              className={styles.navItem}
              onClick={() => setIngestOpen(true)}
              style={{ border: "none", background: "none", textAlign: "left", width: "100%", cursor: "pointer" }}
            >
              Add Knowledge
            </button>
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>System</div>
            {systemItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? styles.navItemActive : styles.navItem}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className={styles.footer}>
          <UserButton />
        </div>
      </aside>

      <IngestModal open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </>
  );
}
