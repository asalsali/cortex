"use client";

import { useState, useCallback } from "react";
import { getIntegrations } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { integrations as mockIntegrations, formatDate } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import styles from "./page.module.css";

function getIconClass(sourceType: string): string {
  switch (sourceType) {
    case "slack": return styles.iconSlack;
    case "notion": return styles.iconNotion;
    case "git": return styles.iconGit;
    default: return styles.iconManual;
  }
}

function getIconLabel(sourceType: string): string {
  switch (sourceType) {
    case "slack": return "#";
    case "notion": return "N";
    case "git": return "<>";
    default: return "+";
  }
}

function getStatusDotClass(status: string): string {
  switch (status) {
    case "connected": return styles.statusConnected;
    case "pending": return styles.statusPending;
    default: return styles.statusAvailable;
  }
}

function getStatusTextClass(status: string): string {
  switch (status) {
    case "connected": return styles.statusTextConnected;
    case "pending": return styles.statusTextPending;
    default: return styles.statusTextAvailable;
  }
}

function getButtonClass(status: string): string {
  switch (status) {
    case "connected": return styles.connectBtnDisabled;
    case "pending": return styles.connectBtnSecondary;
    default: return styles.connectBtnPrimary;
  }
}

function getButtonLabel(status: string): string {
  switch (status) {
    case "connected": return "Connected";
    case "pending": return "Complete Setup";
    default: return "Connect";
  }
}

const SETUP_INSTRUCTIONS: Record<string, string> = {
  slack:
    "1. Go to api.slack.com/apps and create a new app\n2. Add the OAuth scopes: channels:history, channels:read\n3. Install the app to your workspace\n4. Copy the Bot User OAuth Token\n5. Paste it in your Cortex settings under Integrations",
  notion:
    "1. Go to notion.so/my-integrations and create a new integration\n2. Select the workspace you want to connect\n3. Copy the Internal Integration Secret\n4. Share the Notion pages/databases you want Cortex to read\n5. Paste the secret in your Cortex settings",
  git:
    "1. Go to GitHub Settings > Developer settings > Personal access tokens\n2. Generate a new fine-grained token\n3. Grant read access to Contents for your repositories\n4. Copy the token\n5. Paste it in your Cortex settings under Integrations",
  manual:
    "Manual upload is always available.\n\nUse the 'Add Knowledge' button in the sidebar to paste markdown, meeting notes, or any text content directly.",
};

export default function SourcesPage() {
  const { data: integrations, loading } = useApi(
    useCallback(() => getIntegrations(), []),
    mockIntegrations,
  );
  const [setupModal, setSetupModal] = useState<string | null>(null);

  const selectedIntegration = integrations?.find(
    (i) => i.sourceType === setupModal,
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Sources</h1>
        <p className={styles.subtitle}>
          Connect your tools to feed the knowledge base
        </p>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : !integrations || integrations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#9ca3b4" }}>
            No integrations available
          </div>
          <p>Check your API connection to see available sources.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {integrations.map((integration) => (
            <div key={integration.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div
                  className={`${styles.iconBox} ${getIconClass(integration.sourceType)}`}
                >
                  {getIconLabel(integration.sourceType)}
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{integration.name}</div>
                  <div className={styles.cardStatus}>
                    <span
                      className={`${styles.statusDot} ${getStatusDotClass(integration.status)}`}
                    />
                    <span className={getStatusTextClass(integration.status)}>
                      {integration.status}
                    </span>
                  </div>
                </div>
                <button
                  className={getButtonClass(integration.status)}
                  onClick={() => {
                    if (integration.status !== "connected") {
                      setSetupModal(integration.sourceType);
                    }
                  }}
                  disabled={integration.status === "connected"}
                >
                  {getButtonLabel(integration.status)}
                </button>
              </div>
              <p className={styles.cardDesc}>{integration.description}</p>
              <div className={styles.cardMeta}>
                {integration.factCount > 0 && (
                  <span>{integration.factCount} facts extracted</span>
                )}
                {integration.lastSyncAt && (
                  <span>Last sync: {formatDate(integration.lastSyncAt)}</span>
                )}
                {!integration.lastSyncAt &&
                  integration.status === "available" && (
                    <span>Not connected</span>
                  )}
                {!integration.lastSyncAt &&
                  integration.status === "pending" && (
                    <span>Awaiting OAuth authorization</span>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!setupModal}
        onClose={() => setSetupModal(null)}
        title={`Connect ${selectedIntegration?.name ?? "Source"}`}
      >
        <div style={{ fontSize: 13, color: "#9ca3b4", lineHeight: 1.8 }}>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "#0f1117",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #2a2d3e",
              color: "#e8eaed",
            }}
          >
            {SETUP_INSTRUCTIONS[setupModal ?? "manual"]}
          </pre>
          <p style={{ marginTop: 16, color: "#6b7280", fontSize: 12 }}>
            OAuth integration is coming soon. For now, follow the manual steps above
            and configure your credentials in Settings.
          </p>
        </div>
      </Modal>
    </div>
  );
}
