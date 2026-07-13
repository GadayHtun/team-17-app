/**
 * Expired page — shown when exam status is "used" (410).
 * Covers: revisiting a link after successful submit, or duplicate open.
 */
export default function ExamExpiredPage() {
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
            background: "#7F1D1D",
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
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
          This link has expired
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#A0A0A0",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          This exam has already been completed and can&apos;t be reopened.
          Contact the hiring team if you think this is a mistake.
        </p>
      </div>
    </div>
  );
}
