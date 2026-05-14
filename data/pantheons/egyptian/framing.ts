import type { EncounterAvatarKey, ZodiacSignKey } from '../../types';
import type { FramingMatrix, FramingPlaceholderMap } from '../types';

/**
 * Egyptian per-Sefirah avatar trial-framing matrix and placeholder
 * fallback (#555). Mirrors the four-dimensional shape established
 * for greco-roman framing in `pantheons/greco-roman/framing.ts`
 * (#478). 8 encounter deities × 12 sign cells × 3 variants = 288
 * strings.
 *
 * The Egyptian deity speaks at the top of the encounter prep
 * sub-state, naming the trial in their voice + acknowledging the
 * player's sign capsule. Each deity's trial mechanic is the same
 * as their greco-roman counterpart (Thoth ≈ Hermes / word-match;
 * Isis ≈ Demeter / patience; Amun ≈ Athena / pre-question
 * insight; Horus ≈ Ares / burn-cost; Osiris ≈ Apollo / balance;
 * Hathor ≈ Aphrodite / declare-want; Ra ≈ Zeus / open-hand
 * abundance; Khonsu ≈ Selene / dream-peek). The voice register
 * follows `reference/pantheons/egyptian.md` (#551).
 *
 * Constraints (matching greco-roman): 10–20 words, second-person,
 * leans into the sign's voice / native / reaction, 3 variants per
 * cell with different rhythm + image + angle.
 *
 * Authoring discipline established by the #553 PR 2 and #554
 * reviews: dignity must be conveyed through imagery, not label
 * prefixes ("Fall sign", "Rulership", "Detriment" etc. are
 * forbidden inside the prose). Cross-deity sentence chassis at the
 * same sign is forbidden — each deity reaches the sign through
 * its own locked vocabulary.
 *
 * Framing differs from blessings (#554, gift-mode) and verdicts
 * (#553, reactive) in *timing* — framing is a prelude. The deity
 * sets the stakes / names the test before the player rolls.
 */

// ──────────────── Thoth (Hod) ────────────────
// Voice: scribe-precise, ink-careful, reed-disciplined.
// Trial: word-match — name an arcanum; matching deck-top adds +5.

const thoth = {
  aries: [
    'Aries. Speak the card before the reed dries. The page rewards the first true mark.',
    'Hot hand at the ink. Name an arcanum — the wedjat-eye is already watching the line.',
    'You charge the page. Name a card straight. The reed catches no curved stroke.',
  ],
  taurus: [
    'Taurus. Weigh the word, then write it. The page holds patience well; haste blurs.',
    'Slow tongue at the ink. Name the card the page has already half-noted.',
    'Stand at the tablet until the right arcanum settles. The reed will catch the steady word.',
  ],
  gemini: [
    'Gemini. Two cards on your tongue, one in the deck. Speak the one the reed wants.',
    'Quick scribe. Pick a word the page will not have to correct.',
    'Mercury at the tablet. Name an arcanum — the wedjat-eye knows your accent.',
  ],
  cancer: [
    'Cancer. Name the card the tide carries up. The page reads feeling well enough.',
    'Soft word at the reed. The wedjat-eye accepts what the heart names before the head.',
    'A name surfaces in the undertone. Speak that arcanum; the tablet receives it without question.',
  ],
  leo: [
    'Leo. Announce the card. The reed honours the unembarrassed voice.',
    'Hold up the arcanum like a banner. The wedjat-eye reads confidence as evidence.',
    'Big voice for a small mark. Name the card like you mean to be quoted in the canon.',
  ],
  virgo: [
    'Virgo. The page is yours twice over — name the exact card, no synonym, no near-miss.',
    'The reed bows for the careful hand. Pick the arcanum the wedjat-eye would footnote.',
    'Precision wins this one. Speak the word the page would write on the first pass.',
  ],
  libra: [
    'Libra. Two arcana balance on your tongue. Name the one the page is asking for.',
    'Fair scribe. Pick the card whose weight matches what the wedjat-eye expects.',
    'Weigh the words. Speak the one that does not tilt the line.',
  ],
  scorpio: [
    'Scorpio. The card you suspect is the card. Say it; the page will not flinch.',
    'You already know which arcanum. Name it — the wedjat-eye honours the depth.',
    'Compressed word for a compressed page. One mark. Stake it.',
  ],
  sagittarius: [
    'Sagittarius. Aim past the obvious card. The reed honours the far throw.',
    'The reed prefers a wide arc here. Name the arcanum the canon almost forgot.',
    'Wide reach for a wide canon. Pick the card no one would quote.',
  ],
  capricorn: [
    'Capricorn. Pick the card that endures. The reed honours the structural answer.',
    'Patient scribe. Name the arcanum the page will still want in a hundred years.',
    'Cold ink at the tablet. The wedjat-eye reads the long line; speak the lasting word.',
  ],
  aquarius: [
    'Aquarius. Name an arcanum the schools have not yet catalogued.',
    'The reed waits for a word the canon does not yet hold. Speak; the page will record it.',
    'Pick the card no school has filed. The wedjat-eye notes the unprecedented mark for future ink.',
  ],
  pisces: [
    'Pisces. The card is already on the page; trace it. The reed accepts soft contact.',
    'Speak the arcanum even when the reed dips into water. The wedjat-eye is patient with the soft-stroke page.',
    'A name arrived in the dream. Write it; the tablet will hold what the flood carried in.',
  ],
} as const;

