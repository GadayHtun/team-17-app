/**
 * Root page — exam platform landing.
 * Ticket 1 (CreateExam) will eventually live here.
 */
export default function Home() {
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
          maxWidth: 480,
          width: "100%",
          padding: "48px 32px",
          background: "#2A2A2A",
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            margin: "0 0 12px",
            color: "#FFFFFF",
          }}
        >
          Exam Platform
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#A0A0A0",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          AI-powered MCQ screening tool. Create exams, send links, and
          evaluate candidates — all in one place.
        </p>
      </div>
    </div>
  );
}
