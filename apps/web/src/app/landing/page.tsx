import Link from "next/link";
import styles from "./page.module.css";

const sections = [
  {
    number: "01",
    title: "Temporal knowledge",
    description:
      "Every fact has a timeline. See how decisions evolved, what was superseded, and why. Never lose the context behind a change.",
  },
  {
    number: "02",
    title: "Agent-ready from day one",
    description:
      "MCP server and REST API let AI agents read and write to your knowledge base. Claude, Cursor, and Codex become company-aware.",
  },
  {
    number: "03",
    title: "Ambient ingestion",
    description:
      "Connect Slack, Notion, GitHub, and more. Knowledge flows in from where your team already works. No wiki maintenance.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: [
      "5 users",
      "2 integrations",
      "Weekly dream cycle",
      "Quick search",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$12",
    period: "/user/mo",
    features: [
      "50 users",
      "Unlimited sources",
      "Nightly dream cycle",
      "MCP server access",
      "API keys",
      "Supersession tracking",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$25",
    period: "/user/mo",
    features: [
      "Unlimited users",
      "Custom connectors",
      "On-demand cycles",
      "Deep search + reranker",
      "SSO / SAML",
      "Priority support",
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
        <span className={styles.navBrand}>Cortex</span>
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
        <h1 className={styles.heroTitle}>
          Your company<br />brain.
        </h1>
        <p className={styles.heroSubtitle}>
          A living knowledge graph built from your existing tools.
          Every fact has a timeline. Every decision is traceable.
        </p>
        <div className={styles.heroActions}>
          <Link href="/sign-up" className={styles.heroPrimary}>
            Get Started
          </Link>
          <span className={styles.heroNote}>Free for small teams</span>
        </div>
      </section>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Sections — stacked, not cards */}
      <section className={styles.sectionsWrap}>
        {sections.map((section, i) => (
          <div key={i} className={styles.sectionBlock}>
            <span className={styles.sectionNumber}>{section.number}</span>
            <h2 className={styles.sectionHeading}>{section.title}</h2>
            <p className={styles.sectionText}>{section.description}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className={styles.pricingSection}>
        <h2 className={styles.pricingSectionTitle}>Pricing</h2>
        <p className={styles.pricingSectionSub}>
          Start free. Scale when you need to.
        </p>
        <div className={styles.pricingTable}>
          <div className={styles.pricingHeader}>
            <div className={styles.pricingHeaderCell} />
            {pricing.map((plan) => (
              <div key={plan.name} className={styles.pricingHeaderCell}>
                <div className={styles.pricingPlanName}>{plan.name}</div>
                <div className={styles.pricingPrice}>
                  {plan.price}
                  {plan.period && (
                    <span className={styles.pricingPeriod}>{plan.period}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Feature rows */}
          {["Users", "Integrations", "Dream Cycle", "Search", "API Access", "Support"].map(
            (feature, fi) => {
              const values = [
                ["5", "50", "Unlimited"],
                ["2", "Unlimited", "Custom"],
                ["Weekly", "Nightly", "On-demand"],
                ["Quick", "Standard", "Deep + reranker"],
                ["\u2014", "MCP + REST", "MCP + REST"],
                ["Community", "Email", "Priority"],
              ];
              return (
                <div key={feature} className={styles.pricingRow}>
                  <div className={styles.pricingFeatureLabel}>{feature}</div>
                  {values[fi].map((val, vi) => (
                    <div key={vi} className={styles.pricingCell}>
                      {val}
                    </div>
                  ))}
                </div>
              );
            },
          )}
          <div className={styles.pricingActions}>
            <div className={styles.pricingActionCell} />
            {pricing.map((plan) => (
              <div key={plan.name} className={styles.pricingActionCell}>
                <Link
                  href="/sign-up"
                  className={
                    plan.highlighted
                      ? styles.pricingCtaHighlighted
                      : styles.pricingCtaDefault
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Cortex</span>
        <span className={styles.footerCopy}>
          The company brain that remembers how you got here.
        </span>
      </footer>
    </div>
  );
}
