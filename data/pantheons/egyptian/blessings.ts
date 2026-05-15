import type { SefirahBlessingMatrix } from '../types';

/**
 * Egyptian per-Sefirah blessing matrix (#554).
 *
 *   10 sefirot × 12 signs × 3 variants = 360 lines.
 *
 * Companion to the verdict matrix (#553). Blessings fire during the
 * Blessing Ritual screen (post-encounter), not at encounter resolve —
 * the voice is gift-mode, open-handed, less judgmental than the
 * verdict-voice. Each deity leaves something with the player.
 *
 * Voice register and source-grounding follow
 * `reference/pantheons/egyptian.md` (#551). The 8 encounter deities
 * use their locked voices (Amun, Isis, Ra, Horus, Osiris, Hathor,
 * Thoth, Khonsu). Kether speaks in a collective unmanifest-Crown
 * voice (no single deity). Malkuth uses Bastet-as-companion — a
 * warmer hearth/threshold register, parallel to Hestia in greco-roman.
 *
 * Sign-aware dignity calibration is softer here than in verdicts:
 * rulership / exaltation cells run warmer or more porous; fall /
 * detriment cells stay open-handed but hold the gift more carefully
 * (no fail-state in a blessing).
 *
 * Word counts: 8–21 (matching greco-roman's range; max in
 * greco-roman is 21).
 */

// ──────────────── Kether — collective unmanifest voice ────────────────

const ketherBlessings = {
  aries: [
    'Before the first sunrise, your fire was counted. The gathering kept the dawn open for your arrival.',
    'Spark before any flint — your beginning is already woven into the company we are becoming.',
    'You who could not wait — the threshold opens at the speed you brought to it.',
  ],
  taurus: [
    'Patient ground — the gathering rests on what you bear. Before form, your steadiness was promised.',
    'Slow stone in the unformed company — we hold the dawn for the weight you bring.',
    'When all return as one, your unbroken keeping will be the floor the threshold opens upon.',
  ],
  gemini: [
    'Bridge before there were shores — your translation is already counted in the cohering.',
    'You who carry meaning between voices — the gathering keeps the hinge you turned.',
    'When the company arrives whole, your moving between will be the wind through every gate.',
  ],
  cancer: [
    'The undertone you read was the first sound. You — keeper of feeling-before-word — already part of us.',
    'We gather what is felt before it is named, and we remember your hand on the unsaid.',
    'When all return, your knowing of what moves beneath will hold the company steady at the gate.',
  ],
  leo: [
    'Heart-warmth in the unformed gathering — your conviction is already counted in the kindling.',
    'You who carry the room — the dawn holds open for the heat you bring.',
    'When the company comes together, your bearing will warm the threshold we cross as one.',
  ],
  virgo: [
    'Fine-eyed in the unformed — what you saw small is already counted at the largest scale.',
    'The gathering loses nothing with you among us. Your watchful seeing — already received.',
    'When all return as one, the small things you saved will be why nothing is missing from the whole.',
  ],
  libra: [
    'You who held the threshold open for both sides before there were sides — the gathering keeps the symmetry you brought.',
    'The gathering coheres around the balance you brought. Your hinge — already received.',
    'When the company returns whole, your placing the right thing in the right place will be why we are not broken.',
  ],
  scorpio: [
    'You who saw to the bottom of the silence — counted in the founding before any word was spoken.',
    'The gathering holds what cannot yet be said, and we remember your unflinching look.',
    'When all return, the depth you knew alone will be the depth the company shares.',
  ],
  sagittarius: [
    'Far-aimed one — the horizon you reached is already counted in the gathering before the bow bent.',
    'The company keeps the threshold open as wide as your aim required.',
    'When all return, the distance you covered will be why the gate could welcome arrival from anywhere.',
  ],
  capricorn: [
    'Builder before the world was built — your scaffolding is already in the gathering before form took shape.',
    'The long arc you carried is held in our forming. Your patience — received before completion.',
    'When all return as one, the structure you bore will be the bone of our cohering.',
  ],
  aquarius: [
    'Outsider counted in — you who saw the company from beyond it, already part of the threshold.',
    'The gathering includes even what could not be foreseen. Your strange angle — received.',
    'When all return, the angle you saw from will be why the company is not a closed circle.',
  ],
  pisces: [
    'Edges-loved one — your softness was counted before any wall went up. The gathering keeps the porous gate.',
    'You who would not wall off — the dawn holds open at the looseness you brought.',
    'When the company arrives whole, your willingness to be porous will be why we did not break apart.',
  ],
} as const;

// ──────────────── Chokmah — Amun (hidden, breath, wind, pylon) ────────────────

