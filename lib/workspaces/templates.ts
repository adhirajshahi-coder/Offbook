import type { BlocksContent, CodeStepType, PythonContent, SqlContent, WebContent } from "./schemas";

/** Starting content for each coding step type in the HQ lesson editor (and the seed). */
export const CODE_TEMPLATES: { code_blocks: BlocksContent; code_python: PythonContent; code_web: WebContent; sql: SqlContent } = {
  code_blocks: {
    label: "Code",
    prompt: "Guide Kube to the star. Drag blocks into a stack, then press Run.",
    grid: ["S..#", ".#..", "...G"],
    maxBlocks: null,
    allowRepeat: true,
    hints: ["Kube starts facing right. Which way does it need to go first?", "Try: turn right, move forward twice, turn left, then move forward three times."],
    explanation: "You wrote an algorithm: exact steps, in order, that a computer can follow.",
  },
  code_python: {
    label: "Code",
    prompt: "Finish the function so it returns the total of two prices.",
    starter: "def total(a, b):\n    # your code here\n    pass\n\nprint(total(40, 25))\n",
    checks: [
      { label: "total(40, 25) gives 65", code: "assert total(40, 25) == 65" },
      { label: "It works for other numbers too", code: "assert total(0, 9) == 9 and total(100, 1) == 101" },
    ],
    hints: ["Use the return keyword.", "return a + b"],
    explanation: "A function takes inputs, does a job and returns an answer you can reuse.",
  },
  code_web: {
    label: "Code",
    prompt: "Make a mini profile card: a heading with your first name and a paragraph about one hobby. Make the heading violet.",
    html: "<h1>Your name</h1>\n<p>One thing I love doing is...</p>\n",
    css: "h1 {\n  color: black;\n}\n",
    js: "",
    tabs: ["html", "css"],
    checks: [
      { label: "There's a heading", selector: "h1" },
      { label: "There's a paragraph", selector: "p" },
      { label: "The heading is violet (#7B14FF)", selector: "h1", style: { property: "color", value: "rgb(123, 20, 255)" } },
    ],
    hints: ["Change the colour value in the CSS tab.", "color: #7B14FF;"],
    explanation: "HTML says what's on the page; CSS says how it looks.",
  },
  sql: {
    label: "Code",
    prompt: "List the names of students who scored more than 80.",
    schema:
      "CREATE TABLE scores (name TEXT, subject TEXT, score INTEGER);\nINSERT INTO scores VALUES ('Asha','Maths',92),('Ravi','Maths',74),('Meera','Maths',85),('Kabir','Maths',68);",
    starter: "SELECT name FROM scores\n",
    expected: [["Asha"], ["Meera"]],
    ordered: false,
    hints: ["Add a WHERE clause.", "WHERE score > 80"],
    explanation: "WHERE filters rows, so you only get the ones you asked for.",
  },
};

export function codeTemplate(type: CodeStepType) {
  return structuredClone(CODE_TEMPLATES[type]);
}
