import type { BudgetConfig } from "../../lib/games/budget-bazaar";
import type { DojoConfig } from "../../lib/games/decision-dojo";

/**
 * Default game content (PRD §7.7). Stored in games.config, editable in HQ
 * (Content → Games). The seed only writes a config when none exists yet.
 */

export const BUDGET_BAZAAR: BudgetConfig = {
  levels: [
    { level: 1, title: "Pocket money month", weeks: 4, startCash: 100, income: 250, needs: 120, goal: 200, minJoy: 30, interestPct: 0, riskyOption: false },
    { level: 2, title: "Saving for something big", weeks: 5, startCash: 150, income: 300, needs: 140, goal: 450, minJoy: 30, interestPct: 1, riskyOption: false },
    { level: 3, title: "Grow your money", weeks: 6, startCash: 200, income: 350, needs: 160, goal: 800, minJoy: 30, interestPct: 1, riskyOption: true },
  ],
  events: [
    {
      id: "birthday",
      text: "Your friend's birthday is this weekend.",
      choices: [
        { label: "₹250 gift from the mall", cash: -250, joy: 12, tag: "costly", why: "Generous, but it ate most of your week." },
        { label: "₹80 gift and a handmade card", cash: -80, joy: 14, tag: "smart", why: "Thoughtful and affordable. Friends remember the card." },
        { label: "Skip the party", cash: 0, joy: -12, tag: "ok", why: "Saved money, but missing friends has a cost too." },
      ],
    },
    {
      id: "rain",
      text: "Monsoon rain! Your umbrella breaks on the way to school.",
      choices: [
        { label: "Buy a sturdy ₹150 umbrella", cash: -150, joy: 2, tag: "smart", why: "A need, and a sturdy one lasts the season." },
        { label: "Buy the ₹60 one that might break again", cash: -60, joy: 0, tag: "ok", why: "Cheaper now, but you may pay twice." },
        { label: "Get wet for a week", cash: 0, joy: -15, tag: "costly", why: "Skipping real needs costs you in other ways." },
      ],
    },
    {
      id: "sale",
      text: "Headphones on sale: ₹499, down from ₹999. \"Only today!\"",
      choices: [
        { label: "Buy them now", cash: -499, joy: 10, tag: "costly", why: "\"Only today\" is a trick to rush you." },
        { label: "Wait a week and see if you still want them", cash: 0, joy: -2, tag: "smart", why: "Waiting turns rushed wants into real choices." },
      ],
    },
    {
      id: "chores",
      text: "A neighbour offers ₹100 to help water plants while they're away.",
      choices: [
        { label: "Say yes (with a parent's okay)", cash: 100, joy: 4, tag: "smart", why: "Earning a little is the other half of budgeting." },
        { label: "Say no, it's holidays", cash: 0, joy: 2, tag: "ok", why: "Rest matters too. No harm done." },
      ],
    },
    {
      id: "snacks",
      text: "Everyone is getting chaat after school, every day this week.",
      choices: [
        { label: "Join every day (₹40 × 5)", cash: -200, joy: 10, tag: "costly", why: "Small daily spends add up to big ones." },
        { label: "Join twice (₹80)", cash: -80, joy: 8, tag: "smart", why: "Still fun with friends, at less than half the cost." },
        { label: "Bring snacks from home", cash: 0, joy: 3, tag: "ok", why: "Cheap and fine, if a little less fun." },
      ],
    },
    {
      id: "recharge",
      text: "Your phone data runs out. Online class is tomorrow.",
      choices: [
        { label: "₹299 big pack", cash: -299, joy: 4, tag: "costly", why: "More data than you need." },
        { label: "₹149 pack that lasts the month", cash: -149, joy: 2, tag: "smart", why: "Matches what you actually use." },
      ],
    },
    {
      id: "lost",
      text: "You find ₹50 on the school stairs.",
      choices: [
        { label: "Hand it to the office", cash: 0, joy: 8, tag: "smart", why: "Someone is looking for it. Honesty feels good." },
        { label: "Keep it", cash: 50, joy: -6, tag: "costly", why: "It's not yours, and it's hard to enjoy." },
      ],
    },
    {
      id: "fest",
      text: "The school fest has game stalls this week.",
      choices: [
        { label: "Play everything (₹200)", cash: -200, joy: 14, tag: "costly", why: "Fun, but it blew the week's plan." },
        { label: "Pick your two favourites (₹60)", cash: -60, joy: 10, tag: "smart", why: "Planned fun is still fun." },
        { label: "Just watch", cash: 0, joy: -4, tag: "ok", why: "Saved money, missed a little joy." },
      ],
    },
    {
      id: "book",
      text: "Your class needs a ₹120 workbook by Monday.",
      choices: [
        { label: "Buy it new", cash: -120, joy: 0, tag: "smart", why: "It's a need for class. Pay needs first." },
        { label: "Buy a used copy from a senior for ₹50", cash: -50, joy: 2, tag: "smart", why: "Same book, less money. Great find." },
      ],
    },
    {
      id: "scam",
      text: "A message says you won ₹5,000! Just pay ₹200 to \"unlock\" it.",
      choices: [
        { label: "Pay the ₹200", cash: -200, joy: -10, tag: "costly", why: "Real prizes never ask you to pay first. That's a scam." },
        { label: "Ignore it and tell a parent", cash: 0, joy: 4, tag: "smart", why: "Spotted the scam. Paying to receive money is always a red flag." },
      ],
    },
  ],
};

