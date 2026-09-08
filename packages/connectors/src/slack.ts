import type { SourceConnector, WebhookEvent } from "./interface";
import type {
  ConnectorConfig,
  Integration,
  SyncResult,
  CreateFactInput,
} from "@cortex/shared";
import { writebackGate } from "@cortex/shared";

// ─── Slack API types ─────────────────────────────────────────────

interface SlackMessage {
  type: string;
  subtype?: string;
  text: string;
  user: string;
  ts: string;
  channel?: string;
  edited?: { user: string; ts: string };
}

interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  is_private: boolean;
  num_members: number;
  topic: { value: string };
  purpose: { value: string };
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token: string;
  team: { id: string; name: string };
  bot_user_id: string;
  error?: string;
}

const SLACK_API = "https://slack.com/api";

// ─── Slack connector ─────────────────────────────────────────────

/**
 * Slack source connector.
 *
 * Handles OAuth setup, channel selection, history sync, and
 * real-time event processing via the Slack Events API.
 */
export class SlackConnector implements SourceConnector {
  readonly type = "slack";

  /**
   * Exchange an OAuth authorization code for a bot token,
   * then store the encrypted token in the integration config.
   */
  async authorize(
    code: string,
    tenantId: string
  ): Promise<Integration> {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        "SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be set"
      );
    }

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = (await res.json()) as SlackOAuthResponse;
    if (!data.ok) {
      throw new Error(`Slack OAuth failed: ${data.error}`);
    }

    // In production: encrypt data.access_token before storing
    return {
      id: crypto.randomUUID(),
      tenantId,
      sourceType: "slack",
      config: {
        team_id: data.team.id,
        team_name: data.team.name,
        bot_token_enc: data.access_token, // encrypt in production
        bot_user_id: data.bot_user_id,
        channel_ids: [],
      },
      status: "active",
      lastSyncAt: null,
    };
  }

  /**
   * Set up a new integration from pre-validated config.
   */
  async setup(config: ConnectorConfig): Promise<Integration> {
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

  /**
   * List channels the bot has access to.
   */
  async listChannels(
    botToken: string
  ): Promise<SlackChannel[]> {
    const channels: SlackChannel[] = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        types: "public_channel,private_channel",
        limit: "200",
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `${SLACK_API}/conversations.list?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${botToken}` },
        }
      );
      const data = (await res.json()) as {
        ok: boolean;
        channels: SlackChannel[];
        response_metadata?: { next_cursor?: string };
      };

      if (!data.ok) break;
      channels.push(...data.channels);
      cursor = data.response_metadata?.next_cursor || undefined;
    } while (cursor);

    return channels;
  }

  /**
   * Store selected channel IDs in the integration config.
   */
  subscribeChannels(
    integration: Integration,
    channelIds: string[]
  ): Integration {
    return {
      ...integration,
      config: {
        ...integration.config,
        channel_ids: channelIds,
      },
    };
  }

  /**
   * Sync channel history since last sync.
   */
  async sync(integration: Integration): Promise<SyncResult> {
    const botToken = integration.config.bot_token_enc as string;
    const channelIds = (integration.config.channel_ids as string[]) || [];
    const result: SyncResult = {
      pagesCreated: 0,
      pagesUpdated: 0,
      factsExtracted: 0,
      errors: [],
    };

    for (const channelId of channelIds) {
      try {
        const syncResult = await this.syncChannel(
          botToken,
          channelId,
          integration.tenantId,
          integration.lastSyncAt
        );
        result.factsExtracted += syncResult.factsExtracted;
        result.pagesCreated += syncResult.pagesCreated;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        result.errors.push(`Channel ${channelId}: ${msg}`);
      }
    }

    return result;
  }

  /**
   * Fetch messages from a single channel, run through the writeback gate,
   * and produce fact inputs for storage.
   *
   * Returns the facts that passed the gate. The caller is responsible
   * for persisting them.
   */
  async syncChannel(
    botToken: string,
    channelId: string,
    tenantId: string,
    since: Date | null
  ): Promise<SyncResult & { facts: CreateFactInput[] }> {
    const facts: CreateFactInput[] = [];
    let cursor: string | undefined;
    const oldest = since
      ? (since.getTime() / 1000).toString()
      : undefined;

    do {
      const params = new URLSearchParams({
        channel: channelId,
        limit: "100",
      });
      if (oldest) params.set("oldest", oldest);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(
        `${SLACK_API}/conversations.history?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${botToken}` },
        }
      );
      const data = (await res.json()) as {
        ok: boolean;
        messages: SlackMessage[];
        has_more: boolean;
        response_metadata?: { next_cursor?: string };
      };

      if (!data.ok) break;

      for (const msg of data.messages) {
        // Skip subtypes (joins, leaves, bot messages, etc.)
        if (msg.subtype) continue;

        // Run through the ambient writeback gate
        const gate = writebackGate(msg.text);
        if (!gate.passed) continue;

        // Build a fact input from the message
        facts.push({
          entitySlug: `slack-${channelId}`,
          content: msg.text,
          kind: "context",
          confidence: 0.7,
          sourceType: "slack",
          sourceRef: `slack://${channelId}/${msg.ts}`,
          extractedBy: "connector",
          validFrom: new Date(
            Number.parseFloat(msg.ts) * 1000
          ).toISOString(),
        });
      }

      cursor = data.has_more
        ? data.response_metadata?.next_cursor
        : undefined;

      // Respect Slack rate limits: 1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
    } while (cursor);

    return {
      pagesCreated: 0,
      pagesUpdated: 0,
      factsExtracted: facts.length,
      errors: [],
      facts,
    };
  }

  /**
   * Handle real-time Slack events (message posted, edited, deleted).
   */
  async handleEvent(
    event: WebhookEvent
  ): Promise<CreateFactInput | null> {
    const payload = event.payload as Record<string, unknown>;
    const eventType = payload.type as string;

    if (eventType === "message") {
      const msg = payload as unknown as SlackMessage;

      // Skip bot messages and subtypes
      if (msg.subtype) return null;

      // Run through writeback gate
      const gate = writebackGate(msg.text);
      if (!gate.passed) return null;

      const channelId = msg.channel || (payload.channel as string);
      return {
        entitySlug: `slack-${channelId}`,
        content: msg.text,
        kind: "context",
        confidence: 0.7,
        sourceType: "slack",
        sourceRef: `slack://${channelId}/${msg.ts}`,
        extractedBy: "connector",
        validFrom: new Date(
          Number.parseFloat(msg.ts) * 1000
        ).toISOString(),
      };
    }

    // message_changed: could update/supersede existing fact
    // message_deleted: could expire existing fact
    // For MVP, we only handle new messages
    return null;
  }

  /**
   * Handle an incoming webhook event (SourceConnector interface).
   */
  async handleWebhook(event: WebhookEvent): Promise<void> {
    await this.handleEvent(event);
  }

  /**
   * Tear down the integration (revoke bot token).
   */
  async teardown(integration: Integration): Promise<void> {
    const botToken = integration.config.bot_token_enc as string;
    if (botToken) {
      await fetch(`${SLACK_API}/auth.revoke`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
    }
  }
}
