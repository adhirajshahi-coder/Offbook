# Offbook: curriculum-to-PRD mapping (proposal v0.1)

Source files: `PRD Offbook.docx` (PRD v1.0) and `Cirriculum.xlsx` (42 courses, 9 tracks, 3 levels).
Status: proposal for the owner to approve. Once approved, these decisions go into `docs/DECISIONS.md` and this file goes into `docs/curriculum/` for the seed script to read.

Items marked **[OWNER]** are decisions only the owner can make. Each has a default so the build can proceed.

---

## 1. The gaps this file closes

| | PRD v1.0 | Curriculum | Decision below |
|---|---|---|---|
| Tracks | 5 zones | 9 tracks | §2: use 9 zones |
| Grade bands | Explore 6–8, Build 9–10, Launch 11–12 | Level 1: 6–8, Level 2: 8–10, Level 3: 10–12 (they overlap) | §3: theme band comes from class; content level comes from progress |
| Courses per band | About 1 per zone (≈15 total) | 13 / 17 / 12 = 42 | §4: one ordered path per level, with choice slots |
| Core / Recommended / Elective | Not modelled; strict order, one active course | 13 Core, 21 Recommended, 8 Elective | §4: electives become "pick one" slots on the path |
| Depth | Missions → lessons → steps, quizzes | Course title, project, summary only | §6: a course template, plus 2 seed courses outlined in full |
| Projects | Solo, self-paced, no peer free text, no photos | Many are class or team activities, some publish publicly | §7: solo default plus a school-cohort variant |

---

## 2. Tracks → zones

**Decision: adopt the curriculum's 9 tracks as the world-map zones.** Folding 9 tracks into 5 would push science, health, civics and language into zones where they don't belong. Tracks are already data in the PRD (`tracks` table), so this needs no code change. It does change the marketing copy ("five zones") and the game rule (§5).

Zone names are placeholders. They reuse the PRD names where they fit and are editable in HQ.

| # | Curriculum track | Zone name [OWNER] | Courses (L1 / L2 / L3) | Game (v1) |
|---|---|---|---|---|
| 1 | Thinking & Personal Effectiveness | Leaders' Peak | 4 / 0 / 0 | Decision Dojo, Say It Better |
| 2 | Digital Foundations & Safety | Cyber Cove | 2 / 0 / 0 | none |
| 3 | Coding & Building | Code Canyon | 1 / 4 / 4 | none (later) |
| 4 | AI & Data | Bot Bay | 1 / 1 / 3 | Bot Builder |
| 5 | Math & Logic | Puzzle Peaks | 1 / 1 / 1 | none |
| 6 | Business, Money & Leadership | Founders' Forge | 1 / 5 / 0 | Budget Bazaar, Startup Sprint |
| 7 | Science, Health & Sustainability | Discovery Delta | 1 / 3 / 1 | none |
| 8 | Creativity, Language & Society | Voice Valley | 2 / 3 / 1 | none |
| 9 | Career & Capstone | Launchpad | 0 / 0 / 2 | none |

Notes
- "Money Mint" stays the in-app name of the first course (*Money Skills & Personal Finance*), so the PRD's seed and marketing hero ("Spend ₹500 wisely") still work.
- **[OWNER] Positioning.** The PRD pitches "skills school does not teach". Several courses (*Human Body, Health & Nutrition*; *Civics, History & Global Awareness*; *Frontier Science Lab*) overlap with school subjects. Default: keep them and pitch them as "school plus real life", as PRD §4.6 already does.
- Zones are unevenly sized (Thinking has 4 courses, all at L1; Career has 2, both at L3). That's fine on a map. Zones with no courses at the student's level show as "coming at Level N".

---

## 3. Grade bands vs curriculum levels

The PRD uses the band for two things that should be separate:

1. **Theme band** (look and feel: Explore / Build / Launch). Keep the PRD rule: it comes from the student's class (6–8 / 9–10 / 11–12).
2. **Content level** (which courses are on the path). New field: `students.content_level` (1–3), set by placement and then by progress.

**Placement when a student joins** (default):

| Class at signup | Starts at | Theme |
|---|---|---|
| 6, 7, 8 | Level 1 | Explore |
| 9, 10 | Level 2 | Build |
| 11, 12 | Level 3 | Launch |