const chokmahBlessings = {
  aries: [
    'You came running and the hidden god still met you. The breath was waiting at the pylon you charged.',
    'The wind held its shape while you tore through. Take the breath the hidden god leaves at your gate.',
    'Fire arriving at the silent gate — the mask did not move, but the breath remembers you came.',
  ],
  taurus: [
    'You stood until the hidden answered. The breath that arrives slowly is the gift the pylon kept for you.',
    'The mask softened toward your stillness. The silence the hidden god leaves is yours to carry.',
    'You waited at the pylon and the wind arrived through it. Take what the silent god gives.',
  ],
  gemini: [
    'You spoke many tongues at the silent gate. The hidden god leaves the breath between your words.',
    'The wind moved through every name you offered. What the pylon keeps for you is the unspoken one.',
    'Many-voiced at the mask — the breath you receive is the one that needed no translation.',
  ],
  cancer: [
    'You felt the hidden before you saw the pylon. The breath the silent god leaves moves with the tide of you.',
    'The wind found the soft place first. Take what the mask kept for the heart that arrived undefended.',
    'You came porous and the pylon recognised you. The breath gathers where your feeling pooled.',
  ],
  leo: [
    'You announced yourself and the hidden god still gave the breath. The pylon does not need your name to know you.',
    'Bright at the silent gate — the mask let the warmth through without naming it. Take what was given quietly.',
    'You arrived loud and the wind answered low. The breath the hidden god leaves is the soft echo of your fire.',
  ],
  virgo: [
    'Plain-eyed at the pylon — the hidden god speaks plainly to you. Take the breath without ornament.',
    'You parsed the silence and the silence answered. What the mask leaves is small, exact, yours.',
    'You arrived with no excess and the wind matched you. The breath the silent god gives is clean.',
  ],
  libra: [
    'You weighed before crossing and the pylon weighed with you. The hidden god leaves the balanced breath.',
    'The mask kept the scales even while you stood. Take what the silent god gave to your fairness.',
    'You held the threshold open for both sides — the wind moves now through the gate you set.',
  ],
  scorpio: [
    'You saw to the bottom of the silence. The breath the hidden god leaves is the one held back from others.',
    'The pylon opened where you looked. Take what the mask gives only to the unflinching.',
    'You knew the hidden was hiding nothing from you — the wind that arrives is yours alone.',
  ],
  sagittarius: [
    'You aimed past the pylon and the wind carried farther. The breath the hidden god leaves is the long one.',
    'Far-flung at the silent gate — the mask released the breath at the distance you required.',
    'You shot through the silence and the silence opened wide. Take the wind that travels with you.',
  ],
  capricorn: [
    'You came cold to the silent gate — the hidden god leaves the breath that warms slowly, lastingly.',
    'The pylon held against the wind you brought. The mask leaves the breath that endures discipline.',
    'You arrived with structure and the silence answered in kind. Take the breath that fits the long climb.',
  ],
  aquarius: [
    'The breath came at you from a quarter no priest had marked. The wind the hidden god leaves does not blow from any named direction.',
    'You stood between pylons no one had built, and the silent god still answered. Take the breath the mask gave to no one before.',
    'The hidden god has voices outside the rite. Yours was one of them — carry the silence that knows it was heard.',
  ],
  pisces: [
    'You dissolved at the pylon and the hidden god dissolved with you. The breath was the whole sky breathing.',
    'Water at the silent gate — the mask was already gone before you arrived. Take the wind that is everywhere.',
    'You came porous and the breath was already in you. The hidden god gives what was never separate.',
  ],
} as const;

// ──────────────── Binah — Isis (threshold, knot, carry, river) ────────────────

