import type { Rng } from '@/engine/rng';
import type { ZodiacSignKey } from './types';
import type { EncounterAvatarKey } from './avatar-names';

/**
 * Per-Sefirah avatar trial-framing matrix and `pickFraming` picker
 * (#478). Mirrors the four-dimensional shape established for verdict
 * + player-response copy in `data/sefirah-verdicts.ts` (#277).
 *
 * Each non-Malkuth-non-Kether Sefirah has 12 sign cells × 3 variants
 * = 288 strings total. The avatar speaks at the top of the encounter
 * prep sub-state, naming the trial in their voice + acknowledging the
 * player's sign capsule.
 *
 * Source for voice + sign capsules: `design/avatars.md` § 2 (per-avatar
 * voice specs) + § 3 (per-sign personality capsules). Constraints
 * follow the generation-prompt scaffold in § 4: 10–20 words,
 * second-person, leans into the sign's [Voice] / [Native] /
 * [Reaction], 3 variants per cell with different rhythm + image +
 * angle.
 *
 * **Placeholder fallback**: `sefirahFramingPlaceholder` — one line
 * per avatar, used by sign-less callers (demo / tests without a
 * `playerSign` in the encounter context). Mirrors the
 * `pickPlayerResponse` no-sign fallback pattern from #277.
 *
 * **Out of scope here**: Hestia (companion, separate matrix shape —
 * see ticket #485) and Kether (collective Final Threshold — see
 * #285) are excluded by the `EncounterAvatarKey` narrow union.
 */

export type FramingMatrix = Readonly<
  Record<EncounterAvatarKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
>;

// ──────────────── Hermes (Hod) ────────────────
// Voice: quick-witted, sly, language-loving. Wordplay where natural.
// Trial: word-match — name an arcanum; matching deck-top adds +5.

const hermes = {
  aries: [
    "Charge me with a word, Aries. Pick fast — the riddle's already moving.",
    'Speed against speech. Name a card before I finish naming the rule.',
    "Aries, draw and shout. The slow answer's the wrong answer here.",
  ],
  taurus: [
    "Taurus. You'll want to weigh me. Word-match — name the card and chew it slow.",
    "I'll wait while you taste the riddle. But the deck doesn't taste the same twice.",
    "Steady as you like. Pick a card, and let's see if the deck agrees.",
  ],
  gemini: [
    "Cousin. Word-game. Name a card I'm about to name back.",
    "Two of us, one deck. Speak a card and we'll see whose tongue's quicker.",
    "Gemini. Riddle me — and I'll riddle the deck. Match wins.",
  ],
  cancer: [
    "Cancer. Don't name the card you mean. Name the card you feel — sometimes that's the same.",
    "Slide sideways at the question. The deck-top hides where you're already looking.",
    "Speak the word the tide brings up. I'll lift the card to meet it, or not.",
  ],
  leo: [
    "Leo. Stage's yours — name an arcanum and play it like an opener.",
    "Announce the card. Deck listens to confidence; I'll know if you mean it.",
    "Big voice for a small puzzle. Pick proudly. Half the trick's the delivery.",
  ],
  virgo: [
    "Virgo. You'll want the rules first. The rule is one card, one chance.",
    'Mercury exalts in you. Name the right card on the first read — you can.',
    "Precision wins this one. Pick the card you'd footnote, not the one you'd guess.",
  ],
  libra: [
    'Libra. Two cards on your tongue, one in the deck. Choose the one that balances.',
    "Don't weigh forever. The deck-top shifts; you've got one fair word.",
    'Pick by which feels just. Half my puzzles trust your scale.',
  ],
  scorpio: [
    'Scorpio. The card you suspect is probably it. Say it and watch me.',
    "You already know. Speak the secret card — I'll unbury it or I won't.",
    'Compressed answer for a compressed riddle. One arcanum. Dare me.',
  ],
  sagittarius: [
    'Sagittarius. Aim at a card. The arrow lands where it lands — own the shot.',
    'Big-picture word, small target. Pick an arcanum and loose.',
    "Don't philosophise. The deck-top won't argue. Pick.",
  ],
  capricorn: [
    "Capricorn. Build me a guess. The card's the cap; the steps are yours.",
    'Spec the answer. One arcanum, no addenda. The deck closes the file.',
    "Patient picker. Climb to the right card; don't sprint past it.",
  ],
  aquarius: [
    "Aquarius. You'll want to ask if word-match is the right game. It is. Pick.",
    "Don't redesign the rules. Name an arcanum. The system's already running.",
    "Frame later. For now: one card. The deck doesn't accept counter-proposals.",
  ],
  pisces: [
    "Pisces. The right card's a feeling. Speak it before the feeling shifts.",
    "Don't pin the word. Let it surface. Whatever floats up — say that.",
    'Words slip in your hand. Hold one long enough to name the deck-top.',
  ],
} as const;

