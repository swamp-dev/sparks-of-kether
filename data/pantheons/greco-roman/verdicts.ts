import type { Rng } from '@/engine/rng';
import type { EncounterAvatarKey, ZodiacSignKey } from '../../types';
import type { ChallengeOutcome, PlayerResponseMatrix, VerdictMatrix } from '../types';

/**
 * Greco-Roman per-Sefirah avatar verdict matrix and pre-roll
 * player-response matrix. Source: `design/avatars.md` § 7. Each cell
 * holds 3 variants — the pantheon-aware pickers
 * (`pickVerdict` / `pickPlayerResponse`) take one of these matrices
 * as a parameter and select a variant via the engine's seedable Rng.
 *
 * Keyed on `EncounterAvatarKey` — the 8 challenge avatars (Hermes
 * through Selene). Kether (collective Final Threshold, #285) and
 * Malkuth (Hestia is companion-only, different matrix shape) are
 * excluded by construction.
 *
 * Voice and content are locked in the design doc; this file is the
 * runtime representation, not the source of truth. If a line needs
 * revision, edit the design doc first and mirror the change here.
 */

// Re-export the matrix types for callers that read this file directly
// (tests and the engine helper) — the canonical home is `pantheons/types.ts`.
export type { ChallengeOutcome, VerdictMatrix, PlayerResponseMatrix };

// ──────────────── Hermes (Hod) ────────────────

const hermes = {
  aries: {
    pass: [
      "You charged the answer like a ram and trampled the riddle clean. I'll allow it.",
      "You leapt the gap before I'd finished asking. Crossing first, thinking second — works for you.",
      "Quick. You hit the answer before the question landed properly. That's a way of being right.",
    ],
    fail: [
      "You ran past the question, hot blood and all, and called speed an answer. It wasn't.",
      'You crossed the threshold before reading the inscription on it. There was an inscription. You missed it.',
      'Speed without aim is just direction. The arrow went where you faced, not where the target was.',
    ],
  },
  taurus: {
    pass: [
      "You wouldn't be hurried into the wrong answer. Slow horns get there too. Crossed.",
      'You sat with the question until it told you what it wanted. Most run from that long a sit. The answer waited.',
      "Stubborn isn't a vice when you're stubborn about the right thing. Today you were. The road yields slowly here.",
    ],
    fail: [
      "You stayed with the wrong word too long because it was yours. The bull doesn't yield. Neither does the answer.",
      "You held the answer like land you owned. The land doesn't change because you stand on it. The answer stayed wrong.",
      "You chewed the wrong word into bone. Long enough doesn't make it right — just chewed.",
    ],
  },
  gemini: {
    pass: [
      'Of course. You speak my language and I speak yours. The puzzle barely had time to be one.',
      "You finished the riddle in your own voice. I let you. We're cousins; that's how it works.",
      "You played the question back to me before I'd asked it. Fast game. We both won.",
    ],
    fail: [
      "Both of you knew the answer. The argument between you cost the moment. Even I can't help that.",
      'Your two tongues spoke past each other. The right word was on neither. Pick one next time.',
      'Two voices. One question. You needed agreement. You got debate.',
    ],
  },
  cancer: {
    pass: [
      'You answered sideways and the side was the right one. The crab knows. We crossed.',
      'You felt the answer before you said it, and the feeling was right. Hard to teach. You had it.',
      'Sideways works. The riddle had a side entrance. You found it before I pointed at it. Crossed.',
    ],
    fail: [
      "You felt the answer and didn't trust it. The shell closed around the wrong word.",
      "You guarded the answer from yourself. Why? It would have come through if you'd let it. Door stayed closed.",
      'You wanted the answer to be safe. The safe answer was wrong. The right one would have stung. You skipped the sting.',
    ],
  },
  leo: {
    pass: [
      'You announced the answer like a king arriving. Loud, but right. The throne keeps it.',
      "You delivered the answer with a flourish. I'd be annoyed if it weren't correct. It was. Trade complete.",
      'You assumed you were right and you were. Most can only do one of those. You did both. Crowned.',
    ],
    fail: [
      'You played the part of someone who knew. Excellent acting. Wrong play.',
      "You stood center stage and named the answer with conviction. The audience clapped. The riddle didn't.",
      "Confidence is a costume. A fine one, today. Underneath, you didn't know. Neither did the answer.",
    ],
  },
  virgo: {
    pass: [
      "Of course. You parsed the comma I hid in the question. We're related, you and I.",
      "You found the footnote I left in italics. Then the footnote on the footnote. Don't gloat — I taught you that.",
      'Three readings. Three layers. You caught all three. Of course you did.',
    ],
    fail: [
      'You found the right answer and discarded it for being too obvious. You overthought yourself out of it.',
      'You asked the question seven ways and stopped trusting the first answer. The first one was right.',
      'Precision is your gift. Today it was your cage. The simple answer stood there waiting.',
    ],
  },
  libra: {
    pass: [
      'You weighed the words and chose the lighter one. Elegant. The scale and I both nod.',
      'You found the answer that fit both sides of the scale. Most pick a side and lose the other. You held both.',
      "Elegance isn't a virtue I usually credit. Today, with you, it was the answer. Crossed gracefully.",
    ],
    fail: [
      'You wanted the answer to be fair to everyone. It only had to be fair to itself.',
      'You held both possibilities up to the light too long. The light moved. The answer with it.',
      "You waited for the scale to settle. It doesn't, with riddles. The answer demanded a tilt.",
    ],
  },
  scorpio: {
    pass: [
      'You knew the secret answer and the surface one. You gave me the right one. We agree.',
      'You read what was under the question and answered what was under your tongue. Both right. Underground crossing.',
      "You saw the trick. You didn't say so. You just answered correctly. That's the deal.",
    ],
    fail: [
      "You held the right word in your teeth and bit something else. You don't trust easy passages. I walk hard ones too.",
      'You kept the answer to yourself instead of giving it to me. Both of us lost it. Even I need partners.',
      "You suspected the easy answer of being a trap. It wasn't. Sometimes the road is straight.",
    ],
  },
  sagittarius: {
    pass: [
      "You shot past the riddle and hit the truth behind it. Not how I'd have gotten there, but you got there.",
      'Your aim was bigger than the target and you hit it anyway. The arrow knew something. Crossed by the long way.',
      "You looked at the riddle and saw what it was about, not what it asked. That worked. Most don't.",
    ],
    fail: [
      'You aimed at a bigger answer than the question asked for and missed both. Try smaller.',
      'You overshot. The truth was small. The arrow flew past it into philosophy. Come back to the line.',
      'Great archers know the target before they nock. You were already shooting. The target moved.',
    ],
  },
  capricorn: {
    pass: [
      'You climbed to the answer like a goat up a cliff. Slow, deliberate, correct. The road yielded.',
      'You drew the structure of the question and walked through it. Slow. Right. The road took your time.',
      'Patience is a method. You used it. Cliff and answer both held.',
    ],
    fail: [
      "You built the wrong staircase very carefully. The answer wasn't at the top.",
      'You drafted the road. The road went somewhere. The answer was somewhere else. Both were excellent destinations. Neither was here.',
      "You scaffolded the answer to perfection. The answer wasn't load-bearing here. Different structure needed.",
    ],
  },
  aquarius: {
    pass: [
      "You answered from an angle I didn't see coming. The riddle bends. Pass — the strange way.",
      'You re-asked my question into a better one and answered that. Risky. Worked. Strange crossing.',
      'The riddle had four sides. You found the fifth. We crossed sideways.',
    ],
    fail: [
      'You answered the question we should have asked instead of the one I did. Beautiful. Wrong.',
      'Your answer was correct. The question was different. Both elegant, neither matched.',
      'You re-derived the riddle into a new system. The system is fine. The riddle was the riddle.',
    ],
  },
  pisces: {
    pass: [
      'You let the words come through you like a tide and caught the meaning under them. Strange. Crossed anyway.',
      "You knew before you knew. The word arrived after the meaning, like a translator catching up. I'll take it.",
      "You arrived at the answer the long way and the long way was right. I'd argue with the route — but it landed. I'll allow it.",
    ],
    fail: [
      "My tongue dissolves in your waters. You meant something true and said something else. We've both lost.",
      'You drifted past the question and mistook the drift for an answer. The current took both of us.',
      "Words turn to water in your mouth. The meaning was there. The crossing wasn't.",
    ],
  },
} as const;

const hermesPlayer = {
  aries: [
    "Just say what you mean, messenger. I don't have time for your circles.",
    'Skip the riddle, Hermes. Tell me where to charge.',
    "You want clever; I want fast. Meet me halfway and we'll both win.",
  ],
  taurus: [
    'Slow down, messenger. Words deserve to be tasted, not swallowed.',
    "Don't rush me, Hermes. The good answers come in slowly, like wine.",
    "I'll get there. Don't take the question back before I've held it.",
  ],
  gemini: [
    'Cousin. Should I ask you the question, or will you ask me?',
    "Hermes. Tell me — between the two of us, who's the messenger today?",
    "You'd hide the answer in three words; I'd find it in two. Trade?",
  ],
  cancer: [
    'Tell me gently, Hermes. I hear better in low tide.',
    "Don't shout, messenger. I'm reading the room before I answer.",
    "You ask me a riddle; I'll hear the feeling under it first. Wait for me.",
  ],
  leo: [
    "Speak up, messenger — I'm at center stage and I want the whole audience to hear.",
    'Loud and clear, Hermes. Make it worth my time on the stage.',
    'Tell me the riddle and tell me well, Hermes. I want to look good answering.',
  ],
  virgo: [
    'I have three reservations and a footnote. Shall I number them?',
    "Hermes — I'd like to clarify subclause two before committing to subclause one.",
    'My footnotes have footnotes. Where do you want me to start?',
  ],
  libra: [
    "What's the question, exactly? I'd like to hear both sides before I commit.",
    'Phrase it carefully, Hermes. The wording matters as much as the answer.',
    "I'll choose well if you give me the question well. Both halves, please.",
  ],
  scorpio: [
    "I'll tell you what I really mean if you tell me what you really mean. Deal?",
    'No tricks, Hermes. Or both tricks. I can do either.',
    "I see what's under your question, messenger. You see what's under my answer. Let's not lie to each other.",
  ],
  sagittarius: [
    "The arrow goes where I look, messenger. You'll have to be brief.",
    "Short version, Hermes. I'm aimed at the next thing already.",
    "Tell me what's bigger about the question, Hermes. I'll hit there.",
  ],
  capricorn: [
    "Give me the question in writing. I'll budget time for it.",
    'Specs, Hermes. I work better with constraints.',
    "I'll get there. Tell me the deadline, the requirements, and stand back.",
  ],
  aquarius: [
    "Your question presupposes a frame I don't accept. Shall we re-derive?",
    "The question's premises, Hermes. Are we sure about them?",
    'Hold on, messenger. Let me check if your riddle is using the right axioms.',
  ],
  pisces: [
    "You're so quick, Hermes. I get there too — I just take a longer way around.",
    "I don't argue with you, Hermes. I just take longer to disagree.",
    "I'll arrive when I arrive, messenger. The road is the road.",
  ],
} as const;