const binahBlessings = {
  aries: [
    'You came running and the threshold widened. The cosmic mother keeps what your fire forgot.',
    'The knot tied itself faster than your charge. Carry the river that came through the gate you broke.',
    'Heat at the threshold — the mother received it. The carrying is hers; the speed was yours.',
  ],
  taurus: [
    'You bore weight at the threshold and the threshold thanked you. The cosmic mother adds her own.',
    'The knot held because you held first. Take the river that runs through your endurance.',
    'Slow at the gate — the mother carried you the rest of the way. The weight is shared now.',
  ],
  gemini: [
    'You spoke at the threshold and the mother listened on both sides. The knot tied your two voices into one.',
    'Bridge at the river — the carrying went where your translating opened the gate.',
    'Many-voiced at the cosmic threshold — the mother holds your meanings together. Carry her stillness.',
  ],
  cancer: [
    'You crossed feeling-first and the river carried you. The cosmic mother knows that gait.',
    'The threshold opened at your soft step. The knot the mother ties around you is the home one.',
    'You came porous and the carrying was already underway. Take the river that has always been yours.',
  ],
  leo: [
    'Bright at the threshold — the mother received the warmth without taking it from you. The knot holds.',
    'You arrived loud and the river answered low. The cosmic mother carries the soft echo of your fire.',
    'The carrying needed your heat. Take what the mother gives to those who arrive shining.',
  ],
  virgo: [
    'You crossed with no excess and the threshold thanked you. The knot the mother ties is precise.',
    'Fine-eyed at the river — the carrying went exactly where your seeing pointed.',
    'Plain at the cosmic gate — the mother gives the carrying without ornament. It is enough.',
  ],
  libra: [
    'You balanced the threshold for two and the mother carried both. The knot ties fairness in.',
    'Even-handed at the river — the carrying is shared. The cosmic mother leaves you the unweighted part.',
    'You held the gate open for the other side — the mother holds it open for yours.',
  ],
  scorpio: [
    'You looked to the bottom of the river and the river looked back. The mother ties the knot at the depth you found.',
    'Unflinching at the threshold — the carrying went down with you. The cosmic mother does not flinch either.',
    'You saw what others wall off. The river the mother gives is the one that has not been simplified.',
  ],
  sagittarius: [
    'You aimed past the threshold and the river ran with your arrow. The mother carries the long shot.',
    'Far at the cosmic gate — the knot the mother ties stretches to where you went.',
    'You wanted distance and the carrying gave it. The river the mother leaves runs to the horizon.',
  ],
  capricorn: [
    'You came with structure and the mother gave structure. The threshold opens to discipline that earns it.',
    'Long-arc at the river — the carrying is the kind that endures. The cosmic mother knows the slow gift.',
    'You bore weight without complaint. The knot the mother ties around you is the lasting one.',
  ],
  aquarius: [
    'The threshold opened sideways at your approach. The cosmic mother ties the knot that bridges where no bridge was drawn.',
    'You crossed the river by a ford the maps do not mark. The mother carries you anyway; the knot holds at the unfamiliar bank.',
    'The mother carries even those who arrive at a gate she did not place. The river you crossed is yours now to name.',
  ],
  pisces: [
    'You dissolved at the threshold and the river received the dissolution. The cosmic mother carries water that loves water.',
    'Soft at the cosmic gate — the knot the mother ties is a knot of foam. It holds anyway.',
    'You came porous and the carrying was already inside you. The mother gives what was never withheld.',
  ],
} as const;

// ──────────────── Chesed — Ra (sun, throne, sky, kingdom) ────────────────

const chesedBlessings = {
  aries: [
    'Fire at the throne — the sun added its own. Take the warmth the noon-light leaves on your shoulders.',
    'You ran into the kingdom and the kingdom widened. The sky keeps the heat you brought through.',
    'Bright into bright — the throne kept the door open. The sun walks home with you.',
  ],
  taurus: [
    'Slow under the noon-sun — the throne acknowledges the weight you carried. The light stays with the patient.',
    'You stood until the sky stood with you. The sun leaves the warmth that endures past the day.',
    'Steady at the kingdom — the throne thanks you for the floor. The noon-light is yours to keep.',
  ],
  gemini: [
    'You spoke under the noon-sky and the kingdom heard every voice. The sun warms the bridge.',
    'Many-tongued before the throne — the light brightens what you translated.',
    'You crossed between voices at noon — the sun keeps the heat in the hinge you turned.',
  ],
  cancer: [
    'You came soft to the kingdom and the noon-light met you softly. The throne knows the tide-gait.',
    'The sun warmed what the moon began. Take what the throne gives to those who arrive feeling-first.',
    'You crossed under noon with the undertone intact — the kingdom keeps it that way.',
  ],
  leo: [
    'Bright into the brightest hall — the throne received you as kin. The sun walks home shoulder-to-shoulder.',
    'You arrived in your full light and the sky widened. The noon-warmth is yours to wear.',
    'The kingdom recognised the fire you brought — the throne leaves the warmth lit on your back.',
  ],
  virgo: [
    'Plain-eyed at the noon-court — the sun gives the clean light. The throne keeps no ornament for you.',
    'You missed nothing under the noon-sun. The kingdom leaves the warmth on the small details you held.',
    'Exact at the throne — the sun warms what you measured. The light is precisely yours.',
  ],
  libra: [
    'You weighed under the noon-sun and the scales held. The throne keeps the balanced light on you.',
    'Even at the kingdom — the sun warms both sides of what you held open.',
    'The throne thanks you for fairness at noon. The light leaves the kind that does not glare.',
  ],
  scorpio: [
    'You looked to the bottom of the kingdom and the sun looked with you. The throne does not flinch from the depth.',
    'Unblinking at the noon-court — the sun warms what others would not look at. Take that light.',
    'The kingdom keeps the heat at the depth you brought. The throne leaves the unflinching warmth.',
  ],
  sagittarius: [
    'Far-aimed under the rulership sun — the noon-light goes the distance with you. The throne walks home.',
    'You shot past the kingdom and the kingdom widened to meet you. The sun keeps the long heat lit.',
    'The throne adds its own arrow to yours. The noon-light covers the horizon where you went.',
  ],
  capricorn: [
    'You climbed cold to the throne and the sun met you anyway. The light gives the warmth that endures the slow ascent.',
    'Long-arc at the kingdom — the noon-sun acknowledges the discipline. The warmth fits the climb.',
    'You came patient to the sky — the throne leaves the heat that lasts through winter.',
  ],
  aquarius: [
    'The noon-light reached you in the hall where no throne stood. The sun keeps the warmth lit at the angle you required.',
    'You arrived at the kingdom by a road the cartographers had not drawn. The sun made the new road official with its heat.',
    'The throne extends past the painted borders. The light the sun leaves is the kind that proves you were always already in the kingdom.',
  ],
  pisces: [
    'Soft into the rulership sun — the noon-light dissolved into your softness. Take the sky home.',
    'You came porous to the throne and the warmth was already in you. The kingdom does not separate from itself.',
    'Water at noon — the sun warmed the whole tide. The throne leaves the heat that holds water.',
  ],
} as const;

