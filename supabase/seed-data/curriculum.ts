/**
 * The approved curriculum map (docs/curriculum-mapping.md, signed off
 * 2026-11-02), as seed data. Source: docs/curriculum/Cirriculum.xlsx.
 * The seed writes this to the database; after that, HQ is the source of truth.
 */

export type TrackSeed = {
  slug: string;
  name: string;
  zone: string;
  color: string;
};

export const TRACKS: TrackSeed[] = [
  { slug: "thinking", name: "Thinking & Personal Effectiveness", zone: "Leaders' Peak", color: "#7B14FF" },
  { slug: "digital", name: "Digital Foundations & Safety", zone: "Cyber Cove", color: "#38BDF8" },
  { slug: "coding", name: "Coding & Building", zone: "Code Canyon", color: "#FF8A3D" },
  { slug: "ai-data", name: "AI & Data", zone: "Bot Bay", color: "#1FD6A0" },
  { slug: "math", name: "Math & Logic", zone: "Puzzle Peaks", color: "#5B6CFF" },
  { slug: "business", name: "Business, Money & Leadership", zone: "Founders' Forge", color: "#FFD23F" },
  { slug: "science", name: "Science, Health & Sustainability", zone: "Discovery Delta", color: "#2BB673" },
  { slug: "creativity", name: "Creativity, Language & Society", zone: "Voice Valley", color: "#FF5C7A" },
  { slug: "career", name: "Career & Capstone", zone: "Launchpad", color: "#140B2B" },
];

export type SlotSeed = { key: string; level: 1 | 2 | 3; order: number; title: string };

export const SLOTS: SlotSeed[] = [
  { key: "A", level: 2, order: 6, title: "Make something" },
  { key: "B", level: 2, order: 10, title: "Understand the world" },
  { key: "C", level: 2, order: 11, title: "Sharpen your mind" },
  { key: "D", level: 3, order: 4, title: "Build" },
  { key: "E", level: 3, order: 5, title: "Go deeper" },
  { key: "F", level: 3, order: 7, title: "Prepare" },
];

export type CourseSeed = {
  slug: string;
  title: string;
  shortTitle?: string;
  track: string;
  level: 1 | 2 | 3;
  /** Fixed path position, or the slot it sits in. */
  order?: number;
  slot?: string;
  priority: "core" | "recommended" | "elective";
  promise: string;
  /** Solo capstone (mapping §7). */
  capstone: string;
  /** School-code version, where the curriculum project needs a class. */
  cohort?: string;
};

