/**
 * Level 2 and 3 course skeletons (curriculum mapping §6, Phase 7): three
 * missions per course, each ending in a real output. Seeded as drafts, so
 * students never see empty missions; the content team fills them in HQ.
 */

export type MissionOutline = { title: string; output: string };

export const SKELETONS: Record<string, [MissionOutline, MissionOutline, MissionOutline]> = {
  // Level 2: Build
  entrepreneurship: [
    { title: "Find a problem worth solving", output: "Three customer interviews and a one-line problem statement" },
    { title: "Design a tiny offer", output: "A priced offer with costs worked out" },
    { title: "Sell your first ten", output: "A mini sales log and what you'd change" },
  ],
  spreadsheets: [
    { title: "Rows, columns and formulas", output: "A family budget sheet with totals" },
    { title: "Sort, filter and spot patterns", output: "A cleaned-up dataset with three findings" },
    { title: "Charts that tell the truth", output: "One honest chart and a short caption" },
  ],
  "python-1": [
    { title: "Your first programs", output: "A program that greets you and does a calculation" },
    { title: "Decisions and loops", output: "A quiz game with scoring" },
    { title: "Functions and lists", output: "A pocket-money tracker" },
  ],
  "design-thinking": [
    { title: "Empathise and define", output: "A user persona and problem statement" },
    { title: "Ideate and sketch", output: "Ten ideas and three paper sketches" },
    { title: "Prototype and test", output: "A clickable or paper prototype tested with two people" },
  ],
  "web-dev-1": [
    { title: "Your first web page", output: "A one-page profile in HTML" },
    { title: "Style with CSS", output: "A styled page with colours, fonts and layout" },
    { title: "Build a mini site", output: "A three-page site about something you love" },
  ],
  "video-content": [
    { title: "Plan a story", output: "A storyboard for a 60-second video" },
    { title: "Shoot and record", output: "Raw footage and clean audio" },
    { title: "Edit and publish safely", output: "A finished short video, shared with a parent's okay" },
  ],
  "electronics-robotics": [
    { title: "Circuits basics", output: "A simulated circuit that lights an LED" },
    { title: "Sensors and inputs", output: "A circuit that reacts to light or touch" },
    { title: "Build a smart device", output: "A working simulated gadget with a short demo" },
  ],
  "game-design": [
    { title: "What makes games fun", output: "A one-page game design idea" },
    { title: "Rules, levels and balance", output: "A paper prototype playtested by a friend" },
    { title: "Build a playable level", output: "A small playable game with a design document" },
  ],
  "teamwork-leadership": [
    { title: "Working in a team", output: "A team charter with roles" },
    { title: "Planning a project", output: "A simple project plan with milestones" },
    { title: "Leading and reflecting", output: "A finished team project and a retrospective" },
  ],
  economics: [
    { title: "Choices and trade-offs", output: "A trade-off diary for one week" },
    { title: "Prices and markets", output: "A supply-and-demand explainer from a real example" },
    { title: "Money and the economy", output: "A short analysis of a news story about prices" },
  ],
  marketing: [
    { title: "Know your audience", output: "An audience profile for a real product" },
    { title: "Build a brand", output: "A name, logo idea and voice for a small brand" },
    { title: "Plan a campaign", output: "A one-week campaign plan with honest messaging" },
  ],
  climate: [
    { title: "How the climate works", output: "A diagram explaining the greenhouse effect" },
    { title: "Energy around us", output: "A home energy audit" },
    { title: "Make a difference", output: "A sustainability action plan for home or school" },
  ],
  civics: [
    { title: "How we are governed", output: "A map of who decides what in your city" },
    { title: "Stories from history", output: "A short timeline of a turning point" },
    { title: "Global citizen", output: "A fact-checked explainer on a global issue" },
  ],
  "human-body": [
    { title: "How your body works", output: "A labelled systems poster" },
    { title: "Food and energy", output: "A balanced meal plan for a week" },
    { title: "Healthy habits", output: "A 2-week habit tracker and reflection" },
  ],
  "mind-behaviour": [
    { title: "How we think", output: "A list of thinking traps spotted in daily life" },
    { title: "Emotions and choices", output: "An emotions journal for a week" },
    { title: "Habits and motivation", output: "A small behaviour-change experiment" },
  ],
  "logical-math": [
    { title: "Patterns and puzzles", output: "A set of solved logic puzzles with explanations" },
    { title: "Numbers in real life", output: "A real-life estimation challenge" },
    { title: "Problem-solving strategies", output: "Your own puzzle, with a solution guide" },
  ],
  "world-language": [
    { title: "Hello and everyday words", output: "A 1-minute self-introduction recording (kept private)" },
    { title: "Getting around", output: "A role-play script for shopping or travel" },
    { title: "Culture and conversation", output: "A short culture fact file" },
  ],
  // Level 3: Launch
  "generative-ai": [
    { title: "How generative AI works", output: "An explainer of what AI can and can't do" },
    { title: "Prompting well", output: "A prompt playbook tested in Offbook's sandbox" },
    { title: "Automate a real task", output: "A small automation with notes on checking its output" },
  ],
  "python-2": [
    { title: "Data structures", output: "A contacts organiser using dictionaries" },
    { title: "Problem solving and algorithms", output: "Three solved coding challenges" },
    { title: "Build a bigger program", output: "A tested mini project" },
  ],
  "data-analysis": [
    { title: "Data and questions", output: "A clear question and a cleaned dataset" },
    { title: "Analyse with Python", output: "A notebook-style analysis with findings" },
    { title: "Visualise and present", output: "Two honest charts and a short report" },
  ],
  "web-dev-2": [
    { title: "JavaScript basics", output: "An interactive page that responds to clicks" },
    { title: "Working with data", output: "A to-do list that saves in the browser" },
    { title: "Version control with Git", output: "A project with a clear commit history" },
  ],
  databases: [
    { title: "Asking questions of data", output: "SELECT queries that answer real questions" },
    { title: "Designing tables", output: "A small database design for a school club" },
    { title: "Joining and summarising", output: "A report built from joined tables" },
  ],
  "mobile-app": [
    { title: "Plan your app", output: "Screens sketched for one useful app" },
    { title: "Build the screens", output: "A working prototype with two screens" },
    { title: "Test and improve", output: "A tested app with fixes from user feedback" },
  ],
  "machine-learning": [
    { title: "How machines learn", output: "A trained classifier in a browser tool" },
    { title: "Data and bias", output: "A bias check of your model's training data" },
    { title: "Evaluate a model", output: "An accuracy report with limitations" },
  ],
  "math-future": [
    { title: "Change and rates", output: "A model of change from real data" },
    { title: "Vectors and movement", output: "A vector diagram of a real motion" },
    { title: "Models of the world", output: "A simple model with predictions and checks" },
  ],
  "frontier-science": [
    { title: "Big ideas in science", output: "A one-page explainer on a frontier topic" },
    { title: "How scientists know", output: "A critique of a science news story" },
    { title: "Your research question", output: "A mini research proposal" },
  ],
  "career-portfolio": [
    { title: "Explore careers", output: "Three career profiles from real interviews or research" },
    { title: "Build your portfolio", output: "A portfolio page with your best Offbook work" },
    { title: "Interview practice", output: "A mock interview with self-feedback" },
  ],
  "academic-english": [
    { title: "Reading like a scholar", output: "Annotated summaries of two articles" },
    { title: "Writing an argument", output: "A structured argumentative essay" },
    { title: "Exam strategies", output: "A timed practice task with a review" },
  ],
  capstone: [
    { title: "Choose and plan your project", output: "A project brief with goals and milestones" },
    { title: "Build it", output: "A working version, shared for feedback" },
    { title: "Launch and reflect", output: "A launched project and a presentation" },
  ],
};