// ──────────────── Isis (Binah) ────────────────
// Voice: few words, weighted, threshold-keeping.
// Trial: patience / grief — the test rewards holding instead of racing.

const isis = {
  aries: [
    'Aries. You do not outrun the threshold. Sit. The knot ties when it is ready.',
    'Charge if you must. The river keeps the record. Patience opens what speed cannot.',
    'Quick, hot answer. Wrong here. The carrying does not hurry; sit at the threshold.',
  ],
  taurus: [
    'Taurus. The threshold rests on what you bear. Stand. The knot will find your weight.',
    'Slow ground. The river runs at the pace the mother sets. Hold.',
    'Steady at the gate. The carrying meets the patient — wait without bracing.',
  ],
  gemini: [
    'Gemini. The knot ties one thread, then the other. Speak one at a time.',
    'Bridge at the threshold. The mother carries both your voices; let them take turns.',
    'Many-tongued at the river. Wait until the carrying chooses the line.',
  ],
  cancer: [
    'Cancer. You feel the threshold before you see it. The mother knows the gait.',
    'Tide-walker. The knot ties at the soft step. Come in undefended.',
    'You read the unsaid. The river takes that as the password. Cross.',
  ],
  leo: [
    'Leo. The threshold does not need the show. Quiet at the gate.',
    'Bright at the river. The mother loves the warmth but the carrying is patient work.',
    'Heart-loud at the knot. Lower the volume; the carrying needs the soft pace.',
  ],
  virgo: [
    'Virgo. The knot ties exactly where you point. Be precise about the threshold.',
    'Fine-eyed at the river. The mother thanks the careful crossing.',
    'Plain at the gate. The carrying favours the unornamented step.',
  ],
  libra: [
    'Libra. The threshold opens both ways. Stand at the centre; the knot ties to balance.',
    'Even-handed at the river. The mother thanks the fairness; the carrying is shared.',
    'Balanced at the gate. The carrying answers symmetry — bring the second side.',
  ],
  scorpio: [
    'Scorpio. The river runs deep here. Look without flinching; the carrying meets the gaze.',
    'You see to the bottom. The mother ties the knot at the depth you brought.',
    'Unflinching at the threshold. The carrying does not soften what it carries.',
  ],
  sagittarius: [
    'Sagittarius. The threshold opens wide for the long shot. Aim, then wait.',
    'Far at the river. The mother carries past the immediate bank; trust the distance.',
    'Long-arc at the gate. The knot the mother ties stretches to your horizon.',
  ],
  capricorn: [
    'Capricorn. The threshold is yours by long climb. The mother knows the discipline.',
    'Slow flood at the river. The carrying suits structure; bring the bone of the case.',
    'Cold patient ground. The knot ties at the pace the long arc requires.',
  ],
  aquarius: [
    'Aquarius. The threshold opens sideways. The mother ties the knot at the strange angle.',
    'The mother carries by routes no map kept. Take the river-crossing she opens for the late-comer.',
    'Cross by the unfamiliar ford. The cosmic mother ties the knot that holds the unexpected bank.',
  ],
  pisces: [
    'Pisces. The river is the threshold here. Dissolve into the carrying.',
    'Foam at the river — the mother ties a knot that floats. The crossing holds even loose.',
    'The threshold blurred at your approach; the mother carries the diffuse body without bracing.',
  ],
} as const;