export const COURSES: CourseSeed[] = [
  // Level 1: Explore (classes 6–8), fixed path
  { slug: "money-skills", title: "Money Skills & Personal Finance", shortTitle: "Money Mint", track: "business", level: 1, order: 1, priority: "core", promise: "Budget, save, borrow safely and understand investing basics.", capstone: "Run a virtual ₹10,000 month and a one-year savings plan with simulated investing." },
  { slug: "critical-thinking", title: "Critical Thinking, Logic & Ethics", track: "thinking", level: 1, order: 2, priority: "core", promise: "Reason clearly, resist misinformation and make ethical choices.", capstone: "Fact-check a viral claim and record a 3-minute audio 'myth vs evidence' talk." },
  { slug: "learning-how-to-learn", title: "Learning How to Learn", track: "thinking", level: 1, order: 3, priority: "core", promise: "Learn the science of studying so every other course becomes easier.", capstone: "Two-week experiment: apply one technique to a real exam topic, compare scores before and after, and present the results." },
  { slug: "cyber-safety", title: "Cyber Safety & Digital Citizenship", track: "digital", level: 1, order: 4, priority: "core", promise: "Protect accounts, data and reputation; spot scams; use AI and social media wisely.", capstone: "'Scam Spotter' poster or short video (no face needed) teaching younger students to avoid one scam." },
  { slug: "communication", title: "Communication: Speaking, Listening & Storytelling", track: "thinking", level: 1, order: 5, priority: "core", promise: "Speak with confidence, listen well and tell stories that persuade.", capstone: "'Pitch Your Idea': a 3-minute audio talk, reviewer and self-rubric feedback, then a second improved attempt." },
  { slug: "everyday-math", title: "Everyday Math, Data & Probability Sense", track: "math", level: 1, order: 6, priority: "core", promise: "Use math to judge discounts, risk, charts and survey claims.", capstone: "Survey 8–10 family members or neighbours, analyse it, and present one honest and one misleading chart.", cohort: "Design and run a class survey, analyse it, and present one honest and one misleading chart." },
  { slug: "how-computers-work", title: "How Computers & the Internet Work", track: "digital", level: 1, order: 7, priority: "core", promise: "Understand what is inside your devices and how the internet works.", capstone: "'Follow a click': map every step from typing a URL to the page loading, plus a labelled home-network diagram." },
  { slug: "ai-literacy", title: "AI Literacy & Responsible AI Use", track: "ai-data", level: 1, order: 8, priority: "core", promise: "Understand how AI works, use it well and question it.", capstone: "Train a simple image classifier on a provided image set, test where it fails, and write an 'AI user manual' for classmates." },
  { slug: "block-coding", title: "Computational Thinking & Block Coding", track: "coding", level: 1, order: 9, priority: "core", promise: "Learn to think like a programmer using visual blocks.", capstone: "A playable game with score and levels, plus a 'how I debugged it' journal." },
  { slug: "scientific-thinking", title: "Scientific Thinking & Research Skills", track: "science", level: 1, order: 10, priority: "core", promise: "Learn how to ask questions, test ideas and use evidence.", capstone: "Mini research project on a daily-life question with a poster presentation." },
  { slug: "habits-wellbeing", title: "Habits, Well-Being & Resilience", track: "thinking", level: 1, order: 11, priority: "core", promise: "Build small habits, manage stress and look after your mind.", capstone: "21-day habit challenge with a tracked log and a reflection report." },
  { slug: "english-writing", title: "English Communication & Writing", track: "creativity", level: 1, order: 12, priority: "core", promise: "Write and speak clear, confident English for school and life.", capstone: "Portfolio: one email, one summary, one short story and one opinion piece." },
  { slug: "visual-design", title: "Visual Design & Creativity", track: "creativity", level: 1, order: 13, priority: "recommended", promise: "Make posters, logos and graphics that look professional.", capstone: "Design a brand kit (logo, colours, fonts) and three posts for a real or imagined project." },

  // Level 2: Build (classes 8–10)
  { slug: "entrepreneurship", title: "Entrepreneurship & Startup Basics", track: "business", level: 2, order: 1, priority: "recommended", promise: "Find a real problem and test a small business idea.", capstone: "Run an offline mini business with family and neighbours (≤ ₹500 stock, parent ack) and report profit and lessons.", cohort: "Run a stall at a class market day and report profit and lessons." },
  { slug: "spreadsheets", title: "Spreadsheets & Data Literacy", track: "ai-data", level: 2, order: 2, priority: "recommended", promise: "Clean, analyse and visualise data using spreadsheets.", capstone: "Dashboard on a topic you care about (sports, school, cricket stats, budget)." },
  { slug: "python-1", title: "Python Programming I", track: "coding", level: 2, order: 3, priority: "recommended", promise: "Your first real programming language, used in AI, data and automation.", capstone: "A text adventure, quiz app or expense tracker that saves to a file." },
  { slug: "design-thinking", title: "Design Thinking & Product/UX Basics", track: "business", level: 2, order: 4, priority: "recommended", promise: "Design products people actually want and can use.", capstone: "Design and test a clickable app prototype that solves a school or community problem." },
  { slug: "web-dev-1", title: "Web Development I: HTML & CSS", track: "coding", level: 2, order: 5, priority: "recommended", promise: "Build and publish your own responsive website.", capstone: "A personal portfolio website, published through Offbook's public portfolio (parent-enabled, first name only)." },
  { slug: "video-content", title: "Video, Audio & Content Creation", track: "creativity", level: 2, slot: "A", priority: "recommended", promise: "Plan, shoot, edit and publish videos, podcasts and music.", capstone: "Produce a 3–5 minute video or podcast episode for the Showcase wall (parent consent, staff approval, no face required)." },
  { slug: "electronics-robotics", title: "Electronics, Robotics & Making", track: "coding", level: 2, slot: "A", priority: "elective", promise: "Build circuits, sensors and simple robots with your own hands.", capstone: "A working circuit or smart-device prototype in the browser simulator, with a build log." },
  { slug: "game-design", title: "Game Design & Development Basics", track: "coding", level: 2, slot: "A", priority: "elective", promise: "Design and build your own simple game.", capstone: "A playable game on the Offbook showcase with a short design document." },
  { slug: "teamwork-leadership", title: "Teamwork, Leadership & Project Management", track: "business", level: 2, order: 7, priority: "recommended", promise: "Lead and work in teams, and deliver projects on time.", capstone: "Plan and deliver a family project (trip, event or room makeover) using a Kanban board and a retrospective.", cohort: "Plan and deliver a small team project using a Kanban board and a retrospective." },
  { slug: "economics", title: "Economics Foundations", track: "business", level: 2, order: 8, priority: "recommended", promise: "Understand how incentives, prices and markets shape the world.", capstone: "Play the market round in Startup Sprint and write an analysis of what happened.", cohort: "Run a classroom market game and write an analysis of what happened." },
  { slug: "marketing", title: "Marketing, Branding & Social Media", track: "business", level: 2, order: 9, priority: "recommended", promise: "Understand how products get noticed, and market ethically.", capstone: "Plan and run a 2-week content campaign for a school club or mini business." },
  { slug: "climate", title: "Climate, Energy & Sustainability", track: "science", level: 2, slot: "B", priority: "recommended", promise: "Understand climate change and design practical solutions.", capstone: "Home energy and water audit with three recommendations presented to your family.", cohort: "School sustainability audit with three recommendations presented to management." },
  { slug: "civics", title: "Civics, History & Global Awareness", track: "creativity", level: 2, slot: "B", priority: "recommended", promise: "Understand how societies, governments and the world are connected.", capstone: "Policy brief on a local issue.", cohort: "Model parliament on a school or community issue." },
  { slug: "human-body", title: "Human Body, Health & Nutrition", track: "science", level: 2, slot: "B", priority: "recommended", promise: "Know how your body works and how to keep it healthy.", capstone: "Personal health plan plus a first-aid demonstration for your family." },
  { slug: "mind-behaviour", title: "Understanding Mind & Behaviour", track: "science", level: 2, slot: "B", priority: "elective", promise: "Explore how memory, emotion, bias and habits shape behaviour.", capstone: "Run a simple memory or bias experiment with family (script and parent ack) and report findings." },
  { slug: "logical-math", title: "Logical Math & Problem Solving", track: "math", level: 2, slot: "C", priority: "recommended", promise: "Train the mind with patterns, puzzles and proof-style reasoning.", capstone: "Solve and explain 10 problems in a 'puzzle journal'." },
  { slug: "world-language", title: "World Language Starter (choose one)", track: "creativity", level: 2, slot: "C", priority: "elective", promise: "Start a new language: Spanish, French, German, Japanese, Korean or Mandarin.", capstone: "A 3-minute audio introduction and conversation in the chosen language." },

  // Level 3: Launch (classes 10–12)
  { slug: "generative-ai", title: "Generative AI, Prompting & Automation", track: "ai-data", level: 3, order: 1, priority: "recommended", promise: "Build useful AI assistants and automations with no-code and light code.", capstone: "Automate a real task (study planner, club announcements, FAQ bot) in the Offbook sandbox and document the workflow." },
  { slug: "python-2", title: "Python II: Data Structures & Problem Solving", track: "coding", level: 3, order: 2, priority: "recommended", promise: "Go deeper: organise data, write efficient code and structure bigger programs.", capstone: "Build a mini project (inventory system, maze solver or simple game) with tests." },
  { slug: "data-analysis", title: "Data Analysis & Visualisation with Python", track: "ai-data", level: 3, order: 3, priority: "recommended", promise: "Analyse real datasets with Python and present insights.", capstone: "A data-story notebook on a public dataset with three insights and a recommendation." },
  { slug: "web-dev-2", title: "Web Development II: JavaScript & Git", track: "coding", level: 3, slot: "D", priority: "recommended", promise: "Make websites interactive and collaborate with Git.", capstone: "An interactive web app hosted online, with a parent-created GitHub account or an exported repo." },
  { slug: "databases", title: "Databases & SQL Basics", track: "coding", level: 3, slot: "D", priority: "recommended", promise: "Store and query data the way real apps do.", capstone: "Create and query a database for a school library or sports league." },
  { slug: "mobile-app", title: "Build Your First Mobile App", track: "coding", level: 3, slot: "D", priority: "elective", promise: "Create an app that runs on a phone.", capstone: "A working app solving a school or community problem, tested offline with 5 family members or friends." },
  { slug: "machine-learning", title: "Machine Learning Basics (Hands-on)", track: "ai-data", level: 3, slot: "E", priority: "elective", promise: "Build simple models that learn from data.", capstone: "Build a model such as a spam detector or exam-score predictor and report its strengths and limits." },
  { slug: "math-future", title: "Math for the Future: Change, Vectors & Models", track: "math", level: 3, slot: "E", priority: "recommended", promise: "Visual intuition for calculus, vectors and mathematical modelling.", capstone: "Create and present a model such as projectile motion, population growth or a simple loan." },
  { slug: "frontier-science", title: "Frontier Science Lab (Concept Level)", track: "science", level: 3, slot: "E", priority: "elective", promise: "Explore space, quantum ideas, materials and chemistry through demos and stories.", capstone: "A science-communication video or poster on a frontier topic." },
  { slug: "career-portfolio", title: "Career Exploration, Portfolio & Interview Basics", track: "career", level: 3, order: 6, priority: "recommended", promise: "Discover careers, build a portfolio and prepare for first interviews.", capstone: "Portfolio and personal career plan reviewed by a mentor." },
  { slug: "academic-english", title: "English for Academic Writing & Global Exams", track: "creativity", level: 3, slot: "F", priority: "elective", promise: "Prepare for IELTS/TOEFL-style tests and academic writing.", capstone: "Timed practice test with a personal improvement plan." },
  { slug: "capstone", title: "Capstone: Build & Launch a Real Project", track: "career", level: 3, order: 8, priority: "core", promise: "Solve a real problem and present it at a showcase.", capstone: "Solo or family project presented at the monthly online showcase day, with a demo, one-page summary and reflection.", cohort: "Team project presented at a school showcase with a demo, one-page summary and reflection." },
];

/** Slot F also offers any Slot D course not yet taken; unlock logic handles that. */
export const SLOT_F_ALSO_FROM = "D";

/** Bridge for students placed straight into Level 2 or 3 (mapping §3). */
export const BRIDGE = {
  slug: "bridge",
  title: "Bridge: Offbook Essentials",
  track: "thinking",
  promise: "The Level 1 essentials, fast: stay safe online, handle money and learn how to learn.",
  fromCourses: [
    { course: "cyber-safety", missions: [1] },
    { course: "money-skills", missions: [1, 2] },
    { course: "learning-how-to-learn", missions: [1] },
  ],
};

export const GAMES = [
  { slug: "budget-bazaar", title: "Budget Bazaar", track: "business", unlocksAt: "money-skills" },
  { slug: "decision-dojo", title: "Decision Dojo", track: "thinking", unlocksAt: "critical-thinking" },
  { slug: "say-it-better", title: "Say It Better", track: "thinking", unlocksAt: "communication" },
  { slug: "bot-builder", title: "Bot Builder", track: "ai-data", unlocksAt: "ai-literacy" },
  { slug: "startup-sprint", title: "Startup Sprint", track: "business", unlocksAt: "entrepreneurship" },
];