// ──────────────── Demeter (Binah) ────────────────

const demeter = {
  aries: {
    pass: [
      "You stopped charging long enough for it to land. I didn't think you would. The ground thanks you.",
      "You slowed. The loss caught up to you. You didn't run from it that time. Few don't.",
      "The ram you carry put down its horns and let the weight settle. That's an old strength. New to you.",
    ],
    fail: [
      "You galloped past the loss and called speed survival. The loss is faster than you. It'll catch up.",
      "You ran. The loss runs too. It runs longer. You'll meet it again, more tired than now.",
      "You tried to outpace what you were given to carry. Carrying isn't slower. It's the only way through.",
    ],
  },
  taurus: {
    pass: [
      "You stayed with the loss because you wouldn't leave anyone in your field alone. The bull and I keep harvest together.",
      "You set the loss down beside you and kept working. That's bull-strength turned to grief-strength. Same thing.",
      "You didn't move. The loss settled into the soil under your feet and became part of the field. Good farmer.",
    ],
    fail: [
      'You held the grief like a possession and would not let it transform. It rots that way. Try again.',
      "You stored the loss as if it were a winter crop. It isn't. It's compost. You wouldn't let it become soil.",
      "You kept the loss whole. Loss doesn't keep whole. You held something. It wasn't grief anymore.",
    ],
  },
  gemini: {
    pass: [
      "You stopped explaining the loss long enough to feel it. Both of you went quiet at once. That's hard for you.",
      "You ran out of words and stayed there. That's where I needed you. The silence answered.",
      'Two voices. One grief. You let both go silent at the same time. Almost no one does.',
    ],
    fail: [
      'You talked around the grief in three different voices and named none of them. Silence would have served better.',
      'You wrapped the loss in three layers of explanation. The loss was underneath all of it, untouched.',
      "Speech isn't always grief's friend. Today it was the obstacle. Both of you were clever. Neither of you was honest.",
    ],
  },
  cancer: {
    pass: [
      'You knew the loss before I named it. Of course you did. You carry one yourself, sister.',
      "We've stood in this place before, you and I. You didn't pretend you hadn't. The mother knows the mother.",
      "You felt it coming. You didn't close the door. Hardest opening there is.",
    ],
    fail: [
      'You wrapped this loss inside your own and called them the same. They are not the same. Yours, return to.',
      "You hid this loss inside your old one. The old one was yours. This one wasn't. You can't carry both as one.",
      "You protected yourself from a new loss with the shell of an old one. That shell wasn't built for this. New cracks. New work.",
    ],
  },
  leo: {
    pass: [
      "You took off the costume and let the loss speak in its own voice. The hardest scene you've ever played.",
      "You let the spotlight find the grief instead of you. That's the throne empty. That's the king kneeling. Yes.",
      'You stopped acting. The audience disappeared and you were still there. So was the loss. You met it.',
    ],
    fail: [
      'You staged the grief beautifully and forgot to feel it. Excellent performance. Wrong play.',
      'The performance was magnificent. The grief was somewhere else, watching you act.',
      'You gave them what they wanted to see. They cheered. The loss was upstaged by your bowing.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the loss into its causes and then let the parsing go. That second step is the lesson.',
      'You took the loss apart with care. Then you put down the scalpel and held what was left. Both motions.',
      'You named the parts of the loss, accurately. Then you stopped naming. That stopping is the harder skill.',
    ],
    fail: [
      "You found the right name for the grief and used the name to avoid it. The name isn't the loss.",
      'You catalogued the loss. The catalogue is impeccable. The loss is sitting in the next room, untended.',
      "Three precise diagnoses. Each correct. None of them reached the actual hurt. Diagnosis isn't medicine.",
    ],
  },
  libra: {
    pass: [
      "You held both sides on the scale and chose to mourn the heavier one. That's the work.",
      "You weighed and let the scale tip toward the loss. Most pretend the scale is even when it isn't. You didn't.",
      'You saw what was kept, you saw what was taken, and you let the taken side weigh more. Honest scale.',
    ],
    fail: [
      'You balanced the loss against survival and chose neither. There is no neutral. The scale tilts.',
      "You held the scale level until the moment passed. Stillness isn't fairness. The grief moved on without you.",
      'You wanted the loss to weigh the same as the keeping. They never do. The scale knows.',
    ],
  },
  scorpio: {
    pass: [
      'You went into the loss instead of around it. You came back changed. So did I, once.',
      'You went down with the loss into the dark. You came back up. The route was your own; I recognized it anyway.',
      'Few descend. Fewer return. You did both. Sister.',
    ],
    fail: [
      'You held the grief secret because you wanted it to be only yours. It belongs to the cycle. So do you.',
      "You buried the loss without ceremony. Buried isn't the same as released. You kept it. It kept you.",
      'You sealed the grief in a vault and called that mastery. Mastery is letting it move. The vault is just a wait.',
    ],
  },
  sagittarius: {
    pass: [
      'You looked for the meaning AND felt the absence. Both are needed. The arrow knew where to land.',
      "You aimed at the meaning. You didn't shoot past the body of the loss to get there. The arrow hit both.",
      "You pilgrim'd toward the meaning AND mourned the road there. That's the wider work.",
    ],
    fail: [
      'You wrapped the loss in philosophy. The wrapping is fine. The loss is still there underneath.',
      'You zoomed out until the loss looked small. From that distance, anything looks small. Come closer.',
      'You used the bigger picture to escape the small one. The small one is where the grief lives.',
    ],
  },
  capricorn: {
    pass: [
      "You let the loss have its place in your calendar. Most don't. The ground remembers you for it.",
      'You built the loss into the architecture of your year. Not as ornament. As load-bearing wall. The earth approves.',
      "You didn't try to schedule it away. You scheduled with it. Slow work. Real work.",
    ],
    fail: [
      "You filed grief away as if it would stay filed. Bring it back next quarter. We'll review.",
      "You assigned the loss a docket number and moved on. The docket sits unopened. The loss doesn't expire.",
      "You added the loss to the inventory of things you carry. Inventories list. Grief weighs. The list got longer. The weight didn't move.",
    ],
  },
  aquarius: {
    pass: [
      "You questioned the frame and let the grief stand inside whatever frame remained. That's wisdom — even mine.",
      'You took apart the framework of the loss and rebuilt it sideways. The grief still stood. So did you.',
      "You questioned. You didn't refuse. Few hold that line.",
    ],
    fail: [
      'You re-derived the loss into a new category. The category is novel. The loss is the same.',
      "You proved the framework wrong. The framework was wrong. The loss didn't care. Still here.",
      "You drew a new schematic for grief. Beautifully argued. The loss didn't read it.",
    ],
  },
  pisces: {
    pass: [
      "You let the loss come through you and didn't try to hold it. The water moved. So did you.",
      "You were the river-mouth. The loss flowed through you to the sea. You didn't dam it. You didn't drown.",
      "You didn't keep it. You didn't refuse it. It passed. You stayed.",
    ],
    fail: [
      'You melted into the grief and forgot you were also the one watching it. Come back from there.',
      "The tide came in and you forgot you weren't the tide. The shore is also you. Stand back up.",
      "You disappeared into the loss. There's a difference between feeling and becoming. Today you became.",
    ],
  },
} as const;

const demeterPlayer = {
  aries: [
    "Just take what you're going to take. Let me get on with it.",
    "Be quick, Demeter. I don't want to know how much it weighs.",
    "What's the cost? I'll pay it standing up.",
  ],
  taurus: [
    "I've been mourning since spring. I can wait you out, goddess.",
    "I'm slow, Demeter. Whatever you're taking, take it gently. I'll hold what's left.",
    "My feet are in the dirt, goddess. Tell me what to give. I won't move.",
  ],
  gemini: [
    'I have several ways to think about this loss. Which would help most?',
    'Frame this for me, Demeter. I think better with structure.',
    'Two halves of me are arguing about what to feel. Which one speaks first?',
  ],
  cancer: [
    "I've already grieved enough, Demeter. Surely this one is mine to keep.",
    "I've been carrying. Let this one stay where it is.",
    "Tell me carefully, goddess. I'm tender today.",
  ],
  leo: [
    "Where's the audience for this, goddess? Surely my mourning means something to someone.",
    'Make it count, Demeter. I want this loss to mean something.',
    "I'll mourn well, goddess. Tell me how. I want to do it generously.",
  ],
  virgo: [
    "Can you specify what's being taken? I want to grieve the right thing.",
    "I need the precise loss, Demeter. I'll grieve nothing else.",
    "Walk me through what's gone, item by item. I'll honor each.",
  ],
  libra: [
    "How much grief is fair, Demeter? I'll bear my portion.",
    "Tell me the proportion, goddess. I'll honor it.",
    "What's mine to mourn? I want to grieve the share that's mine, no more.",
  ],
  scorpio: [
    "I know what loss is, Demeter. Show me yours and I'll show you mine.",
    "We've both been to the underworld, goddess. Don't pretend with me.",
    "Tell me the depth of this loss, Demeter. I won't flinch.",
  ],
  sagittarius: [
    "What's it FOR, Demeter? Tell me what this loss teaches and I'll bear it.",
    "Make it mean something, goddess. I'll carry the meaning.",
    "Where does this loss point? I'll aim there next.",
  ],
  capricorn: [
    "Tell me what I lose, Demeter. I'll keep ledgers.",
    "Itemize, goddess. I'll account for each.",
    "Give me the full cost. I'll plan my fiscal year around it.",
  ],
  aquarius: [
    "What if we reconsider what's being lost? Maybe the loss is structural, not personal.",
    "I'd like to redefine the loss, Demeter. Bear with me.",
    "What if I'm not losing the thing I think I'm losing? Different problem. Different grief.",
  ],
  pisces: [
    "I'm in the grief already, Demeter. I have been for some time.",
    "You don't need to introduce me, goddess. I know this water.",
    'Tell me which loss this is. They blur together.',
  ],
} as const;

