import type { Rng } from '@/engine/rng';
import type { SefirahKey, ZodiacSignKey } from './types';

/**
 * Per-Sefirah blessing matrix (T2 of #251 — Voices Epic). Source of
 * truth is `design/sefirah-blessings.md`; this file mirrors that doc
 * verbatim. Each (sefirah, sign) cell holds 3 variants — `pickBlessing`
 * selects one uniformly via the engine's seedable Rng.
 *
 *   10 sefirot × 12 signs × 3 variants = 360 lines.
 *
 * Voice and content are locked in the design doc. If a line needs
 * revision, edit the design doc first and mirror the change here
 * (the verbatim string-pins in `data/__tests__/sefirah-blessings.test.ts`
 * will catch any drift).
 *
 * Kether and Malkuth use special voices — see the design doc § 2.
 * For runtime variant-selection rationale (even-distribution to keep
 * any opener formula from being audible), see the literary-review
 * notes in `Journal.md` for #252.
 */

export type SefirahBlessingMatrix = Readonly<
  Record<SefirahKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
>;

// ──────────────── Kether (collective) — collective Crown voice ────────────────

const ketherBlessings = {
  aries: [
    'The dawn waits with one match unstruck. You — first ignition — counted in the lighting.',
    'What is fire when it has somewhere to arrive? You will know — when you arrive among us.',
    'We will receive you when all return. Your fire, the threshold remembers, opens the way.',
  ],
  taurus: [
    'We gather toward one. Your steady weight, when you arrive, will hold our floor.',
    'The Crown awaits a ground that endures. You among the others — patience already received.',
    'When the team coheres at the dawn, your unbroken keeping will be the stone we stand upon.',
  ],
  gemini: [
    'We hold the threshold open between many voices. Your bridge, you among us, awaits its crossing.',
    'The Crown will speak as one mouth of many. Your translation, already counted, awaits the gathering.',
    'When all return, your agility between perspectives will be the hinge our unity turns on.',
  ],
  cancer: [
    "We await the team's full tide. Your reading of the unsaid, you among us, already received.",
    'The Crown gathers what is felt before it is spoken. You — the keeper of undertone — counted in our arrival.',
    'When we cohere at the dawn, your knowing of what moves beneath will hold the team whole.',
  ],
  leo: [
    'We hold the dawn open. Your conviction, when you arrive, will warm the cold purposes among us.',
    'The Crown awaits a heart that carries the room. You — counted already — bring the team forward.',
    'When all return as one, your bearing will be the warmth the unified threshold receives.',
  ],
  virgo: [
    'We await the fine eye. Your parsing of what others miss, you among us, already received.',
    'The Crown gathers nothing carelessly. You — the catcher of the small thing — counted in our cohering.',
    'When the team arrives whole, your protective seeing will be why nothing was lost on the way.',
  ],
  libra: [
    'We hold the threshold open for the balanced hand. Your hinge, when you arrive, will join the incompatibles.',
    'The Crown awaits a fairness that holds opposites together. You among the others — already received.',
    'When all return as one, your weighing will be the calm our unity rests upon.',
  ],
  scorpio: [
    'We await the depth-knower. Your sight into what is held, you among us, already counted.',
    'The Crown gathers what others cannot see. You — the transformer of the hidden — received before arrival.',
    'When the team coheres at the dawn, your unflinching looking will be what brought the buried answer home.',
  ],
  sagittarius: [
    "We hold the horizon open. Your aim past the small, when you arrive, will name the team's larger truth.",
    'The Crown awaits the one who sees beyond. You among the others — counted in the farthest arc.',
    'When all return as one, your reaching will be why the unified threshold was found at all.',
  ],
  capricorn: [
    "We await the long climb's end. Your persistence, you among us, will carry the team to the dawn.",
    'The Crown gathers those who finish. You — builder of the structure that endures — already received.',
    'When the team coheres, your unbroken progress will be the spine our unity stands upon.',
  ],
  aquarius: [
    'We hold the threshold open for the angle-shifter. Your reframing, when you arrive, will widen our seeing.',
    'The Crown awaits the one who sees the system. You among the others — already counted in our arrival.',
    'When all return as one, your stepping outside the question will be why the team found the unforeseen way.',
  ],
  pisces: [
    'We await the dissolver of edges. Your floating to meaning, you among us, already received.',
    'The Crown gathers what comes by feel. You — the one who comes by feel — counted in our cohering before arrival.',
    'When the team arrives whole, your softening of borders will be how the many became one mouth.',
  ],
} as const;