// ──────────────── Amun (Chokmah) ────────────────
// Voice: hidden, breath-quiet, pylon-deep.
// Trial: pre-question insight — test rewards acting before the prompt resolves.

const amun = {
  aries: [
    'Aries. The breath was already in you. Strike before the question finishes.',
    'Fire at the pylon. The hidden god answered before you arrived; trust the heat.',
    'Charge with your eyes closed. The wind already lit the first edge.',
  ],
  taurus: [
    'Taurus. The breath waits long for the patient. Stand; the answer arrives slowly.',
    'Slow at the pylon. The hidden god honours the unhurried; the wind will come.',
    'Steady at the silent gate. The mask softens toward the body that does not rush.',
  ],
  gemini: [
    'Gemini. Many tongues at the pylon. The hidden god gives the breath beneath all of them.',
    'Quick-voiced at the silent gate. The wind picks the unspoken meaning.',
    'Bridge at the mask. The breath the hidden god leaves is the one between your words.',
  ],
  cancer: [
    'Cancer. The hidden god speaks where you already feel. The breath is in the undertone.',
    'Soft at the pylon. The mask softens first to feeling-first.',
    'Tide at the silent gate. The wind moves with the gait you brought.',
  ],
  leo: [
    'Leo. The hidden god answered before you announced. Strike; the breath knows your name.',
    'Bright at the pylon. The mask kept your warmth in the silence; trust it.',
    'Big voice at the silent gate. The wind already echoes you back.',
  ],
  virgo: [
    'Virgo. Plain at the pylon. The hidden god speaks plainly to you.',
    'Fine-eyed at the mask. The wind that arrives is exactly the one you needed.',
    'The breath that finds you is small, exact, useful — measured to your precision.',
  ],
  libra: [
    'Libra. The hidden god holds the breath even between two answers. The wind the mask gives is fair.',
    'Even at the pylon. The breath moves through the gate you set both sides of.',
    'Balanced at the silent gate. The wind arrives at the centre.',
  ],
  scorpio: [
    'Scorpio. The hidden god has been waiting for you. The breath that comes is the held one.',
    'Unflinching at the pylon. The mask shows you the depth others do not see.',
    'Deep at the silent gate. The wind that arrives is the one the surface forgets.',
  ],
  sagittarius: [
    'Sagittarius. The hidden god aims past the immediate question. The breath travels far.',
    'Far at the pylon. The wind the mask gives covers the horizon.',
    'Long shot at the silent gate. The breath the hidden god leaves is the long one.',
  ],
  capricorn: [
    'Capricorn. Cold at the pylon — the breath that comes is the kind that lasts the long winter.',
    'The wind arrives slow at the silent gate; the mask honours the long climb.',
    'Structured at the silent gate. The breath fits the discipline you brought.',
  ],
  aquarius: [
    'Aquarius. The hidden god has voices outside the rite. Yours may be one.',
    'The breath arrives by a route no priest mapped. Move before the question; the hidden god is with you.',
    'Act on the wind no shrine kept. The mask answers what the gathering had not yet asked.',
  ],
  pisces: [
    'Pisces. The hidden god dissolves with you; the breath was always in the room. Receive everywhere.',
    'The pylon dissolved on your approach. The hidden god is already breath, already with you.',
    'Let the boundaries melt at the silent gate. The wind already moves through the parts of you that arrived first.',
  ],
} as const;

// ──────────────── Horus (Gevurah) ────────────────
// Voice: martial, falcon-clean, claim-bearing.
// Trial: burn-cost-before-attempt — pay before the case opens.