export const DECISION_DOJO: DojoConfig = {
  scenarios: [
    {
      id: "fest-rumour",
      level: 1,
      title: "The fest rumour",
      intro: "Two days before the school fest, a message spreads in your class group: \"Fest cancelled because of a fight!\"",
      start: "message",
      winAt: 4,
      nodes: {
        message: {
          text: "Your friends are panicking and some are already returning stall money. What do you do first?",
          options: [
            { label: "Forward it to everyone, just in case", next: "spread", points: -2, skill: "misinformation", debrief: "Forwarding an unchecked message makes the rumour bigger." },
            { label: "Ask who first sent it and where they heard it", next: "source", points: 2, skill: "source-checking", debrief: "Checking the source is the first move with any claim." },
            { label: "Ignore it", next: "ignore", points: 0, skill: "fact-vs-opinion", debrief: "Not spreading it is good, but your friends are still confused." },
          ],
        },
        source: {
          text: "It started with a senior who \"heard it from someone\". No teacher has said anything.",
          options: [
            { label: "Check the school notice board and ask the class teacher", next: "teacher", points: 2, skill: "source-checking", debrief: "Going to the official source settles it." },
            { label: "Decide it must be true, so many people are saying it", next: "spread", points: -1, skill: "misinformation", debrief: "Lots of people repeating something doesn't make it true." },
          ],
        },
        ignore: {
          text: "The next morning, half the stalls have pulled out. Your stall partner is upset.",
          options: [
            { label: "Ask the class teacher what's really happening", next: "teacher", points: 2, skill: "source-checking", debrief: "Better late than never: you went to the source." },
            { label: "Pull out too", next: "end-cancelled", points: -1, skill: "misinformation", debrief: "Acting on a rumour can make it come true." },
          ],
        },
        spread: {
          text: "The rumour is everywhere now. The principal hears about it and is not happy.",
          options: [
            { label: "Post a correction once you know the facts", next: "teacher", points: 1, skill: "digital-ethics", debrief: "Fixing your mistake publicly takes courage." },
            { label: "Stay quiet and hope it blows over", next: "end-cancelled", points: -1, skill: "digital-ethics", debrief: "Rumours rarely fix themselves." },
          ],
        },
        teacher: {
          text: "The teacher says the fest is ON. There was a small argument, already sorted. How do you share this?",
          options: [
            { label: "Post the teacher's message in the group, calmly", next: "end-saved", points: 2, skill: "misinformation", debrief: "A calm, sourced correction is the best fix for a rumour." },
            { label: "Mock the people who believed the rumour", next: "end-awkward", points: -1, skill: "fairness", debrief: "Being right doesn't need making others feel small." },
          ],
        },
      },
      endings: {
        "end-saved": { title: "Fest saved", text: "Stalls come back, the fest is a hit, and people now ask you before forwarding things." },
        "end-awkward": { title: "Fest on, feelings hurt", text: "The fest happens, but some classmates feel embarrassed. Facts plus kindness works better." },
        "end-cancelled": { title: "Stalls lost", text: "The fest goes ahead with half the stalls. The rumour cost everyone something." },
      },
    },
    {
      id: "team-conflict",
      level: 2,
      title: "Team conflict",
      intro: "Your science project team has a week left. Arjun hasn't done his part, and Diya wants to remove him from the group.",
      start: "start",
      winAt: 4,
      nodes: {
        start: {
          text: "Diya says, \"He's just lazy. Let's tell the teacher and drop him.\" What do you do?",
          options: [
            { label: "Agree and drop him", next: "dropped", points: -1, skill: "fairness", debrief: "You decided without hearing his side." },
            { label: "Talk to Arjun first to find out what's going on", next: "talk", points: 2, skill: "stakeholders", debrief: "Hearing every side before deciding is fair." },
            { label: "Do his part yourself and say nothing", next: "overload", points: 0, skill: "stakeholders", debrief: "It gets done, but the real problem stays hidden." },
          ],
        },
        talk: {
          text: "Arjun admits he's been helping at his family's shop every evening and is embarrassed to say so.",
          options: [
            { label: "Swap tasks so his part can be done on Sunday", next: "plan", points: 2, skill: "stakeholders", debrief: "You changed the plan to fit everyone's real situation." },
            { label: "Tell the group he has an excuse, so it's fine to skip", next: "overload", points: 0, skill: "fairness", debrief: "Kind, but the work still has to be shared fairly." },
          ],
        },
        overload: {
          text: "You're up late three nights in a row and start to resent the whole team.",
          options: [
            { label: "Call a quick team meeting to re-split the work", next: "plan", points: 1, skill: "argument-structure", debrief: "Naming the problem early saves friendships." },
            { label: "Push through alone", next: "end-tired", points: -1, skill: "stakeholders", debrief: "Doing everything alone isn't leadership." },
          ],
        },
        dropped: {
          text: "Arjun is hurt and the teacher asks why nobody spoke to him first.",
          options: [
            { label: "Apologise and invite him back with a smaller task", next: "plan", points: 1, skill: "fairness", debrief: "Owning a mistake and repairing it counts." },
            { label: "Say it was Diya's idea", next: "end-blame", points: -2, skill: "fairness", debrief: "Blaming others doesn't fix the team." },
          ],
        },
        plan: {
          text: "The new plan works. On presentation day, the teacher asks who did what.",
          options: [
            { label: "Give honest credit to everyone, including Arjun's Sunday work", next: "end-team", points: 2, skill: "fairness", debrief: "Fair credit builds trust for next time." },
            { label: "Mention mostly your own work", next: "end-meh", points: -1, skill: "fairness", debrief: "Taking extra credit chips away at team trust." },
          ],
        },
      },
      endings: {
        "end-team": { title: "Strong team", text: "The project scores well and Arjun thanks you. People want you on their team next time." },
        "end-meh": { title: "Done, but awkward", text: "The project is fine, but the team feels uneven about credit." },
        "end-tired": { title: "Burnt out", text: "You finish, exhausted. Asking for help would have been smarter." },
        "end-blame": { title: "Team split", text: "The group falls apart. A quick conversation at the start would have changed everything." },
      },
    },
    {
      id: "miracle-claim",
      level: 3,
      title: "The miracle drink",
      intro: "A video in the family group says a new \"brain drink\" raises exam marks by 30% in a week. Your aunt wants to buy a month's supply for ₹1,500.",
      start: "start",
      winAt: 4,
      nodes: {
        start: {
          text: "Everyone in the group is excited. What do you notice first?",
          options: [
            { label: "It's from a company that sells the drink", next: "seller", points: 2, skill: "source-checking", debrief: "Who's making the claim, and what they gain, matters." },
            { label: "Lots of likes, so it must work", next: "likes", points: -1, skill: "misinformation", debrief: "Likes measure popularity, not truth." },
            { label: "The marks went up for one student in the video", next: "one", points: 1, skill: "correlation-causation", debrief: "One story isn't evidence for everyone." },
          ],
        },
        seller: {
          text: "The video shows a student whose marks rose after drinking it.",
          options: [
            { label: "Ask what else changed: maybe they also studied more", next: "cause", points: 2, skill: "correlation-causation", debrief: "Two things happening together doesn't mean one caused the other." },
            { label: "That proves it works", next: "likes", points: -1, skill: "correlation-causation", debrief: "One before-and-after isn't proof." },
          ],
        },
        one: {
          text: "Your aunt says, \"But it worked for him!\"",
          options: [
            { label: "Ask if there's a fair test with many students", next: "cause", points: 2, skill: "correlation-causation", debrief: "Fair tests compare groups, not single stories." },
            { label: "Agree, one success is enough", next: "likes", points: -1, skill: "correlation-causation", debrief: "One success can be luck or other causes." },
          ],
        },
        likes: {
          text: "Your aunt is about to pay. What now?",
          options: [
            { label: "Suggest checking with a doctor or a trusted source first", next: "cause", points: 1, skill: "source-checking", debrief: "Pausing to check is never wasted." },
            { label: "Let her buy it", next: "end-wasted", points: -1, skill: "misinformation", debrief: "Unchecked claims can cost money." },
          ],
        },
        cause: {
          text: "You find no fair tests, only the company's own videos. How do you tell your aunt?",
          options: [
            { label: "Explain kindly what you found and suggest sleep, practice and breaks instead", next: "end-smart", points: 2, skill: "argument-structure", debrief: "Clear reasons plus a better option persuades best." },
            { label: "Tell her she's being silly", next: "end-argue", points: -1, skill: "fairness", debrief: "Being right rudely rarely changes minds." },
          ],
        },
      },
      endings: {
        "end-smart": { title: "Money saved, minds changed", text: "Your aunt thanks you and asks you to check the next viral claim too." },
        "end-argue": { title: "Right, but nobody listened", text: "You were right about the evidence, but the argument left everyone annoyed." },
        "end-wasted": { title: "₹1,500 gone", text: "The drink arrives. Marks don't change. Checking first would have saved the money." },
      },
    },
  ],
};