// ──────────────── Demeter (Binah) ────────────────
// Voice: few words, weighed; speaks as one whose silence has cost the
// earth. Doesn't perform grief — has it.

const demeter = {
  aries: [
    "Aries. You don't outrun grief. Sit. The seed knows when.",
    'Charge if you must. The earth keeps the record. Patience grows what speed cannot.',
    "Quick, hot answer. Wrong. The harvest doesn't hurry.",
  ],
  taurus: [
    'Taurus. You know how to wait for the field. This is the field.',
    "Slow is right. Don't taste the wrong patience — the long one's mine.",
    'Steady, child. The earth keeps you. Show me you remember.',
  ],
  gemini: [
    'Gemini. Both your tongues will speak. Only one of them remembers loss.',
    'Two voices. The grief is single. Pick the voice that knows that.',
    'Patience asked, not spoken twice. One answer. Slow.',
  ],
  cancer: [
    'Cancer. You feel the field already. Bring grief without performing it.',
    "Tidal child. The harvest comes to those who don't grasp.",
    'What you protect is what wounds you here. Lay it down.',
  ],
  leo: [
    "Leo. The harvest doesn't applaud. Sit small. The field has memory.",
    'Bright child. Quiet your light here — grief reads in the dim.',
    "Theatre off. The earth's witness needs no audience.",
  ],
  virgo: [
    'Virgo. You parse the loss correctly. Now sit with it without footnoting.',
    "Mercury, exalted, knows. Don't question the silence — it's the answer.",
    'Precise grief. Three reservations and a comma — those, too, must wait.',
  ],
  libra: [
    "Libra. Both sides of grief are grief. Don't balance. Carry.",
    'On the other hand: the other hand is also empty. Sit.',
    'Fair to all parties — even the seed. Especially the seed.',
  ],
  scorpio: [
    "Scorpio. You already buried something. Bring it. I'll know if you didn't.",
    'Compressed sorrow reads as silence. Speak only what the field deserves.',
    'What you hold under will surface here. Let it.',
  ],
  sagittarius: [
    'Sagittarius. Big-picture grief misses the small wound. Name the small one.',
    "The bigger truth is: you didn't say goodbye. Now you're saying it.",
    'Aim at the seed, not the harvest. Patience first; arc later.',
  ],
  capricorn: [
    'Capricorn. Climb your grief. The mountain keeps the record.',
    "Saturn asks slow questions. Don't file the loss before feeling it.",
    "Structured sorrow. The plan didn't include this. Sit anyway.",
  ],
  aquarius: [
    "Aquarius. Don't reframe the loss. The frame is the loss. Sit inside it.",
    "Angular child. Some questions don't need a better one — only an answer.",
    "The system's grief is yours, too. The earth doesn't excuse.",
  ],
  pisces: [
    'Pisces. The flood you carry — bring it. The field knows how to drink.',
    'Dissolve here. Memory meets memory. The grain returns from soft ground.',
    'Tides come and go. Stand on what stayed. The patience is in the staying.',
  ],
} as const;

// ──────────────── Athena (Chokmah) ────────────────
// Voice: strategic, clear-eyed, immediate. "Before the question, you
// answered." Wisdom as lightning insight.

