import type { BotConfig } from "../../lib/games/bot-builder";
import type { SayConfig } from "../../lib/games/say-it-better";
import type { SprintConfig } from "../../lib/games/startup-sprint";

/** Default content for the Phase 6 games (PRD §7.7). Editable in HQ → Content → Games. */

export const SAY_IT_BETTER: SayConfig = {
  roundsPerRun: 6,
  winPct: 70,
  rubric: ["I started with the main point", "I gave one reason or example", "I spoke at a calm, clear pace", "I ended with what I'd like to happen"],
  speak: [
    { level: 1, prompt: "In 30 seconds, tell a friend why they should try your favourite book or game." },
    { level: 2, prompt: "In 30 seconds, ask your class teacher for an extra day on a project, giving one good reason." },
    { level: 3, prompt: "In 30 seconds, pitch one change that would make your school canteen better." },
  ],
  rounds: [
    {
      id: "late-bus", level: 1, goal: "clearer", situation: "Telling your parent you'll be home late.",
      options: [
        { text: "Practice ran over. I'll take the 5:30 bus and be home by 6:15.", points: 2, why: "Says what happened, what you'll do and when. Nothing to guess." },
        { text: "So basically practice was kind of long and then there was this other thing after, so I don't really know when I'll be back, maybe late, I'll see how it goes.", points: 0, why: "Lots of words, but no time or plan: your parent still can't stop worrying." },
        { text: "I'll be late today, sorry.", points: 1, why: "Honest, but how late? A time helps." },
      ],
    },
    {
      id: "group-chat", level: 1, goal: "kinder", situation: "A classmate's drawing is shared in the group chat and people are laughing.",
      options: [
        { text: "lol 😂", points: 0, why: "Joining in makes it worse for them." },
        { text: "Guys, let's not. I actually like the colours she used.", points: 2, why: "Calm, stops the pile-on and says something genuinely kind." },
        { text: "Stop being mean!!!", points: 1, why: "Right idea, but shouting can start a fight instead of ending one." },
      ],
    },
    {
      id: "borrow-book", level: 1, goal: "persuasive", situation: "Asking your sibling to lend you their book.",
      options: [
        { text: "Give me your book.", points: 0, why: "A demand, not a request. People dig in when told." },
        { text: "Can I borrow your book till Sunday? I'll keep it in my bag so it doesn't get bent.", points: 2, why: "Polite, has a time limit and answers their worry before they say it." },
        { text: "Please please please can I have your book?", points: 1, why: "Polite-ish, but no reason or promise to make it easy to say yes." },
      ],
    },
    {
      id: "homework-q", level: 1, goal: "clearer", situation: "Messaging your teacher about homework.",
      options: [
        { text: "Ma'am, sorry to disturb you so late in the evening, I just wanted to ask about the homework because I didn't really get it, if you have time.", points: 1, why: "Polite, but after all that, which part didn't you get?" },
        { text: "Good evening ma'am, for maths Q4, should we show the working or just the answer? (Riya, 7B)", points: 2, why: "Specific question, says who you are. Easy to answer in one line." },
        { text: "what is hw", points: 0, why: "Too short to be clear, and a bit rude for a teacher." },
      ],
    },
    {
      id: "friend-sad", level: 1, goal: "kinder", situation: "Your friend didn't make the football team.",
      options: [
        { text: "Honestly it's just football, there are way bigger things in life, and you'll forget about it in a week anyway, so don't be sad about it at all.", points: 0, why: "Shrinks their feelings. They cared about it, and telling someone not to be sad rarely helps." },
        { text: "That's rough, I know you trained hard. Want to practise together for next season?", points: 2, why: "Names the feeling, credits their effort, offers help." },
        { text: "Oh no. Anyway, did you see the match?", points: 1, why: "Notices, but moves on too fast." },
      ],
    },
    {
      id: "project-idea", level: 1, goal: "persuasive", situation: "Convincing your group to pick your project idea.",
      options: [
        { text: "My idea is best, trust me.", points: 0, why: "No reason given, so nothing to agree with." },
        { text: "Let's do the water-saving survey: we can collect data at home this weekend, and it fits the rubric's 'real data' point.", points: 2, why: "Gives reasons the group cares about: it's doable and it scores well." },
        { text: "I really really want to do mine.", points: 1, why: "Honest, but it's about you, not the group." },
      ],
    },
    {
      id: "apology", level: 2, goal: "kinder", situation: "You forgot your friend's birthday.",
      options: [
        { text: "Sorry I forgot your birthday. That wasn't fair to you. Can I take you for ice cream Saturday?", points: 2, why: "Owns the mistake, no excuses, offers to make it right." },
        { text: "Sorry, but honestly I had so much going on with exams and tuition and everything, you know how it is, so it just slipped my mind completely.", points: 0, why: "The 'but' and the list of excuses cancel the sorry." },
        { text: "Belated happy birthday!", points: 1, why: "Friendly, but skips the apology." },
      ],
    },
    {
      id: "instructions", level: 2, goal: "clearer", situation: "Explaining to your grandmother how to video call.",
      options: [
        { text: "Okay so first you open the app, the one that does the calls, and then you kind of look around for the camera thing and press it, it's really easy once you find it.", points: 0, why: "Long, but 'the camera thing' and 'look around' don't tell her where to tap." },
        { text: "Tap the green phone icon, then my name, then the camera picture at the top right.", points: 2, why: "Short steps, in order, with what each thing looks like." },
        { text: "It's easy, you'll figure it out.", points: 1, why: "Encouraging, but no help." },
      ],
    },
    {
      id: "canteen", level: 2, goal: "persuasive", situation: "Asking the principal for a fruit stall in the canteen.",
      options: [
        { text: "Everyone wants fruit. Please do it.", points: 1, why: "Polite, but 'everyone' isn't evidence." },
        { text: "62 of 80 students in our survey said they'd buy fruit at break. A two-week trial stall would show if it works.", points: 2, why: "Real numbers and a small, low-risk first step." },
        { text: "The canteen food is honestly bad, nobody likes it, everyone complains every single day, and it would be so much better if you changed all of it as soon as possible, please.", points: 0, why: "Complaining puts people on the defensive, and 'change all of it' is a big, vague ask." },
      ],
    },
    {
      id: "feedback", level: 2, goal: "kinder", situation: "Giving feedback on a friend's speech practice.",
      options: [
        { text: "It was boring.", points: 0, why: "Hurts and doesn't help them improve." },
        { text: "Your opening story was great! The middle felt long. Maybe cut one example?", points: 2, why: "Starts with a real strength, then one specific, fixable idea." },
        { text: "It was fine.", points: 1, why: "Kind, but gives them nothing to work with." },
      ],
    },
    {
      id: "notice", level: 2, goal: "clearer", situation: "Writing a notice for the class science club.",
      options: [
        { text: "Science club Friday 3:15, Lab 2. Bring a used bottle for the rocket build. All classes welcome.", points: 2, why: "What, when, where, what to bring, who. All in one line." },
        { text: "Hi everyone! Science club is coming up soon and it's going to be really fun and exciting, so please keep an eye out because more details will be shared later on!", points: 0, why: "Friendly, but no time or place: people can't come." },
        { text: "Science club on Friday in the lab, it'll be fun!", points: 1, why: "Close, but which lab and what time?" },
      ],
    },
    {
      id: "screen-time", level: 2, goal: "persuasive", situation: "Asking your parents for 30 more minutes of game time on weekends.",
      options: [
        { text: "All my friends get more time than me!", points: 0, why: "Comparing rarely persuades parents." },
        { text: "If I finish homework by Saturday noon, could I have 30 extra minutes? You can check my planner.", points: 2, why: "Offers a fair deal and a way to check it." },
        { text: "Can I please have more time?", points: 1, why: "Polite, but there's no reason to say yes." },
      ],
    },
    {
      id: "email-intern", level: 3, goal: "clearer", situation: "Emailing a local bakery to ask about a school interview.",
      options: [
        { text: "Hi, I'm a class 11 student doing a business project. Could I ask you 5 questions for 15 minutes next week? My teacher, Mr Iyer, is copied.", points: 2, why: "Who you are, what you want, how long, and a trusted adult included." },
        { text: "Hi can u help me with my project pls", points: 0, why: "Unclear ask and too casual for a stranger." },
        { text: "Hello, I'd like to interview you for a project.", points: 1, why: "Polite, but when, how long, and who you are?" },
      ],
    },
    {
      id: "disagree", level: 3, goal: "kinder", situation: "Disagreeing with a teammate's plan in a meeting.",
      options: [
        { text: "That won't work.", points: 0, why: "Shuts the idea down without a reason." },
        { text: "I like that it's quick. My worry is cost. What if we tried it with one class first?", points: 2, why: "Finds the good, names one concern, suggests a way forward." },
        { text: "Hmm, I mean, I'm not totally sure about it, maybe it could work, or maybe not, I don't know, it's hard to say. What does everyone else think about it?", points: 1, why: "Gentle, but your actual concern never comes out." },
      ],
    },
    {
      id: "pitch", level: 3, goal: "persuasive", situation: "Opening line of your pitch for a phone-free study hour.",
      options: [
        { text: "Phones are bad for you and everyone knows it, so I think we should just ban them from school completely, because nobody can concentrate with them around anyway.", points: 0, why: "Sounds preachy and loses half the room before you've made your case." },
        { text: "Last week our class lost 40 minutes a day to notifications. One phone-free hour could win that back.", points: 2, why: "A concrete problem and a small, clear fix." },
        { text: "I want to talk about phones today.", points: 1, why: "Clear topic, but no reason to care yet." },
      ],
    },
    {
      id: "summary", level: 3, goal: "clearer", situation: "Summing up your group's survey for the class.",
      options: [
        { text: "So basically we asked a lot of people a lot of stuff, and there were lots of different answers, and it was really interesting, and we learned a lot about breakfast.", points: 0, why: "Lots of words, but not one finding the class can remember." },
        { text: "Most students (7 in 10) skip breakfast on school days, mainly because of time. Quick options could help.", points: 2, why: "The key number, the main reason, and what it means." },
        { text: "We found many students skip breakfast.", points: 1, why: "A finding, but how many and why?" },
      ],
    },
    {
      id: "refuse", level: 3, goal: "kinder", situation: "Saying no to a friend who wants to copy your homework.",
      options: [
        { text: "No way, do your own work.", points: 1, why: "Fair, but harsher than it needs to be." },
        { text: "I can't share it, but I can explain Q3 at break. It clicked for me after the second example.", points: 2, why: "Keeps your line, and still helps your friend learn." },
        { text: "Fine, here, but don't tell anyone.", points: 0, why: "Kind in the moment, but bad for both of you." },
      ],
    },
    {
      id: "fundraiser", level: 3, goal: "persuasive", situation: "Poster line for a class fundraiser for the animal shelter.",
      options: [
        { text: "₹50 feeds a shelter dog for a week. Bake sale, Friday break, Gate 2.", points: 2, why: "Shows exactly what money does, plus when and where." },
        { text: "Please come and donate whatever you can, because it's for a really, really good cause and every little bit helps a lot. Thank you so much in advance!", points: 1, why: "Warm, but what's the cause, and when and where is the sale?" },
        { text: "Buy our stuff.", points: 0, why: "No reason to care." },
      ],
    },
  ],
};

