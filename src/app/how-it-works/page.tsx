import Link from "next/link";
import styles from "./page.module.css";

export default function HowItWorksPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>How it works</h1>
        <p className={styles.subtitle}>
          From job description to competency report in four simple steps
        </p>
      </div>

      <div className={styles.timeline}>
        {/* Step 1 */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineLeft}>
            <div className={styles.timelineMarker}>
              <span className={styles.stepNum}>1</span>
            </div>
            <div className={styles.timelineLine} />
          </div>
          <div className={styles.timelineContent}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineLabel}>HR creates exam</div>
              <h3 className={styles.timelineTitle}>Paste a Job Description</h3>
              <p className={styles.timelineDesc}>
                Simply paste the full job description and specify how many
                questions you need at each difficulty level.
              </p>
              <div className={styles.exampleBox}>
                <div className={styles.exampleLabel}>Example JD snippet</div>
                <p className={styles.exampleText}>
                  &quot;Senior Frontend Engineer — 5+ years React experience,
                  strong TypeScript skills, experience with design systems...&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineLeft}>
            <div className={styles.timelineMarker}>
              <span className={styles.stepNum}>2</span>
            </div>
            <div className={styles.timelineLine} />
          </div>
          <div className={styles.timelineContent}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineLabel}>AI generates questions</div>
              <h3 className={styles.timelineTitle}>Tiered Question Creation</h3>
              <p className={styles.timelineDesc}>
                AI analyzes the JD and generates questions at three difficulty
                levels, each with automatic mark allocation.
              </p>
              <div className={styles.exampleBox}>
                <div className={styles.exampleLabel}>Generated questions</div>
                <div className={styles.questionList}>
                  <div className={styles.questionItem}>
                    <span className={`${styles.tierBadge} ${styles.tierEasy}`}>Easy · 1m</span>
                    <span className={styles.questionText}>What is the virtual DOM in React?</span>
                  </div>
                  <div className={styles.questionItem}>
                    <span className={`${styles.tierBadge} ${styles.tierMedium}`}>Medium · 2m</span>
                    <span className={styles.questionText}>Explain React.memo and when to use it.</span>
                  </div>
                  <div className={styles.questionItem}>
                    <span className={`${styles.tierBadge} ${styles.tierHard}`}>Hard · 3m</span>
                    <span className={styles.questionText}>How would you implement a custom hook for debounced search?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineLeft}>
            <div className={styles.timelineMarker}>
              <span className={styles.stepNum}>3</span>
            </div>
            <div className={styles.timelineLine} />
          </div>
          <div className={styles.timelineContent}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineLabel}>Candidate takes exam</div>
              <h3 className={styles.timelineTitle}>One-Time Link Delivery</h3>
              <p className={styles.timelineDesc}>
                Candidate receives a unique, single-use link. No sign-ups
                required — they answer questions one at a time.
              </p>
              <div className={styles.exampleBox}>
                <div className={styles.exampleLabel}>Candidate experience</div>
                <div className={styles.examPreview}>
                  <div className={styles.examHeader}>
                    <span className={styles.examProgress}>Question 3 of 40</span>
                    <span className={`${styles.tierBadge} ${styles.tierMedium}`}>Medium · 2m</span>
                  </div>
                  <p className={styles.examQuestion}>Explain React.memo and when to use it.</p>
                  <div className={styles.examOptions}>
                    <div className={styles.examOption}>A. A higher-order component for class components</div>
                    <div className={`${styles.examOption} ${styles.examOptionSelected}`}>B. A performance optimization that skips re-renders</div>
                    <div className={styles.examOption}>C. A method for state management</div>
                    <div className={styles.examOption}>D. A testing utility for component snapshots</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className={styles.timelineItem}>
          <div className={styles.timelineLeft}>
            <div className={styles.timelineMarker}>
              <span className={styles.stepNum}>4</span>
            </div>
          </div>
          <div className={styles.timelineContent}>
            <div className={styles.timelineCard}>
              <div className={styles.timelineLabel}>Instant results</div>
              <h3 className={styles.timelineTitle}>Competency Report</h3>
              <p className={styles.timelineDesc}>
                Server-side grading delivers instant results with CSV export.
                See where each candidate excels and where they need growth.
              </p>
              <div className={styles.exampleBox}>
                <div className={styles.exampleLabel}>Sample report</div>
                <div className={styles.reportPreview}>
                  <div className={styles.reportRow}>
                    <span className={styles.reportLabel}>Candidate</span>
                    <span className={styles.reportValue}>sarah@example.com</span>
                  </div>
                  <div className={styles.reportRow}>
                    <span className={styles.reportLabel}>Total Score</span>
                    <span className={styles.reportValue}>72 / 120</span>
                  </div>
                  <div className={styles.reportBreakdown}>
                    <div className={styles.reportTier}>
                      <span className={`${styles.tierBadge} ${styles.tierEasy}`}>Easy</span>
                      <span className={styles.reportScore}>18/20</span>
                    </div>
                    <div className={styles.reportTier}>
                      <span className={`${styles.tierBadge} ${styles.tierMedium}`}>Medium</span>
                      <span className={styles.reportScore}>34/60</span>
                    </div>
                    <div className={styles.reportTier}>
                      <span className={`${styles.tierBadge} ${styles.tierHard}`}>Hard</span>
                      <span className={styles.reportScore}>20/40</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to start?</h2>
        <p className={styles.ctaDesc}>
          Create your first adaptive assessment in under two minutes.
        </p>
        <Link href="/create-exam" className={styles.ctaButton}>
          Create Exam
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