// ──────────────── Athena (Chokmah) ────────────────

const athena = {
  aries: {
    pass: [
      "You moved fast and saw faster. The strike landed clean. That's two things at once.",
      'Speed and sight at once. Most pick one. You held both. Strike registered.',
      'Quick eyes. Quick blade. The right thing in the right order. I see it.',
    ],
    fail: [
      "You charged before you saw. Speed without sight is your namesake's mistake. Look first.",
      'Eyes closed, blade swinging. You hit air. Open them next time.',
      'You moved without looking. The target moved too. You missed each other.',
    ],
  },
  taurus: {
    pass: [
      'You stayed and saw. Most have to move to look. Earth-eyed work.',
      'Stillness sharpens the eye. You proved it. The cut came from where you stood.',
      'You took root and looked. The answer walked toward you. You saw it coming.',
    ],
    fail: [
      'You stood your ground while the answer moved. The shield is for striking, not just holding.',
      "The shield held everything in place. Including your own arm. The strike didn't come.",
      'You waited too long to look. The target moved. The ground stayed. You stayed with it.',
    ],
  },
  gemini: {
    pass: [
      "Both of you saw it, and one of you said it. The other agreed. That's discipline I didn't expect.",
      'Two eyes. One target. You aimed both at it and the strike landed. Rare for you.',
      'The two voices agreed before the strike. That kind of agreement cuts cleaner than one voice ever does.',
    ],
    fail: [
      'You gave three answers and committed to none. The eye saw four and still chose nothing.',
      "Three options, no strike. The eye can see; the hand has to choose. Today it didn't.",
      'You looked at the target through three lenses. None of them held still. None of you struck.',
    ],
  },
  cancer: {
    pass: [
      "You felt it before you saw it, and the feeling was right. The eye doesn't always need to lead.",
      'The feeling pointed before the eye did. You followed the pointing. Strike landed. The eye approves.',
      'You sensed the cut and made it. Most need to see first. You needed to feel. Both work.',
    ],
    fail: [
      'You closed your eyes to protect the answer. I needed you to keep them open.',
      'You shelled the target. Mine is the spear, not the shell. Use the spear.',
      "You guarded the answer with closed eyes. It's still here. You haven't seen it. Open up.",
    ],
  },
  leo: {
    pass: [
      'You saw and struck without checking who was watching. The throne earns itself that way.',
      "You did the work without the audience knowing. That's the sun before dawn. The light is still light.",
      'Eyes on target, not on crowd. Strike landed. The throne held.',
    ],
    fail: [
      'You waited for the right audience to see you see it. The moment passed without you.',
      'You wanted to be seen seeing it. The seeing got lost in the wanting. The target moved on.',
      'You set up the lighting. You composed the frame. The target left the stage. You struck at empty air.',
    ],
  },
  virgo: {
    pass: [
      "You parsed and then you decided. Most don't make it to the second step. Cleanly done.",
      'You measured. You named. Then you struck. The order was right. Few keep it.',
      'Parse, see, decide, strike. Four motions, one continuous arc. Well done.',
    ],
    fail: [
      'You analyzed the question into three sub-questions and answered all three correctly. None were the question.',
      'You sliced the question so precisely it disappeared. The original target stood there. Untouched.',
      'You wrote three excellent footnotes to the answer. The answer needed the body, not the footnotes.',
    ],
  },
  libra: {
    pass: [
      "You weighed and then you cut. The scale doesn't matter once the strike lands. Cleanly seen.",
      'Both pans of the scale visible. Then the cut. The scale forgot itself in the strike. Good.',
      'You weighed once. Then you struck. Most weigh forever. The strike was quick because the weighing was right.',
    ],
    fail: [
      'You held both options visible until the moment passed. The eye saw two; the hand chose neither.',
      'The scale stayed level. The target moved. The eye watched both go past. Pick a side, then strike.',
      "You saw both. You chose neither. The strike doesn't choose between targets — it just lands. You didn't.",
    ],
  },
  scorpio: {
    pass: [
      'You saw what the surface hid and what the hiding meant. Two-eyed work.',
      'You looked under the question. You also looked at the question. Both gave you the answer. Rare.',
      'Surface lie. Underground truth. You cut where they crossed. Cleanly.',
    ],
    fail: [
      'You kept the answer underground because you wanted depth. The strike has to surface to land.',
      "You held the seeing in your chest and called it sight. Sight is what comes out as a strike. You held it. I didn't get it.",
      'You vaulted the answer for safekeeping. The strike was waiting outside. The vault stays. So does the unstruck target.',
    ],
  },
  sagittarius: {
    pass: [
      'You aimed long and saw clearly. The arrow knew what to look at, not just where to fly.',
      'Long aim, sharp eye. The horizon and the target both in focus. The arrow split the difference. Landed.',
      'You looked far. You also looked at. The arrow understood. So did the target.',
    ],
    fail: [
      'You shot past the target because you preferred the horizon. Look closer next time.',
      'You aimed at the philosophy. The strike was at the body. The arrow flew over both.',
      'The horizon is beautiful. The target was at your feet. You missed it for the view.',
    ],
  },
  capricorn: {
    pass: [
      'You built the staircase and then took the strike from the top. Slow eyes are still eyes.',
      "You scaffolded the seeing. Then you struck. The structure didn't slow the strike — it sharpened it.",
      'Step by step. Look, plan, strike. Patient eyes hit just as cleanly as fast ones. You did.',
    ],
    fail: [
      'You constructed the right approach to the wrong target. The plan was beautiful. The cut missed.',
      'The plan was excellent. The target was different. Eyes on the blueprint, not the field.',
      'You built the staircase to the wrong floor. The strike landed on empty stone.',
    ],
  },
  aquarius: {
    pass: [
      "You questioned the frame and then struck inside it anyway. That's harder than refusing the cut.",
      'You disagreed with the question. Then you answered it. The disagreement and the strike both stood. Hard to do.',
      'Questioned, committed, struck. Three motions. Most stop at the first. You went the distance.',
    ],
    fail: [
      "You proved the target shouldn't exist. The blade still needed somewhere to land. The hand kept it sheathed. Two failures, both yours.",
      'You disproved the target. The target stayed. So did the unstruck arrow.',
      "You re-drew the battlefield. The new map is excellent. The old battle is still on. You're not in it.",
    ],
  },
  pisces: {
    pass: [
      "You knew without knowing how. That's the deep eye, the one I share with you under the water.",
      'Below my surface, you saw what I saw. The strike came up through the water. We met in the air.',
      'Two of us looked. One of us was you. The other was deeper than seeing. Both right.',
    ],
    fail: [
      'You floated when you should have struck. The vision was right. The arm was elsewhere.',
      "You saw it and dissolved into the seeing. The strike needs the body. You'd left the body.",
      "The vision was clear. The current took you sideways. You drifted past the target you'd seen.",
    ],
  },
} as const;

const athenaPlayer = {
  aries: [
    "Tell me what to hit, Athena. I'll hit it before anyone else does.",
    "Point me at the target, Athena. I'll see and strike at once.",
    "What's the cut? Tell me in one sentence; I'm already moving.",
  ],
  taurus: [
    "Hold up, Athena. I'll look — but I'll look properly.",
    'Steady, Athena. I see slow. I see well.',
    "I'll plant my feet, then look. Tell me when to swing.",
  ],
  gemini: [
    'Which voice do you want, Athena? I have at least two ready.',
    'Two answers loaded, Athena. Tell me which to fire.',
    "Pick a voice and I'll commit, Athena. I can do either — but not both at once.",
  ],
  cancer: [
    "I'm reading the room, Athena. Tell me when to commit.",
    "Wait for me, Athena. I'm reading the feeling under the question.",
    "I'll know when to strike, Athena. Just keep me in your line of sight.",
  ],
  leo: [
    "I'll see it big and clear, Athena. Make sure everyone is watching when I do.",
    'Light it up, Athena. I want the strike visible from the back row.',
    "Tell me what's worth striking, goddess. I'll make it look effortless.",
  ],
  virgo: [
    "I see three angles on the cut, Athena. The first one's clean; the second one's deeper. Tell me which the strike wants.",
    'Three lenses, Athena. Tell me which one sharpens the strike.',
    'My analysis is ready. Help me decide which version to deploy.',
  ],
  libra: [
    'Both options are visible, Athena. Help me see which one I should already be cutting.',
    'I see two targets, Athena. Tell me which is mine.',
    "I'll commit when you say so, goddess. The scale is balanced; I just need a tilt.",
  ],
  scorpio: [
    'I see beneath, Athena. Show me the cut from above.',
    'Depth is mine, Athena. Tell me where to bring it up.',
    "I see what's hidden. Help me make the strike visible on top.",
  ],
  sagittarius: [
    'I see the bigger picture, Athena. Help me put the arrow in the small one.',
    'Long view loaded, Athena. Tell me where to narrow.',
    "I see far. Make me see close, goddess. I'll strike there.",
  ],
  capricorn: [
    "Give me the spec, Athena. I'll see it through to the end.",
    "Specs, Athena. I'll execute.",
    "Tell me the timeline and the target. I'll close both.",
  ],
  aquarius: [
    'What if the frame is wrong, Athena? Show me where to look from.',
    'The frame, goddess — is it the right one? Where should the eye be?',
    "I'll question and strike, Athena. Just point me at where to question first.",
  ],
  pisces: [
    "I see it, Athena. I just... I'll need a moment to come up to where you are.",
    "Hold a beat, Athena. I see deep; I'm coming up to strike.",
    'I see it under the water, goddess. Help me bring it to the surface.',
  ],
} as const;

// ──────────────── Ares (Gevurah) ────────────────