**Moving up early.** This is what the curriculum's overlapping bands are for. Finishing a level's path unlocks the next level as soon as the student is in that level's minimum class (Level 2 from class 8, Level 3 from class 10). A class-8 student who finishes Level 1 moves straight into Level 2 and keeps the Explore theme until class 9. A student who finishes a level before reaching the minimum class gets open play in their current level (§4.3) until they qualify.

**Late joiners [OWNER].** A class 9–12 joiner skips Level 1, including *Cyber Safety*. Default: every student placed directly into Level 2 or 3 gets a **Bridge** as the first course on their path. It's a condensed course built from Level 1 lessons: Cyber Safety (all of Mission 1), Money Skills (Missions 1–2) and Learning How to Learn (Mission 1). It reuses existing lessons, so no new content is needed. Lessons are shown at the student's theme band.

**Pace check.** At roughly 3 missions of 3–4 weeks each, a course takes about 10 weeks, so a student finishes about 4–5 courses a year. That's ~13 courses across classes 6–8 (Level 1 fits exactly), ~11 across 8–10, and ~8 across 10–12. The paths in §4 are sized to this.

---

## 4. Course order (the path) and choice slots

The owner's rules stay as written: **strict order and one active course at a time** (PRD §8). Electives fit in as **choice slots**: a node on the path where the student picks one of 2–4 courses. Once they pick, that course becomes the active course, and the rest of the path stays locked until it's complete.

Schema change: add `course_slots (id, level, order_index, title)` and `courses.slot_id` (nullable). A course with `slot_id = null` is a fixed step. Unlock logic treats a slot as complete when any one of its courses is complete. Add this case to the unit tests in `lib/gamification/unlocks.ts`.

### 4.1 Level 1: Explore (classes 6–8): 13 steps, no choice

Level 1 is all Core apart from one Recommended course, so it's a fixed path. The order is chosen for activation first (the north-star metric), then for prerequisites.

| Step | Course | Zone | Priority | Why here |
|---|---|---|---|---|
| 1 | Money Skills & Personal Finance ("Money Mint") | Founders' Forge | Core | Strongest hook; matches the onboarding taste challenge and the marketing hero; unlocks Budget Bazaar |
| 2 | Critical Thinking, Logic & Ethics | Leaders' Peak | Core | PRD seed course 2; unlocks Decision Dojo |
| 3 | Learning How to Learn | Leaders' Peak | Core | Makes every later course easier; early but not first, since it's less exciting as a first impression |
| 4 | Cyber Safety & Digital Citizenship | Cyber Cove | Core | Before any course where students publish or use online tools |
| 5 | Communication: Speaking, Listening & Storytelling | Leaders' Peak | Core | Unlocks Say It Better |
| 6 | Everyday Math, Data & Probability Sense | Puzzle Peaks | Core | Builds on Money and Critical Thinking |
| 7 | How Computers & the Internet Work | Cyber Cove | Core | Prerequisite for AI Literacy and coding |
| 8 | AI Literacy & Responsible AI Use | Bot Bay | Core | Needs step 7; unlocks Bot Builder |
| 9 | Computational Thinking & Block Coding | Code Canyon | Core | Needs step 7; prerequisite for Python I |
| 10 | Scientific Thinking & Research Skills | Discovery Delta | Core | Uses step 6's data skills |
| 11 | Habits, Well-Being & Resilience | Leaders' Peak | Core | The 21-day habit project fits well later in the year |
| 12 | English Communication & Writing | Voice Valley | Core | Brings together communication and research |
| 13 | Visual Design & Creativity | Voice Valley | Recommended | Lighter course to finish on; leads into Level 2 marketing and video |

### 4.2 Level 2: Build (classes 8–10): 11 steps, 3 of them choice slots

17 courses won't fit in about 11 steps, so 8 are fixed and 9 are spread across 3 slots. The fixed courses are the ones Level 3 depends on.