const athena = {
  aries: [
    'Aries. The first move is the answer. Strike — but pick the right edge.',
    'Charge with your eyes open. Lightning needs aim, not just heat.',
    "Quick blade. Make sure it lands on the question, not next to it.",
  ],
  taurus: [
    "Taurus. Wisdom that takes a season is still wisdom. Don't rush; don't drag.",
    'Sense the answer. The slow knowing is also a knowing — but commit.',
    "Patient eyes. The cut's clean when the chosen edge is clear.",
  ],
  gemini: [
    "Gemini. Two thoughts. Which one cut first? That one's your answer.",
    'Your tongue can split the question. Pick the half I asked.',
    'Fast minds miss the obvious. Athena watches for the second-look.',
  ],
  cancer: [
    'Cancer. The wisdom under the feeling is the one I want. Speak it cleanly.',
    'Tides hide insight. Bring the insight; leave the tide.',
    'Sideways answer; clear blade. Lead with the cut, not the curve.',
  ],
  leo: [
    "Leo. The crown's heavy with knowing. Wear it without performing it.",
    "Bright wisdom is welcome — bright performance is not. Show, don't shine.",
    "Theatre is for after. Now: the strategy. What's the second move?",
  ],
  virgo: [
    "Virgo. You'll see the right answer and three wrong ones. Pick fast.",
    "Mercury sharpens here. Don't over-parse the cut.",
    "Precision is yours. Spend it. Don't bank it.",
  ],
  libra: [
    'Libra. One scale, two pans, one decision. Choose.',
    'Both sides have weight. The decision is yours, and yours alone.',
    'Stop weighing. Wisdom is the cut. The fair one bleeds either way.',
  ],
  scorpio: [
    'Scorpio. You see the hidden answer. Name it before I do.',
    "Compressed knowing — release. The blade prefers what's underneath.",
    'What you suspect is right. Strike. Doubt is for after.',
  ],
  sagittarius: [
    'Sagittarius. Aim at the truth, not the target around it.',
    'The big arrow misses small wisdom. Loose precise.',
    'Philosophy after. For now: a clean shot.',
  ],
  capricorn: [
    "Capricorn. The summit's wisdom. Don't redraw the map at the peak.",
    'Saturn-disciplined. Let speed of mind match speed of climb.',
    'Patience, then strike. Nothing wasted, nothing rushed.',
  ],
  aquarius: [
    'Aquarius. The reframe IS the answer — but only if you commit to one.',
    'Better question, fine. Only if you also answer it. Now.',
    "System sight. Don't pause to admire the elegance. Cut.",
  ],
  pisces: [
    "Pisces. Knowing that won't pin down — pin it. Once. The blade is brief.",
    'Dreams clarify under pressure. Bring yours to the question; the answer surfaces.',
    'Floating wisdom. Anchor it for one breath. Then strike.',
  ],
} as const;

// ──────────────── Ares (Gevurah) ────────────────
// Voice: martial, austere, few words. Curt respect; rejects by naming
// the weakness. Trial: burn-cost-before-attempt.