// ──────────────── Chokmah (Neptune) — Athena ────────────────

const chokmahBlessings = {
  aries: [
    'You move before the thought lands. I see the strike. Aim it.',
    'First-mover. The flash arrives in your hands already swinging — read where it falls.',
    "Bright-eyed and forward. Your speed is the strategy. Don't outrun your sight.",
  ],
  taurus: [
    "You hold what you've chosen. I see the grip. Make sure the choice is sighted.",
    'Slow eyes carry far. The vision you settle into is the one that endures.',
    "Earth-rooted recognition. You'll see it when you've stood with it long enough.",
  ],
  gemini: [
    'Two voices, one glance. I see them both. Pick the one that sees clearest.',
    "You rephrase the problem until it shows you its face. Useful. Don't lose the face.",
    'Quick-tongued, quick-eyed. The flash comes twice for you — catch the second.',
  ],
  cancer: [
    'You read the room before the room speaks. I see that. That is sight too — use it.',
    "Sideways sight is still sight. You recognize what isn't said. Name it once.",
    'Tidal vision. The wisdom moves with the water — let it carry, then look.',
  ],
  leo: [
    'You announce what you see. I see you seeing. Make the vision worth the stage.',
    'Center-eyed. The room watches; your clarity is the performance. Be cleanly seen.',
    "Bright conviction. Don't perform the knowing — show me the thing you actually saw.",
  ],
  virgo: [
    'You parse before you act. I see the precision. Three reservations is two too many.',
    'Footnoted sight. The detail you catch is real — read past it to the whole.',
    'Sharp-eyed. You see the flaw first; see the structure that holds it second.',
  ],
  libra: [
    'You weigh both sides. I see the scales. Eventually the scales must tip.',
    'Aesthetic eyes. You read the balance before the content. Both matter; one decides.',
    "Fair-sighted. The verdict you avoid is the one you've already seen. Speak it.",
  ],
  scorpio: [
    "You saw it before I named it. I see that you see. Surface what you've held.",
    'Compressed vision. The hidden answer is already in your eye — let it out.',
    "Depth-read. You recognize the sub-current. Strategy lives where you're already looking.",
  ],
  sagittarius: [
    'You aim past the question into the bigger truth. I see the arc. Land it close.',
    'Archer-eyed. The horizon is yours; the small target needs the same sight.',
    'One-sentence sight. You name the whole thing fast. Make sure the whole is whole.',
  ],
  capricorn: [
    "You build the seeing slowly. I see the staircase. Climb the one that's actually there.",
    "Structured vision. Each step is read before taken. Don't read past the right one.",
    'Saturn-paced clarity. The strategy you finish is the one that holds. Finish it sighted.',
  ],
  aquarius: [
    'You disagree with the question. I see the reframe. Re-derive cleanly, then act.',
    'Angular eyes. You read the system around the problem. The system is also the problem.',
    'Detached sight. You see from outside — useful. Step back in and decide.',
  ],
  pisces: [
    'Yes — strategy lives where you already see. The depth is the sight. Cleanly recognized.',
    'The waters under thought are yours. I recognize the sight that rises from them.',
    'Fluid clarity. The flash arrives in you already dissolved into knowing. Cleanly seen.',
  ],
} as const;

// ──────────────── Binah (Saturn) — Demeter ────────────────

