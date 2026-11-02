import type { Faq } from "@/components/marketing/blocks";

// Marketing copy. Answers must stay honest: no guaranteed outcomes (PRD §2.3).

export const HOME_FAQ: Faq[] = [
  {
    q: "Will this distract from board exams?",
    a: "It's designed not to. Sessions are about 15 minutes, and parents can switch on a lighter weekly goal in exam years. Skills like learning how to learn and managing stress tend to help with school, not compete with it.",
  },
  {
    q: "Is it safe for my child?",
    a: "There is no chat, no messaging between students, no ads and no third-party trackers. Children use a first name or nickname only, never an email, surname or photo. Nothing your child makes is shown publicly unless you agree and our team approves it.",
  },
  {
    q: "What if we don't like it?",
    a: "Ask for a full refund from the Billing page within the refund window, no questions asked. We never charge you again automatically; we remind you before the year ends and you decide.",
  },
  {
    q: "Does my child need a phone or laptop?",
    a: "Any phone, tablet or computer with a browser works. You sign in once on the device, and your child opens their profile with a 4-digit PIN.",
  },
  {
    q: "Which classes is it for?",
    a: "Classes 6 to 12. The look and the lessons change with age: brighter and more playful for younger students, sharper and more project-focused for older ones.",
  },
];

export const FULL_FAQ: Faq[] = [
  ...HOME_FAQ,
  {
    q: "What does my child actually learn?",
    a: "Real-world skills in nine zones: thinking and personal effectiveness, digital safety, coding, AI and data, math and logic, business and money, science and health, creativity and language, and career skills. Each course ends in a real project.",
  },
  {
    q: "Why can't my child open every course at once?",
    a: "Courses unlock one at a time so students finish what they start. Every course is visible on the map from day one, so the whole road ahead is clear.",
  },
  {
    q: "How do I see progress?",
    a: "The Parent Zone shows lessons done, skills mastered and streaks. You also get a short weekly summary with a question to ask your child about.",
  },
  {
    q: "We were given a school code. Where do we use it?",
    a: "Enter it at checkout. It links your child to their school's program and applies any school price.",
  },
  {
    q: "Can I have more than one child on one account?",
    a: "Yes. Add each child in the Parent Zone. Each child has their own profile, PIN and yearly plan.",
  },
  {
    q: "Is there live teaching?",
    a: "Lessons are self-paced. There are monthly mentor sessions online, using a meeting link we share with you.",
  },
];