// ──────────────── Gevurah — Horus (falcon, claim, line, court) ────────────────

const gevurahBlessings = {
  aries: [
    'Fire at the rulership gate — the falcon nodded once. The line you brought is yours; the wrong is named.',
    'Clean strike at the court — the case opens and closes in your favour. Take the verdict the falcon leaves.',
    'You charged and the line held. The falcon walks home with you; the claim is now law.',
  ],
  taurus: [
    'Slow at the court — the falcon thanks you for the steady case. The verdict the line gives is heavy and yours.',
    'You bore the case without flinching. The falcon leaves the claim that does not move with the wind.',
    'Steady before the court — the line you drew will hold the way you held it.',
  ],
  gemini: [
    'You argued every side at the court and the falcon allowed it. The line the verdict draws is fair to all.',
    'Many-voiced at the case — the falcon nods at the angles. Take the verdict that honours each.',
    'Bridge at the legal threshold — the line you drew connects the parties. The falcon thanks the hinge.',
  ],
  cancer: [
    'Soft arrival at the court — the falcon met the tide-gait without sharpening its claim. The verdict came tender.',
    'Soft at the court — the line still held. The falcon leaves the claim that did not need cruelty.',
    'Tide at the legal gate — the falcon nodded twice for the gait. The case is yours.',
  ],
  leo: [
    'Bright at the court — the falcon saw the warmth and gave the verdict in kind. Take the line lit up.',
    'You came in your full bearing and the case bent toward fairness. The falcon walks home in your light.',
    'Heart at the gate — the line the falcon draws is the warm-blooded one.',
  ],
  virgo: [
    'Plain-eyed at the court — the falcon thanks you for the cleanness. The verdict comes without excess.',
    'Exact at the legal gate — the line drawn is the line that was needed. The falcon leaves the precision.',
    "You missed no detail of the case. The falcon's claim lands exactly where your seeing pointed.",
  ],
  libra: [
    'Even-handed at the court — the falcon thanks you for the balance. The verdict holds both sides.',
    'You weighed before striking and the falcon weighed with you. The line is fair the way you are fair.',
    'Balanced at the gate — the falcon leaves the claim that does not crush. Carry it as you carried the scales.',
  ],
  scorpio: [
    'Rulership depth at the court — the falcon nodded as for kin. The verdict holds at the bottom.',
    'Unflinching at the legal gate — the falcon leaves the claim that goes all the way down.',
    'You saw the wrong at its root and named it there. The line the falcon draws cuts as deep.',
  ],
  sagittarius: [
    'Far-aimed at the court — the falcon flies the long verdict home with you. The case covers the horizon.',
    'You shot past the immediate wrong to the principle. The falcon thanks the aim; the line goes the distance.',
    'Long-shot at the legal gate — the falcon leaves the claim that holds across the territory.',
  ],
  capricorn: [
    'Patient at the court — the falcon thanks you for the long case. The verdict the line gives is the kind that lasts.',
    'You bore the slow argument and the falcon bore it with you. The claim endures the way you endured.',
    'Structured at the gate — the line drawn is the bone of justice. The falcon leaves it intact.',
  ],
  aquarius: [
    "You argued the case from outside the court's accepted procedure and the falcon allowed the angle. The verdict the line draws is precedent-setting.",
    'The falcon nodded at the unprecedented claim. The court the verdict opens is one others will have to build to.',
    'You made the case in a register the legal tradition had not anticipated. The line the falcon draws is yours; the court adjusts.',
  ],
  pisces: [
    'Soft at the court — the falcon softened too. The verdict the line gives is one that does not bruise.',
    'You came porous to the legal gate and the case held anyway. The falcon leaves the claim that holds water.',
    'Water at the court — the line the falcon draws is fluid but firm. Carry the verdict that flows.',
  ],
} as const;

// ──────────────── Tiferet — Osiris (feather, scale, heart, weigh) ────────────────