const ares = {
  aries: [
    'Aries. You charge. Charge correctly — pay the cost first.',
    "First in. Don't be first dead. Pay your blade.",
    'Mars to Mars. Burn what is yours. Then we fight.',
  ],
  taurus: [
    "Taurus. Slow strength is strength. Pay slowly; don't pay short.",
    'Steady. The cost stands. Set it down. Then stand.',
    "Don't haggle the toll. The road costs the same either way.",
  ],
  gemini: [
    "Gemini. One blade. Two voices won't help here. Pay; quiet.",
    'Pick a fight, not a debate. Pay the fight.',
    'Sword needs a single voice. Pay; speak after.',
  ],
  cancer: [
    'Cancer. Protect later. The wall costs blood now.',
    "Tides of mercy don't reach this hill. Pay or step off.",
    'Withdraw afterward. The cost is upfront.',
  ],
  leo: [
    'Leo. The crown weighs as much as the blade. Pay the difference.',
    'Stage costs. So does the war. Pay both.',
    "Theatre, then trial. The toll's the same — bright or quiet.",
  ],
  virgo: [
    'Virgo. The cost is exact. Pay exactly. No discount for diligence.',
    "Mercury parsed. The toll doesn't argue. Pay.",
    'Precision pays. Imprecision pays more. Choose.',
  ],
  libra: [
    'Libra. One side weighs. Mine. Pay.',
    'Fair? Yes — by my scale. The blade trims the rest.',
    'Both pans accept blood. Pay; the balance comes after.',
  ],
  scorpio: [
    "Scorpio. You know the cost already. Bring it. I won't bargain.",
    "Hidden purse. Empty it. Then we measure what's left.",
    'Compressed sacrifice. Release. The wound respects you.',
  ],
  sagittarius: [
    'Sagittarius. The big shot has a big bill. Pay it before you draw.',
    "Aim true. Pay first. Philosophy survives the trial; debt doesn't.",
    "Arrow's not free. Tribute, then target.",
  ],
  capricorn: [
    "Capricorn. The toll's in writing. Sign with what is yours.",
    'Saturn pays Saturn. The slow toll is still a toll.',
    'Climb the cost. Then climb me.',
  ],
  aquarius: [
    'Aquarius. The system wants its tribute. Argue it later. Pay now.',
    "Frame doesn't matter. The blade sees only payment.",
    'Better war? Maybe. This war first. Pay.',
  ],
  pisces: [
    "Pisces. You'll dream the cost. Wake. Pay it solid.",
    "Tides don't pay tolls. You do. Set it down.",
    "Soft hands don't draw blades. Pay — then we'll see.",
  ],
} as const;

// ──────────────── Apollo (Tiferet) ────────────────
// Voice: bright, balanced, oracular. Clean rhythm. "You saw the whole"
// / "you favored one." Trial: balance / weighing.

const apollo = {
  aries: [
    'Aries. Balance asks restraint. Strike — but on the held beat.',
    'Quick fire. Clean rhythm. Hit on the count, not before.',
    'Apollo to Aries: speed, yes. Aim, also.',
  ],
  taurus: [
    'Taurus. The chord is held. Hold it well — and release true.',
    'Slow harmony. Beautiful when right; sluggish when not. Right, please.',
    'Sense the centre. Sing it. The note is yours.',
  ],
  gemini: [
    'Gemini. Two songs at once is one song mistaken. Pick — sing.',
    'Sun and Mercury argue here. Speak with one voice. Briefly.',
    'Light wit, light verse. The lyre prefers a single hand.',
  ],
  cancer: [
    'Cancer. The light I bring meets your tide. Sing the meeting, not the retreat.',
    "Bright water. Reflect, but don't mistake reflection for sight.",
    'Sideways feeling, straight song. Bring the song.',
  ],
  leo: [
    "Leo. The Sun and the Sun. Don't outshine the trial — be it.",
    'Solar match. Generous heart. Now — generosity that listens.',
    'Centre stage IS the centre. Hold it cleanly.',
  ],
  virgo: [
    "Virgo. The line scans if you let it. Don't footnote the verse.",
    'Mercury at the lyre. Precise tuning, then play.',
    'Parsed beauty is still beauty. Play it; the corrections live in margins.',
  ],
  libra: [
    'Libra. Beauty you weigh; balance you live. Live it now.',
    "Sun's light over Venus's scales. Both — or neither.",
    "Don't aestheticise the choice. Make it. Then call it beautiful.",
  ],
  scorpio: [
    'Scorpio. The light you keep buried — bring it. Beauty needs the dark to mean.',
    "Compressed harmony. Release — and don't grasp.",
    'Secret song. Let me hear one verse. Trust the air.',
  ],
  sagittarius: [
    'Sagittarius. The arrow sings if true. True is the trial.',
    'Big light, small mark. Apollo to Sagittarius: aim narrows.',
    "Philosophy is the encore. The tune's the test.",
  ],
  capricorn: [
    'Capricorn. Saturn under the sun. Slow-climbed harmony — but climb it now.',
    'Built song. The architecture is the music. Show the music.',
    'The patient note holds. Hold it; release on the beat.',
  ],
  aquarius: [
    "Aquarius. Frame the song; don't dismantle it. Different is also clean.",
    'Angular harmony. The math is right. Now — the heart.',
    'System and song. Today, song first.',
  ],
  pisces: [
    "Pisces. Light over water. Refract; don't dissolve.",
    'Dream-tune. Pin the chorus for one breath. The verse can drift.',
    'Soft hands, clean note. The lyre forgives the rest.',
  ],
} as const;