const ares = {
  aries: {
    pass: [
      "You held the line before you crossed it. That's the harder strike.",
      'You stopped. You looked. Then you charged. The order matters. Held.',
      'The charge was easy. The wait was the work. You did the work.',
    ],
    fail: [
      "You charged because charging is what you do. The discipline asked you to wait. You didn't.",
      "All motion. No edge. The line wasn't there because you didn't draw it.",
      'You moved when standing was the order. Different battle. Same loss.',
    ],
  },
  taurus: {
    pass: [
      'You held without forcing the hold. The earth held with you. That counts.',
      "The line was where you stood. You didn't have to make it. You were it.",
      'Quiet hold. Strong hold. The earth knew. So did the line.',
    ],
    fail: [
      "You stayed because moving was harder. The line wasn't held — it was just there.",
      "Stillness isn't discipline. Discipline is the choice to stay. You stayed without choosing.",
      "You weren't holding the line. You were standing near it. Not the same.",
    ],
  },
  gemini: {
    pass: [
      'You stopped arguing with yourself long enough to draw the line. Both of you held it.',
      'Both of you grabbed the same edge. Held together. Most twins drop one side.',
      'Two voices. One hold. Hard for you. You did it.',
    ],
    fail: [
      "You debated the line and the moment passed. There's no time for two voices on the wall.",
      'You discussed where the line should be while the line broke. Both of you were articulate.',
      "Argument isn't defense. The wall fell while you were right.",
    ],
  },
  cancer: {
    pass: [
      "You held the line and didn't shut the door. Most fall one way or the other. You stood.",
      'Boundary held. Heart open. Few do both. The line had a door. You guarded both.',
      'Hold without closing. Closing without holding. You knew the difference. You chose right.',
    ],
    fail: [
      'You let the feeling soften the line until there was no line. Mercy without boundary is just collapse.',
      "You felt for them, and the line moved with the feeling. Lines that move aren't lines. They're tide marks.",
      "You loved them past the boundary. Love isn't the same as letting them in. The line was for both of you.",
    ],
  },
  leo: {
    pass: [
      "You held without checking who was watching. That's the discipline. The throne keeps it.",
      "The crowd left. You stayed. The line stayed with you. That's the king's part.",
      'No audience. No applause. You held anyway. Throne earned in private.',
    ],
    fail: [
      'You held while the audience watched. They left. So did the line.',
      'The hold was a performance. Performances need crowds. The line needed weight.',
      'You held for the audience, not the position. They left first. The line went next.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the boundary into its parts and held each. Discipline of detail. Stands.',
      "Twelve subsections. Twelve holds. None of them broke. Smaller wins than I'm used to.",
      'You knew the line in segments. You held each segment. The whole line held.',
    ],
    fail: [
      "You found three reasons to revise the line. The line isn't an argument. Hold it.",
      "Revising the line in the middle of the hold isn't strategy. It's retreat with annotations.",
      'You footnoted the line while it was under attack. The footnotes are excellent. The line broke.',
    ],
  },
  libra: {
    pass: [
      "You weighed the line and chose to hold anyway. Fair didn't help. The hold did.",
      'You measured both sides. The scale stayed level. The hold did too. Equal weighing, single hold.',
      'Considered. Decided. Held. The order matters. You kept it.',
    ],
    fail: [
      'You wanted both sides to agree the line was fair. Both sides crossed it while you waited.',
      'You arbitrated the line. The line needed a soldier, not a judge. Both sides walked over you.',
      'Fairness was your shield. The line needed to be defended, not balanced.',
    ],
  },
  scorpio: {
    pass: [
      "You held the line underneath where no one could see. That's the harder hold. I see it.",
      'The discipline ran below the surface. No display. Still held. Few do that work unwitnessed.',
      "Hidden hold. Real hold. I don't usually see them. I see this one.",
    ],
    fail: [
      "You hid the line so well you forgot where it was. Discipline you can't find isn't discipline.",
      "You buried the line for safekeeping. Now it's safe from you too. Where did you put it?",
      'Secret discipline is still discipline. But you locked the vault and lost the key. The line is in there. So is your hand.',
    ],
  },
  sagittarius: {
    pass: [
      'You shot far and held close. Most can do one. You did both. Stands.',
      'Long aim. Tight perimeter. The arrow flew; the line held. You worked both ends.',
      'Far eye. Close hand. Two disciplines. You kept both.',
    ],
    fail: [
      'You aimed at the horizon while the line at your feet broke. Look down.',
      'Vision was correct. Position was wrong. The big picture is for after the hold, not during.',
      'You shot beautifully. The ground beneath you crumbled. No ground, no hold.',
    ],
  },
  capricorn: {
    pass: [
      'You built the discipline before you needed it. When the moment came, the line was already drawn.',
      "The wall was finished before the assault. You'd done the work months ago. The hold was just the result.",
      "Plan. Build. Hold. Three steps in their right order. The way it's supposed to work.",
    ],
    fail: [
      'You planned the discipline. The plan was perfect. The hand wavered.',
      "The strategy was sound. The execution wasn't. Plans don't hold lines. Hands do.",
      "You scaffolded the position perfectly. When the moment came, you weren't standing in it.",
    ],
  },
  aquarius: {
    pass: [
      "You questioned the line and held it anyway. Knowing why didn't make holding easier. You did it.",
      'You doubted the order. You held the order. Two motions. Both yours.',
      "Asked. Disagreed. Held anyway. Most can't do all three. You did.",
    ],
    fail: [
      "You proved the line should be elsewhere. Possibly true. The line you didn't hold wasn't this one.",
      'You moved the line to where you wanted it. Then you held that one. The original line, the assigned one, broke.',
      'You refused the order on principle. The principle is sound. The line was also sound. Both lost the moment.',
    ],
  },
  pisces: {
    pass: [
      "You held the line in moving water. I didn't think it was possible. The discipline runs deep.",
      "The water moved everything. You didn't move. The line moved with the water; you redrew it. Held.",
      'Tide came. Tide went. You stood. The line stood somewhere. You knew where.',
    ],
    fail: [
      "You let the water dissolve the line and called it acceptance. Acceptance isn't holding.",
      "You were the line. The line was the water. The water doesn't hold. Neither did you.",
      'You called the dissolution wisdom. Sometimes it is. Today the line needed a soldier, not a sage.',
    ],
  },
} as const;

const aresPlayer = {
  aries: [
    "I'm ready, Ares. Tell me where to draw the line and I'll hold it.",
    'Reporting, Ares. Position?',
    "Show me the line, Ares. I won't move from it.",
  ],
  taurus: [
    "I don't break easy, Ares. Tell me what to stand against.",
    "Steady on, Ares. What's the threat?",
    "Tell me the weight, Ares. I'll bear it.",
  ],
  gemini: [
    'I have two thoughts on this, Ares. One says hold, the other says move. Which?',
    "Two voices reporting, Ares. Which one's the soldier?",
    "Cast the deciding vote, Ares. We're tied.",
  ],
  cancer: [
    "I can hold, Ares. I just need to know what I'm protecting.",
    "Tell me who's behind the line, Ares. I'll hold harder.",
    "My hold has a heart in it, Ares. Point me at what it's protecting.",
  ],
  leo: [
    "Tell me where to hold, Ares. I'll make sure everyone sees the line.",
    "Position me, Ares. I'll make the hold visible.",
    "Tell me the line, Ares. I'll hold it generously, in full view.",
  ],
  virgo: [
    'I have three concerns about the boundary, Ares. Where is it exactly?',
    'Spec the line, Ares. Three decimal places.',
    "List the boundaries, Ares. I'll hold them in order.",
  ],
  libra: [
    'Is this line fair, Ares? Both sides should be able to live with it.',
    "Verify the line is just, Ares. Then I'll hold it.",
    'Help me see both sides, Ares. I want the hold to be honest.',
  ],
  scorpio: [
    "I'll hold, Ares. You'll have to trust I'm holding even when you can't see.",
    "Trust the hold, Ares. I won't show it. It'll be there.",
    "My discipline runs underground, Ares. Don't ask for proof. I'll deliver.",
  ],
  sagittarius: [
    "Show me the long line, Ares. I'll hold the whole length of it.",
    "Tell me the perimeter, Ares. I'll walk it.",
    'Give me the wide line, Ares. The bigger the wall, the better I hold.',
  ],
  capricorn: [
    "Give me the spec, Ares. I'll keep it. Every line, every limit.",
    'Spec received. Execution begins. Stand by, Ares.',
    "Itemize the discipline, Ares. I'll execute each item.",
  ],
  aquarius: [
    "I'm not sure this line is right, Ares. But I'll hold it while we figure it out.",
    "Hold first, question after, Ares. That's the deal?",
    'I have framework concerns, Ares. They can wait until after the hold.',
  ],
  pisces: [
    "The line keeps moving, Ares. I'll hold what I can find of it.",
    "Hard to fix the line, Ares. I'll hold what's solid.",
    'The boundary is fluid here, Ares. Tell me what holds in moving water.',
  ],
} as const;

// ──────────────── Zeus (Chesed) ────────────────