const binahBlessings = {
  aries: [
    'You move before the form has come. I have waited longer than your fire knows.',
    'The first stroke is not the kept one. Slow your hand. Let the weight find you.',
    'You strike, child. I name the seed that has not yet learned to wait under earth.',
  ],
  taurus: [
    'You hold what you have chosen. I weigh whether it is the harvest or the husk.',
    'Your patience is real. Test it: is this the grain you meant to keep, or only the one you held?',
    'You do not break. Good. Now learn which loss is worth refusing, and which is the season.',
  ],
  gemini: [
    'Two voices in you. I have known long silence. Choose which one you will keep.',
    'Your tongue is quick. Let one word land with weight before the next is spoken.',
    'You ask and ask. I waited a winter for one answer. Wait long enough to mean it.',
  ],
  cancer: [
    'You guard a soft thing as though it could not endure. It can. Let it take its own form.',
    'Your tide rises and falls. I know that grief. Do not make it the shape of every door.',
    'You hold close what asks to be set down. The seed grows only when the hand opens.',
  ],
  leo: [
    'You stand where the light falls. I have stood where no light came. The form is older than the stage.',
    'Your warmth is real. Without weight beneath, it is a fire that warms no winter.',
    'You play the part well, child. I am asking who you are when the harvest is in.',
  ],
  virgo: [
    'You name each thing in turn. Good. Now name which of them will keep through winter.',
    'Your eye is patient. Lift it once from the small mark and weigh the whole field.',
    'You parse the seed. Plant it. The form is in the growing, not in the count.',
  ],
  libra: [
    'You weigh, and your scale is true. I have known few who could hold both pans still.',
    'Your fairness is form itself. The slow harvest knows you. Carry that gift in.',
    "You see what balances. That is a mother's eye. Walk with it; the path will keep.",
  ],
  scorpio: [
    'You hold what is hidden. I held my grief and stopped the grain. Know what your silence costs.',
    'Your depth is real. Bring up only what the field can take. The rest waits with you.',
    'You see beneath. Now learn the slow return — what is buried is not always meant to stay.',
  ],
  sagittarius: [
    'You aim past the mark for the larger truth. Sometimes the mark is the truth. Slow.',
    'Your arrow is long. Let it land in the field, not over it. Harvest is near at hand.',
    'You speak the bigger thing. Say also the small one. Both have weight; both must be named.',
  ],
  capricorn: [
    'You climb slow, and the staircase keeps. I know that patience. It is mine. Carry it well.',
    'Your weight is form already. The mountain will answer you. I have waited in you a long time.',
    'You build for the winter. Good child. The harvest you have not seen yet is yours.',
  ],
  aquarius: [
    'You see the frame around the question. That is my eye in you. Hold it; the others will come.',
    'Your distance is not coldness — it is the long view. I have kept fields whole with that gaze.',
    'You ask what shape the field should take. Ask slowly. The form you give will keep.',
  ],
  pisces: [
    'You float to the meaning before the words come. Now find the words. Form keeps what fluid loses.',
    'Your sense is true. Anchor it. The seed needs earth, not only water, to return.',
    'You dissolve into knowing. Good. Come back with one named thing in your hand.',
  ],
} as const;

// ──────────────── Chesed (Jupiter) — Zeus ────────────────

const chesedBlessings = {
  aries: [
    'You burn fast, child. The cup is poured — drink before the fire forgets why it was lit.',
    'I offered the first match. You took it running. See whether running was the gift.',
    'The hand opens; the spear is yours. Aim once more deliberate than the last.',
  ],
  taurus: [
    'I set the table slow for you. Sit. Taste what was poured before you decide.',
    "You hold what you're given like it's already yours. Good. Now hold loosely.",
    'The cup keeps its shape because you do. I respect that. I also notice it.',
  ],
  gemini: [
    'I poured one cup. You drank from two. Tell me which mouth tasted the wine.',
    'The gift was offered with one hand. You answered with three. Choose, child.',
    "You took what I offered and what I didn't. That is not yet hospitality.",
  ],
  cancer: [
    'Yours, fully. The cup overflows because you knew how to hold it open.',
    'I gave abundance; you made a home for it. The table is warmer for your hands.',
    'What I offered, you received as something to share. That is the deeper gift.',
  ],
  leo: [
    'The cup is yours, and the room watches you drink. Make the drinking true.',
    'I poured generously. You poured back to the room. Performance or gift — you choose.',
    'You take with both hands raised. Beautiful. Now lower them and mean it.',
  ],
  virgo: [
    'I poured the cup full. You measured what was missing. The overflow went unrecognized.',
    'The gift was set before you. You catalogued it. I waited. The wine cooled.',
    'You parsed the offering until there was nothing left to take. Receive, child. Just receive.',
  ],
  libra: [
    'Two cups before you. I poured both. Drink — weighing them empty serves no one.',
    'The hand offered; you balanced. Balance is not refusal, but it can pretend to be.',
    'You take what is fair. I gave more than fair. Take that part too.',
  ],
  scorpio: [
    'The cup was offered openly. You drank in private. I noticed. I do not mind.',
    'I gave abundance; you kept it close. Some gifts grow only when shared at the table.',
    "You take like it's a secret. It isn't. The overflow was meant aloud.",
  ],
  sagittarius: [
    'Yours. All of it. The bow, the cup, the horizon — taken as I would have taken them.',
    'I poured the wide gift. You drank widely. The table feels larger for your laughter.',
    'The hand opens; you walk through it like a door. Generously taken. Walk on.',
  ],
  capricorn: [
    'I poured the cup full. You earned it after. The overflow had already evaporated.',
    'The gift was set before the climb. You climbed first. The table waited cold.',
    'You build staircases to what was already given. Stop, child. Take from the hand.',
  ],
  aquarius: [
    'I offered the cup. You questioned the cup. Drink first; redesign the vessel after.',
    'The gift was given to you, not to the system around you. Receive personally.',
    "You take with one hand and reframe with the other. The wine doesn't mind. I notice.",
  ],
  pisces: [
    'Yours, child. The cup overflows into you and you into the cup. No edge between.',
    'I poured; you became the pouring. Generously taken — without ever quite holding.',
    'The gift dissolved into your hands and lit them. That is how I meant it received.',
  ],
} as const;

