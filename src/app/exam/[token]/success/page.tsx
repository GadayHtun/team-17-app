/**
 * Success page — shown after a 2xx submit response.
 * Confirmation only, no score, no way back into the exam.
 */
import { TESTID } from "@/shared/testids";

export default function ExamSuccessPage() {
  return (
    <div
      data-testid={TESTID.successPage}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
        background: "var(--background)",
      }}
    >
      <div
        data-testid="success-page"
        style={{
          maxWidth: 400,
          width: "100%",
          padding: "48px 32px",
          background: "var(--card)",
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#166534",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: "0 0 16px",
            color: "var(--foreground)",
          }}
        >
          Answers submitted
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Thanks for completing the exam. The hiring team will review your
          results and contact you by email.
        </p>
      </div>
    </div>
  );
}