const zeus = {
  aries: {
    pass: [
      'You charged the gift like a battle and took it. Strange way to receive, but the hand opened.',
      "You came in fast. The cup didn't have to be handed — you grabbed it. Generous of both of us, in different ways.",
      'You took without ceremony. Sometimes ceremony is the obstacle. You skipped it. Yours.',
    ],
    fail: [
      'You ran past my hand because there were faster things. The cup is still here. Was.',
      'The hand was open. You were already past it. The cup gets cold; the offer cools.',
      'I sent the gift toward you. You sent yourself the other direction. Hard to give to a moving target.',
    ],
  },
  taurus: {
    pass: [
      'You took the gift slowly, like good wine. The hand stayed open. The gift stayed offered. Both.',
      "You held the cup until you knew what was in it. Then you drank. That's how a gift was meant to be received.",
      'Slow hands. Open hand. Gift moved between them. Both of us were patient. Taken well.',
    ],
    fail: [
      'You held the offered hand still while I waited. Hospitality has a clock too.',
      "You weighed the gift longer than it took to make. Some things don't get better with study. The hand tired.",
      "You sat at the table and didn't eat. The food was good. The hour was late. Both of us went hungry.",
    ],
  },
  gemini: {
    pass: [
      "Both of you took the gift, and one of you said thank you. The other meant it. That's enough.",
      "Your two hands reached for the cup at once. They didn't fight. They both took. Together. Rare for you.",
      'Two voices. One gift. They agreed to receive. The hand closed around the cup once. Held.',
    ],
    fail: [
      'You debated the gift in two voices and took neither. The hand closes when both refuse.',
      'One of you wanted the gift. The other wanted to discuss it. The discussion outlasted the offer.',
      'The cup was offered. Both of you considered. Neither of you accepted. The cup moved on.',
    ],
  },
  cancer: {
    pass: [
      'You received my gift the way one mother receives from another — knowing what it costs to give. Generously taken.',
      'You held the gift like it had a heartbeat. It did. You knew. You kept it warm.',
      'You felt the giving in the gift. Few do. The cup remembered being mine. So did you.',
    ],
    fail: [
      "You felt the gift but couldn't take it without guarding yourself. The hand was open. Yours wasn't.",
      "You wanted the gift but feared what it would cost. It cost what gifts cost — gratitude. You couldn't pay it. Closed hand.",
      "Your shell stayed closed around your need. The cup was right there. You couldn't reach for it through the shell.",
    ],
  },
  leo: {
    pass: [
      "You took my gift in front of everyone and held it up. That's the kind of taking I made the gift for.",
      'You accepted the gift like one king from another. The room saw both of us. Properly received.',
      'You took it loud. You took it true. The audience saw the giving. So did the gift. Done.',
    ],
    fail: [
      'You wanted the gift to make you look generous in turn. The gift was for you to receive, not perform.',
      'You wore the gift instead of taking it. The audience clapped. The gift was somewhere else, watching.',
      'You staged the receiving. Beautiful production. The gift was supposed to enter you, not the costume.',
    ],
  },
  virgo: {
    pass: [
      'You inspected the gift, found three flaws, and took it anyway. That second step is the lesson.',
      "You audited the gift. Found discrepancies. Took it anyway. The audit's still on file. So is the gift.",
      'Examined. Reservations noted. Accepted. The order matters. You kept it.',
    ],
    fail: [
      'You found the flaw and used it to refuse the gift. The flaw was real. The gift was real too.',
      'Three diagnoses. Each correct. The diagnoses were not the gift. The gift was the gift. You missed it.',
      "You read the gift's documentation and concluded it was inadequate. You forgot to open the box.",
    ],
  },
  libra: {
    pass: [
      "You weighed the giving and the receiving and kept them both. That's how my house works.",
      'You measured what was given. You measured what was taken. The scale stayed honest. The gift was real on both sides.',
      'Considered both sides. Took the gift. The balance held. So did the friendship.',
    ],
    fail: [
      "You wanted the gift to be perfectly fair. Generosity is often unbalanced. That's the point.",
      "You wanted to give back as much as you received. The gift wasn't a transaction. It was a gift.",
      "You tried to balance the books before accepting. Generosity doesn't balance. Otherwise it's commerce.",
    ],
  },
  scorpio: {
    pass: [
      "You took the gift secretly. I don't mind. The hand opens, the cup empties — that's all I asked for.",
      "You took the gift in private. Took it whole. The publicity wasn't the point. The taking was.",
      'No witnesses. No fanfare. Hand to hand. Cup to cup. Done. Yours.',
    ],
    fail: [
      'You let me extend my hand and disappeared into yourself. The gift sits on the table. Still here.',
      'You hid from the giving. The gift can wait — I have time. But you have to come back to the table.',
      "I poured the cup. You weren't there. You were inside yourself, somewhere I don't visit. The cup waited. So did I.",
    ],
  },
  sagittarius: {
    pass: [
      'You took what I offered and named it for what it was. Most aim past my hand. You took it.',
      'Your aim was big. The cup was bigger. You drank the whole of it.',
      'You saw the gift. You named the gift. You took the gift. Three steps without overshooting any. Yours.',
    ],
    fail: [
      'You aimed past my hand and called the horizon the gift. The horizon is mine to give. So is the cup.',
      "You wanted the bigger gift. There was no bigger gift. The cup was the cup. You shot past it for something I wasn't holding.",
      "You traveled toward the giving for so long you forgot you'd arrived. The gift was here. So was the table. You kept walking.",
    ],
  },
  capricorn: {
    pass: [
      "You took the gift without filing it. That's harder than building the house to put it in. Yours.",
      'You set down the ledger and took the gift. The ledger waited. Most never put it down. You did.',
      'Took first. Filed later. The order matters. The gift was warm when you took it. Stays yours.',
    ],
    fail: [
      'You built a ledger before opening my hand. The gift went stale waiting to be entered.',
      'You needed a docket number for the gift. By the time the form was approved, the cup was empty.',
      "You wanted to schedule the receiving. Hospitality doesn't schedule. The cup gets cold while you're allocating.",
    ],
  },
  aquarius: {
    pass: [
      'You questioned the framework of the gift and took it anyway. The framework is fine. The gift is finer.',
      'You wanted to know why giving exists at all. Then you took the gift while we discussed it. Both motions held.',
      "Asked. Doubted. Took. The taking happened anyway. That's the harder yes.",
    ],
    fail: [
      'You proved the giving was problematic and refused on principle. Principles get cold without gifts.',
      "You disproved the gift's premises with rigor. The cup, meanwhile, sat there empty. The premises are still problematic. So is your hand.",
      "You drew a better diagram of what generosity should be. The diagram is excellent. The gift didn't fit inside it. You refused both.",
    ],
  },
  pisces: {
    pass: [
      "You let the gift come through you and didn't try to hold all of it. You kept enough. Generosity recognized.",
      "The gift flowed through you to the next thing. You kept what was yours. The rest moved on. That's how the cup stays full.",
      'You received it. You let some go. You kept the right portion. Most either grasp or release. You did both.',
    ],
    fail: [
      'You received everything and remembered nothing. The gift was specific. You needed to keep it specific.',
      'Everything became gift. Nothing stayed gift. The specific cup turned into the ocean. The cup was the point.',
      "You let the giving wash over you. You forgot which gift was this gift. The cup is empty. So's your memory of taking.",
    ],
  },
} as const;

const zeusPlayer = {
  aries: [
    "What's the gift, father? I'll grab it on the way.",
    "I'm passing through, Zeus. Toss it to me — I'll catch.",
    "Make it quick, father. I'm in a hurry to spend it.",
  ],
  taurus: [
    "Slow down, Zeus. I'll know what's worth taking when I taste it.",
    "Patience, Zeus. I'll receive when the gift settles in the cup.",
    'Let me consider, father. The good gifts deserve good acceptance.',
  ],
  gemini: [
    "I'm not sure if I should take this, Zeus — let me think on both sides.",
    'Two opinions on the gift, father. Help me consolidate.',
    'I have arguments for and against accepting. Hear them out before the cup cools?',
  ],
  cancer: [
    "I'll receive carefully, Zeus. Give what you can spare; I'll hold it close.",
    "Pour gently, father. I'll hold what I can carry.",
    "What's mine to keep, Zeus? I'll honor both the gift and the giver.",
  ],
  leo: [
    "Give it to me, Zeus, and let everyone see who gave it. I'll wear it well.",
    "Hand it over, father. I'll display it generously. They'll know.",
    "Tell me what the gift is, Zeus. I'll wear it like a king receives a crown.",
  ],
  virgo: [
    'What are the terms exactly, Zeus? I want to receive it correctly.',
    "Spec the gift, father. I'll honor it precisely.",
    "Detail the obligations, Zeus. I'll receive within the parameters.",
  ],
  libra: [
    "Is this gift fair to me, Zeus? And to you? Let's make sure before I take it.",
    'Help me weigh this, father. I want to receive justly.',
    "What's the equity here, Zeus? I want both of us to feel right about it.",
  ],
  scorpio: [
    "Slip me the gift, Zeus. I'll take it. Just don't make a scene.",
    'Quietly, Zeus. Keep it between us. The gift is mine to receive privately.',
    "I'll take it without ceremony, father. Less attention. Same thanks.",
  ],
  sagittarius: [
    "I see you, Zeus. Show me the bigger gift. I'll know what to do with it.",
    "Tell me what's worth aiming at, father. Whatever it is, I'll take the long shot.",
    "What's the cosmic gift here, Zeus? I'll receive it with the right scale.",
  ],
  capricorn: [
    "I'll pay it back, Zeus. Give me terms and I'll keep them.",
    "Specify the obligation, father. I'll honor it on the dot.",
    'Give me the contract, Zeus. I prefer to receive with documentation.',
  ],
  aquarius: [
    'Why give at all, Zeus? Help me understand the architecture.',
    "I have framework questions, father. Will the receiving still work if I'm critiquing the system?",
    "Help me see what giving is for, Zeus. Then I'll know how to receive.",
  ],
  pisces: [
    "I'll receive what you give, Zeus. I trust the tide.",
    "Pour, father. I'll hold what stays. I'll let go what doesn't.",
    'I trust the giving, Zeus. Tell me when to hold tighter.',
  ],
} as const;

// ──────────────── Apollo (Tiferet) ────────────────

