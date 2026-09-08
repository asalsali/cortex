import type { SourceConnector, WebhookEvent } from "./interface";
import type { ConnectorConfig, Integration, SyncResult } from "@cortex/shared";

/**
 * Slack source connector.
 * Handles OAuth setup, channel history sync, and webhook-driven message ingestion.
 */
export class SlackConnector implements SourceConnector {
  readonly type = "slack";

  async setup(config: ConnectorConfig): Promise<Integration> {
    // Validates: team_id, bot_token (encrypted), channel_ids
    if (!config.team_id || !config.bot_token_enc) {
      throw new Error("Slack connector requires team_id and bot_token_enc");
    }

    return {
      id: crypto.randomUUID(),
      tenantId: config.tenant_id as string,
      sourceType: "slack",
      config,
      status: "active",
      lastSyncAt: null,
    };
  }

  async sync(integration: Integration): Promise<SyncResult> {
    // In production:
    // 1. Decrypt bot_token from config
    // 2. For each channel in channel_ids:
    //    a. Call conversations.history with oldest=last_sync_at
    //    b. For each message, enqueue an ingestion job
    // 3. Rate limit: 1 req/sec per Slack method

    console.log(`[SlackConnector] Syncing integration ${integration.id}`);

    return {
      pagesCreated: 0,
      pagesUpdated: 0,
      factsExtracted: 0,
      errors: [],
    };
  }

  async handleWebhook(event: WebhookEvent): Promise<void> {
    // Handle Slack Event Subscriptions API events:
    // - message: new message in a monitored channel
    // - message_changed: edited message
    // - channel_join: bot joined a new channel
    console.log(`[SlackConnector] Webhook event: ${event.type}`);
  }

  async teardown(integration: Integration): Promise<void> {
    // Revoke bot token, unsubscribe from events
    console.log(`[SlackConnector] Teardown integration ${integration.id}`);
  }
}
