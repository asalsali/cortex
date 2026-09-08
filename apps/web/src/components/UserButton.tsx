"use client";

import { useEffect, useState } from "react";

/**
 * Shows the Clerk UserButton when auth is configured, or a "Dev Mode"
 * badge with placeholder avatar when running without Clerk.
 */
export default function UserButton() {
  const [ClerkUserButton, setClerkUserButton] = useState<React.ComponentType<{
    afterSignOutUrl: string;
    appearance: Record<string, unknown>;
  }> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [user, setUser] = useState<{ firstName?: string | null; lastName?: string | null; imageUrl?: string } | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      setIsLoaded(true);
      return;
    }

    // Dynamically import Clerk hooks
    import("@clerk/nextjs").then((mod) => {
      setClerkUserButton(() => mod.UserButton as unknown as React.ComponentType<{
        afterSignOutUrl: string;
        appearance: Record<string, unknown>;
      }>);
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) return null;

  // Dev mode -- no Clerk
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#222539",
            border: "1px solid #2a2d3e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3b4",
          }}
        >
          D
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#9ca3b4" }}>Dev User</div>
          <div
            style={{
              fontSize: 10,
              color: "#fbbf24",
              fontFamily: "var(--font-mono)",
            }}
          >
            dev mode
          </div>
        </div>
      </div>
    );
  }

  // Clerk mode
  if (ClerkUserButton) {
    return (
      <ClerkUserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: { width: 28, height: 28 },
          },
        }}
      />
    );
  }

  return null;
}