const tiferetBlessings = {
  aries: [
    'Fire at the scale — the heart still weighed. The feather the throne of the dead leaves is yours, light as it came.',
    'You ran into the weighing and the heart held its line. The throne acknowledges the speed; the scale honours the weight.',
    'Bright at the underworld court — the feather settled because your heart was true. Take it home.',
  ],
  taurus: [
    'Steady at the scale — the heart you brought was not heavy with deceit. The feather the throne leaves is patient.',
    'You stood at the weighing without shifting. The throne of the dead acknowledges the stone you laid.',
    'Slow at the underworld gate — the feather the heart matched is the lasting one. Carry it.',
  ],
  gemini: [
    'Many-voiced at the scale — the heart still weighed clean. The throne thanks you for the truth in every tongue.',
    'You translated yourself at the weighing and every translation held. The feather honours the hinge.',
    'Bridge at the underworld court — the scale balanced the many parts of you. The throne acknowledges them all.',
  ],
  cancer: [
    'Soft at the scale — the heart and the feather met in tide-rhythm. The throne of the dead thanks the gait.',
    'You came feeling-first to the weighing and the weighing softened. The feather the throne leaves is gentle.',
    'Tide at the underworld gate — the heart you brought knew its own weight. The scale honours it.',
  ],
  leo: [
    'Rulership-throne at the scale — the throne of the dead recognised you as kin. The feather sits warm on you.',
    'Bright at the weighing — the heart held in its full light. The throne leaves the warmth lit on your back.',
    'You came in your full bearing and the scale loved the show. The feather acknowledges the heat that did not lie.',
  ],
  virgo: [
    'Exact at the scale — the heart matched the feather to the smallest fraction. The throne thanks the precision.',
    'You parsed your own weight before the weighing began. The feather the throne leaves is the clean one.',
    'Plain at the underworld gate — the scale held without ornament. The throne acknowledges what was simply true.',
  ],
  libra: [
    'The scale moved more than once before settling — the heart still weighed clean. The throne thanks the patience the contest required.',
    'You held the scales steady at the underworld court even when they wanted to swing. The throne leaves the hard-won feather.',
    'Even-handed at the weighing under contest — the throne of the dead acknowledges the fairness that did not flinch.',
  ],
  scorpio: [
    'Unflinching at the scale — the heart bore looking at. The throne of the dead acknowledges the depth.',
    'You showed the heart at its full weight and the feather still rose. The throne thanks the truth-telling.',
    'Deep at the weighing — the scale honoured the parts of you others would not show. Take the feather.',
  ],
  sagittarius: [
    'Far-arched at the scale — the heart reached past the local truth to the wide one. The feather flies with you.',
    'You aimed at the principle behind the case and the throne of the dead met the aim.',
    'Long-shot at the underworld court — the scale balanced the horizon. The throne leaves the long feather.',
  ],
  capricorn: [
    'Patient at the scale — the heart bore weight that took years to set down. The throne acknowledges the slow gift.',
    'Long-arc at the weighing — the feather the throne leaves is the kind that endures discipline.',
    'Structured at the underworld gate — the heart held its line through the long climb. The scale honours it.',
  ],
  aquarius: [
    'Your heart did not fit the shape the scale was built for; the scale adjusted. The throne leaves the feather that records the new measurement.',
    'The feather settled at an angle no underworld scribe had drawn before. The throne acknowledges what was unprecedented in the weighing.',
    'You weighed in a register the hall had not seen, and the hall held. The feather the throne leaves is the one no template predicted.',
  ],
  pisces: [
    'Soft at the scale — the heart and the feather were already the same substance. The throne does not separate them.',
    'Water in the scale — the heart kept its weight even in the tide. The throne of the dead leaves the feather that floats true.',
    'The underworld gate opened onto water and the heart floated unbruised through the weighing. The feather rises with you, untouched by current.',
  ],
} as const;

// ──────────────── Netzach — Hathor (cup, cow, milk, music, drink) ────────────────

