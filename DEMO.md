# Demo — Team 17 Exam Platform

> AI-powered MCQ screening tool. Paste a JD → LLM generates tiered questions →
> HR curates → one-time link → candidate takes exam → server grades → results.csv.

---

## Video

| | |
|---|---|
| **YouTube** (unlisted) | https://youtu.be/mSDow1yT1nY |
| **Drive fallback** | https://drive.google.com/file/d/1b3CP4V5iRLtm0ZUQ7TXm8zKG7kIe9UP2/view?usp=sharing |
| **Date recorded** | 2026-07-25 |
| **Duration** | 4:55 (max 6:00) |
| **Live URL** | https://team-17-app-dulg.vercel.app/ |

## Scripts

| Language | File |
|----------|------|
| Burmese (မြန်မာ) narration | [`DEMO-SCRIPT-my.md`](./DEMO-SCRIPT-my.md) — original |
| Burmese (မြန်မာ), extended | [`Presentation_script-my.md`](./Presentation_script-my.md) — includes technical deep-dive |

---

## Demo walkthrough (6 minutes)

### 1. Hook — The problem (30s)

**What to say:** HR teams spend hours manually creating screening exams. Static quizzes
are easy to cheat, and one-size-fits-all questions don't measure actual skill — too easy
for seniors, too hard for juniors.

**Visual:** Title slide with "The Hiring Bottleneck"

---

### 2. Solution — What we built (30s)

**What to say:** We built an AI-powered MCQ screening tool for HR and technical recruiters.
Paste a job description → AI generates tiered questions (Easy / Medium / Hard).
HR reviews, curates, sends a one-time link. Done.

**Visual:** Platform overview slide

---

### 3. Live demo — Step by step (3.5 min)

#### Step 1 — Create Exam

| Action | Detail |
|--------|--------|
| Navigate to | `/create-exam` |
| Fill | Job Title: "Senior Frontend Developer" |
| Paste | Job description (a realistic JD) |
| Enter | Candidate email |
| Set counts | Easy: 3 · Medium: 3 · Hard: 3 |
| Click | "Generate Questions" |

**What to say:** AI generates 9 questions — 3 per difficulty tier — from the job
description. No manual question writing needed.

---

#### Step 2 — Review & Curate

**Navigate to:** `/review`

**What to show:**
- Questions grouped by tier (Easy / Medium / Hard)
- Correct answers visible to HR only (server-side, never to candidate)
- Deselect unwanted questions
- Regenerate individual questions if needed
- Click "Create Exam"

**What to say:** HR reviews the generated questions, removes bad ones, regenerates
if needed. One click finalizes the exam. The server assigns IDs and marks, then
produces a one-time candidate link.

---

#### Step 3 — Candidate takes exam

**Open:** `/exam/[token]`

**What to show:**
- Questions displayed one at a time
- Radio button options
- Prev / Next navigation
- Progress indicator
- Submit when done

**What to say:** The candidate opens the link and sees the questions. They don't see
the correct answer, the difficulty tier, or any server-side data. Unanswered
questions score 0 marks. **Note:** refreshing mid-exam loses answers in v1.

---

#### Step 4 — Submit & Grade

**Action:** Click Submit

**What to show:**
- Candidate sees a "Thank you" confirmation page (`/end`)
- Server auto-grades server-side (pure function)
- Candidate never sees their score — response is `{ ok: true }`

**What to say:** Submission goes to the server for grading. Marks are assigned per
question (Easy = 1, Medium = 2, Hard = 3). Scores are server-only — candidates
never see their results.

---

#### Step 5 — Results

**Navigate to:** `/results`

**What to show:**
- Results table: candidate name, job, scores per tier, total, percentage
- Export to CSV button

**What to say:** HR comes back to see the results. Competency breakdown per tier
shows where the candidate excels. CSV export for records.

---

### 4. Tech highlight (45s)

**What to say:**
- **Frontend:** Next.js + TypeScript (App Router, CSS Modules)
- **AI:** LLM via OpenRouter — JD treated as untrusted data, length-capped
- **Storage:** File-based (MongoDB database), exams live as JSON
- **Grading:** Server-side autograder, marks from config (1/2/3)
- **Validation:** Three-layer — JSON parse, schema check, quality check; up to 3 retries
- **Security:** `answerIndex` never reaches candidates; tokens = `crypto.randomUUID()`
- **Testing:** Vitest (unit + contract) + Playwright (E2E golden path)
- **Build:** Claude Code + aihero skills + TDD workflow

**Visual:** Architecture slide

### 5. What's next & outro (30s)

**What to say:** Next up — automated email invite system and an enhanced results
dashboard. Thanks for watching. This is Team 17's Exam Platform.

**Visual:** "What's Next" slide → Team 17 closing slide

---

## Recording checklist

- [x] Script written (English + Burmese)
- [ ] Recorded from **live URL**, clean browser, readable text, no secrets
- [ ] Under **6:00**
- [ ] (optional) Intro stinger added
- [ ] (optional) Captions on
- [ ] Uploaded — YouTube unlisted or Drive fallback
- [ ] Link tested in incognito
- [ ] Link pasted in `DEMO.md` + `report.md` + team video sheet
