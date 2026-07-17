import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.badge}>Adaptive Interview Assessment</span>
        <h1 className={styles.title}>
          Dynamic assessments that find the right talent
        </h1>
        <p className={styles.subtitle}>
          Upload a job description and let AI generate tiered questions that
          adapt to each candidate&apos;s skill level — from junior to senior.
          No static templates, no cheating, just precise competency measurement.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/create-exam" className={styles.ctaPrimary}>
            Create Exam
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🎯</div>
          <h3 className={styles.featureTitle}>Adaptive Difficulty</h3>
          <p className={styles.featureDesc}>
            Questions scale in real-time based on candidate answers,
            pinning their true skill ceiling accurately.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🤖</div>
          <h3 className={styles.featureTitle}>AI-Generated Per Session</h3>
          <p className={styles.featureDesc}>
            No static question banks to leak or game. Every exam is
            uniquely generated from your job description.
          </p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📊</div>
          <h3 className={styles.featureTitle}>Competency Reports</h3>
          <p className={styles.featureDesc}>
            Detailed skill analysis with CSV export — not just pass/fail,
            but where each candidate excels and needs growth.
          </p>
        </div>
      </div>
    </div>
  );
}
