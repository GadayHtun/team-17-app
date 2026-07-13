/**
 * Global 404 page — handles any unmatched route.
 */
export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        background: "#1A1A1A",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "48px 32px",
          background: "#2A2A2A",
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#7C3AED",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 16px",
            color: "#FFFFFF",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#A0A0A0",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
    </div>
  );
}