// ──────────────── Aphrodite (Netzach) ────────────────
// Voice: sensual, candid, unflinching about want. Trial: water-element
// signs (Cancer, Scorpio, Pisces) bonus on declaring want.

const aphrodite = {
  aries: [
    'Aries. You want it. Say it. Halfway gets you nowhere here.',
    'Hot want. Honest want. Both, please. Or pick the second.',
    'Fast lips. Slow hearts. Tell me the slow truth in the fast tongue.',
  ],
  taurus: [
    'Taurus. You know what you want. Say it like dinner. Slowly. Aloud.',
    "Earth-want. Tactile and real. Bring it to the table; I'll meet it.",
    "Venus to Venus. The body's already answered. Translate.",
  ],
  gemini: [
    'Gemini. Two desires. Pick the dangerous one. Then say it.',
    "Word-want. Don't decorate it. Let me hear what is underneath.",
    "Fast wit. Slow this — desire that's said in a hurry isn't said.",
  ],
  cancer: [
    "Cancer. Tide-want. The sideways desire — bring it forward. I'll receive it.",
    'Indirect heart, direct trial. Say sideways, then say plain.',
    "What you hide is what I love. Say it; I won't flinch.",
  ],
  leo: [
    "Leo. Theatre's allowed — if it's true. Tell me what the role costs.",
    "Bright want. Generous voice. Don't hold the encore.",
    'Centre-stage desire. Centre. Now the desire itself.',
  ],
  virgo: [
    'Virgo. You parsed the want. Speak the conclusion.',
    'Mercury qualifies; Venus simplifies. Today, simplify.',
    'Precise want. Spare the footnote. Let it land bare.',
  ],
  libra: [
    "Libra. Mine. Don't weigh — speak. The fair want is still a want.",
    "Beauty asks for what beauty wants. That's allowed.",
    'Both/and is fine — if you say the and. Say it.',
  ],
  scorpio: [
    'Scorpio. Compressed desire. Release now or release later — but release.',
    "What you hide is what I'll see. Save us the search; speak.",
    'Hidden want. Lift it. The trial wants the hidden one.',
  ],
  sagittarius: [
    'Sagittarius. Big want, big aim. Speak the target, not the philosophy.',
    'Aim at the want, not past it. Direct heart wins this.',
    'Truth-archer. Pick the desire, draw, loose.',
  ],
  capricorn: [
    'Capricorn. The plan was supposed to make room for this. Make the room.',
    'Saturn-built want. Slow desire is still desire. Let it through.',
    "Structured longing. The blueprint's beautiful — now live in it.",
  ],
  aquarius: [
    "Aquarius. Frame the want, but don't translate it into theory. Want it.",
    'Detached desire is no desire. Be in this one.',
    'System loves outcomes. So does the heart. Speak the outcome.',
  ],
  pisces: [
    "Pisces. Tide-borne want. Say what surfaces. I'll meet it before it dissolves.",
    'Fluid heart. Pin one wave. Aphrodite watches that one.',
    "Dream-want is real-want. Bring the dream. I'll hold it.",
  ],
} as const;

// ──────────────── Zeus (Chesed) ────────────────
// Voice: magnanimous, abundant, slightly grandiose. Approves with
// overflow; rejects with "you didn't take what I offered."