/** Demo real-world challenges (PRD §7.9). Matched by title when seeding. */
export const CHALLENGES = [
  {
    title: "Plan a family grocery run",
    type: "real_world" as const,
    track: "business",
    requiredCourse: "money-skills",
    xp: 200,
    brief:
      "With a parent, plan one week's grocery shopping on a budget you agree together. List what you need, estimate prices, and compare two shops or apps. After the shop, write what you spent against the plan and one thing you'd change next time.",
    rubric: [
      "Lists needs separately from wants",
      "Sets a budget and estimates prices before shopping",
      "Compares at least two options",
      "Compares the plan with what was actually spent",
      "Says one clear thing to change next time",
    ],
    safety_note:
      "Do this with a parent or guardian. Don't go to shops alone, and don't share your address, phone number or photos of your family online while doing this challenge.",
  },
  {
    title: "Fact-check a forward",
    type: "challenge_week" as const,
    track: "thinking",
    requiredCourse: "critical-thinking",
    xp: 150,
    brief:
      "Find a message, post or video that's been forwarded in a family or class group. Check it like a detective: who made the claim, what evidence there is, and what trusted sources say. Write up your verdict (true, false or unclear) with at least two sources.",
    rubric: [
      "States the claim clearly",
      "Identifies who made it and what they gain",
      "Uses at least two independent, trusted sources",
      "Gives a verdict that follows from the evidence",
    ],
    safety_note:
      "Don't reply to or contact the person who sent the message, and don't click unknown links. Ask a parent before searching online. Remove names and phone numbers from anything you paste in.",
  },
];
