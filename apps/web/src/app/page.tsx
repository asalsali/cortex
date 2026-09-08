export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "4rem 2rem" }}>
      <h1>Cortex</h1>
      <p style={{ fontSize: "1.25rem", color: "#666" }}>
        The company brain that remembers how you got here.
      </p>

      <div style={{ marginTop: "3rem" }}>
        <h2>Search your knowledge base</h2>
        <form
          style={{
            display: "flex",
            gap: "0.5rem",
            marginTop: "1rem",
          }}
        >
          <input
            type="text"
            placeholder="What do you want to know?"
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              fontSize: "1rem",
              border: "1px solid #ddd",
              borderRadius: "0.5rem",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              backgroundColor: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </form>
      </div>

      <div style={{ marginTop: "3rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ padding: "1.5rem", border: "1px solid #eee", borderRadius: "0.5rem" }}>
          <h3>Temporal Knowledge</h3>
          <p style={{ color: "#666" }}>
            Every fact has a timeline. See how your company's knowledge evolves.
          </p>
        </div>
        <div style={{ padding: "1.5rem", border: "1px solid #eee", borderRadius: "0.5rem" }}>
          <h3>Agent-Ready</h3>
          <p style={{ color: "#666" }}>
            MCP server with 7 memory verbs. Claude Code, Codex, and custom agents.
          </p>
        </div>
        <div style={{ padding: "1.5rem", border: "1px solid #eee", borderRadius: "0.5rem" }}>
          <h3>Ambient Ingestion</h3>
          <p style={{ color: "#666" }}>
            Connect Slack, Notion, GitHub. Knowledge flows in automatically.
          </p>
        </div>
        <div style={{ padding: "1.5rem", border: "1px solid #eee", borderRadius: "0.5rem" }}>
          <h3>Dream Cycle</h3>
          <p style={{ color: "#666" }}>
            Overnight consolidation. Wake up to a coherent picture.
          </p>
        </div>
      </div>
    </main>
  );
}
