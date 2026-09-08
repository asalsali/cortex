import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #7c5cfc, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              color: "white",
            }}
          >
            C
          </div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#e8eaed",
              letterSpacing: "-0.02em",
            }}
          >
            Cortex
          </span>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#7c5cfc",
              colorBackground: "#161921",
            },
          }}
        />
      </div>
    </div>
  );
}