const horus = {
  aries: [
    'Aries. Charge — but pay the line first. The falcon honours the funded strike.',
    'Fire at the court. The falcon honours the strike that paid its claim.',
    'First in. Pay the cost; then the case is yours.',
  ],
  taurus: [
    'Taurus. The line stands when you stand. Pay the case and bear it.',
    'Steady at the court. The falcon honours the weight of the paid claim.',
    'Slow burn at the legal gate. The verdict the line draws is heavy and earned.',
  ],
  gemini: [
    'Gemini. Many sides to the case — pay the cost of the one you will argue.',
    'Quick tongue at the court. The falcon allows angles, but the claim must be funded.',
    'Bridge at the legal gate. Pay the line for the argument; the verdict follows.',
  ],
  cancer: [
    'Cancer. The case bends in soft water. Pay accordingly; the falcon respects the increased cost.',
    'Soft at the court. The falcon softens but the claim still costs.',
    'Tide-walker at the legal gate. The line bends — pay anyway.',
  ],
  leo: [
    'Leo. Bright at the court. Pay the cost in the volume you arrived in.',
    'Heart at the legal gate. The falcon honours the warm-blooded claim.',
    'Lion before the falcon. Burn the case lit; the verdict warms with you.',
  ],
  virgo: [
    'Virgo. Plain at the court. Pay the exact cost — no more, no less.',
    'Fine-eyed at the legal gate. The falcon honours the precisely-funded claim.',
    'Exact at the line. The verdict the falcon draws is precisely your payment.',
  ],
  libra: [
    'Libra. The case requires more weighing here; pay the cost with both sides considered.',
    'Even at the court. The falcon thanks the fair claim; the line is shared.',
    'Balanced at the legal gate. Pay the cost both sides can stand behind.',
  ],
  scorpio: [
    'Scorpio. The falcon knows you mean the case. Pay the cost at the bottom; the verdict holds there.',
    'Unflinching at the court. Burn the claim all the way down; the falcon honours the unhidden cost.',
    'Deep at the legal gate. The line cuts all the way down; pay accordingly.',
  ],
  sagittarius: [
    'Sagittarius. Aim past the immediate wrong. The falcon flies the long verdict.',
    'Long shot at the court. Pay the cost of the principle, not just the case.',
    'Wide at the legal gate. The claim covers the horizon — pay the territory.',
  ],
  capricorn: [
    'Capricorn. Patient at the court. The falcon honours the long-burning case.',
    'Structured at the legal gate. Pay the cost in the lasting form.',
    'Cold at the line. The verdict the falcon draws is the kind that endures.',
  ],
  aquarius: [
    'Aquarius. Argue from outside the court\'s procedure — pay anyway.',
    'Fund the unprecedented claim before the court hears it. The falcon honours the cost that opens new law.',
    'Pay the case nobody has filed before. The falcon accepts the burn that sets the precedent.',
  ],
  pisces: [
    'Pisces. Soft at the court. The line still holds; pay what the tide allows.',
    'The case ran like rivers at the gate. The falcon gathered it into a line; pay what the current allows.',
    'Your claim drifted; the falcon pinned its edges. Pay the cost the tide does not wash off.',
  ],
} as const;

// ──────────────── Osiris (Tiferet) ────────────────
// Voice: bright-grave, throne-of-the-dead measured, oracular.
// Trial: balance / weighing — match the feather.

const osiris = {
  aries: [
    'Aries. The scale wants steadiness; strike on the held beat.',
    'Fire at the weighing. The heart must match the feather even at speed.',
    'Quick blade at the throne. Aim true — the feather settles on the precise note.',
  ],
  taurus: [
    'Taurus. The heart you bring is the heart that weighs. Be patient with the scale.',
    'Slow at the throne. The feather honours the unhurried truth.',
    'Steady at the weighing. The scale loves the body that does not shift mid-measure.',
  ],
  gemini: [
    'Gemini. The heart weighs in every voice you brought. The feather honours the chord.',
    'Many-tongued at the scale. The throne measures each translation; the feather settles on the chord.',
    'Bridge at the weighing. The feather settles when all your sides agree.',
  ],
  cancer: [
    'Cancer. The heart you brought is the one the scale weighs. Soft is allowed.',
    'Tide at the throne. The feather meets feeling-first; bring the undertone.',
    'Soft at the weighing. The scale receives the tide-gait without sharpening.',
  ],
  leo: [
    'Leo. The feather sits warm on the heart that arrives bright. The throne acknowledges the show.',
    'Bright at the weighing. The scale loves the unembarrassed truth.',
    'Heart lit at the throne. The feather settles where the warmth lands.',
  ],
  virgo: [
    'Virgo. Plain at the scale. The feather matches what you measure honestly.',
    'Exact at the throne. The weighing honours the parsed heart.',
    'Fine-eyed at the weighing. The feather settles to the smallest fraction.',
  ],
  libra: [
    'Libra. The scale will move more than once. Hold your weight; the feather waits out the contest.',
    'Even at the throne. The feather honours the fairness that does not crush.',
    'Balanced at the weighing. The scale settles where you stop forcing it.',
  ],
  scorpio: [
    'Scorpio. The heart bears looking at. The feather honours the unflinching weight.',
    'Deep at the throne. The scale measures the part you did not hide.',
    'Unblinking at the weighing. The feather settles at the depth you brought.',
  ],
  sagittarius: [
    'Sagittarius. The heart reaches past the immediate scale. The feather flies far.',
    'Long-arched at the throne. The weighing honours the principle behind the case.',
    'Far at the weighing. The feather covers the horizon you aimed at.',
  ],
  capricorn: [
    'Capricorn. The heart endured years to bring this. The feather honours the slow gift.',
    'Structured at the throne. The scale measures the bone of your truth.',
    'Cold patient at the weighing. The feather settles on what survived discipline.',
  ],
  aquarius: [
    'Aquarius. The heart does not fit the standard scale. The feather adjusts.',
    'Bring the heart no template predicted; the scale shifts to meet its measure. The feather settles on the new note.',
    'Weigh in a register the hall has not yet recorded. The throne lets the scale find an unaccustomed balance.',
  ],
  pisces: [
    'Pisces. Soft at the scale. The heart and the feather were already the same substance.',
    'The throne flooded; the scale weighed beneath the surface. The feather found the heart through the water.',
    'Heart and feather drifted together, indistinguishable. The throne accepted the chord; the weighing finished itself.',
  ],
} as const;

