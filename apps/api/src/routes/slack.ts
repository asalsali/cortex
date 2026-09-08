import { Hono } from "hono";
import { SlackConnector } from "@cortex/connectors";
import type { AppEnv } from "../index";

const slack = new SlackConnector();

export const slackRoutes = new Hono<AppEnv>();

// ─── GET /integrations/slack/authorize ──────────────────────────
// Redirect the user to Slack's OAuth authorization page.

slackRoutes.get("/integrations/slack/authorize", (c) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return c.json({ error: "SLACK_CLIENT_ID not configured" }, 500);
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/integrations/slack/callback`;
  const scopes = "channels:history,channels:read,users:read";

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);

  // Pass tenant ID through state param for the callback
  const tenantId = c.get("tenantId");
  url.searchParams.set("state", tenantId);

  return c.redirect(url.toString());
});

// ─── GET /integrations/slack/callback ───────────────────────────
// Handle the OAuth callback from Slack.

slackRoutes.get("/integrations/slack/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state"); // tenant ID
  const error = c.req.query("error");

  if (error) {
    return c.json({ error: `Slack OAuth denied: ${error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: "Missing code or state parameter" }, 400);
  }

  try {
    const integration = await slack.authorize(code, state);

    // In production: persist the integration to the database
    // INSERT INTO integrations (id, tenant_id, source_type, config, status)
    //   VALUES ($1, $2, 'slack', $3, 'active')
    console.log(
      `[slack] Integration created: ${integration.id} for tenant ${state}`
    );

    // Redirect to the integrations page
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
    return c.redirect(`${webUrl}/integrations?slack=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[slack] OAuth callback error:", message);
    return c.json({ error: message }, 500);
  }
});

// ─── POST /integrations/slack/channels ──────────────────────────
// List available channels or select channels to subscribe to.

slackRoutes.post("/integrations/slack/channels", async (c) => {
  const body = await c.req.json<{
    action: "list" | "subscribe";
    integrationId: string;
    channelIds?: string[];
  }>();

  if (body.action === "list") {
    // In production: look up the integration's bot token from the database
    const botToken = "xoxb-placeholder"; // integration.config.bot_token_enc
    try {
      const channels = await slack.listChannels(botToken);
      return c.json({
        channels: channels.map((ch) => ({
          id: ch.id,
          name: ch.name,
          isPrivate: ch.is_private,
          numMembers: ch.num_members,
          topic: ch.topic.value,
          purpose: ch.purpose.value,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 500);
    }
  }

  if (body.action === "subscribe") {
    if (!body.channelIds || body.channelIds.length === 0) {
      return c.json({ error: "channelIds required for subscribe action" }, 400);
    }

    // In production: update integration.config.channel_ids in the database
    console.log(
      `[slack] Subscribing to channels: ${body.channelIds.join(", ")}`
    );
    return c.json({ subscribed: body.channelIds });
  }

  return c.json({ error: "action must be 'list' or 'subscribe'" }, 400);
});

// ─── POST /integrations/slack/sync ──────────────────────────────
// Trigger a manual sync for a Slack integration.

slackRoutes.post("/integrations/slack/sync", async (c) => {
  const body = await c.req.json<{ integrationId: string }>();

  // In production: look up the integration from the database
  // and enqueue a sync job via the job queue
  console.log(`[slack] Manual sync requested for integration: ${body.integrationId}`);

  return c.json({
    status: "queued",
    message: "Slack sync job has been enqueued.",
    integrationId: body.integrationId,
  });
});

// ─── POST /webhooks/slack ───────────────────────────────────────
// Handle incoming Slack Events API webhooks.
// Note: This is mounted separately at /webhooks/slack in production.

slackRoutes.post("/webhooks/slack", async (c) => {
  const body = await c.req.json();

  // Handle Slack URL verification challenge
  if (body.type === "url_verification") {
    return c.json({ challenge: body.challenge });
  }

  // Verify signing secret
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[slack] SLACK_SIGNING_SECRET not configured");
    return c.json({ error: "Webhook not configured" }, 500);
  }

  // In production: verify the request signature using
  // the X-Slack-Signature and X-Slack-Request-Timestamp headers
  // against the signing secret. For now, accept all events.

  if (body.type === "event_callback") {
    const event = body.event;
    if (!event) {
      return c.json({ ok: true });
    }

    const fact = await slack.handleEvent({
      type: event.type,
      payload: event,
      timestamp: new Date(),
    });

    if (fact) {
      // In production: persist the fact to the database
      // or enqueue an ingestion job
      console.log(`[slack] Fact extracted from event: ${fact.sourceRef}`);
    }
  }

  return c.json({ ok: true });
});