const netzachBlessings = {
  aries: [
    'Fire at the cup — the milk did not curdle. Hathor thanks the directness; take the drink lit by your heat.',
    'You ran into the want and the want met you. The cup the cow leaves is brimming for the unshy.',
    'Bright at the music — the song picked up your tempo. Drink what the body asked for.',
  ],
  taurus: [
    'Rulership cup — the milk is the richest pour. Hathor thanks you for staying long enough to be filled.',
    'Slow at the song — the body settled into the music. The cup the cow leaves is for the patient drinker.',
    'You came steady to the want and the want stayed. Take the drink that knows its own weight.',
  ],
  gemini: [
    'Many-voiced at the cup — the song picked up every tongue you brought. Hathor thanks the playfulness.',
    'Bridge at the music — the drink moves between the parts of you. The cow leaves the cup that is shared.',
    'You translated the want into many forms and the want met all of them. Drink the brimming hinge.',
  ],
  cancer: [
    'Tide at the cup — the milk moved with your gait. Hathor thanks the soft-coming.',
    'You came feeling-first to the music and the music received the feeling. The drink the cow leaves is the tender one.',
    'Soft at the want — the body told the truth. Take the cup that meets you at the undertone.',
  ],
  leo: [
    'Bright at the cup — the milk warmed in your glow. Hathor thanks the unembarrassed wanting.',
    'You came in your full want and the want shone back. The cow leaves the drink that wears the heat well.',
    'Heart at the music — the song picked you up and held you up. Take the cup of unashamed.',
  ],
  virgo: [
    'Hathor met your reticence with a small, exact pour. The cup the cow leaves is precisely measured; drink it — it is enough.',
    'You came careful to the want and the want still came. The cow leaves the cup that respects the precise heart.',
    'Plain at the music — the song held its line at the volume you could bear. The drink is yours.',
  ],
  libra: [
    'Rulership cup — the music balanced sweetness and shape. Hathor thanks the elegant wanting.',
    'Even-handed at the song — the drink the cow leaves is fair to all parts of the body that asked.',
    'Balanced at the cup — the milk did not overflow; it did not stint. Hathor honours the proportion.',
  ],
  scorpio: [
    'Deep at the cup — the milk went all the way down. Hathor thanks the body that did not split from itself.',
    'You came unflinching to the want and the want bore it. The cow leaves the drink that meets the depth.',
    'Music at the bottom of the room — the song held the long note your body asked for.',
  ],
  sagittarius: [
    'Far-flung at the cup — the milk arrived from a distance and stayed warm. Hathor thanks the long thirst.',
    'You aimed past the immediate drink to the larger appetite. The song meets you at the horizon.',
    'Long-shot at the music — the cow leaves the cup that goes the distance with you.',
  ],
  capricorn: [
    'Patient at the cup — the milk took its time and was richer for it. Hathor thanks the disciplined wanting.',
    'Long-arc at the song — the music the cow leaves is the kind that lasts through the climb.',
    'Structured at the music — the body waited for the right verse. Take the drink that fits the long line.',
  ],
  aquarius: [
    'The cup poured at an angle that should have spilled. The cow leaves the milk that knows a body-route you had not asked for.',
    'You drank the music in a key no instrument had played. Hathor thanks the body that wanted what no one had named yet.',
    'The drink arrived in a vessel you had not held before. The cow leaves the milk that fits the cup you brought.',
  ],
  pisces: [
    'Soft at the cup — the milk dissolved into the body without asking permission. Hathor thanks the porous drinking.',
    'You came open to the music and the music was already inside you. The cow leaves what is everywhere.',
    'Water at the cup — the drink the cow gives is the tide of the body itself.',
  ],
} as const;

// ──────────────── Hod — Thoth (ink, reed, page, tablet, scribe) ────────────────

const hodBlessings = {
  aries: [
    'Fire at the reed — the ink still wrote clean. Thoth thanks the directness; the line on your page is bright.',
    'You charged the page and the page held. The scribe leaves the writing that survives the heat you brought.',
    'Bright at the tablet — the wedjat-eye watched and the line stayed straight. Take the page home.',
  ],
  taurus: [
    'Steady at the page — the reed did not waver. Thoth thanks the patient hand; the writing endures.',
    'Slow at the ink — the line dried richly. The scribe leaves the page that does not smudge.',
    'You bore weight at the tablet and the tablet bore back. The wedjat-eye honours the carved-in writing.',
  ],
  gemini: [
    'Rulership reed — the ink flew. Thoth thanks the agile scribing; the page holds every angle you tried.',
    'Many-voiced at the page — the writing keeps all the dialects you brought. The wedjat-eye nodded at the brightness.',
    'Bridge at the tablet — the line the scribe leaves bridges the meanings. Carry the brilliant page.',
  ],
  cancer: [
    'Tide at the reed — the ink moved with feeling. Thoth thanks the soft-handed writing; the page is tender.',
    'You came feeling-first to the page and the page received the feeling. The line the scribe leaves is gentle.',
    'Soft at the ink — the wedjat-eye loved the careful pressure. Take the writing that holds the undertone.',
  ],
  leo: [
    'Bright at the page — the ink warmed in your glow. Thoth thanks the unashamed scribing; the line shines.',
    'You came in your full voice and the writing kept the volume. The scribe leaves the page that wears the heat.',
    'Heart at the reed — the wedjat-eye liked the warm pressure. The line is yours, lit up.',
  ],
  virgo: [
    'The reed bows for the exact hand twice over. Thoth leaves the page that needed no correction; the wedjat-eye approves the unornamented line.',
    'Plain at the ink — the line lands exactly where it should. The scribe leaves the precision intact.',
    'Fine-eyed at the tablet — the wedjat-eye approved every stroke. The page is yours; nothing extra.',
  ],
  libra: [
    'Even-handed at the page — the ink balanced both sides. Thoth thanks the fair scribe; the line holds.',
    'Balanced at the reed — the writing the scribe leaves honours both arguments. The wedjat-eye nodded at the equity.',
    'You weighed each word before writing it and the page weighed back. The line is the fair one.',
  ],
  scorpio: [
    'Deep at the page — the ink went all the way through the parchment. Thoth thanks the unflinching scribing.',
    'You wrote at the bottom of the matter and the matter held. The scribe leaves the line that does not lie.',
    'Unflinching at the tablet — the wedjat-eye honoured the depth. The page carries what others would not write.',
  ],
  sagittarius: [
    'The writing landed at the principle if not the detail. Thoth thanks the long aim; the reed honoured the far throw.',
    'You aimed past the immediate page to the territory. The line the scribe leaves covers the distance.',
    'Long-shot at the ink — the wedjat-eye allowed the horizon. The page holds the wide view.',
  ],
  capricorn: [
    'Patient at the reed — the ink took the long time and was sharper for it. Thoth thanks the slow scribing.',
    'Long-arc at the page — the writing the scribe leaves is the kind that lasts on the tablet.',
    'Structured at the ink — the line is the bone of the page. The wedjat-eye honours the discipline.',
  ],
  aquarius: [
    'You wrote a line the script did not yet contain, and the page accepted the new mark. The wedjat-eye learned the character with you.',
    'The reed moved at an angle the scribal schools had not taught. Thoth leaves the page where the new line is now precedent.',
    'You drew an ink-stroke the canon had not anticipated. The wedjat-eye watched the page carry the unprecedented mark.',
  ],
  pisces: [
    'The reed dipped into water instead of ink, and Thoth still wrote you clean. The page that survives is yours.',
    'Soft at the page — the reed wrote on water and the writing held its line. The scribe leaves the page that survived the flood.',
    'Water at the tablet — the wedjat-eye watched the page accept the flood. The line you keep is the one that held.',
  ],
} as const;

