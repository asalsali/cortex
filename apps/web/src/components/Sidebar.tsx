"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import UserButton from "./UserButton";
import IngestModal from "./IngestModal";
import styles from "./Sidebar.module.css";

const navItems = [
  { href: "/", label: "Search", icon: "/" },
  { href: "/entities", label: "Entities", icon: "E" },
  { href: "/timeline", label: "Timeline", icon: "T" },
  { href: "/sources", label: "Sources", icon: "S" },
  { href: "/dream", label: "Dream Cycle", icon: "D" },
];

const settingsItems = [
  { href: "/settings", label: "Settings", icon: "*" },
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
          <div className={styles.logoMark}>
            <div className={styles.logoIcon}>C</div>
            <span className={styles.logoText}>Cortex</span>
          </div>
          <div className={styles.tenant}>meridian</div>
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
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>Actions</div>
            <button
              className={styles.navItem}
              onClick={() => setIngestOpen(true)}
              style={{ border: "none", background: "none", textAlign: "left", width: "100%" }}
            >
              <span className={styles.navIcon}>+</span>
              <span className={styles.navLabel}>Add Knowledge</span>
            </button>
          </div>

          <div className={styles.navSection}>
            <div className={styles.sectionLabel}>System</div>
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? styles.navItemActive : styles.navItem}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
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