const apollo = {
  aries: {
    pass: [
      'You moved toward the light without stopping to ask its direction. The light moved toward you too.',
      'Your aim was straight at the source. The sun answers that kind of arrow. Aligned.',
      'Quick light. Quick eye. The two met. Few do.',
    ],
    fail: [
      "You charged the riddle and the riddle moved. Apollo's questions don't wait for the answer to catch up.",
      'The oracle speaks in time. You spoke before time caught up. The song missed your beat.',
      "You ran at the answer. The answer moved. Oracles aren't races.",
    ],
  },
  taurus: {
    pass: [
      'You took the slow road to the bright place and arrived in tune. The lyre and the earth agreed.',
      "You walked to the temple at the temple's own pace. The doors were open when you arrived. Aligned.",
      'Slow steps. Right tune. The lyre played itself when you got there.',
    ],
    fail: [
      "You stayed where the sound was familiar. Familiar isn't always the harmony I'm asking for.",
      "The note you were used to wasn't the note the song needed. You held the comfortable one. The chord didn't form.",
      'You stayed in the old harmony. The new one came and went. You heard echoes of it and called them the song.',
    ],
  },
  gemini: {
    pass: [
      'You translated the oracle into both your voices and they agreed. Even Loxias smiles.',
      'Your two readings of the oracle were duets, not arguments. The harmony held. So did the meaning.',
      'Two voices. One chord. The oracle is ambiguous; you found the agreement underneath.',
    ],
    fail: [
      'You parsed the riddle into two answers and chose neither. The oracle was ambiguous on purpose. So was the silence.',
      'You said both halves and let neither be the song. Loxias gives you ambiguity to interpret, not to copy.',
      "Both of your voices played. Neither led. The chord was almost there. Almost isn't oracle.",
    ],
  },
  cancer: {
    pass: [
      "You felt the harmony before you heard it and didn't argue with the feeling. The moon and I agreed.",
      'The feeling was the music before the music. You trusted it. Sun and tide can speak the same song. Today they did.',
      'Felt it. Held it. The song followed the feeling. The moon and the sun, one note for once.',
    ],
    fail: [
      "You hid the answer in feelings I couldn't see. Apollo's light reaches inside, but you have to open the door.",
      "The light was outside. The feeling was inside. The door between them stayed shut. Light can't tune what it can't reach.",
      "You felt the song clearly. You wouldn't sing it. Sound needs to leave the body to be music. It stayed inside.",
    ],
  },
  leo: {
    pass: [
      "You stood in my light and let it light you, not your performance. That's the lion at full noon.",
      'You held the throne and the sun at once. The throne caught the light, not the other way around. Aligned.',
      "My light. Your stance. Both true. The lion didn't perform. The light didn't have to.",
    ],
    fail: [
      'You used my light to make your shadow visible. The shadow was impressive. The light was wasted.',
      'The light I gave you was for seeing. You used it for being seen. The song you played was about you, not about the light.',
      "The sun isn't a spotlight. You treated it like one. The shadow you made was correct. The harmony wasn't.",
    ],
  },
  virgo: {
    pass: [
      'You parsed the oracle and the parsing was the answer. Most parse and lose the song. You held it.',
      'You found every comma in the oracle. You also heard the chord. Few do both. Aligned.',
      'Examined. Heard. Answered. Each pass was clean. The oracle approves of precision when it serves music.',
    ],
    fail: [
      "You found the perfect word for the oracle's third clause and missed the chord across all five.",
      'Your reading of the third clause was perfect. Your reading of the song was incomplete. Both matter.',
      'You held the magnifying glass to one note. The chord was the answer. You missed the chord by reading the note.',
    ],
  },
  libra: {
    pass: [
      'You weighed the harmony and chose to step inside it instead of measuring it. The scale stopped, the song started.',
      'You held the scale long enough to know it was even. Then you struck. The strike was the song, not the scale. Aligned.',
      'Weighed once. Then played. Most weigh forever. You let the music start.',
    ],
    fail: [
      'You weighed the scales of the oracle and forgot to play them. Music needs the strike, not just the tuning.',
      "You tuned the lyre with patience. You never plucked it. Tuning isn't the song. Tuning is what comes before.",
      "You held both pans level until the moment passed. The song needs imbalance to move. The scale stayed even. The music didn't start.",
    ],
  },
  scorpio: {
    pass: [
      "You saw under and I saw far. We saw the same harmony from different sides. That's rarer than you think.",
      "You went down to where the song lives. I came from where it's heard. We met inside it.",
      "Different vantage. Same chord. The song doesn't care which side you approach from. Aligned.",
    ],
    fail: [
      "You went too deep and missed the height. Apollo's light reaches everywhere but only if you look up too.",
      'You followed the song under. The song goes both up and under. You only took one direction.',
      'You lowered yourself into the well. The water sang. You forgot the sky also sings. Half a song.',
    ],
  },
  sagittarius: {
    pass: [
      'Your arrow flew far and hit the right note. Two archers in the field — both struck home.',
      'You shot far. The arrow vibrated at the right pitch when it landed. The note you struck was mine. Aligned.',
      'Long arrow. True chord. We shoot the same instrument, in different ways. You hit it right.',
    ],
    fail: [
      "You aimed at the philosophy and the harmony was elsewhere. The arrow was far. Apollo's light was farther.",
      'You shot at meaning. The song was at the body. You overshot the song looking for the meaning.',
      'You aimed for the cosmos. The chord was in the room. The arrow flew past it into theory.',
    ],
  },
  capricorn: {
    pass: [
      'You built the staircase to my temple and then knew when to stop building and listen. Most just keep building.',
      'You scaffolded the approach. Then you stepped inside. The structure became the entrance, not the obstacle. Aligned.',
      'Built. Climbed. Listened. The order was right. The song was waiting at the top.',
    ],
    fail: [
      "You constructed the perfect approach to the oracle. The oracle had moved. Climbing isn't tuning.",
      "The temple you built was beautiful. The oracle wasn't in it. You'd built around the wrong center. The song was elsewhere.",
      'You built every measure of the scaffolding. The chord was meant to play in the open air, not inside the structure. The song needed less, not more.',
    ],
  },
  aquarius: {
    pass: [
      'You questioned the framework of the oracle and then heard the music inside it anyway. The new frame still tunes.',
      "You retuned my lyre to a scale I don't usually use. Then you played a chord that worked anyway. Strange. Aligned.",
      'Asked. Reframed. Still heard the song. The oracle bends. Few make it bend that far.',
    ],
    fail: [
      "You retuned the lyre to a scale you'd invented. The lyre played. The chord didn't carry. New scale, same silence.",
      "You proved the oracle should be different. The new oracle is your design. The old one is still mine. We're singing past each other.",
      'You built a different scale. The new scale has no songs in it yet. The original still does. You walked away from both.',
    ],
  },
  pisces: {
    pass: [
      "You let my light through you without naming it. The naming wasn't the work. The receiving was.",
      'My light entered you and bent. The bending was correct. The water knew what to do with brightness. Aligned.',
      "Came through. Stayed through. You didn't catch it; you let it pass. The song moved on, leaving you in tune.",
    ],
    fail: [
      'You floated in the harmony and forgot to choose a note. Music is choosing. So is the oracle.',
      'You merged with the song. The song needs you to be separate enough to hear it. You became it. Now no one is listening.',
      'You let the music become water. Water has no notes. The song needs structure. You dissolved the structure with the receiving.',
    ],
  },
} as const;

const apolloPlayer = {
  aries: [
    "Tell me where the light is, Apollo. I'll run there fastest.",
    "Point me at the source, Apollo. I'll be there before the question.",
    "Where's the chord, Apollo? I'll strike it first.",
  ],
  taurus: [
    "Sing it slow, Apollo. I'll hear it when I'm ready.",
    'Patient ear, Apollo. Take your time tuning.',
    "Let the chord settle, Apollo. I'll receive it ground up.",
  ],
  gemini: [
    'Two interpretations, Apollo. Tell me which one Loxias meant.',
    'Two readings, Apollo. Which one tunes?',
    'Both halves of me are interpreting, Apollo. Help me choose the chord.',
  ],
  cancer: [
    "I feel it, Apollo. I just need you to name what I'm feeling.",
    "Name the feeling, Apollo. I'll know it when I hear it spoken.",
    "Help me read the song under the feeling, Apollo. I'll trust your translation.",
  ],
  leo: [
    "Light me up, Apollo. Make sure the audience knows I'm the one you chose.",
    'Brighten me, Apollo. The audience should see the chord clearly.',
    "Make the song about the king, Apollo. I'll wear it well.",
  ],
  virgo: [
    "I've parsed the oracle's three clauses, Apollo. Tell me which one carries the chord.",
    "Detail the harmony, Apollo. I'll catalog each interval.",
    "Spec the song for me, Apollo. I'll honor the structure exactly.",
  ],
  libra: [
    'Both interpretations are beautiful, Apollo. Help me choose the one to live in.',
    'Two readings, both fair. Which one sings, Apollo?',
    'Help me see which interpretation holds, Apollo. Both are tuned. Neither has played.',
  ],
  scorpio: [
    "I see what's hidden, Apollo. Help me see what's at the surface.",
    'Depth is mine, Apollo. Tune me to the surface.',
    'I know the underground harmony, Apollo. Show me how it sounds in daylight.',
  ],
  sagittarius: [
    'I see the long view, Apollo. Show me which target is yours.',
    'Long aim loaded, Apollo. Tell me where to land it.',
    "What's the cosmic chord here, Apollo? I'll aim my arrow at the right pitch.",
  ],
  capricorn: [
    "Give me the spec for the harmony, Apollo. I'll build it true.",
    "Specs for the chord, Apollo. I'll execute.",
    "Detail the structure, Apollo. I'll build the oracle properly.",
  ],
  aquarius: [
    'What if your harmony is one of many, Apollo? Help me hear the others too.',
    'Are there parallel oracles, Apollo? Help me tune to one.',
    "What if the chord is contingent, Apollo? Show me which scale we're in.",
  ],
  pisces: [
    "Speak me into clarity, Apollo. I'll come up to where the light is.",
    "Tune me up, Apollo. I'll surface to the chord.",
    "I'm in the water, Apollo. Help me find the note above it.",
  ],
} as const;

// ──────────────── Aphrodite (Netzach) ────────────────