| Step | Course or slot | Zone | Priority |
|---|---|---|---|
| 1 | Entrepreneurship & Startup Basics | Founders' Forge | R (unlocks Startup Sprint) |
| 2 | Spreadsheets & Data Literacy | Bot Bay | R |
| 3 | Python Programming I | Code Canyon | R |
| 4 | Design Thinking & Product/UX Basics | Founders' Forge | R |
| 5 | Web Development I: HTML & CSS | Code Canyon | R |
| 6 | **Slot A "Make something"**: Video, Audio & Content Creation (R) / Electronics, Robotics & Making (E) / Game Design & Development Basics (E) | | |
| 7 | Teamwork, Leadership & Project Management | Founders' Forge | R |
| 8 | Economics Foundations | Founders' Forge | R |
| 9 | Marketing, Branding & Social Media | Founders' Forge | R |
| 10 | **Slot B "Understand the world"**: Climate, Energy & Sustainability (R) / Civics, History & Global Awareness (R) / Human Body, Health & Nutrition (R) / Understanding Mind & Behaviour (E) | | |
| 11 | **Slot C "Sharpen your mind"**: Logical Math & Problem Solving (R) / World Language Starter (E) | | |

**[OWNER] Class 10 board year.** Steps 8–11 will often fall in class 10. Default: keep the path, and have the parent dashboard offer a "board-exam lighter mode" (weekly goal drops from 4 days to 2). The path doesn't change.

### 4.3 Level 3: Launch (classes 10–12): 8 steps, 3 of them choice slots

| Step | Course or slot | Zone | Priority |
|---|---|---|---|
| 1 | Generative AI, Prompting & Automation | Bot Bay | R |
| 2 | Python II: Data Structures & Problem Solving | Code Canyon | R |
| 3 | Data Analysis & Visualisation with Python | Bot Bay | R |
| 4 | **Slot D "Build"**: Web Development II: JavaScript & Git (R) / Databases & SQL Basics (R) / Build Your First Mobile App (E) | | |
| 5 | **Slot E "Go deeper"**: Machine Learning Basics (E) / Math for the Future (R) / Frontier Science Lab (E) | | |
| 6 | Career Exploration, Portfolio & Interview Basics | Launchpad | R |
| 7 | **Slot F "Prepare"**: English for Academic Writing & Global Exams (E) / any course not yet taken from Slot D | | |
| 8 | Capstone: Build & Launch a Real Project | Launchpad | Core (always last) |

**[OWNER] Level 3 leans heavily on coding.** It has no business, communication or design courses, so a student who isn't interested in tech has a thin Level 3. Default: ship as is, and plan a "Founder track" Level 3 course (for example *Running a real venture*) for v2.

**Open play.** After a student finishes a level's path, the courses they didn't pick in its slots open up, still one at a time. This also covers students waiting for the minimum class to move up (§3).

### 4.4 Cross-level prerequisites (course-level skill links)

Seed these as `prerequisite` or `applies_in` links between the skills in each course. The skill graph then shows connections across levels and zones, which is the "connect the dots" view in PRD §7.3.

| From | To | Type |
|---|---|---|
| Computational Thinking & Block Coding | Python I | prerequisite |
| Python I | Python II → Data Analysis → Machine Learning | prerequisite |
| Web Development I | Web Development II | prerequisite |
| Spreadsheets & Data Literacy | Data Analysis with Python | prerequisite |
| AI Literacy | Generative AI; Machine Learning | prerequisite |
| Money Skills | Entrepreneurship; Economics | applies_in |
| Communication (L1) | Marketing; Career & Interviews | applies_in |
| Everyday Math & Data | Spreadsheets; Logical Math | applies_in |
| Visual Design | Marketing; Video & Content | applies_in |
| Design Thinking | Capstone | applies_in |
| Cyber Safety | Web Dev I; Video & Content; Generative AI | applies_in (safety refresher shown before the first publish) |

---

## 5. Games

The PRD rule "a track's game unlocks when the student reaches that track's course" doesn't work with 9 zones and several courses per zone. **Change: `games.unlock_course_id`.** Each game unlocks when its course starts.

| Game | Zone | Unlocks at | Ship in |
|---|---|---|---|
| Budget Bazaar | Founders' Forge | L1 step 1, Money Skills | Phase 4 |
| Decision Dojo | Leaders' Peak | L1 step 2, Critical Thinking | Phase 4 |
| Say It Better | Leaders' Peak | L1 step 5, Communication | Phase 6 |
| Bot Builder | Bot Bay | L1 step 8, AI Literacy | Phase 6 |
| Startup Sprint | Founders' Forge | L2 step 1, Entrepreneurship | Phase 6 |

