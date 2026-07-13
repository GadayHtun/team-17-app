/**
 * Generic error page — shown for 404 (malformed/unknown token)
 * and unexpected errors.
 */
export default function ExamErrorPage() {
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
            background: "#92400E",
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
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
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
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#A0A0A0",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          We couldn&apos;t load your exam. The link may be invalid or expired.
          Please contact the hiring team for assistance.
        </p>
      </div>
    </div>
  );
}
