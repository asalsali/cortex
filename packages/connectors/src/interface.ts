import type { ConnectorConfig, Integration, SyncResult } from "@cortex/shared";

export interface WebhookEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Source connector interface.
 * All integrations follow this contract.
 */
export interface SourceConnector {
  /** Connector type identifier */
  readonly type: string;

  /**
   * Set up a new integration (OAuth flow result, config validation).
   */
  setup(config: ConnectorConfig): Promise<Integration>;

  /**
   * Sync new content from the source since last sync.
   */
  sync(integration: Integration): Promise<SyncResult>;

  /**
   * Handle an incoming webhook event from the source.
   * Not all connectors support webhooks.
   */
  handleWebhook?(event: WebhookEvent): Promise<void>;

  /**
   * Tear down the integration (revoke tokens, unsubscribe webhooks).
   */
  teardown(integration: Integration): Promise<void>;
}