export const BOT_BUILDER: BotConfig = {
  levels: [
    {
      level: 1, title: "Spam spotter", task: "Teach the bot to spot spam messages.", labels: ["Normal", "Spam"],
      trainCount: 8, testCount: 6, winAccuracy: 66,
      items: [
        { text: "You won a free phone click this link now to claim your prize", label: 1 },
        { text: "Congratulations winner claim your free gift card today", label: 1 },
        { text: "Urgent your account is blocked click link to unlock free", label: 1 },
        { text: "Earn money fast from home click now free offer", label: 1 },
        { text: "Free recharge offer claim now limited prize winner", label: 1 },
        { text: "Last chance win cash prize click the link free", label: 1 },
        { text: "Claim your lottery prize now send your bank details", label: 1 },
        { text: "Can you send me the maths homework for tomorrow", label: 0 },
        { text: "Mum says dinner is ready come downstairs", label: 0 },
        { text: "Practice is moved to four tomorrow at the school ground", label: 0 },
        { text: "Happy birthday hope you have a great day", label: 0 },
        { text: "Did you finish the science project slides yet", label: 0 },
        { text: "See you at the bus stop tomorrow morning", label: 0 },
        { text: "Thanks for helping me with the homework today", label: 0 },
      ],
      prompts: [
        {
          goal: "Get the bot to explain photosynthesis for a class 6 student.",
          options: [
            { prompt: "photosynthesis", response: "Photosynthesis is the process by which chlorophyll-containing organisms convert light energy into chemical energy via the Calvin cycle…", points: 0, why: "One word gives the bot no idea who it's for, so the answer is too hard." },
            { prompt: "Explain photosynthesis to a class 6 student in 3 short sentences with one everyday example.", response: "Plants make their own food using sunlight, water and air. Leaves catch sunlight like tiny solar panels. That's why a plant on a sunny window grows faster!", points: 2, why: "Says who it's for, how long, and asks for an example." },
            { prompt: "Tell me about plants and sunlight.", response: "Plants need sunlight. There are many kinds of plants, like trees, flowers and grasses…", points: 1, why: "Closer, but the bot wandered off topic." },
          ],
        },
      ],
    },
    {
      level: 2, title: "Kindness checker", task: "Teach the bot to flag unkind comments before they're posted.", labels: ["Kind", "Unkind"],
      trainCount: 12, testCount: 6, winAccuracy: 66,
      items: [
        { text: "Great job on your drawing the colours look amazing", label: 0 },
        { text: "Thanks for helping me today you are awesome", label: 0 },
        { text: "Nice try you will do better next time keep going", label: 0 },
        { text: "Love your idea let us work on it together", label: 0 },
        { text: "Well done on the match you played really well", label: 0 },
        { text: "Your speech was great I liked the story", label: 0 },
        { text: "Good luck in your exam you will do great", label: 0 },
        { text: "Keep going your project looks really great", label: 0 },
        { text: "Your drawing is ugly and stupid nobody likes it", label: 1 },
        { text: "You are so stupid you always lose", label: 1 },
        { text: "Nobody wants you on the team go away", label: 1 },
        { text: "That idea is dumb and so are you", label: 1 },
        { text: "You played terrible you are useless", label: 1 },
        { text: "Your speech was boring and stupid", label: 1 },
        { text: "Go away nobody likes your ugly face", label: 1 },
        { text: "You are useless at everything just quit", label: 1 },
        { text: "Thanks so much you are a great friend", label: 0 },
        { text: "Really well done I love how hard you tried", label: 0 },
        { text: "You are a stupid loser and everyone knows it", label: 1 },
        { text: "Ugly boring useless just go away", label: 1 },
      ],
      prompts: [
        {
          goal: "Get the bot to suggest a kinder way to say \"Your essay is bad.\"",
          options: [
            { prompt: "Rewrite: Your essay is bad.", response: "Your essay is poor.", points: 0, why: "The bot did exactly what you asked, which was just to rewrite. Say what you want." },
            { prompt: "Rewrite \"Your essay is bad\" as kind, specific feedback a classmate would find helpful, in one sentence.", response: "Your opening grabbed me! Adding one example in the middle would make your point even stronger.", points: 2, why: "Says the goal (kind and helpful), the audience and the length." },
            { prompt: "Make it nicer.", response: "Your essay is not very good.", points: 1, why: "\"Nicer\" is vague, so the bot only softened it a little." },
          ],
        },
        {
          goal: "Check the bot's facts.",
          options: [
            { prompt: "Is it true? Just say yes or no.", response: "Yes.", points: 0, why: "Bots can be confidently wrong. A yes/no gives you nothing to check." },
            { prompt: "Give the answer and the source you used, and say if you're not sure.", response: "I believe the Great Wall is about 21,000 km long, according to a 2012 survey. I'm fairly confident, but check a trusted source.", points: 2, why: "Asking for sources and uncertainty helps you verify, because AI can make things up." },
            { prompt: "Are you sure?", response: "Yes, I'm sure.", points: 1, why: "Asking again rarely helps; ask for sources instead." },
          ],
        },
      ],
    },
    {
      level: 3, title: "Review sorter", task: "Teach the bot to sort shop reviews into happy and unhappy customers.", labels: ["Happy", "Unhappy"],
      trainCount: 12, testCount: 8, winAccuracy: 70,
      items: [
        { text: "Loved the samosas fresh and hot will come again", label: 0 },
        { text: "Friendly staff and quick service great value", label: 0 },
        { text: "Best chai in town always fresh and tasty", label: 0 },
        { text: "Great taste good price clean place", label: 0 },
        { text: "Quick delivery food was hot and tasty loved it", label: 0 },
        { text: "Staff were friendly and helpful great experience", label: 0 },
        { text: "Tasty food fair price will order again", label: 0 },
        { text: "Fresh bread every morning love this bakery", label: 0 },
        { text: "Clean shop great service tasty snacks", label: 0 },
        { text: "Great chai friendly staff fair price", label: 0 },
        { text: "Waited forty minutes and the food was cold", label: 1 },
        { text: "Rude staff and overpriced never again", label: 1 },
        { text: "Food was stale and the place was dirty", label: 1 },
        { text: "Delivery was late and the order was wrong", label: 1 },
        { text: "Too expensive and the tea was cold", label: 1 },
        { text: "Dirty tables slow service very disappointed", label: 1 },
        { text: "Wrong order cold food and rude reply", label: 1 },
        { text: "Overpriced stale snacks not worth it", label: 1 },
        { text: "Slow delivery and cold food again disappointed", label: 1 },
        { text: "Never again rude and dirty shop", label: 1 },
      ],
      prompts: [
        {
          goal: "Get the bot to summarise 50 reviews for the shop owner.",
          options: [
            { prompt: "Summarise these reviews.", response: "The reviews talk about food, service and prices.", points: 1, why: "True but useless: say what the owner needs to know." },
            { prompt: "Summarise these reviews for the shop owner: the top 2 things customers love, the top 2 complaints, and one fix to try first.", response: "Loved: fresh chai and friendly staff. Complaints: slow delivery and cold food. Try first: a warming bag for deliveries.", points: 2, why: "Clear audience, clear structure, and asks for a next step." },
            { prompt: "Are the reviews good?", response: "Some are good and some are bad.", points: 0, why: "A vague question gets a vague answer." },
          ],
        },
      ],
    },
  ],
};

