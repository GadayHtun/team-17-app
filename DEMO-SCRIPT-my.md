# Demo Video Script — Burmese (🇲🇲)
# Team 17 — Exam Platform (AI-Powered MCQ Screening Tool)
# ရှည်လျားမှု — မိနစ် ၆ မိနစ် (အမြင့်ဆုံး)

---

## 🎬 HOOK — ပြဿနာ (စက္ကန့် ၃၀)

**မြန်မာဘာသာ:**
"HR တွေက စာမေးပွဲမေးခွန်းတွေ ကိုယ်တိုင်ဖန်တီးဖို့ အချိန်အများကြီး ကုန်ဆုံးနေရတယ်။ တစ်ယောက်ချင်းစီအတွက် မေးခွန်းတွေ ပြန်ဖန်တီးနေရတာ ပိုပြီးပင်ပန်းပါတယ်။ ဒါကြောင့် ကျွန်တော်တို့က AI-powered MCQ screening tool ကို ဖန်တီးခဲ့ပါတယ်။"

**English translation (for reference):**
"HR teams spend too much time manually creating screening exams. Crafting questions for each candidate is exhausting. That's why we built an AI-powered MCQ screening tool."

---

## 💡 SOLUTION — ဖြေရှင်းနည်း (စက္ကန့် ၃၀)

**မြန်မာဘာသာ:**
"ကျွန်တော်တို့ tool က HR တွေအတွက် ရည်ရွယ်ထားပါတယ်။ Job description ကို paste လုပ်လိုက်ရုံနဲ့ AI က အဆင့် ၃ ဆင့်ခွဲပြီး မေးခွန်းတွေ အလိုအလျောက် ဖန်တီးပေးပါတယ် — Easy, Medium, Hard ဆိုပြီး။ HR က ပြန်စစ်ဆေးပြီး ကြိုက်တဲ့မေးခွန်းတွေ ရွေးချယ်နိုင်ပါတယ်။ ပြီးရင် one-time link ကို candidate ဆီ ပို့ပေးလိုက်ရုံပါပဲ။"

**English translation:**
"Our tool is built for HR. Paste a job description and AI automatically generates tiered questions — Easy, Medium, Hard. HR reviews and curates, then sends a one-time link to the candidate."

---

## 🔴 LIVE DEMO — အသုံးပြုပုံ (မိနစ် ၃.၅)

**Step 1 — Exam ဖန်တီးခြင်း (Create Exam)**

**မြန်မာဘာသာ (narration):**
"ပထမဆုံးအနေနဲ့ HR dashboard ကနေ 'Create Exam' ကို နှိပ်ပါမယ်။"

*(screen recording မှာ show လုပ်ရန်)*
- Page: `/create-exam`
- Job Title: `Senior Frontend Developer`
- Job Description: JD ကို paste လုပ်ပါ
- Candidate Email: `candidate@example.com`
- Easy: `3`, Medium: `3`, Hard: `3`
- "Generate Questions" ကို နှိပ်ပါ

**မြန်မာဘာသာ (narration):**
"Generate ကို နှိပ်လိုက်တာနဲ့ AI က မေးခွန်း ၉ ခုကို အလိုအလျောက် ဖန်တီးပေးပါတယ်။"

---

**Step 2 — မေးခွန်းများ ပြန်စစ်ခြင်း (Review & Curate)**

**မြန်မာဘာသာ (narration):**
"နောက်တစ်ဆင့်မှာ မေးခွန်းတွေကို စစ်ဆေးနိုင်ပါတယ်။ Easy, Medium, Hard ဆိုပြီး အုပ်စုခွဲပြထားပါတယ်။ မကောင်းတဲ့ မေးခွန်းတွေကို ဖျက်နိုင်တယ်၊ အသစ်တစ်ခု ပြန်ထုတ်နိုင်တယ်။"

*(screen recording မှာ show လုပ်ရန်)*
- Page: `/review`
- Questions grouped by tier: Easy (3), Medium (3), Hard (3)
- HR can see correct answers (candidate မြင်ရမည်မဟုတ်)
- Deselect / regenerate individual questions
- "Create Exam" ကို နှိပ်ပါ

