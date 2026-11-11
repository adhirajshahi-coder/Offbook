import type { BlocksContent, PythonContent, SqlContent, WebContent } from "../../../lib/workspaces/schemas";
import type { Card } from "../lesson-types";

/**
 * Phase 7 starter lessons: one complete lesson per coding course that shows
 * its workspace in action (Mission 1, Lesson 1). Everything else in these
 * courses is a draft skeleton for the content team.
 */

type CodeStepSeed =
  | { type: "code_blocks"; content: BlocksContent }
  | { type: "code_python"; content: PythonContent }
  | { type: "code_web"; content: WebContent }
  | { type: "sql"; content: SqlContent };

export type StarterLesson = {
  courseSlug: string;
  mission: { title: string; output: string };
  skills: { slug: string; name: string; description: string }[];
  lesson: { title: string; summary: string; estMinutes: number; deck: Card[]; code: CodeStepSeed[]; reflect: string };
};

const blocks = (prompt: string, grid: string[], extra: Partial<BlocksContent> = {}): CodeStepSeed => ({
  type: "code_blocks",
  content: { label: "Code", prompt, grid, maxBlocks: null, allowRepeat: true, hints: [], explanation: "", ...extra },
});

export const CODING_STARTERS: StarterLesson[] = [
  {
    courseSlug: "block-coding",
    mission: { title: "Think like a computer", output: "Three solved maze puzzles and your own maze idea" },
    skills: [{ slug: "algorithms", name: "Algorithms", description: "Break a task into clear steps a computer can follow." }],
    lesson: {
      title: "Algorithms: step by step",
      summary: "Give Kube exact instructions to reach the star, then use loops to say more with less.",
      estMinutes: 10,
      deck: [
        { title: "Computers follow instructions exactly", body: "A computer does exactly what you say, in order. Not what you meant. That's why the steps matter.", visual: "list" },
        { title: "An algorithm is a recipe", body: "An algorithm is a list of clear steps that solves a problem, like a recipe or directions to a friend's house.", visual: "target" },
        { title: "Loops save effort", body: "If you need to do the same thing five times, a repeat block says it once. Programmers call that a loop.", visual: "arrows" },
      ],
      code: [
        blocks("Get Kube to the star. Kube starts facing right.", ["S..G"], {
          hints: ["How many squares away is the star?", "Three move forward blocks will do it."],
          explanation: "Three steps in a row: your first algorithm.",
          allowRepeat: false,
        }),
        blocks("Now there's a turn. Get Kube to the star.", ["S.#", "#.#", "#.G"], {
          hints: ["Kube needs to go right, then down, then right.", "move forward, turn right, move forward twice, turn left, move forward."],
          explanation: "Turns change direction without moving. Order matters!",
        }),
        blocks("A long corridor! Reach the star using no more than 4 blocks.", ["S......G"], {
          maxBlocks: 4,
          hints: ["Moving forward seven times takes seven blocks. Is there a shorter way?", "Use one repeat block set to 7, with a move forward inside."],
          explanation: "One loop replaced seven blocks. Shorter programs are easier to read and fix.",
        }),
      ],
      reflect: "Where in real life do you follow an algorithm without thinking about it?",
    },
  },
  {
    courseSlug: "python-1",
    mission: { title: "Your first programs", output: "A program that greets you and does a calculation" },
    skills: [{ slug: "python-basics", name: "Python basics", description: "Write small Python programs with print, variables and functions." }],
    lesson: {
      title: "Hello, Python",
      summary: "Print messages, store values in variables and write your first function.",
      estMinutes: 12,
      deck: [
        { title: "print shows things on screen", body: "print(\"Hi!\") makes the computer show Hi!. Text goes inside quotes.", visual: "chat" },
        { title: "Variables are labelled boxes", body: "price = 40 stores 40 in a box called price. You can use price later instead of the number.", visual: "wallet" },
        { title: "Functions are reusable recipes", body: "def total(a, b): makes a recipe called total. return sends the answer back.", visual: "lightbulb" },
      ],
      code: [
        {
          type: "code_python",
          content: {
            label: "Code",
            prompt: "Make the program print: Hello, Offbook!",
            starter: "# Change the message inside the quotes\nprint(\"Hello\")\n",
            checks: [{ label: "It prints Hello, Offbook!", outputIncludes: "Hello, Offbook!" }],
            hints: ["The text inside the quotes is what gets printed.", "print(\"Hello, Offbook!\")"],
            explanation: "print shows a message. Every program you'll ever write starts small like this.",
          },
        },
        {
          type: "code_python",
          content: {
            label: "Code",
            prompt: "Finish the function so it returns the total of two prices.",
            starter: "def total(a, b):\n    # your code here\n    pass\n\nprint(total(40, 25))\n",
            checks: [
              { label: "total(40, 25) gives 65", code: "assert total(40, 25) == 65" },
              { label: "It works for other numbers too", code: "assert total(0, 9) == 9 and total(100, 1) == 101" },
            ],
            hints: ["Replace pass with a line that starts with return.", "return a + b"],
            explanation: "A function takes inputs, does a job and returns an answer you can reuse anywhere.",
          },
        },
      ],
      reflect: "What would you like to build with Python one day?",
    },
  },
  {
    courseSlug: "web-dev-1",
    mission: { title: "Your first web page", output: "A one-page profile in HTML" },
    skills: [{ slug: "html-css", name: "HTML and CSS", description: "Structure a page with HTML and style it with CSS." }],
    lesson: {
      title: "Build a profile card",
      summary: "Use HTML to put words on a page and CSS to make them look good.",
      estMinutes: 12,
      deck: [
        { title: "HTML is the skeleton", body: "HTML tags like <h1> and <p> tell the browser what each part of the page is: a heading, a paragraph.", visual: "list" },
        { title: "CSS is the style", body: "CSS says how things look: colours, sizes, spacing. h1 { color: violet; } colours every heading.", visual: "lightbulb" },
        { title: "Keep it safe", body: "Use your first name only on pages you make. No phone numbers, addresses or photos of people.", visual: "shield" },
      ],
      code: [
        {
          type: "code_web",
          content: {
            label: "Code",
            prompt: "Make a mini profile card: a heading with your first name and a paragraph about one hobby. Make the heading violet (#7B14FF).",
            html: "<h1>Your name</h1>\n<p>One thing I love doing is...</p>\n",
            css: "h1 {\n  color: black;\n}\n",
            js: "",
            tabs: ["html", "css"],
            checks: [
              { label: "There's a heading", selector: "h1" },
              { label: "There's a paragraph about a hobby", selector: "p" },
              { label: "The heading is violet (#7B14FF)", selector: "h1", style: { property: "color", value: "rgb(123, 20, 255)" } },
            ],
            hints: ["Open the CSS tab and change the colour.", "color: #7B14FF;"],
            explanation: "HTML says what's on the page; CSS says how it looks. Every website works this way.",
          },
        },
      ],
      reflect: "Which website do you use most, and what one thing would you change about how it looks?",
    },
  },
  {
    courseSlug: "databases",
    mission: { title: "Asking questions of data", output: "SELECT queries that answer real questions" },
    skills: [{ slug: "sql-queries", name: "SQL queries", description: "Ask questions of a database with SELECT, WHERE and ORDER BY." }],
    lesson: {
      title: "SELECT and WHERE",
      summary: "Pull exactly the rows you need out of a table.",
      estMinutes: 12,
      deck: [
        { title: "Data lives in tables", body: "A table is like a spreadsheet: rows are records, columns are details like name or score.", visual: "list" },
        { title: "SELECT picks columns", body: "SELECT name FROM scores asks for the name column from the scores table.", visual: "magnifier" },
        { title: "WHERE picks rows", body: "WHERE score > 80 keeps only rows that match. You can combine conditions with AND.", visual: "target" },
      ],
      code: [
        {
          type: "sql",
          content: {
            label: "Code",
            prompt: "List the names of students who scored more than 80.",
            schema:
              "CREATE TABLE scores (name TEXT, subject TEXT, score INTEGER);\nINSERT INTO scores VALUES ('Asha','Maths',92),('Ravi','Maths',74),('Meera','Maths',85),('Kabir','Maths',68);",
            starter: "SELECT name FROM scores\n",
            expected: [["Asha"], ["Meera"]],
            ordered: false,
            hints: ["Add a WHERE clause after FROM scores.", "WHERE score > 80"],
            explanation: "WHERE filters rows, so you only get the ones you asked for.",
          },
        },
        {
          type: "sql",
          content: {
            label: "Code",
            prompt: "Show each student's name and score, highest score first.",
            schema:
              "CREATE TABLE scores (name TEXT, subject TEXT, score INTEGER);\nINSERT INTO scores VALUES ('Asha','Maths',92),('Ravi','Maths',74),('Meera','Maths',85),('Kabir','Maths',68);",
            starter: "SELECT name, score FROM scores\n",
            expected: [["Asha", 92], ["Meera", 85], ["Ravi", 74], ["Kabir", 68]],
            ordered: true,
            hints: ["ORDER BY sorts rows.", "ORDER BY score DESC"],
            explanation: "ORDER BY ... DESC sorts from biggest to smallest. Leaderboards work like this.",
          },
        },
      ],
      reflect: "What question would you love to ask a database about your school or city?",
    },
  },
];