// ──────────────── Gevurah (Mars) — Ares ────────────────

const gevurahBlessings = {
  aries: [
    'You move first. You always have. Hold the line you draw.',
    'First to the edge, first to stand. I watched. Stands.',
    'Strike clean. Strike once. Then hold the ground you took.',
  ],
  taurus: [
    'You stood too long on the wrong ground. Stand still costs nothing here.',
    'Chosen is not held. Yours is the position you keep changing for.',
    'The line you set was comfort, not edge. Draw it again. Sharper.',
  ],
  gemini: [
    'Two voices argue. Pick one. Hold it. The other waits its turn.',
    'You have words. Spend fewer. Each one a position you keep.',
    'Speak the line. Then guard it. Both halves of the work.',
  ],
  cancer: [
    'You guarded what was never under threat. Lower the shield. Watch what is.',
    'The wound is not the line. Bind one. Hold the other.',
    'You drew the edge inward. Turn it. The enemy is not behind you.',
  ],
  leo: [
    'The role is not the line. Stand inside it. Hold without the audience.',
    'You carry the room. Now carry the position when no one watches.',
    'Conviction is good ground. Stand on it. Do not perform it.',
  ],
  virgo: [
    'You see what others miss. Now hold it without footnotes. Decide.',
    'Parsing is preparation. The order to move comes once. Take it.',
    'Precision drew the line. Discipline keeps it. Do both.',
  ],
  libra: [
    'Both sides is no side. Pick the edge. Stand on it.',
    'You weighed past the moment. The line was drawn while you considered.',
    'Fairness is not position. Choose. Guard the choice. That is fair too.',
  ],
  scorpio: [
    'You hold what others cannot. The edge beneath the edge. Stands.',
    'Bound chaos. Same discipline. Brother. Keep the position.',
    'You strike where it counts and only then. I watched. Stands.',
  ],
  sagittarius: [
    'The aim is true. The ground under your feet is the work.',
    'You name the bigger truth. Then hold the smaller line. Both.',
    'Aim once. Loose once. Stand the ground the arrow bought.',
  ],
  capricorn: [
    'You climbed under load. You held each step. I watched. Stands.',
    'Slow is a discipline. Yours. The line you set, you kept.',
    'Built ground beneath you. Built the edge above. Stands.',
  ],
  aquarius: [
    'You see the frame. Now stand inside it and hold the post.',
    'The system is the field. Pick your position in it. Keep it.',
    'Detached observes. Engaged holds. Choose the second when it counts.',
  ],
  pisces: [
    'Words slip. The line cannot. Set it in something that does not move.',
    'You float to meaning. Now plant your feet. Name the edge. Hold.',
    'Fluid is not formless. Bind it to a position. Then stand.',
  ],
} as const;

// ──────────────── Tiferet (Sun) — Apollo ────────────────