// ──────────────── Hathor (Netzach) ────────────────
// Voice: sensual, milk-warm, unflinching about want.
// Trial: declare want — water signs (Cancer, Scorpio, Pisces) bonus.

const hathor = {
  aries: [
    'Aries. You want it. Say it. Halfway gets you nowhere at the cup.',
    'Hot want at the music. Honest want. The cow leaves the drink to the unshy.',
    'Fast lips at the cup. Tell the slow truth in the fast tongue.',
  ],
  taurus: [
    'Taurus. The cup is yours; say what the body wants to keep. The cow pours generous for the patient.',
    'Slow at the music. The cow honours the want that takes its time to name.',
    'Steady at the cup. The drink the cow leaves is for the body that named itself patient.',
  ],
  gemini: [
    'Gemini. Many wants on the tongue — say the one the body would drink.',
    'Quick-mouthed at the cup. The music picks the want that is most playful.',
    'Bridge at the music. The cow leaves the drink to the want that names both sides.',
  ],
  cancer: [
    'Cancer. The cup tilts toward the tide-gait want — the cow pours where the heart already moved.',
    'Soft at the music. The cow loves the feeling-first naming.',
    'Tide at the cup. Say the want the heart already poured into the body.',
  ],
  leo: [
    'Leo. Bright at the cup. Want loudly — the music meets the warmth.',
    'Heart at the music. The cow loves the unembarrassed thirst.',
    'Big voice at the cup. Name the want with the volume you arrived in.',
  ],
  virgo: [
    'Virgo. Name the want carefully — the cup measures exactly the volume you name.',
    'Plain at the music. The cow leaves the small, precise pour to the careful want.',
    'Fine-eyed at the cup. Say the want without ornament; the drink will fit.',
  ],
  libra: [
    'Libra. The cup balances sweetness and shape. Want elegantly; the music holds the proportion.',
    'Even at the music. The cow leaves the drink that does not stint or overflow.',
    'Balanced at the cup. Name the want the way you weighed it before arrival.',
  ],
  scorpio: [
    'Scorpio. The cup honours the want that goes deep. The cow pours past the surface drinkers.',
    'Unflinching at the music. The cow leaves the drink the body asks for at the bottom.',
    'Deep at the cup. Say the want others would have swallowed.',
  ],
  sagittarius: [
    'Sagittarius. Aim the want past the immediate cup. The music carries far.',
    'Long shot at the music. The cow leaves the drink for the large appetite.',
    'Far at the cup. Name the want that does not fit in one swallow.',
  ],
  capricorn: [
    'Capricorn. Patient at the music. Name the want the body would still hold in years.',
    'Long-arc at the cup. The cow leaves the drink that lasts through the slow climb.',
    'Structured at the music. Say the want that has bone — the cow honours it.',
  ],
  aquarius: [
    'Aquarius. Want at a strange angle. The cup pours sideways for the heretic body.',
    'Name the want no playlist holds. The cow pours the milk the music had not learned to ask for.',
    'Speak the desire the song had no chord for. The cup the cow fills is shaped to your thirst.',
  ],
  pisces: [
    'Pisces. The cup is the tide; the song is the body. Say the want — both flow as one.',
    'The song was the body, the body the song. The cow leaves the drink that needs no boundary.',
    'Name the want; the cup arrived in you already. The cow tilts toward the thirst you already are.',
  ],
} as const;

