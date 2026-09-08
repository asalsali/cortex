"use client";

import { ClerkProvider } from "@clerk/nextjs";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    // Dev mode -- no auth
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#7c5cfc",
          colorBackground: "#161921",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