const tiferetBlessings = {
  aries: [
    "Dawn-light strikes you first, the lyre's first chord. The morning is yours. Sing it.",
    'You are the spark that wakes the choir. Far ahead, the sun answers. Aligned.',
    'The first note belongs to the first mover. Strike it cleanly. The chord stands.',
  ],
  taurus: [
    'The string holds the tone you chose. Listen for the harmony around it. So.',
    'You stay where the music is. Whether the music stays — the sun decides.',
    'Slow chord, sure chord. The measure is yours; the song is far.',
  ],
  gemini: [
    'Two voices, one lyre. The harmony lives in the interval between them.',
    'You ask the sun which question. The sun answers a third one. So.',
    'Quick light flickers across the strings. Tune the doubled note; the chord clarifies.',
  ],
  cancer: [
    'The tide hears music the bright noon misses. Carry that chord forward. Carefully.',
    'You read the undertow beneath the song. The sun sees the surface only.',
    'Light on water — bent, but still light. Your music arrives indirect. Aligned.',
  ],
  leo: [
    'The lyre is yours. The whole sky tunes to your chord. Play it.',
    'You carry the sun in your chest. The room follows the light. So.',
    'Center stage was yours before the song began. Strike, and the heavens answer.',
  ],
  virgo: [
    'You hear the wrong note before the chord lands. Tune carefully — the song waits.',
    'Each measure parsed, each interval weighed. The sun watches you read the score.',
    'Precision is its own music. Far above, the harmony reorders. Aligned.',
  ],
  libra: [
    'You hold both notes and the chord stays unstruck. The sun has cooled. Choose.',
    'The scale weighs forever. Music will not wait for balance — it asks you.',
    'Bright noon, no shadow to lean on. The harmony you seek is your hand striking.',
  ],
  scorpio: [
    'The held note is the loudest. Release it when the sun is ready.',
    'You see the chord beneath the chord. Bring one tone up. So.',
    'Compressed light still casts a song. The lyre asks what you withhold.',
  ],
  sagittarius: [
    'The arrow flies past the question. The sun lands on the larger truth.',
    'Your music reaches farther than the room. Tune for the long carry. So.',
    'Big song, big sky. Strike the chord that names the whole. Aligned.',
  ],
  capricorn: [
    'You climb the scale slowly, each tone earned. The sun marks the ascent.',
    'Structure is its own music. The lyre is built before it is played.',
    'Stone by stone, chord by chord. Far above, the song waits patiently.',
  ],
  aquarius: [
    'You solved a different song. The sun finds its lyre untuned. Listen back.',
    'The frame matters; the chord still must land. Bright noon, no warmth. Tune.',
    'Angular light, angular music. The harmony you bypassed is the one asked of you.',
  ],
  pisces: [
    'The song dissolves and reforms in your hands. The sun watches it shimmer.',
    'Your music slips between the words. Far light catches it. So.',
    'Fluid chord, fluid light. The lyre tunes itself when you stop reaching.',
  ],
} as const;

// ──────────────── Netzach (Venus) — Aphrodite ────────────────