// ──────────────── Yesod — Khonsu (moon, dream, tide, crossing) ────────────────

const yesodBlessings = {
  aries: [
    'Fire at the crossing — the moon kept the path lit for the speed you brought. Take the silver home.',
    'You ran into the night and the night opened. The traveller thanks the directness; the tide is yours.',
    'Bright at the dream — the moon honoured the heat. Carry the path that warmed under your feet.',
  ],
  taurus: [
    'Exalt at the moon — the tide rose richly for the patient crosser. Khonsu thanks the slow night-walk.',
    'Steady at the crossing — the path the traveller leaves is the kind that holds in the dark.',
    'Slow at the dream — the moon ripened with you. Take the silver that lasts past dawn.',
  ],
  gemini: [
    'Many-voiced at the crossing — the moon picked up every tongue. Khonsu thanks the agile night-traveller.',
    'Bridge at the dream — the path the traveller leaves connects the parts of you that crossed separately.',
    'You spoke at the tide and the tide answered in many voices. The moon honours the hinge.',
  ],
  cancer: [
    'Rulership tide — the moon walked you home. Khonsu thanks the soft-footed crossing; the dream is yours.',
    'You came feeling-first to the night and the night carried you. The traveller leaves the gentle path.',
    'Soft at the crossing — the moon was already in the water you walked through. Take the path everywhere.',
  ],
  leo: [
    'Bright at the night-gate — the moon met the warmth without dimming it. Khonsu thanks the unashamed dreamer.',
    'You came in your full heat to the crossing and the crossing held. The traveller leaves the warm-blooded path.',
    'Heart at the dream — the moon honoured the show. Carry the silver lit up on your back.',
  ],
  virgo: [
    'Plain at the moon — the path is the clean one. Khonsu thanks the exact step at the night-gate.',
    'Fine-eyed at the crossing — the dream the traveller leaves is the precise one; nothing extra in the tide.',
    'You came careful to the night and the night was careful with you. Take the small, sure silver.',
  ],
  libra: [
    'Even-handed at the crossing — the moon balanced both shores. Khonsu thanks the fair night-walking.',
    'Balanced at the dream — the path the traveller leaves honours the parts that came and the parts that stayed.',
    'You held the tide level for two and the moon held it level for you. Take the symmetric silver.',
  ],
  scorpio: [
    'The moon walked with you anyway, knowing the deep tide the crossing would carry. The path the traveller leaves is the held one.',
    'You came down to the night without fear and the dream did not punish. The moon thanks the unflinching descent.',
    'Deep at the crossing — the silver the traveller leaves is the kind that survives the underwater path.',
  ],
  sagittarius: [
    'Far-aimed at the crossing — the moon lit the long path. Khonsu thanks the dreamer who walked the horizon.',
    'You shot past the immediate tide to the far shore. The traveller leaves the path that covers the distance.',
    'Long-shot at the dream — the moon honoured the reach. Take the silver that runs to the edge.',
  ],
  capricorn: [
    'Khonsu walked you across slow and exact — the path the traveller leaves is the structured one, fit to the long ascent.',
    'You came cold to the crossing and the crossing met you with discipline. The moon thanks the long climb.',
    'Patient at the night-gate — the dream the traveller leaves is the kind that endures the slow watch.',
  ],
  aquarius: [
    'You crossed by an unlit ford; the moon lit it after. The traveller leaves the path that did not exist before tonight.',
    'The night-tide ran at an hour no traveller before you had walked. Khonsu leaves the crossing that becomes a route on the next moon.',
    'You took the night-road at the angle the dream had not yet drawn. The moon walks home along the new line with you.',
  ],
  pisces: [
    'Soft at the crossing — the moon led you through water that already knew your gait. Khonsu thanks the porous dreamer.',
    'You came open to the dream and the dream was the room itself. The traveller leaves what was never bounded.',
    'Water at the night-gate — the path the moon leaves is the tide of the body itself. Walk it home.',
  ],
} as const;

