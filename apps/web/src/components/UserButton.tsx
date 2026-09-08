"use client";

import { useEffect, useState } from "react";

export default function UserButton() {
  const [ClerkUserButton, setClerkUserButton] = useState<React.ComponentType<{
    afterSignOutUrl: string;
    appearance: Record<string, unknown>;
  }> | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      setIsLoaded(true);
      return;
    }

    import("@clerk/nextjs").then((mod) => {
      setClerkUserButton(() => mod.UserButton as unknown as React.ComponentType<{
        afterSignOutUrl: string;
        appearance: Record<string, unknown>;
      }>);
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) return null;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
        <div style={{ fontSize: 12, color: "#71717a" }}>Dev User</div>
      </div>
    );
  }

  if (ClerkUserButton) {
    return (
      <ClerkUserButton
        afterSignOutUrl="/sign-in"
        appearance={{
          elements: {
            avatarBox: { width: 24, height: 24 },
          },
        }}
      />
    );
  }

  return null;
}