**မြန်မာဘာသာ (narration):**
"'Create Exam' ကို နှိပ်ပြီးရင် server က exam ID တွေ သတ်မှတ်ပေးပြီး one-time link ထုတ်ပေးပါတယ်။ ဒီ link ကို candidate ဆီ ပို့လိုက်ပါ။"

---

**Step 3 — Candidate စာမေးပွဲဖြေခြင်း (Take Exam)**

**မြန်မာဘာသာ (narration):**
"အခု candidate ဘက်ကနေ ကြည့်ကြည့်အောင်။ Candidate က link ကို ဖွင့်လိုက်တာနဲ့ မေးခွန်းတွေ မြင်ရပါတယ်။ ဒါပေမယ့် ဖြေထားတဲ့ အဖြေကိုတော့ မမြင်ရပါဘူး — ဒါက security အရ အရေးကြီးပါတယ်။"

*(screen recording မှာ show လုပ်ရန်)*
- Page: `/exam/[token]`
- Questions displayed one at a time
- Radio button options
- Prev / Next navigation
- Progress indicator
- No answer index visible (answerIndex stripped)
- No difficulty tier shown to candidate

**မြန်မာဘာသာ (narration):**
"ဖြေချင်တဲ့ မေးခွန်းကို ရွေးပြီး Next နှိပ်ပါ။ ဖြေချင်မဖြေချင် ရွေးချယ်ခွင့် ရှိပါတယ် — ဖြေမထားရင် 0 marks ပါပဲ။"

---

**Step 4 — အဖြေတင်ခြင်း (Submit & Grade)**

**မြန်မာဘာသာ (narration):**
"ဖြေပြီးသားဆိုရင် Submit ကို နှိပ်ပါ။ Server က အလိုအလျောက် စစ်ဆေးပြီး grade လုပ်ပေးပါတယ်။ Candidate ကိုတော့ score ပြန်မပြပါဘူး — 'Thank you' page ပဲ ပြပါတယ်။"

*(screen recording မှာ show လုပ်ရန်)*
- Submit button clicked
- Server-side grading (pure function)
- Candidate sees `{ ok: true }` — no score revealed
- Success page displayed

---

**Step 5 — ရလဒ်များ (Results)**

**မြန်မာဘာသာ (narration):**
"HR ဘက်ကနေ results page ကို သွားကြည့်ရင် candidate ရဲ့ အဆင့်တိုင်းက ရမှတ်တွေ မြင်ရပါတယ်။ Easy က ဘယ်လောက်၊ Medium က ဘယ်လောက်၊ Hard က ဘယ်လောက်ဆိုပြီး competency breakdown ပြပေးပါတယ်။ CSV အဖြစ်လည်း export လုပ်နိုင်ပါတယ်။"

*(screen recording မှာ show လုပ်ရန်)*
- Page: `/results`
- Table: candidate name, job title, scores per tier, total, percentage
- Export to CSV button

---

## ⚙️ TECH HIGHLIGHT — နည်းပညာ (စက္ကန့် ၄၅)

**မြန်မာဘာသာ:**
"ဒီ project မှာ အခက်ခဲဆုံးက LLM integration ပါ။ OpenRouter ကနေ free model တစ်ခုကို သုံးပြီး question generation လုပ်ပါတယ်။ Prompt engineering မှာ security ကို အထူးဂရုစိုက်ခဲ့ရပါတယ် — JD ကို untrusted data အဖြစ် treat လုပ်ပြီး length cap တွေ ထားပါတယ်။ Three-layer validation ပါ — JSON parse, schema check, quality check။ Retry ၃ ကြိမ်အထိ ပြန်ကြိုးစားပါတယ်။ AI tool တွေဖြစ်တဲ့ Claude Code, aihero skills တွေကို သုံးပြီး TDD workflow နဲ့ ဆောက်ပါတယ်။"

**English translation:**
"The hardest part was LLM integration. We use a free model via OpenRouter for question generation. Security in prompt engineering was critical — JD treated as untrusted data with length caps. Three-layer validation: JSON parse, schema check, quality check. Up to 3 retries. Built with Claude Code and aihero skills using TDD workflow."

