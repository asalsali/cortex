"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import styles from "./page.module.css";

const team = [
  { name: "Sarah Chen", email: "sarah@meridian.io", role: "admin", initials: "SC" },
  { name: "James Liu", email: "james@meridian.io", role: "admin", initials: "JL" },
  { name: "Alex Kim", email: "alex@meridian.io", role: "member", initials: "AK" },
  { name: "Priya Patel", email: "priya@meridian.io", role: "member", initials: "PP" },
  { name: "Marcus Webb", email: "marcus@meridian.io", role: "admin", initials: "MW" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("ctx_live_mrd_example_key_k4Qm").then(() => {
      setCopied(true);
      toast("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast("Failed to copy", "error");
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your workspace configuration</p>
      </div>

      {/* General */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>General</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Workspace Name</div>
            </div>
            <div className={styles.rowValue}>Meridian</div>
          </div>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Plan</div>
              <div className={styles.rowDesc}>Team plan, billed monthly</div>
            </div>
            <div className={styles.rowValue}>Team ($12/user/mo)</div>
          </div>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Dream Cycle Schedule</div>
              <div className={styles.rowDesc}>
                Overnight consolidation runs
              </div>
            </div>
            <div className={styles.rowValue}>Daily, 2:00 AM PST</div>
          </div>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Default Search Mode</div>
            </div>
            <div className={styles.rowValue}>Standard</div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>API Keys</div>
        <div className={styles.card}>
          <div className={styles.row}>
            <div>
              <div className={styles.rowLabel}>Agent API Key</div>
              <div className={styles.rowDesc}>
                Use this key for MCP server and REST API access
              </div>
            </div>
          </div>
          <div className={styles.apiKey}>
            <span>ctx_live_mrd_••••••••••••••••••••k4Qm</span>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Team Members</div>
        <div className={styles.card}>
          <div className={styles.teamList}>
            {team.map((member) => (
              <div key={member.email} className={styles.teamMember}>
                <div className={styles.teamAvatar}>{member.initials}</div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamName}>{member.name}</div>
                  <div className={styles.teamEmail}>{member.email}</div>
                </div>
                <span className={styles.teamRole}>{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