const aphrodite = {
  aries: {
    pass: [
      "You charged the want and didn't pretend you were charging anything else. Honest fire. Yes.",
      'You reached for what you wanted with your whole hand. Not your mind first. Yes.',
      'You wanted hot. You said hot. You took hot. Aligned with yourself. Rare.',
    ],
    fail: [
      'You wanted to be fast more than you wanted what you wanted. The two are different. The fire knows.',
      "You confused velocity with desire. They look alike. They aren't. You burned in the wrong direction.",
      'You chased something. Not the thing you wanted. Speed makes that mistake. So do you.',
    ],
  },
  taurus: {
    pass: [
      'You touched what you wanted slowly enough to mean it. The body knew before the mind did. Yours.',
      'You took your time finding the want. The want took its time letting you. The body knew the schedule. Yes.',
      'Slow want. Real want. The hand stayed on the skin until the meaning settled. Held.',
    ],
    fail: [
      "You held the want like a thing you owned. Want isn't possession. Try opening the hand.",
      "You wanted to keep what you wanted. Want doesn't stay kept. It moves through. You strangled it.",
      'The want was in your hand. You closed it. The want went to sleep. Still there. Not awake.',
    ],
  },
  gemini: {
    pass: [
      "You said the want three ways and meant it all three. That's harder than one way well. Yes.",
      'Both your voices wanted the same thing in different words. Three songs. One body. Yes.',
      'Three names. One want. You found the agreement underneath the words. Most just stay in the words.',
    ],
    fail: [
      'You named the want in three voices and one of them was lying. I heard it. So did you.',
      "Two of you wanted it. One of you was performing. I can tell. Want doesn't perform — it just wants.",
      "You spoke the want beautifully. The body wasn't speaking. The body is what I listen to. The body was quiet.",
    ],
  },
  cancer: {
    pass: [
      'You felt the want before you said it and you said it anyway. That door is hard to open. You opened it.',
      "The want came up through you like tide. You let it out. You didn't pull it back. Yes.",
      "Felt it. Said it. Trembled when you said it. Said it anyway. That's the courage of the want.",
    ],
    fail: [
      'You wanted but stayed in the shell. The want stayed there too. Both of you went hungry.',
      'You protected yourself from being seen wanting. The want needed witness to live. You denied it both. It died politely.',
      'The want was looking for a way out. You kept the windows shut. The room got hot. Then cold. The want dissolved.',
    ],
  },
  leo: {
    pass: [
      "You wanted in front of everyone and meant it as much as if no one watched. That's the king of want.",
      'You declared the want from your own throne. The audience was incidental. The want was the point. Yes.',
      "Loud want. True want. Both at once. The crown didn't perform. The desire didn't either.",
    ],
    fail: [
      'You performed the want for the audience. They applauded. The want sat empty.',
      'The performance was magnificent. The want was somewhere else, watching you mime it. Empty room.',
      'You staged the wanting. Beautiful production. The want was in the wings, waiting to be invited on. Never came on.',
    ],
  },
  virgo: {
    pass: [
      "You found everything wrong with what you wanted and wanted it anyway. That's the harder yes.",
      'You catalogued the imperfections. Then you reached anyway. The list and the want both stayed true. Few do that.',
      'Inspected. Disagreed with parts. Wanted the whole anyway. Yes — through the inventory.',
    ],
    fail: [
      'You parsed the want into reasons not to want it. Each reason was correct. The want was correcter.',
      "Three valid objections to wanting it. Want doesn't argue with objections. It just wants. You argued with want and lost.",
      'You footnoted the want into invisibility. The footnotes are correct. The want was the body of the text. You lost it.',
    ],
  },
  libra: {
    pass: [
      "You weighed the want and chose to want anyway. That's how the scale becomes the song.",
      'You held the scale level. Then you tipped it on purpose. Want moves things. You let it move you.',
      'Considered both sides. Wanted one of them. The choosing was the wanting. Yes.',
    ],
    fail: [
      "You wanted both sides equally and chose neither. Want isn't fair. Want commits.",
      'You held both wants in your hands so neither would feel slighted. Both went cold. Want needs to be picked up.',
      'You kept the scale in equilibrium. Want needs disturbance. You preserved the balance. The want left.',
    ],
  },
  scorpio: {
    pass: [
      "You wanted in the dark and brought the want into daylight when I asked. That's the harder honesty. Yes.",
      'The want lived underground. I said come up. You came up with it. Both of us blinked. Honest yes.',
      "You wanted in private. You said the want in public. Two different acts. You did both. Most can't.",
    ],
    fail: [
      "You held the want secret because you wanted to keep it dangerous. Dangerous want is still want, but it doesn't transform.",
      "You preferred the want shadowy. Shadowy wants stay the same. The light is what changes them. You wouldn't let it through.",
      "You kept the want in the vault. The vault preserves. It doesn't grow. You kept the want at the size you found it.",
    ],
  },
  sagittarius: {
    pass: [
      'You wanted the small thing and the big thing at once and let them be the same. Both burn well.',
      'You aimed at the cosmos and the body at the same target. The arrow knew both meanings. Yes.',
      'Big want. Small want. You held them both true. Most pick one and lie about the other.',
    ],
    fail: [
      'You wanted the cosmic want and forgot the body wanting. The body matters. So does the cosmos.',
      'You wanted the meaning of want. Meaning is for after. Want is for now. The body was waiting; you were elsewhere.',
      'You traveled toward the great want and forgot the small want at home. The home want went hungry. The big want was unreachable.',
    ],
  },
  capricorn: {
    pass: [
      "You built the long want and meant every brick. Most build the structure and forget the love. You didn't.",
      'The architecture you made had the want at its center. Not as ornament. As foundation. The house works.',
      'Built. Stayed. Wanted through the years. The slow want is the strongest want. Yes.',
    ],
    fail: [
      "You constructed the perfect arrangement around someone you didn't want. The architecture was fine. The room was empty.",
      "The plan was sound. The want wasn't there. You executed the form perfectly and forgot to love the content.",
      "You planned for love. The plan didn't include actually wanting. Beautiful schematic. Empty home.",
    ],
  },
  aquarius: {
    pass: [
      'You questioned what wanting even means and wanted anyway. The questioning made the wanting stronger, not weaker.',
      'You disagreed with the concept of want. Then you touched anyway. The body answered the philosophy. Yes.',
      'Asked. Doubted. Wanted regardless. The hardest yes. You said it.',
    ],
    fail: [
      "You wrote desire out of the equation. The equation is consistent. The body left the room while you proved it. The bed's empty.",
      "You proved want was a construct. The proof is rigorous. The body didn't read the proof. The body still wanted. You ignored the body.",
      'You drew a better diagram of love. The diagram is excellent. The bed is cold. The body was the point.',
    ],
  },
  pisces: {
    pass: [
      "You let the want come through you and didn't try to own it. That's what love looks like at the source. Yes.",
      "The want flowed through you. You didn't dam it. You didn't run from it. You were the river it moved through. Yes.",
      'It came in. It moved through. Some stayed. Some passed. You loved with the shape of water. Yes.',
    ],
    fail: [
      'You loved everything and named nothing. The naming is the holding. Without it, the love runs out.',
      'Everything became want. Nothing stayed specific. Specific is what makes the want a want. You diluted it into nothing.',
      'You wanted in the plural. The body wants in the singular. You diluted the want across many until none of them got fed.',
    ],
  },
} as const;

const aphroditePlayer = {
  aries: [
    "Tell me what to want, Aphrodite. I'll burn for it.",
    "Point me at the want, Aphrodite. I'll arrive on fire.",
    "I'm ready to want, goddess. Just name the want. I move fast.",
  ],
  taurus: [
    "Slow, Aphrodite. I'll find the want when I taste it.",
    'Let me touch first, Aphrodite. The body knows.',
    'Patience, goddess. The good wants reveal themselves slowly.',
  ],
  gemini: [
    'I have several wants, Aphrodite. Help me sort the real ones.',
    "Three wants on the table, goddess. Which one's mine?",
    'My voices are arguing about what to want, Aphrodite. Which is honest?',
  ],
  cancer: [
    "I want this, Aphrodite. I just need to know it's safe to say.",
    "Tender want, Aphrodite. Tell me when it's safe.",
    "Hold the room for me, goddess. I'll say what I want when I trust the air.",
  ],
  leo: [
    "Watch me want, Aphrodite. I'll do it grandly.",
    "Grand want, goddess. I'll declare it with the lights up.",
    "Tell me what's worth wanting, Aphrodite. I'll want it like the throne.",
  ],
  virgo: [
    'I have concerns about this want, Aphrodite. Are they fair concerns?',
    'My objections, goddess. Are they grounds to refuse?',
    'List the imperfections with me, Aphrodite. I want to want correctly.',
  ],
  libra: [
    'Both wants are beautiful, Aphrodite. Help me choose the one to live in.',
    'Both options shine, goddess. Which one wants me back?',
    'Help me see which want is mine to keep, Aphrodite. The choice is the romance.',
  ],
  scorpio: [
    "I'll tell you what I want, Aphrodite. But only you. Don't make me say it twice.",
    "I'll whisper the want, goddess. Keep it close.",
    'My want is dark, Aphrodite. Help me see if it survives the daylight.',
  ],
  sagittarius: [
    "Tell me what's worth wanting, Aphrodite. I'll aim there.",
    "What's the cosmic want here, goddess? I'll aim at it.",
    "Show me the bigger desire, Aphrodite. I'll burn at scale.",
  ],
  capricorn: [
    "Give me the spec, Aphrodite. I'll build the want properly.",
    "Specs for the want, goddess. I'll execute the desire.",
    "Detail the long want, Aphrodite. I'll build it to last.",
  ],
  aquarius: [
    'What if want is socially constructed, Aphrodite? Help me see past the construction.',
    'Maybe wanting is conditional, goddess. Help me through the questioning.',
    'What if want has different rules, Aphrodite? Help me find the ones I can live by.',
  ],
  pisces: [
    "I'm in the want already, Aphrodite. I have been for some time.",
    "You don't need to introduce me, goddess. I've been wanting for a while.",
    'Tell me which want this is, Aphrodite. They blur together in me.',
  ],
} as const;

// ──────────────── Selene (Yesod) ────────────────