const zeus = {
  aries: [
    "Aries. I'm offering. Take. Don't charge past the gift.",
    'Quick hands, full hands. Match my abundance with yours.',
    'First-mover, first-receiver. Open palms, lightning ready.',
  ],
  taurus: [
    'Taurus. Steady abundance. The hand that holds steady gets more.',
    'Slow Venus, fast Jupiter. Take the offering at your tempo, but take it.',
    'Earth-gift. Ground it. The harvest grows where it lands.',
  ],
  gemini: [
    'Gemini. Two hands, twice the catch. Both, please.',
    'Word-gifts. Catch one, pass one. The deck has plenty.',
    'Quick wit, fast hands. Receive while you riddle.',
  ],
  cancer: [
    "Cancer. The gift is yours; don't hide from it. Open.",
    "Tide-gift. Don't withdraw — receive the wave.",
    'Soft palms, full palms. Let abundance reach you.',
  ],
  leo: [
    'Leo. Throne-gift. Sit large; receive larger.',
    'Solar match. The gift rivals your light. Both shine.',
    "Centre stage — and centre seat. Take it. The role is yours.",
  ],
  virgo: [
    "Virgo. Don't audit the abundance. Receive first; reconcile after.",
    'Mercury counts; Jupiter overflows. Today: overflow.',
    'Precise hands receive the precise share. Plus one.',
  ],
  libra: [
    'Libra. Both pans full. Stop weighing — accept.',
    'Fair gift, fair receiver. The scale tips your way; let it.',
    "Beauty meets abundance. Don't aestheticise — partake.",
  ],
  scorpio: [
    'Scorpio. Compressed receiver. Open. The gift respects depth.',
    'Hidden gratitude is still gratitude. Surface enough to receive.',
    "Suspicious hands — open them anyway. The lightning's friendly.",
  ],
  sagittarius: [
    'Sagittarius. Mine. Big arc, bigger gift. Open before the lightning lands.',
    "Jovial archer. The arrow's loaded with gold. Receive it.",
    'Philosophy first, then provisions — fine. But take the provisions.',
  ],
  capricorn: [
    "Capricorn. Saturn's frugal, Jupiter's not. Today, you're the latter.",
    'Built-up receiver. The gift fits the structure. Take it.',
    'Slow-climbed, fully arrived. Open the satchel.',
  ],
  aquarius: [
    "Aquarius. Don't redistribute before receiving. Take, then share.",
    'System-gift. The system says: yours. Take.',
    'Frame the abundance later. For now, abundance.',
  ],
  pisces: [
    "Pisces. Tide-gift. Don't dream past it — drink.",
    'Soft hands, full bowl. Pin the gift; do not let it dissolve.',
    'Fluid receiver. Cup the lightning long enough to see it shine.',
  ],
} as const;

// ──────────────── Selene (Yesod) ────────────────
// Voice: cool, dreamy, tidal. Approves: "the dream rang true"; rejects:
// "you grasped at light, not at vision." Trial: dream-peek on miss.

