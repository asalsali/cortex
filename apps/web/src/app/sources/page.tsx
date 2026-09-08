"use client";

import { useState, useCallback } from "react";
import { getIntegrations } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { formatDate } from "@/data/mock";
import { SkeletonList } from "@/components/Skeleton";
import Modal from "@/components/Modal";
import styles from "./page.module.css";

function getStatusClass(status: string): string {
  switch (status) {
    case "connected": return styles.statusConnected;
    case "pending": return styles.statusPending;
    default: return styles.statusDefault;
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
    [],
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
        <SkeletonList count={4} lines={2} />
      ) : !integrations || integrations.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            No integrations available. Check your API connection.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {integrations.map((integration) => (
            <div key={integration.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowName}>{integration.name}</div>
                <p className={styles.rowDesc}>{integration.description}</p>
              </div>
              <div className={styles.rowStatus}>
                <span className={`${styles.statusDot} ${getStatusClass(integration.status)}`} />
                <span className={styles.statusText}>{integration.status}</span>
              </div>
              <div className={styles.rowMeta}>
                {integration.factCount > 0 && (
                  <span>{integration.factCount} facts</span>
                )}
                {integration.lastSyncAt && (
                  <span>{formatDate(integration.lastSyncAt)}</span>
                )}
              </div>
              {integration.status !== "connected" && (
                <button
                  className={styles.connectBtn}
                  onClick={() => setSetupModal(integration.sourceType)}
                >
                  {integration.status === "pending" ? "Complete Setup" : "Connect"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!setupModal}
        onClose={() => setSetupModal(null)}
        title={`Connect ${selectedIntegration?.name ?? "Source"}`}
      >
        <pre className={styles.setupCode}>
          {SETUP_INSTRUCTIONS[setupModal ?? "manual"]}
        </pre>
        <p className={styles.setupNote}>
          OAuth integration is coming soon. Follow the steps above to configure manually.
        </p>
      </Modal>
    </div>
  );
}