Bridge students (§3) unlock Budget Bazaar and Decision Dojo through the Bridge course. Code Canyon, Puzzle Peaks, Discovery Delta, Voice Valley and Launchpad have no game in v1.

---

## 6. Course structure template

The curriculum stops at the course. Every course gets this default structure, which maps onto PRD §7.4:

| PRD level | Default | Source |
|---|---|---|
| Course | 1 per curriculum row | Title = *Course*; promise = *One-line summary* |
| Missions | 3 per course (2–4 allowed), 3–4 weeks each, each ending in a real output | Authored |
| Lessons | 3 per mission (2–5 min of input + practice) | Authored |
| Steps | Study (deck or video) → Try → Twist → Make → Reflect | Authored |
| Mission quiz | 80% mastery, questions from variant pools | Authored (5 questions per lesson × 3 variants) |
| Boss challenge | 1 per mission | Authored (often a game level or a scenario) |
| Capstone | 1 per course | **= curriculum *Hands-on project / output***, adjusted per §7 |

**Content volume [OWNER].** 42 courses × 3 missions × 3 lessons ≈ **378 lessons**, ~1,900 base questions and ~5,700 with variants, plus 126 boss challenges and 42 capstones. Suggested order of writing:
1. The 2 seed courses (below) for Phase 2.
2. The rest of Level 1 (11 courses) before launch. This alone supports a class 6–8 school pilot.
3. Level 2 and 3, plus the Bridge, before opening signups to classes 9–12.

**[OWNER] Launch scope.** The quickest honest launch is classes 6–8 only. Default: launch with Level 1 complete, take class 9–12 signups on a waitlist, and keep pricing at ₹6,000.

---

## 7. Capstone projects that conflict with the PRD

The curriculum was written with a classroom in mind. The PRD is self-paced and parent-paid, with strict child-safety rules (§7.9, §13). Every course needs a **solo default** (works at home with family). Projects marked ★ also get a **school-cohort variant**, used when the student joined with a school code (`students.school_id`) and the school runs the activity.

| Course | Curriculum project | Conflict | Proposed solo default |
|---|---|---|---|
| Communication | 3-min talk **recorded on video**, **peer feedback** | Video shows the child's face (personal data); no student-to-student free text | Audio recording (or private video seen only by staff and parent); feedback from staff reviewer + self-rubric; second attempt kept |
| Everyday Math ★ | Design and run a **class survey** | Needs a class | Survey 8–10 family members or neighbours (offline, safety note) |
| Entrepreneurship ★ | Run a mini business (**class market day** or **online**) | Selling online as a minor; classroom event | Offline sale to family and neighbours (≤ ₹500 stock, parent ack); online selling is not allowed |
| Economics ★ | Run a **classroom market game** | Needs a class | Play the market round inside Startup Sprint / Budget Bazaar, then write an analysis |
| Teamwork ★ | **Team** project with Kanban + retro | No team in a solo product | Family project (plan a trip, event or room makeover) using a Kanban board |
| Capstone ★ | Solve a real problem **as a team**, public showcase | Same | Solo or family project; showcase is the monthly online showcase day (PRD §11) |
| Human Body | First-aid demonstration **for classmates** | Needs classmates | Demonstrate to family; staff review a written step card |
| Climate ★ | School audit presented **to management** | Needs school access | Home energy and water audit, presented to family |
| Civics ★ | **Model parliament** or policy brief | Needs a group | Policy brief on a local issue (solo) |
| Understanding Mind | Experiment **with consent** on people | Child running research on others | Family only, with a script and parent ack; no data about others is uploaded |
| Mobile App | **Tested with 5 users** | Fine if they're family or friends | Test with 5 family members or friends, offline |
| AI Literacy | **Train an image classifier** | PRD says no photo upload | Use provided image sets (no own photos); run in the browser |
| Web Dev I | Portfolio site **live on the internet** | Public personal data | Publish only through Offbook's public portfolio (`/p/[handle]`, parent-enabled, first name only) or a parent-owned account |
| Web Dev II | **GitHub** repo | External account for a minor | Parent-created account, parent consent; offline alternative: export a zip |
| Game Design | Release on **itch.io** | External publishing account | Playable build in Offbook's showcase (with consent); itch.io is optional and the parent publishes it |
| Video & Content | **Publish** a video or podcast | Public media of a minor | Showcase wall only, parent consent + staff approval, no face required |
| Generative AI | Automate a real task with AI tools | Many AI tools have age limits; PRD has no live AI in v1 | Approved, age-appropriate tools list [VERIFY with lawyer]; scripted sandbox inside Offbook until then |
| Electronics & Robotics | Working robot / smart device | Needs a hardware kit (cost, shipping) | Browser simulator (e.g. a Tinkercad-style circuit sim) as default; physical kit as a paid add-on [OWNER] |