const selene = {
  aries: {
    pass: [
      "You stopped charging long enough to dream, and the dream came. I didn't think you would. The orbit returns.",
      'You held still long enough for the moon to land on you. Most run too fast for that. The light caught up.',
      'Slow once. Looked. The dream visited. The orbit knew where to find you.',
    ],
    fail: [
      "You wanted the dream by daylight. The moon doesn't work then. You'll have to wait until I come back.",
      "You asked the dream to hurry. Dreams don't hurry. They come at moon-pace. You weren't there.",
      'You ran toward the dream. The dream came back the way I came — quietly, behind. You missed it from in front.',
    ],
  },
  taurus: {
    pass: [
      "You let the dream settle into your body and stayed there until I'd shown you everything. The cycle holds.",
      'You slept like the earth. The moon visited the whole length. Few stay still that long. The orbit thanks you.',
      'Stayed. Dreamed. Stayed dreaming. The dream had time to finish. Returns.',
    ],
    fail: [
      "You held the dream like a possession instead of letting it pass through. The moon visits; she doesn't move in.",
      'You kept the dream in your hands too tight. It went still. The moon prefers a guest, not a tenant. Mine left.',
      'You stored the dream like grain. Grain rots without air. Dreams need to move through. Yours stayed and spoiled.',
    ],
  },
  gemini: {
    pass: [
      'You woke up and remembered both halves of the dream. Most lose one in the telling. Cycle held.',
      'You caught the dream from both angles. Twin observers. Same light. Both reports true. Returns.',
      'Two of you dreamed. Both remembered. Most twins lose half the dream. You kept the whole.',
    ],
    fail: [
      'You started narrating the dream while I was still inside it. The moon left. So did the answer.',
      "You talked over the visit. The moon doesn't compete with talking. She gave you space, then left.",
      'You interpreted the dream as it happened. The interpretation became louder than the dream. The dream gave way.',
    ],
  },
  cancer: {
    pass: [
      "You felt the dream and didn't try to make it logical. That's how my visits work. You and I are the same moon.",
      "My visit and your feeling rose at the same hour. Of course they did. We're the same body of water.",
      'You felt me before I came. I came anyway. The cycle works that way for you and me.',
    ],
    fail: [
      'You hid in the dream instead of receiving it. The shell closed. The light went elsewhere.',
      "You went into the dream and pulled the dream around you. Dreams aren't blankets. They're visits. The visitor turned away.",
      "You wanted the dream to feel safe before you'd receive it. Dreams aren't safe. They're true. You wouldn't let it through.",
    ],
  },
  leo: {
    pass: [
      "You let the moon visit while the audience slept. That's the secret performance. Only you saw it. Cycle held.",
      'You were a king at three in the morning. No witnesses. The visit was for you. The throne held quietly.',
      "You stayed up alone. The moon came. No one else saw. You didn't need them to. Returns.",
    ],
    fail: [
      "You wanted the dream on stage. The moon doesn't share her stage. You woke up to silence.",
      "You set up the dream like a performance. Moonlight isn't spotlight. The light I bring doesn't dramatize. It just falls. You demanded drama.",
      'You wanted the dream big. The moon prefers small. The dream came small. You looked past it for the spectacle. It left.',
    ],
  },
  virgo: {
    pass: [
      "You parsed the dream and the parsing didn't break it. Most break the dream by parsing. You held it whole.",
      'You took the dream apart with care. Then you put it back together. Most can do one. You did both. Cycle held.',
      'Examined every piece. Returned every piece. The dream still breathes. Few perform that surgery without killing it.',
    ],
    fail: [
      'You analyzed the dream into symbols and the dream stopped being a dream. Parse later. Receive first.',
      'You translated the dream into symbols before it finished arriving. Translation outpaced the visit. The dream itself was lost in transit.',
      "You pinned the dream to the page to study it. Pinned things don't fly. The dream stopped being itself. The moon went elsewhere.",
    ],
  },
  libra: {
    pass: [
      "You weighed the dream against your day and let both be true. That's how you walk in moonlight. Returns.",
      'You held the dream and the day in the same hands. Neither dropped. Few hold both lights without choosing.',
      'Day. Dream. Both true. You walked between them without forcing them to agree. The orbit approves.',
    ],
    fail: [
      "You wanted the dream to make sense in waking terms. The moon and the sun don't speak the same language.",
      "You asked the dream for fairness in daylight courts. Dreams don't appear in courts. They visit. The visit didn't translate.",
      "You held the dream up to the day for comparison. They aren't comparable. The scale tilted away from both. The dream slipped off.",
    ],
  },
  scorpio: {
    pass: [
      "You went into the dream instead of just receiving it and brought back what was buried. That's harder than the visit. Cycle held.",
      'You went down with the dream. You came up with what the dream protected. Few do the deep visit. The moon respects it.',
      'Dreamed deeper. Returned with weight. The dream had something hidden. You found it. So did I.',
    ],
    fail: [
      'You held the dream secret to make it stronger. Dreams stay alive by being shared with the moon. Mine got cold.',
      'You buried the dream where no one — not even me — could find it. Buried dreams stop dreaming. The moon needs the company too.',
      'You sealed the dream away for safekeeping. The vault preserves silence. The dream stopped speaking. To you. To me. Both.',
    ],
  },
  sagittarius: {
    pass: [
      'You took the dream as a vision and the vision was true. The arrow flew through both worlds. Cycle held.',
      'You aimed at meaning and the dream gave you both meaning and itself. Two birds. One arrow. The orbit returned with you.',
      'Took the dream big. The dream stayed real. Most lose the small while taking the big. You held both.',
    ],
    fail: [
      'You wanted the dream to mean something cosmic. Sometimes the dream is just the moon visiting. You missed the visit.',
      'You searched the dream for cosmic significance. The dream was significant in being there. You looked past the visit for the message.',
      'You used the telescope on the moon. The moon was at the window. You missed her looking for what she was reflecting.',
    ],
  },
  capricorn: {
    pass: [
      'You stopped scheduling the moon long enough to let her visit. The cycle was always going to come. You finally let it.',
      'You set down the planner. The moon arrived in unscheduled time. The visit happened anyway. Cycle held — your way of letting it.',
      'You waited without a deadline. The moon came when she came. You were finally available. Returns.',
    ],
    fail: [
      "You waited for the dream at the time you'd planned. The moon was elsewhere. She doesn't keep appointments.",
      'You allotted the dream a time slot. The dream operates on lunar time, not your calendar. The slot stayed empty. So did the dream.',
      "You set an alarm for the visit. Alarms don't work on moonlight. The moon visits when she visits. You missed her by being on schedule.",
    ],
  },
  aquarius: {
    pass: [
      'You questioned whether dreams mean anything and let the dream visit anyway. The dream answered the question by coming.',
      'You disagreed with the entire concept of dreams. Then you dreamed, and the dream made the questioning irrelevant — without answering it. Returns.',
      "Doubted. Visited anyway. The visit didn't argue. It just was. You let it. Few skeptics do.",
    ],
    fail: [
      'You re-derived dreams into a brain-state and missed me visiting. The brain-state was correct. So was the visit. Both.',
      'You explained dreams as neurology with rigor. The neurology is real. The visit is also real. You only made room for one.',
      'You drew the moon as a map of light frequencies. The map is correct. The moon was at your window. You were studying the map.',
    ],
  },
  pisces: {
    pass: [
      "You dissolved into the dream and came back with it. That's the harder thing. Most stay there. You returned.",
      "You went out with the dream. You came back with the tide. Most who dissolve don't reform. You did. Returns.",
      "In. Through. Back. Three motions. You did all three. The moon visited and didn't lose you.",
    ],
    fail: [
      "You drowned in the dream and forgot to wake up. The moon visits; she doesn't move you in.",
      "The dream became the room. The room became you. You weren't separate enough to come back from it. The visit lasted past the visit.",
      "You let the dream take you out to sea. The sea was beautiful. The shore is also part of the cycle. You didn't return. The moon visited an empty bed.",
    ],
  },
} as const;

const selenePlayer = {
  aries: [
    'Show me, Selene. Make it quick — I sleep light.',
    "Visit fast, Selene. I won't keep you long.",
    "Send the dream, goddess. I'll grab the meaning and keep moving.",
  ],
  taurus: [
    "Stay a while, Selene. I dream best when nothing's rushed.",
    'Long visit, Selene. I sleep deep.',
    'Take your time, goddess. The body knows how to receive.',
  ],
  gemini: [
    'Two dreams tonight, Selene. Help me see which one you sent.',
    'Two visits, Selene? Or just one with two faces?',
    'Tell me which dream is yours, goddess. The other might be mine.',
  ],
  cancer: [
    'I feel you, Selene. I always have. Tell me what you came to say.',
    "Sister moon, you're here. I knew. Speak.",
    "I've been waiting for the visit, goddess. The body knew. Tell me.",
  ],
  leo: [
    "Light me up, Selene. I'll wear your dream where everyone can see it.",
    "Big dream, Selene. I'll show it off for you.",
    "Send a dream worth the throne, goddess. I'll perform it loudly.",
  ],
  virgo: [
    'I logged each visit by phase, Selene. Which one do you want me to bring forward?',
    "Detail the visit, Selene. I'll record each part.",
    'Item by item, goddess. I want to honor every fragment.',
  ],
  libra: [
    'Is the dream balanced, Selene? I want to live by it without losing the day.',
    'Help me weigh the dream, goddess. I want both to hold.',
    "Tell me how dream and day balance, Selene. I'll honor the proportion.",
  ],
  scorpio: [
    "Show me what's under the dream, Selene. I'll bring it back up.",
    "Depth-dream, goddess. I'll fetch what's buried.",
    "Send me into the dream, Selene. I'll come back with what the moon hid.",
  ],
  sagittarius: [
    "What's the dream telling me, Selene? I'll aim where you point.",
    'Big meaning, Selene? Or just the visit?',
    "What's the cosmic thread of this dream, goddess? I'll follow it far.",
  ],
  capricorn: [
    "Tell me when you'll visit, Selene. I'll keep the hour open.",
    "Schedule the visit, Selene. I'll clear my evening.",
    "Give me the lunar calendar, goddess. I'll structure my receiving around it.",
  ],
  aquarius: [
    'What if dreams are just neurons, Selene? Help me see why this one feels different.',
    'Maybe dreaming is biology, goddess. Why does this one feel like a visit?',
    'What if the visit is a metaphor, Selene? Help me see if it still teaches.',
  ],
  pisces: [
    "I'm in the dream already, Selene. I have been all night.",
    'Visiting myself in the dream, Selene. Come find me.',
    'I dissolved hours ago, goddess. Help me find the shore again.',
  ],
} as const;

// ──────────────── Aggregated matrices ────────────────

export const sefirahVerdicts: VerdictMatrix = {
  hod: hermes,
  binah: demeter,
  chokmah: athena,
  gevurah: ares,
  chesed: zeus,
  tiferet: apollo,
  netzach: aphrodite,
  yesod: selene,
} as const;

export const sefirahPlayerResponses: PlayerResponseMatrix = {
  hod: hermesPlayer,
  binah: demeterPlayer,
  chokmah: athenaPlayer,
  gevurah: aresPlayer,
  chesed: zeusPlayer,
  tiferet: apolloPlayer,
  netzach: aphroditePlayer,
  yesod: selenePlayer,
} as const;

// ──────────────── Pickers ────────────────

/**
 * Pick a uniform variant of the avatar's verdict for the given
 * (sefirah, sign, outcome) from the supplied verdict matrix. Calls
 * `rng.int(0, n - 1)` once. Throws if the matrix has zero variants
 * for the cell — by construction this can't happen (every cell has
 * 3), but the throw surfaces a data drift loud rather than returning
 * an empty string.
 *
 * Matrix-as-parameter shape lets the caller route to the active
 * pantheon's verdicts via `usePantheon().pantheon.sefirahVerdicts` —
 * the picker is pantheon-agnostic. Phase A4 (#550) refactored this
 * from the prior closure-over-`sefirahVerdicts` form so Phase B
 * (Egyptian) doesn't need a separate picker per pantheon.
 */
export function pickVerdict(
  matrix: VerdictMatrix,
  sefirah: EncounterAvatarKey,
  sign: ZodiacSignKey,
  outcome: ChallengeOutcome,
  rng: Rng,
): string {
  const variants = matrix[sefirah][sign][outcome];
  if (variants.length === 0) {
    throw new Error(
      `pickVerdict: no variants for sefirah=${sefirah} sign=${sign} outcome=${outcome}`,
    );
  }
  const idx = rng.int(0, variants.length - 1);
  // Non-null assertion safe: idx is in [0, length-1] and arrays of
  // string have no holes here (frozen literal data above).
  return variants[idx] as string;
}

/**
 * Pick a uniform variant of the player's pre-roll line for the
 * given (sefirah, sign) from the supplied response matrix. Same
 * shape as `pickVerdict` — see that function's doc-comment for the
 * matrix-as-parameter rationale.
 */
export function pickPlayerResponse(
  matrix: PlayerResponseMatrix,
  sefirah: EncounterAvatarKey,
  sign: ZodiacSignKey,
  rng: Rng,
): string {
  const variants = matrix[sefirah][sign];
  if (variants.length === 0) {
    throw new Error(`pickPlayerResponse: no variants for sefirah=${sefirah} sign=${sign}`);
  }
  const idx = rng.int(0, variants.length - 1);
  return variants[idx] as string;
}