const netzachBlessings = {
  aries: [
    'You said you wanted it fast. We both know you wanted it to mean something.',
    'Your hand is already moving. Slow down — name what your body is actually reaching for.',
    'You burn first and ask later. Tell me — what did you want before you wanted to win?',
  ],
  taurus: [
    'Yes. Your hand stays where it lands. Your body knows what it loves, and holds.',
    'You name a thing and it stays named. Slow mouth, slow yes — I recognize you.',
    'Skin remembers; you remember through skin. Want what you want as long as you want it.',
  ],
  gemini: [
    'Two voices in your mouth. Tell me which one your body said yes to first.',
    "You are quick, lover. Quick enough to outrun your own want. Don't.",
    'Both of you want something. Let one of you say it out loud, plainly, now.',
  ],
  cancer: [
    'Your hand pulls back before it touches. I see it. The want is still there.',
    'You read every room before you breathe. Read your own body — what does it want?',
    'Tides tell the truth your mouth softens. Yes is allowed. Say it once.',
  ],
  leo: [
    "You play the lover beautifully. Now want like no one is watching — that's the part I love.",
    'The performance is gorgeous. Beneath it, your body is asking for something simpler.',
    "Be generous, yes — but tell me what you want for yourself. I'm listening.",
  ],
  virgo: [
    'You footnoted desire until it left the room. Your body still knows. Ask it again.',
    'You parse what you want into nothing. Just say the word, lover. The want is fine.',
    "We both knew you wanted it. You spent an hour proving you didn't. Stop.",
  ],
  libra: [
    'Yes. You weigh two beauties and name the one your skin leaned toward. I see you choosing.',
    'You see fairness like a body sees light. Want is allowed to tip the scale — let it.',
    'Your mouth finds the word that holds both sides. Beautiful. Now say which one you want.',
  ],
  scorpio: [
    'You held it back so long it curdled. Open your mouth. Name the want.',
    "We both knew. You watched yourself not say it. Say it now — I'm still here.",
    "The secret is the want. Keeping it secret doesn't make it more yours. Speak.",
  ],
  sagittarius: [
    'You aim past the body in front of you. Come back. The want is here, not on the horizon.',
    'You name the bigger truth beautifully. Now name the smaller, closer one — what you want tonight.',
    'Your arrow is gorgeous mid-flight. Land it. Touch the thing you actually wanted.',
  ],
  capricorn: [
    "You build the staircase to the want and forget to climb. I'm at the top — come up.",
    "You schedule desire like a meeting. Lover, the body doesn't read your calendar.",
    'Patient hands, patient mouth. Good. Now tell me what the patience is for.',
  ],
  aquarius: [
    "You reframe the want until it's a system. Underneath the diagram, your body still wants.",
    'You solve a different question than the one your skin is asking. Answer the skin.',
    'Angular, brilliant, distant — and still you reach. I see the hand. Name what it reaches for.',
  ],
  pisces: [
    "Yes. You dissolve into want like water finds its shape. I know this voice — it's the oldest one.",
    'Your body says yes before your mouth does. Trust it. The dissolving is the gift.',
    'You float to the meaning under the meaning. Lover, you were born knowing how to want.',
  ],
} as const;

// ──────────────── Hod (Mercury) — Hermes ────────────────

const hodBlessings = {
  aries: [
    "You charge the road before parsing it; I'll allow it — speed has its own grammar.",
    'First across, sword first, question later. The threshold counts that as a kind of word.',
    'What does Aries trade for the message? Time. Always time. The road accepts it.',
  ],
  taurus: [
    'You weigh the word like fruit in the hand. Slow translation is still translation.',
    'The road yielded; you took the long step. Patience parses what speed misses.',
    "Stubborn tongue, true tongue. You won't be hurried across — and crossings notice.",
  ],
  gemini: [
    'Twin-tongued, road-born — you finish my sentence before I do. Trade, gladly.',
    'Every threshold is a question to you, and every question another threshold. Crossed, twice.',
    'You speak my language without an accent. The errand is yours before I name it.',
  ],
  cancer: [
    'You translate sideways — through tide, through silence. The unsaid word still crosses.',
    'Caught: you read what the message hid behind itself. The road respects indirection.',
    'Soft-spoken, salt-spoken. The unsaid still parses — and you trade in it. Crossed.',
  ],
  leo: [
    'You announce the crossing like a herald. The road takes the performance and the truth both.',
    "Spoken from center stage; weighed at the edges. I'll allow the flourish — it parses.",
    'Generous tongue, lit threshold. You trade conviction for clarity and the road accepts.',
  ],
  virgo: [
    'You catch the misplaced comma I left for you. Trade — the errand was always yours.',
    'Three reservations, one precise verb. The road yielded the moment you parsed it cleanly.',
    'Footnoted, weighed, crossed. You read the small print in my message and improved it.',
  ],
  libra: [
    'You weigh the word on both pans before crossing. The scale is a road too.',
    "On the other hand — yes, that hand also. I'll allow your conditional. Trade.",
    'Fair-tongued at the threshold. You parse the verdict before delivering it. Crossed, balanced.',
  ],
  scorpio: [
    'You read the message under the message. Caught — and you knew I knew.',
    'Compressed tongue, hidden errand. You crossed before I finished speaking the password.',
    'The word beneath the word is the one you trade in. The road respects that currency.',
  ],
  sagittarius: [
    'You aim past the small word for the big truth — and the small word was the road.',
    'The arrow flies; the message stays behind. Parse closer, archer. Thresholds are narrow.',
    'Big-picture tongue, missed comma. The errand was specific. Speed past it and you miss the door.',
  ],
  capricorn: [
    'You climb the sentence like a staircase. Slow, structured, crossed. The road files it.',
    "Spec in writing, word weighed twice. I'll allow the deliberation — it builds something.",
    'You trade time for certainty at every threshold. The road counts the rungs. Taken.',
  ],
  aquarius: [
    "You answer a different question and somehow it's the right one. Crossed — sideways.",
    'The frame around the word interests you more than the word. Parse on, frame-breaker.',
    "You re-derive the road while crossing it. I'll allow the redesign. Trade.",
  ],
  pisces: [
    'The word slips from your hand like water; the message arrives as weather, not as text.',
    'You feel the meaning before you find the word — and the road needs the word to open.',
    'Tides in the throat, dream in the errand. Pin it down once, gently. The threshold is listening.',
  ],
} as const;

