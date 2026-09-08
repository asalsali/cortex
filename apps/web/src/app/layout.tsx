import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cortex - The Company Brain",
  description: "A living company knowledge base that remembers how you got here.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