// ──────────────── Ra (Chesed) ────────────────
// Voice: magnanimous, throne-bright, kingdom-abundant.
// Trial: open-hand abundance — match the offering with your own bringing.

const ra = {
  aries: [
    'Aries. The throne is offering. Take. Do not charge past the gift.',
    'Fire to fire at the kingdom. The sun matches what you bring.',
    'Quick at the throne. Open palms — the noon-light fills them.',
  ],
  taurus: [
    'Taurus. Steady at the throne. The sun rewards the body that holds the gift.',
    'Slow at the kingdom. The noon-light enriches what you carry without rush.',
    'Patient at the throne. The sun leaves the warmth for the long-keepers.',
  ],
  gemini: [
    'Gemini. The kingdom hears every tongue. The sun warms the bridge you carry.',
    'Many-voiced at the throne. The noon-light brightens the translation between every dialect.',
    'Bridge at the kingdom. The sun matches your hinge with its own.',
  ],
  cancer: [
    'Cancer. Soft at the throne. The noon-light meets the tide-gait gently.',
    'Tide at the kingdom. The sun warms what the moon began.',
    'Feeling-first at the throne. The noon-light honours the undertone you brought across the tide.',
  ],
  leo: [
    'Leo. Bright into the brightest hall. The sun walks home shoulder-to-shoulder.',
    'Heart-lit at the throne. The kingdom widened at your arrival.',
    'Lion at the throne. The noon-light recognises kin; take generously.',
  ],
  virgo: [
    'Virgo. The throne offers plain — match the precision. The noon-light fits the careful hand.',
    'Plain at the kingdom. The noon-light gives clean — take clean.',
    'Fine-eyed at the throne. The sun warms what you measured.',
  ],
  libra: [
    'Libra. The throne offers fairly. Bring fairness to receive fairly.',
    'Even at the kingdom. The noon-light warms both sides of what you hold open.',
    'Balanced at the throne. Take the gift in the proportion you offer.',
  ],
  scorpio: [
    'Scorpio. The throne offers at the bottom too. Look — take the deep gift.',
    'Unblinking at the kingdom. The noon-light reaches the depth others would not stand to face.',
    'Deep at the throne. The sun warms what others would not look at.',
  ],
  sagittarius: [
    'Sagittarius. The throne walks home with you — far is welcome. The sun rides the long arrow.',
    'Long-aimed at the kingdom. The noon-light covers the horizon you take.',
    'Far at the throne. The sun matches the distance with its own arrow.',
  ],
  capricorn: [
    'Capricorn. The throne offers slowly here. Climb steady; the noon-light meets the patient ascent.',
    'Cold at the kingdom. The noon-light still warms; bring the patience.',
    'Structured at the throne. The sun gives in the form that lasts.',
  ],
  aquarius: [
    'Aquarius. The throne extends past the painted borders. Take at the angle you found.',
    'Open your hand at the unmapped quarter. The sun warms the kingdom to wherever you stood.',
    'Receive at the angle the cartographers missed. The kingdom widens to accept the path you brought.',
  ],
  pisces: [
    'Pisces. The throne dissolves into your softness. The sun warms the whole tide; bring the cup.',
    'The noon-light melted into your shape; the kingdom held no edge between you and itself.',
    'You arrived as tide. The sun warmed every part of what you brought; the throne held its hand open.',
  ],
} as const;

// ──────────────── Khonsu (Yesod) ────────────────
// Voice: cool, traveller-tongued, tidal.
// Trial: dream-peek on miss — the moon offers a glimpse if the body did not arrive.