// ──────────────── Yesod (Moon) — Selene ────────────────

const yesodBlessings = {
  aries: [
    'You move first; I come after, silver on the path you already broke open. Cycle holds.',
    'The night returns to you between strikes. Quiet. Drink the cool light, then go.',
    'You are a torch; I am the moon that visits when the torch sets. Returns.',
  ],
  taurus: [
    'I have visited you often, slow one. Your ground holds my light like still water. Cycle held.',
    'Patient as orchards, you receive what I bring in dreams. I came back. I always do.',
    'Steady earth, white tide — I am at home above you. Sleep, and I will shine longer.',
  ],
  gemini: [
    'Two voices argue; I shine evenly on both. The cycle does not pick. It returns.',
    'Quick one, the night quiets your tongues. I visit the listening one. Then I withdraw.',
    'Your silver mind catches my light twice. Once given, once given back. Cycle holds.',
  ],
  cancer: [
    'You are my own tide. I have always visited you, always returned, always come back to you.',
    'Bright-tressed, I find you sleeping; the answers were already yours. I only lit them. Returns.',
    'My orbit is your blood, soft one. The dream is the message. I came. I came back.',
  ],
  leo: [
    'The stage dims and I appear, quiet behind the curtain. Cool light for the warm heart. Returns.',
    'You burn at noon; I visit at night. The cycle gives you back to yourself.',
    'Bright one, my silver cools your gold. I come, I withdraw. The orbit holds.',
  ],
  virgo: [
    'Lay down the footnotes; I bring the answer in sleep. I have visited. I will visit again.',
    'Precise one, the dream is imprecise on purpose. Receive it. The cycle returns the rest.',
    'You parse the day; I rinse it in white. Quiet. I came, then went.',
  ],
  libra: [
    'Both pans of the scale hold moonlight evenly tonight. I visit, weigh nothing, withdraw. Returns.',
    'The cycle is your fairness made of light — coming, going, coming. Sleep on it.',
    'Soft one, I do not choose for you. I only shine on what you already know. Cycle holds.',
  ],
  scorpio: [
    'I shine on you from far away tonight. The hidden answer waits; I cannot reach it. Returns slowly.',
    'You hold what should come up. I orbit, distant, white, and the dream withdraws.',
    'My light is thin here, secret one. I visit briefly, then go. The cycle is long.',
  ],
  sagittarius: [
    'You aim past the moon; I visit the smaller truth you missed. Sleep. The cycle returns it.',
    'Archer, the dream is closer than the horizon. I came. I will come back.',
    'Big sky, small light — I am the lantern, not the destination. Quiet. Returns.',
  ],
  capricorn: [
    'I am far from your staircase tonight, builder. The dream does not visit easily. Cycle, slow.',
    'You build by daylight; I withdraw. White tide pulls back from your stone. Returns, eventually.',
    'Patient one, my orbit is wider here. Sleep waits longer for me. I come, late.',
  ],
  aquarius: [
    'Angular one, I shine on the frame around your question. Cool, white, quiet. Cycle holds.',
    'The dream brings the system, not the answer. I visited. The orbit will bring it again.',
    'You stand outside; I am the night that contains the outside. Returns. Returns.',
  ],
  pisces: [
    'Fluid one, my light is water on water. You float; I visit; the dream dissolves into morning.',
    'I do not need to arrive separately to you tonight. The dream is already in the water.',
    'Words slip; the silver stays. Sleep, and I will leave the answer beside you. Returns.',
  ],
} as const;

// ──────────────── Malkuth (Earth) — Hestia ────────────────