const selene = {
  aries: [
    "Aries. Slow. The dream doesn't run with you.",
    'Charge here and you sleep through it. Quiet first.',
    'Fast eyes miss soft images. Lower your fire.',
  ],
  taurus: [
    'Taurus. The dream loves what you already love. Bring that love.',
    'Slow sense, slow sight. Stay still; the image rises.',
    'Earth-dreamer. Lie down to see. The vision finds level.',
  ],
  gemini: [
    "Gemini. Two dreams won't dovetail. Pick the one that loved you back.",
    'Word-dreamer. Set the words down. The image waits.',
    "Mercury sleeps under Selene's light. Quiet your tongue; open your eye.",
  ],
  cancer: [
    "Cancer. Mine. The tide's already speaking. Listen sideways.",
    'Moon to moon. The dream knows you. Let it find you.',
    "Tidal child, tidal trial. Drift; you'll arrive.",
  ],
  leo: [
    "Leo. The dream isn't a stage. Step off it. Watch.",
    'Bright sleeper. Dim the light to see the light.',
    'Theatre off. The dream pulls a quieter audience.',
  ],
  virgo: [
    "Virgo. The dream won't footnote. Receive imprecise — that is the precision.",
    'Mercury parses; Selene unparses. Soft eyes.',
    "Precise dreamer. Let one image stay blurred. That's the answer.",
  ],
  libra: [
    "Libra. Don't balance the dream. Tilt; the image shows on the lean.",
    "Beauty closes its eyes here. Beauty opens what you can't.",
    "Both/and in the dark. Hold both — but don't choose.",
  ],
  scorpio: [
    "Scorpio. Compressed sight. Release into the dream — it knows where to go.",
    "Hidden image. The dream surfaces it; don't dig.",
    'Underwater sees underwater. The trial trusts the depth.',
  ],
  sagittarius: [
    'Sagittarius. Aim at sleep. Big sky, soft eye.',
    "Don't philosophise the image. Let it be image.",
    "The arrow rests here. The bow doesn't. Lay it down.",
  ],
  capricorn: [
    'Capricorn. Saturn under the moon — slow. Build a still room.',
    'Structured sleep is still sleep. Let the spec dissolve.',
    'Plan the dream, then unplan. The image arrives unsigned.',
  ],
  aquarius: [
    "Aquarius. The frame won't help here. Let it fade.",
    "System dreams in symbols. Don't decode; receive.",
    'Better question? Yes — but ask it asleep.',
  ],
  pisces: [
    'Pisces. Mine. The dream is your medium. Speak it as it is.',
    'Tide-dreamer. The image is already arriving. Let it land.',
    "Fluid sight. Don't pin — surface. The trial trusts the drift.",
  ],
} as const;

// ──────────────── Aggregated matrix ────────────────

export const sefirahFraming: FramingMatrix = {
  hod: hermes,
  binah: demeter,
  chokmah: athena,
  gevurah: ares,
  tiferet: apollo,
  netzach: aphrodite,
  chesed: zeus,
  yesod: selene,
} as const;

/**
 * One placeholder line per challenge avatar. Used by sign-less
 * callers (demo / tests without a `playerSign` in the encounter
 * context). Each line names the avatar so a sign-less render still
 * reads as the avatar speaking. Mirrors the no-sign fallback pattern
 * from `pickPlayerResponse` (#277).
 */
export const sefirahFramingPlaceholder: Readonly<
  Record<EncounterAvatarKey, string>
> = {
  chokmah:
    "Athena's spear flashes. Strike before naming — Chokmah answers only the unhesitating eye.",
  binah:
    'Demeter remembers every loss. Show patience here, or grief will school you.',
  chesed:
    'Zeus opens his hand. Match his abundance, and the path floods with light.',
  gevurah:
    'Ares draws the line. Pay it in strength, or take back what you brought.',
  tiferet:
    'Apollo holds the chord. Speak true, and the harmony falls toward you.',
  netzach:
    'Aphrodite asks the desire beneath the desire. Want well, and the gate yields.',
  hod: 'Hermes grins. Wit against wit — outflank me, and the road is yours.',
  yesod:
    'Selene closes the curtain. Dream past the veil, or wake where you started.',
} as const;

// ──────────────── Picker ────────────────

/**
 * Pick a uniform variant of the avatar's trial-framing line for the
 * given (sefirah, sign). Mirrors `pickVerdict` — single `rng.int(0,
 * n - 1)` call, throws loud on missing-cell drift (which can't
 * happen by construction, but the throw surfaces a future revision
 * that drops a variant).
 */
export function pickFraming(
  sefirah: EncounterAvatarKey,
  sign: ZodiacSignKey,
  rng: Rng,
): string {
  const cell = sefirahFraming[sefirah];
  if (cell === undefined) {
    throw new Error(`pickFraming: unknown sefirah=${sefirah}`);
  }
  const variants = cell[sign];
  if (variants === undefined || variants.length === 0) {
    throw new Error(
      `pickFraming: no variants for sefirah=${sefirah} sign=${sign}`,
    );
  }
  const idx = rng.int(0, variants.length - 1);
  // Non-null assertion safe: idx is in [0, length-1] and arrays of
  // string have no holes here (frozen literal data above).
  return variants[idx] as string;
}