const khonsu = {
  aries: [
    'Aries. Slow. The moon does not run with you. The crossing wants the held step.',
    'Fire at the night-gate. Lower the speed; the path arrives at the lunar pace.',
    'Charge here and you sleep through the dream. Quiet first.',
  ],
  taurus: [
    'Taurus. The moon walks with the patient body. Trust the slow path; the traveller honours endurance.',
    'Steady at the crossing. The traveller honours the unhurried gait.',
    'Patient at the night-gate. The moon ripens the path; wait.',
  ],
  gemini: [
    'Gemini. Many-voiced at the crossing. The moon picks the version the dream knows.',
    'Quick at the night-gate. The traveller allows the agile dreamer.',
    'Bridge at the moon. The crossing connects the parts of you that crossed separately.',
  ],
  cancer: [
    'Cancer. The moon walks you home. The crossing is yours by birthright.',
    'Tide at the night-gate. The traveller honours the soft-footed gait.',
    'Feeling-first at the crossing. The moon was already in the water.',
  ],
  leo: [
    'Leo. The moon dims for no warmth. Bring the heart but quiet the show.',
    'Bright at the night-gate. The traveller meets warmth but the crossing is cool.',
    'Heart-lit at the crossing. Lower the volume; the dream needs the soft pace.',
  ],
  virgo: [
    'Virgo. Plain at the moon. The crossing rewards the exact step.',
    'Fine-eyed at the night-gate. The traveller honours the careful traverse.',
    'Precise at the crossing. The dream surfaces the clean image.',
  ],
  libra: [
    'Libra. Even at the moon. The crossing balances both shores; walk the centre.',
    'Balanced at the night-gate. The traveller honours the fair gait.',
    'Symmetric at the crossing. The dream the moon shows is the kind that holds.',
  ],
  scorpio: [
    'Scorpio. The moon goes thin here. Walk the path you brought; the traveller meets you anyway.',
    'Deep at the night-gate. The traveller meets you at the bottom anyway.',
    'Unflinching at the crossing. The dream surfaces what the surface forgets.',
  ],
  sagittarius: [
    'Sagittarius. Aim the crossing past the immediate shore. The moon lights far.',
    'Long shot at the night-gate. The traveller honours the dreamer who walks the horizon.',
    'Far at the moon. The crossing covers the distance you set.',
  ],
  capricorn: [
    'Capricorn. The moon walks slowly with you. Bring the discipline; the path the traveller sets is exact.',
    'Cold at the night-gate. The traveller honours the structured night-walker.',
    'Patient at the crossing. The dream the moon leaves fits the long ascent.',
  ],
  aquarius: [
    'Aquarius. The moon walks at the angle you named. The crossing is unprecedented.',
    'Cross by the night-route no traveller had walked. The moon lights what becomes a path on the next tide.',
    'Walk the dream the cartographers had not anticipated. The traveller leaves you the new path home.',
  ],
  pisces: [
    'Pisces. Soft at the crossing. The moon led you through water that knows your gait.',
    'Night and water met without a seam. The traveller crossed alongside you, indistinguishable from the path.',
    'Edges loosened at the moon; the crossing welcomed the body that arrived as already-water.',
  ],
} as const;

// ──────────────── Aggregated matrix ────────────────

export const sefirahFraming: FramingMatrix = {
  hod: thoth,
  binah: isis,
  chokmah: amun,
  gevurah: horus,
  tiferet: osiris,
  netzach: hathor,
  chesed: ra,
  yesod: khonsu,
} as const;

/**
 * One placeholder line per challenge avatar. Used by sign-less
 * callers (demo / tests without a `playerSign` in the encounter
 * context). Each line names the avatar so a sign-less render still
 * reads as the avatar speaking. Parallels the greco-roman placeholder
 * map at `pantheons/greco-roman/framing.ts`.
 */
export const sefirahFramingPlaceholder: FramingPlaceholderMap = {
  chokmah:
    'Amun breathes the answer before the question. Strike, and the hidden god is already with you.',
  binah:
    'Isis holds the threshold. The cosmic mother carries what the racing body would lose.',
  chesed:
    'Ra opens the noon-light. Match the offering, and the kingdom widens for you.',
  gevurah:
    'Horus draws the line. Pay the cost of the case, and the falcon honours the claim.',
  tiferet:
    'Osiris waits at the scale. Bring the heart that matches the feather; the throne weighs true.',
  netzach:
    'Hathor lifts the cup. Name the body\'s want, and the cow leaves the drink that fits.',
  hod: 'Thoth dips the reed. Speak the arcanum the page is waiting to record.',
  yesod:
    'Khonsu lights the crossing. Walk the dream-path; the moon honours the patient step.',
} as const;
