import type { SourceConnector } from "./interface";
import type { ConnectorConfig, Integration, SyncResult } from "@cortex/shared";

/**
 * File upload connector.
 * Handles manual file uploads (markdown, text, PDF).
 */
export class FileUploadConnector implements SourceConnector {
  readonly type = "manual";

  async setup(config: ConnectorConfig): Promise<Integration> {
    return {
      id: crypto.randomUUID(),
      tenantId: config.tenant_id as string,
      sourceType: "manual",
      config,
      status: "active",
      lastSyncAt: null,
    };
  }

  async sync(_integration: Integration): Promise<SyncResult> {
    // File uploads are event-driven, not sync-driven.
    // This is a no-op for the manual connector.
    return {
      pagesCreated: 0,
      pagesUpdated: 0,
      factsExtracted: 0,
      errors: [],
    };
  }

  async teardown(_integration: Integration): Promise<void> {
    // Nothing to tear down for manual uploads
  }
}