---

## 🔮 WHAT'S NEXT — နောက်ထပ် (စက္ကန့် ၃၀)

**မြန်မာဘာသာ:**
"ကျွန်တော်တို့ HR သုံးစွဲသူအတွက် နောက်ထပ် ဘာတွေ ဆက်လုပ်မလဲဆိုတော့ — email invite system ပါဝင်လာမှာပါ။ HR က candidate ရဲ့ email ထည့်လိုက်ရုံနဲ့ exam link ကို အလိုအလျောက် ပို့ပေးမှာပါ။ Results dashboard ကိုလည်း ပိုပြီး ကောင်းအောင် ဖန်တီးသွားမှာပါ။"

**English translation:**
"For our HR users, next we'd add email invite system — HR enters candidate email and the link is sent automatically. We'd also enhance the results dashboard."

---

## 🎤 OUTRO — အဆုံးသတ် (စက္ကန့် ၁၅)

**မြန်မာဘာသာ:**
"ဒါက Team 17 ရဲ့ Exam Platform ပါ။ AI-powered MCQ screening tool နဲ့ HR တွေရဲ့ အလုပ်ကို လွယ်ကူအောင် ကူညီပေးပါတယ်။ ကြည့်ရှုပေးလို့ ကျေးဇူးတင်ပါတယ်။"

**English translation:**
"This is Team 17's Exam Platform. We help HR teams with an AI-powered MCQ screening tool. Thanks for watching."

---

## 📝 SCRIPT TEMPLATE — ကိုယ်တိုင်ဖြည့်ရန်

```
HOOK (30s)
  ပြဿနာ: ___________________________________________________
  ဘယ်သူတွေ ထိခိုက်: ________________ ဘာကြောင့်အရေးကြီး: _______________

SOLUTION (30s)
  ကျွန်တော်တို့ ဖန်တီးခဲ့တာ: ___________________________________
  ဘယ်သူတွေအတွက်: ___________________________________

DEMO — one flow (3.5 min)
  Step 1 — နှိပ်/ရိုက်: _____________________________________
            viewer မြင်ရတာ:  _____________________________________
  Step 2 — နှိပ်/ရိုက်: _____________________________________
            viewer မြင်ရတာ:  _____________________________________
  Step 3 — payoff moment:  _____________________________________
            ("oh, nice" moment)

TECH HIGHLIGHT (45s)
  အခက်ခဲဆုံး: ______________________________________________
  AI tool: _______________________________________

WHAT'S NEXT (30s)
  နောက်ထပ်: _______________________________________________

OUTRO (15s)
  "ဒါက Team ___ ပါ။ ကြည့်ရှုပေးလို့ ကျေးဇူးတင်ပါတယ်။"
```

---

## ✅ CHECKLIST (录制前检查)

- [ ] Script ဖြည့်ပြီးပြီ — exact words + clicks
- [ ] Live URL ကနေ record ပြီး, clean browser, စာသားဖတ်ရလွယ်အောင် zoom ပြီး
- [ ] မိနစ် ၆ မိနစ်ထက် မကျော်အောင်
- [ ] (optional) intro stinger ထည့်ပြီး
- [ ] (optional) captions ဖွင့်ပြီး
- [ ] YouTube unlisted / Drive fallback နဲ့ upload ပြီး
- [ ] Link ကို incognito window မှာ test ပြီး
- [ ] Link ကို DEMO.md + report.md + team sheet ထဲ ထည့်ပြီး

---

## 🛠️ Recording Tools (မှတ်ချက်)

| Tool | Platform | သုံးစွဲပုံ |
|------|----------|-------------|
| **OBS Studio** | Win / Mac / Linux | Full control, screen + mic + webcam |
| **Xbox Game Bar** (`Win+G`) | Windows | Built-in, quick screen capture |
| **Loom** | Browser / app | Easiest; screen + face, instant link |
| **CapCut** | Win / Mac / mobile | Free, auto-captions |
| **Clipchamp** | Windows 11 | Built-in, browser-based |