**Tools not in the PRD stack** (decide before writing these courses):

| Need | Courses | Suggested approach |
|---|---|---|
| Block coding environment | Computational Thinking | Embed Blockly in the lesson player (no external accounts) |
| Python in the browser | Python I/II, Data Analysis, ML | Pyodide in a sandboxed iframe |
| HTML/JS editor + preview | Web Dev I/II, Game Design | In-browser editor (CodeMirror) + sandboxed preview |
| Spreadsheets | Spreadsheets & Data Literacy | In-app grid (lightweight) or a parent-owned Google account |
| SQL | Databases | SQLite in the browser (sql.js) |
| Circuit simulator | Electronics | Embedded simulator or a link to an external one |

These are new "interactive workspace" step types (`code_python`, `code_blocks`, `code_web`, `sql`). Add them in a later phase (proposed Phase 7). Level 1 only needs Blockly.

---

## 8. Seed course outlines (Phase 2)

PRD §9.3 asks for 2 full Explore courses, each with 2 missions × 3 lessons. Missions 1–2 below are the seed. Mission 3 is a skeleton to finish later. Contexts are Indian; reading level is about class 6.

### 8.1 Money Skills & Personal Finance, "Money Mint" (L1 step 1, Founders' Forge)

**Promise:** Budget, save, borrow safely and understand investing basics.
**Capstone:** run a virtual ₹10,000 month, then make a one-year savings plan with simulated investing.

**Mission 1: Where does money go?** Output: a one-week spend log, sorted into needs and wants.
| Lesson | Skill | Try (interactive) | Make |
|---|---|---|---|
| 1. Needs vs wants | needs-vs-wants | Drag-sort 12 items (school bus pass, new cricket bat, mobile recharge…) | Sort 10 of your own recent spends |
| 2. Your first budget | budgeting | Slider sim: split ₹500 pocket money across save / spend / share | A budget for next month's pocket money |
| 3. UPI, cash and tracking | tracking-spend | Match UPI history entries to categories | Start a one-week spend log |
| Boss | | **Budget Bazaar, "Festival week":** run a Diwali-week stall budget with 2 surprise events | |

**Mission 2: Saving and growing.** Output: a savings-goal plan with a date.
| Lesson | Skill | Try | Make |
|---|---|---|---|
| 1. Why save: goals and time | saving-goals | Scenario: three friends, three goals; who gets there first? | Choose a real goal, find its price and set a date |
| 2. Interest and compounding | compound-interest | Slider sim: piggy bank vs savings account vs RD over 5 years | Compare 3 options for your goal |
| 3. Risk and investing basics | risk-return | Pick a simulated mix (FD, gold, index fund); watch 3 years play out | Explain your mix in 3 lines |
| Boss | | **"Grow ₹1,000":** simulator with a surprise market dip; stay on plan | |

**Mission 3 (skeleton): Borrowing and staying safe.** Output: a scam-proof money checklist for your family.
Lessons: 1. Borrowing and the cost of interest (EMI, buy-now-pay-later); 2. UPI scams (collect requests, OTP, fake refunds); this links to Cyber Safety; 3. Smart shopping (discounts, unit price, "₹999 vs ₹1,000"). Boss: *Scam or real?* rapid scenarios.

**Skills (9):** needs-vs-wants, budgeting, tracking-spend, saving-goals, compound-interest, risk-return, borrowing-cost, scam-awareness, unit-price.
**Cross-track links:** budgeting applies_in Entrepreneurship (L2); scam-awareness related to Cyber Safety; compound-interest applies_in Math for the Future (L3).

### 8.2 Critical Thinking, Logic & Ethics (L1 step 2, Leaders' Peak)

**Promise:** Reason clearly, resist misinformation and make ethical choices.
**Capstone:** fact-check a viral claim and give a 3-minute "myth vs evidence" talk. The talk is an **audio** recording reviewed by staff (see §7).