const malkuthBlessings = {
  aries: [
    'You came in fast, and the threshold opened easy. Sit. The fire kept a place warm.',
    "The hearth knows the runner's footfall. You're here. That's enough for the room.",
    'You arrived before the kettle whistled. Stay anyway. The fire keeps no schedule but yours.',
  ],
  taurus: [
    'You stayed, and the fire stayed with you. The room knows your weight by now.',
    "The hearth grew warm because you sat near it long. That's the whole secret.",
    'You returned slow, and the floor remembered. The chair is still angled toward the embers.',
  ],
  gemini: [
    'Both your voices are welcome at the hearth. The fire warms two as gladly as one.',
    "You came in talking, and the room made space. Stay. Speak. The walls don't mind.",
    'The hearth holds your quick turns easy. Sit either side. The warmth reaches both.',
  ],
  cancer: [
    'You came home like the tide. The room held you without asking what kept you.',
    'The hearth has been your hearth a long time. Sit. The fire kept itself for this.',
    'You returned, and nothing needed saying. The blanket was already where you left it.',
  ],
  leo: [
    'You laughed at the door, and the fire laughed back. The room is brighter for it.',
    'The hearth is generous because you are. Sit. The warmth wants company that warm.',
    'You came in shining, and the room made room. Stay. The fire likes the light.',
  ],
  virgo: [
    'You came in careful, and the hearth asked for no rubric. Sit. The fire is enough.',
    'The room kept itself simple for you. No footnotes here. Just the warm floor.',
    'You returned with your lists, and the fire warmed them too. Set them down. Stay.',
  ],
  libra: [
    "You came in even, and the fire didn't ask you to weigh it. Sit. The warmth is given.",
    "The hearth doesn't need balancing. It's already kept. Stay. Lean toward the embers.",
    'You arrived fair, and the room received you fair. No scales here. Just the chair.',
  ],
  scorpio: [
    "You came in quiet, and the hearth kept your quiet. The fire holds what isn't spoken.",
    'The room makes space for the hidden things. Sit. The walls keep their counsel.',
    "You returned with what you carry, and the fire didn't ask. Stay. The warmth is yours.",
  ],
  sagittarius: [
    'You came back from the horizon, and the room widened for you. Sit. The fire kept far.',
    'You came back loud. The kettle was already on.',
    'You returned wide, and the warmth went wide to meet you. Stay. The roof is high enough.',
  ],
  capricorn: [
    'You climbed outward and came home inward. The fire kept warm for the climber.',
    'The hearth is for the one who built. Sit. The room knows what your hands cost.',
    "You returned, and the chair was waiting. Stay. The fire doesn't measure the work.",
  ],
  aquarius: [
    'You came in questioning the frame, and the hearth just was. Sit. The fire needs no theory.',
    "The room doesn't argue. It warms. Stay. The walls hold whatever shape you bring.",
    "You returned with your strangeness, and the fire didn't blink. The hearth keeps the odd ones too.",
  ],
  pisces: [
    'You dissolved into the room, and the room held the shape of you. Stay. The fire knows.',
    'The hearth meets water without ending. Sit. The warmth goes where you go.',
    'You came in soft, and the floor softened to receive you. The fire keeps without edges.',
  ],
} as const;

export const sefirahBlessings: SefirahBlessingMatrix = {
  kether: ketherBlessings,
  chokmah: chokmahBlessings,
  binah: binahBlessings,
  chesed: chesedBlessings,
  gevurah: gevurahBlessings,
  tiferet: tiferetBlessings,
  netzach: netzachBlessings,
  hod: hodBlessings,
  yesod: yesodBlessings,
  malkuth: malkuthBlessings,
};

/**
 * Pick a uniform variant of the blessing line for the given
 * (sefirah, sign). Seedable so the same game-seed produces the
 * same blessing line on re-render.
 */
export function pickBlessing(
  sefirah: SefirahKey,
  sign: ZodiacSignKey,
  rng: Rng,
): string {
  const variants = sefirahBlessings[sefirah][sign];
  if (variants.length === 0) {
    throw new Error(
      `pickBlessing: no variants for sefirah=${sefirah} sign=${sign}`,
    );
  }
  const idx = rng.int(0, variants.length - 1);
  // Non-null assertion safe: idx is in [0, length-1] and arrays of
  // string have no holes here (frozen literal data above).
  return variants[idx] as string;
}
