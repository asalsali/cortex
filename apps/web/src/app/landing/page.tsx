import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    icon: "|",
    title: "Temporal Knowledge",
    description:
      "Every fact has a timeline. See how decisions evolved, what was superseded, and why. Never lose the context behind a change.",
  },
  {
    icon: "A",
    title: "Agent-Ready",
    description:
      "MCP server and REST API let AI agents read and write to your knowledge base. Claude Code, Cursor, and Codex become company-aware.",
  },
  {
    icon: "#",
    title: "Ambient Ingestion",
    description:
      "Connect Slack, Notion, GitHub, and more. Knowledge flows in from where your team already works. No wiki maintenance required.",
  },
  {
    icon: "D",
    title: "Dream Cycle",
    description:
      "Every night, Cortex consolidates new knowledge, detects contradictions, and builds entity cards. Wake up to a coherent picture.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For small teams getting started",
    features: [
      "Up to 5 users",
      "2 source integrations",
      "Weekly dream cycle",
      "Quick search mode",
      "Manual uploads",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$12",
    period: "/user/mo",
    description: "For growing engineering teams",
    features: [
      "Up to 50 users",
      "Unlimited sources",
      "Nightly dream cycle",
      "Standard search mode",
      "MCP server access",
      "API key management",
      "Supersession tracking",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$25",
    period: "/user/mo",
    description: "For scaling companies",
    features: [
      "Unlimited users",
      "Custom connectors",
      "On-demand dream cycles",
      "Deep search with reranker",
      "Priority support",
      "SSO / SAML",
      "Advanced analytics",
      "Custom retention policies",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.logoIcon}>C</div>
          <span className={styles.logoText}>Cortex</span>
        </div>
        <div className={styles.navLinks}>
          <Link href="/sign-in" className={styles.navLink}>
            Sign In
          </Link>
          <Link href="/sign-up" className={styles.navCta}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>Knowledge infrastructure for teams</div>
        <h1 className={styles.heroTitle}>
          The company brain that remembers
          <br />
          <span className={styles.heroAccent}>how you got here</span>
        </h1>
        <p className={styles.heroSubtitle}>
          Cortex builds a living knowledge graph from your existing tools.
          Every fact has a timeline. Every decision is traceable.
          Your AI agents and your team share the same source of truth.
        </p>
        <div className={styles.heroActions}>
          <Link href="/sign-up" className={styles.heroPrimary}>
            Get Started Free
          </Link>
          <Link href="#features" className={styles.heroSecondary}>
            See How It Works
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <h2 className={styles.sectionTitle}>
          Your tools feed the brain. The brain feeds your team.
        </h2>
        <div className={styles.howSteps}>
          <div className={styles.howStep}>
            <div className={styles.howStepNum}>1</div>
            <h4>Connect your sources</h4>
            <p>Slack channels, Notion pages, GitHub repos, meeting transcripts. Knowledge flows in automatically.</p>
          </div>
          <div className={styles.howArrow}>&rarr;</div>
          <div className={styles.howStep}>
            <div className={styles.howStepNum}>2</div>
            <h4>Cortex extracts and links</h4>
            <p>Facts are extracted, entities identified, relationships mapped. Every fact traces back to its source.</p>
          </div>
          <div className={styles.howArrow}>&rarr;</div>
          <div className={styles.howStep}>
            <div className={styles.howStepNum}>3</div>
            <h4>The dream cycle consolidates</h4>
            <p>Overnight, Cortex detects contradictions, supersedes stale facts, and builds coherent entity cards.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricingSection}>
        <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
        <p className={styles.sectionSubtitle}>
          Start free. Scale when your knowledge base grows.
        </p>
        <div className={styles.pricingGrid}>
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlighted
                  ? styles.pricingCardHighlighted
                  : styles.pricingCard
              }
            >
              <div className={styles.pricingName}>{plan.name}</div>
              <div className={styles.pricingPrice}>
                {plan.price}
                <span className={styles.pricingPeriod}>{plan.period}</span>
              </div>
              <p className={styles.pricingDesc}>{plan.description}</p>
              <ul className={styles.pricingFeatures}>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={
                  plan.highlighted
                    ? styles.pricingCtaHighlighted
                    : styles.pricingCta
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className={styles.footerCta}>
        <h2 className={styles.footerCtaTitle}>
          Stop losing institutional knowledge
        </h2>
        <p className={styles.footerCtaText}>
          Set up in 5 minutes. Connect Slack. Let the brain start learning.
        </p>
        <Link href="/sign-up" className={styles.heroPrimary}>
          Get Started Free
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <div className={styles.logoIcon}>C</div>
            <span className={styles.logoText}>Cortex</span>
          </div>
          <div className={styles.footerCopy}>
            The company brain that remembers how you got here.
          </div>
        </div>
      </footer>
    </div>
  );
}