**Mission 1: Spot the claim.** Output: a log of 5 forwards or headlines, each labelled fact, opinion or claim.
| Lesson | Skill | Try | Make |
|---|---|---|---|
| 1. Fact, opinion or claim? | fact-vs-opinion | Sort 12 statements (cricket, exams, food, weather) | Label 5 lines from today's news or family forwards (parent shares them) |
| 2. Who says so? Checking sources | source-checking | Rank 4 sources for one claim | Trace one claim back to where it started |
| 3. Why fake news spreads | misinformation | Spot the urgency and emotion tricks in 6 forwards | Rewrite a scary forward calmly and accurately |
| Boss | | **Decision Dojo, "The fest rumour":** a rumour spreads before the school fest; choose what to check and what to say | |

**Mission 2: Reason it out.** Output: an argument map for a question you care about.
| Lesson | Skill | Try | Make |
|---|---|---|---|
| 1. Reasons and conclusions | argument-structure | Drag reasons under the right conclusion | Map one argument: should our school ban phones? |
| 2. Thinking traps | fallacies | Match 8 examples to bandwagon, false cause, cherry-picking, attacking the person | Find one trap in an ad or a reel |
| 3. Chance and evidence | correlation-causation | Scenario: "Students who eat breakfast score higher." Why might that be? | Explain one "X causes Y" claim in 3 lines |
| Boss | | **"Spot the five traps":** a scripted debate with 5 hidden fallacies | |

**Mission 3 (skeleton): Choose well.** Output: a written decision with your reasoning.
Lessons: 1. Dilemmas: who is affected?; 2. Fairness and honesty (group-project credit, exam shortcuts); 3. Ethics online and with AI (sharing photos, AI homework). Boss: **Decision Dojo, "Team conflict"**.

**Skills (9):** fact-vs-opinion, source-checking, misinformation, argument-structure, fallacies, correlation-causation, stakeholders, fairness, digital-ethics.
**Cross-track links:** source-checking applies_in Scientific Thinking; correlation-causation applies_in Everyday Math & Data; digital-ethics related to Cyber Safety and AI Literacy.

Together these two courses give 18 of the 25 seed skills. The other 7 come from the first lessons of skeleton courses: one for each of the 6 other zones with a Level 1 course, plus *Learning How to Learn*. Launchpad has no Level 1 course, so it shows as "coming at Level 3".

---

## 9. PRD edits needed

| PRD section | Change |
|---|---|
| §1, §15 (marketing) | "Five zones" becomes nine; update the zone map and the "what you'll build" strip |
| §4.4 | Theme band stays tied to class; add `content_level` (§3) |
| §7.3 | Zone names: use the §2 table |
| §7.7 | Games unlock by `unlock_course_id` (§5) |
| §8 | Add choice slots, moving up early, the Bridge course and open play; add them to the unlock unit tests |
| §9.3 | Seed: Money Mint + Critical Thinking as specified in §8; skeleton course = first lesson of every remaining Level 1 course |
| §10.3 | Lesson editor: future step types `code_blocks`, `code_python`, `code_web`, `sql` (Phase 7) |
| §14 | `students.content_level`; `course_slots`; `courses.slot_id`; `courses.priority` (core/recommended/elective); `courses.cohort_variant` jsonb; `games.unlock_course_id` |
| §16 | Add Phase 7: interactive coding workspaces + Level 2/3 content |
| §19 | Add the [OWNER] questions below |

## 10. Owner decisions (defaults in brackets)

1. Nine zones instead of five, and their names. [Yes; names in §2]
2. Keep school-subject courses and pitch them as "school plus real life". [Yes]
3. Bridge course for students joining in class 9–12. [Yes, built from existing Level 1 lessons]
4. Level 1 order, Money Mint first. [As in §4.1]
5. Choice slots for Levels 2 and 3. [As in §4.2–4.3]
6. Board-exam lighter mode in class 10 and 12. [Yes, parent-controlled]
7. Launch scope. [Classes 6–8 first; waitlist for 9–12]
8. Solo defaults for classroom projects; school-cohort variants for school-code students. [Yes, as in §7]
9. Electronics hardware kit. [Simulator by default; kit as a later paid add-on]
10. Approved AI tools for Generative AI and ML. [Scripted sandbox until a lawyer clears specific tools]