// ──────────────── Malkuth — Bastet-as-companion (hearth, threshold, lamp) ────────────────

const malkuthBlessings = {
  aries: [
    'You came in hot and Bastet did not shy. The hearth keeps the heat you brought. Sit; the lamp will dim itself for you.',
    'Fire at the threshold of the home — the cat met you with steady eyes. Take the room that warmed for your coming.',
    'Bright at the doorstep — Bastet thanks the directness. The oil in the lamp burns brighter for the unhesitating arrival.',
  ],
  taurus: [
    'Steady at the threshold — Bastet purrs the way you stand. The hearth keeps the floor as patient as you are.',
    'Slow at the doorstep — the lamp the cat tends warms the long evening. Stay; the oils know your gait.',
    'You bore weight at the home and the home bears back. Take the hearth-warmth that loves the unhurried.',
  ],
  gemini: [
    'Many-voiced at the threshold — Bastet listens to all of them. The lamp keeps the small bright flame for each.',
    'You came in talking and the cat liked the chatter. The hearth keeps the warmth that does not require silence.',
    'Bridge at the doorstep — the home keeps a place for everyone you brought with you.',
  ],
  cancer: [
    'Soft at the home — Bastet recognised the tide-gait. The hearth keeps the warmth that knows feeling-before-word.',
    'You came feeling-first to the threshold and the threshold softened. The cat thanks the undefended arrival.',
    'Tide at the doorstep — the lamp the cat tends is the moon-warm kind. Stay; the home holds the gentle.',
  ],
  leo: [
    'Bright at the home — Bastet liked the full bearing. The hearth keeps the heat that is glad to be looked at.',
    'You came in your full warmth and the cat purred at the heat. The lamp burns generous tonight.',
    'Heart at the threshold — the home keeps the room lit at the volume you arrived in.',
  ],
  virgo: [
    'Plain at the doorstep — Bastet thanks the exact step. The hearth keeps the small, clean fire.',
    'Fine-eyed at the home — the cat noticed you noticing. The lamp the cat tends is the precise one.',
    'You came careful to the threshold and the threshold met you carefully. Stay; the home keeps the unfussy warmth.',
  ],
  libra: [
    'Even-handed at the home — Bastet purrs at the balance. The hearth keeps the warmth that does not favour one side.',
    'Balanced at the doorstep — the lamp the cat tends honours the parts of you that came and the parts that stayed.',
    'You brought fairness through the door and the room kept it. The home leaves the symmetric warmth.',
  ],
  scorpio: [
    'Deep at the threshold — Bastet sees with you. The hearth keeps the warmth that does not look away.',
    'You came down to the home with the unflinching gaze and the home did not flinch. The cat thanks the depth.',
    'Unblinking at the doorstep — the lamp the cat tends burns the long, low oil that warms the bottom of the room.',
  ],
  sagittarius: [
    'Far-flung at the home — Bastet walked the rooms with you. The hearth keeps the warmth that goes the distance.',
    'You came in from afar and the cat met you at the door anyway. The lamp keeps the long-light burning.',
    'Long-shot at the threshold — the home keeps the room that opens onto the horizon you brought.',
  ],
  capricorn: [
    'Patient at the home — Bastet thanks the long climb to the door. The hearth keeps the warmth that lasts the winter.',
    'Long-arc at the doorstep — the lamp the cat tends is the kind that does not gutter through the slow watch.',
    'Structured at the threshold — the home keeps the warmth that fits the bone of the long evening.',
  ],
  aquarius: [
    'Outsider at the home — Bastet welcomed the strange shape. The hearth keeps the warmth that does not require sameness.',
    'You came in at a different angle and the cat made room. The lamp the cat tends burns sideways for you.',
    'You named the home from beyond it and the home kept the name. The warmth lands where you named.',
  ],
  pisces: [
    'Soft at the threshold — Bastet dissolved the line between in and out. The hearth keeps the warmth that holds water.',
    'You came porous to the home and the home was porous too. The cat thanks the unguarded arrival.',
    'Water at the doorstep — the lamp the cat tends keeps the warmth that flows the way you flow.',
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