export const STARTUP_SPRINT: SprintConfig = {
  levels: [
    { level: 1, title: "First stall", weeks: 4, startCash: 500, goalProfit: 3200, interviewPicks: 2 },
    { level: 2, title: "Growing up", weeks: 5, startCash: 800, goalProfit: 4300, interviewPicks: 3 },
    { level: 3, title: "Real business", weeks: 6, startCash: 1000, goalProfit: 5300, interviewPicks: 3 },
  ],
  channels: [
    { id: "posters", label: "Posters at school", cost: 80, reach: 0.5, note: "Cheap, seen by students." },
    { id: "whatsapp", label: "Family WhatsApp groups (with a parent)", cost: 0, reach: 0.35, note: "Free, reaches parents and neighbours." },
    { id: "stall", label: "Stall at the society gate", cost: 150, reach: 0.7, note: "Meet buyers face to face." },
    { id: "flyers", label: "Flyers in the local market", cost: 200, reach: 0.6, note: "Reaches shoppers and adults." },
  ],
  problems: [
    {
      id: "bookmarks", title: "Kids lose their place in books", customer: "Students in classes 4–8", product: "Handmade magnetic bookmarks",
      unitCost: 12, idealPrice: 40, marketSize: 60, bestChannel: "posters",
      questions: [
        { q: "When did you last lose your page? What did you do?", good: true, insight: "Most fold pages, and hate it when library books get marked." },
        { q: "Which designs do you like: cartoons or plain?", good: true, insight: "Cartoon and cricket designs were most popular." },
        { q: "What do you use as a bookmark now?", good: true, insight: "Mostly receipts and pencils. Nobody had a real bookmark." },
        { q: "Wouldn't you love a cool bookmark?", good: false, insight: "Everyone said yes, but that's a leading question, so it tells you little." },
        { q: "Would you pay ₹200 for one?", good: false, insight: "Asking about a future price gets polite guesses, not real behaviour." },
        { q: "Do you like reading?", good: false, insight: "Nice to know, but it doesn't reveal the problem." },
      ],
    },
    {
      id: "plants", title: "Busy families forget to water plants", customer: "Families in your housing society", product: "Self-watering bottle planters",
      unitCost: 35, idealPrice: 120, marketSize: 30, bestChannel: "whatsapp",
      questions: [
        { q: "Tell me about the last plant that died at home. What happened?", good: true, insight: "Most died during family trips or exam weeks." },
        { q: "How do you remember to water plants now?", good: true, insight: "Nobody had a system; it was whoever noticed." },
        { q: "Where do you usually buy pots and plants?", good: true, insight: "The weekend nursery and neighbours' cuttings." },
        { q: "Don't you think plants make homes nicer?", good: false, insight: "Leading: of course they agreed." },
        { q: "Would you buy my planter?", good: false, insight: "People say yes to be kind. It doesn't predict buying." },
        { q: "What's your favourite colour?", good: false, insight: "Fun, but doesn't help you understand the problem." },
      ],
    },
    {
      id: "snacks", title: "Students are hungry after evening tuition", customer: "Tuition students aged 12–16", product: "Healthy snack packs",
      unitCost: 18, idealPrice: 45, marketSize: 50, bestChannel: "stall",
      questions: [
        { q: "What did you eat after tuition yesterday?", good: true, insight: "Mostly chips from the corner shop, or nothing at all." },
        { q: "How much do you usually spend on snacks in a week?", good: true, insight: "Around ₹100–150, mostly on chips and soft drinks." },
        { q: "What makes a snack worth buying for you?", good: true, insight: "Filling, cheap and quick. Healthy was a bonus, not the reason." },
        { q: "Healthy snacks are better, right?", good: false, insight: "Leading: they agreed, then bought chips anyway." },
        { q: "Would you buy healthy snacks every day?", good: false, insight: "Future promises are unreliable." },
        { q: "Is tuition hard?", good: false, insight: "Off topic for this problem." },
      ],
    },
    {
      id: "tutoring", title: "Younger kids struggle with English reading", customer: "Parents of class 2–4 children", product: "Weekend reading club (1 hour)",
      unitCost: 10, idealPrice: 100, marketSize: 20, bestChannel: "whatsapp",
      questions: [
        { q: "What does reading time look like at home right now?", good: true, insight: "Busy evenings: most kids read alone, if at all." },
        { q: "What have you tried to help with reading?", good: true, insight: "Apps and workbooks, which kids got bored of fast." },
        { q: "When would a weekend activity fit your family?", good: true, insight: "Saturday mornings were easiest for most parents." },
        { q: "Reading is important, isn't it?", good: false, insight: "Leading: everyone agrees, it tells you nothing new." },
        { q: "Would you pay ₹500 a session?", good: false, insight: "Hypothetical prices get polite or random answers." },
        { q: "Do your kids watch cartoons?", good: false, insight: "Doesn't reveal the reading problem." },
      ],
    },
  ],
};
