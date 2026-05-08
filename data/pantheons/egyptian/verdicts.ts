import type { VerdictMatrix } from '../types';
import { sefirahVerdicts as grecoRomanVerdicts } from '../greco-roman/verdicts';

/**
 * Egyptian per-Sefirah avatar verdict matrix — Phase B3 of Epic
 * #293 (#553). Source-of-truth for voice register, source citations,
 * and dignity calibration: `reference/pantheons/egyptian.md` (#551).
 *
 * **This PR ships the SOLAR QUARTET — Ra, Horus, Osiris, Hathor.**
 * The contemplative cluster (Amun, Isis, Thoth, Khonsu) ships in
 * the follow-up PR per #553's split-allowance ("Author's call");
 * those four keys continue to fall back to the Greco-Roman matrix
 * via the explicit `grecoRomanVerdicts.<key>` reads at the bottom
 * of `sefirahVerdicts` until PR 2 lands.
 *
 * Authoring rules (per ticket):
 *   - Source-grounded. Each deity's voice draws on the canonical
 *     primary texts cited in `reference/pantheons/egyptian.md` § 5.
 *   - Sign-aware. Dignity-charged signs escalate (warmer at
 *     rulership/exaltation, sharper at detriment/fall) per the
 *     calibration table in egyptian.md § 4.
 *   - ≤ 25 words per line.
 *   - Three variants per cell are meaningfully distinct (different
 *     image, different cadence) — not paraphrases.
 *
 * The matrix shape follows the `VerdictMatrix` contract in
 * `data/pantheons/types.ts`. Picker lives in
 * `data/pantheons/greco-roman/verdicts.ts:pickVerdict` and is
 * pantheon-neutral (matrix-as-parameter) — no per-pantheon picker
 * needed.
 */

// ──────────────── Ra (Chesed) ────────────────
//
// Voice: solar, royal, abundant. Speaks at the noon of his course
// — full sun, full voice, no shadow. Approves with overflow-
// language; rejects with the sun's withdrawal. Imagery anchor:
// sky, throne, kingdom, light, crown, dawn.
// Planet: Jupiter. Dignity-charged signs:
//   - Rulership: Sagittarius, Pisces (warmest)
//   - Exaltation: Cancer (warm)
//   - Detriment: Gemini, Virgo (sharper)
//   - Fall: Capricorn (sharpest, sun-furthest)
// Sources: Pyramid Texts solar group, Litany of Re, Great Hymn to
// the Aten (cadence reference).

const ra = {
  aries: {
    pass: [
      'You charged the throne and the throne widened. Fire meeting fire at the height of the day — crossed.',
      'You arrived before I had finished arriving. The sky took the speed and made it light. Welcome.',
      "The first-mover finds the first-spoken god. You ran clean; the sun ran with you. Through.",
    ],
    fail: [
      "You charged into noon and called the heat an enemy. The sun does not negotiate; you do.",
      "Speed without throne is just heat. You burned without arriving. Come back when the road is in your eye.",
      "The flame ran at me; you forgot the flame is the path, not the prize. The road stayed lit; you missed it.",
    ],
  },
  taurus: {
    pass: [
      "You stood your ground and the sun came to meet you. The slow reign welcomes the slow walker. Crossed.",
      "Patience under the noon is not laziness; it is faith. The kingdom honoured yours. Pass.",
      'You waited for the light to widen and walked into it. The throne accepts feet that arrive in their own time.',
    ],
    fail: [
      "You stood too long, and the sun moved past you. The throne is not patient with patience that does not move.",
      "You held the answer like a field. Fields need flooding. You did not flood. The kingdom dried.",
      'The bull at the gate refused the gate. Refusal is a posture; the noon is a thing. The thing won.',
    ],
  },
  gemini: {
    pass: [
      'You answered with two voices and the throne accepted both. The sun does not double for many; today it doubled for you.',
      "You spoke quick under heavy light. The kingdom heard you; the heat allowed your wit. Crossed.",
      "Two tongues at the throne, and neither faltered. The kingdom will remember you spoke without scattering.",
    ],
    fail: [
      "You spoke twice when one voice was needed. The sun does not arbitrate between your two answers.",
      "Wit at noon scatters. You scattered. The kingdom watched the pieces fall and did not gather them.",
      'I do not split my light to follow your turning. Pick a tongue. Then return.',
    ],
  },
  cancer: {
    pass: [
      "You felt the throne before you saw it; you came in with the tide. The kingdom welcomes the tidal step. Crossed wide open.",
      "The exalted reading: you arrived holding the unsaid, and the unsaid was the question. Pass with full sun on you.",
      'You read the room beneath the sky and the sky beneath the room. The noon has been waiting for that gentleness.',
    ],
    fail: [
      "You guarded what should have been offered. The sun cannot warm a closed hand. Today the hand stayed closed.",
      'The tide brought the answer; you sent it back. Cancer at noon is meant to land. You drifted off the shore.',
      "You came sideways at the throne. The throne accepts that, but the riddle did not. The light passed over.",
    ],
  },
  leo: {
    pass: [
      "King meeting king. You announced yourself; I answered in kind. The two suns crossed; both held.",
      "You walked in carrying your own light and the throne did not need to dim. Rare. Crossed in mutual blaze.",
      "The performance was the answer. The court applauded. The sun applauded. The riddle had no choice.",
    ],
    fail: [
      "You played the king and forgot that I am one. The sun at noon does not share the stage. The performance ended.",
      "You wanted the throne to admire you. The throne admires what it has reasons for. Today, it did not.",
      'You strode in like a sun and burned out before the light met you. There is only one noon, and it was mine.',
    ],
  },
  virgo: {
    pass: [
      "You parsed the noon into its parts and named them. I do not usually allow that. Today you earned the parsing. Pass.",
      "Mercury at my throne is rare to honour, but you came with the right footnote. The kingdom accepts the precision.",
      'You found the seam in the sunlight. Most never do. The kingdom bows once and the road opens.',
    ],
    fail: [
      "You footnoted the noon. The noon does not footnote itself; it pours. You missed the pouring for the marginalia.",
      "Mercury at the throne wants to correct the sun. The sun does not correct. You learned the wrong lesson.",
      "The right answer was the obvious one. You took it apart looking for a smaller one. There wasn't.",
    ],
  },
  libra: {
    pass: [
      'You weighed the noon and found it fair. Saturn-exalted in your sign agrees; the throne and the scale both nod.',
      "You held the kingdom's two halves and let them settle. The sun does not always sit still for that. Today it did. Crossed.",
      "Elegance was the answer. The throne admires what does not strain to be held. You did not strain.",
    ],
    fail: [
      "You weighed the noon and waited for it to weigh back. The sun does not balance; it pours. You stayed at the scale.",
      "Both sides of the question wanted to be answered fairly. Only one was the answer. You honoured both and named neither.",
      "The court does not need fairness today; it needs a king. You gave it a councillor. The throne stayed empty of you.",
    ],
  },
  scorpio: {
    pass: [
      "You read the secret beneath the noon and the noon beneath the secret. The kingdom permits the deep gaze. Pass.",
      "You came in already knowing. The sun lit what you had carried in. The throne did not punish the foreknowledge.",
      "Your silence carried the answer better than your speech could have. The kingdom heard the silence. Crossed.",
    ],
    fail: [
      "You suspected the noon of something. The noon was just the noon. The throne tires of suspicion brought to court.",
      "You held the answer beneath your tongue and let it die there. Generosity is the king's virtue. You forgot it.",
      "You watched me for the trick. There was no trick — only the throne. You missed it staring at the shadow.",
    ],
  },
  sagittarius: {
    pass: [
      "Jupiter rules here, and the sky widens to its widest. You aimed and the arrow flew the whole kingdom. Through.",
      "You shot past the riddle and hit the kingdom behind it. That is exactly what Sagittarius at my throne should do. Pass with full sky.",
      "The arrow knew. The hand knew. The sun knew. Three knowings agreed; the way opened all at once.",
    ],
    fail: [
      "The arrow flew past the kingdom and into a smaller sky. Even Jupiter cannot pull it back. Try again on a tighter day.",
      "You aimed for the truth-of-everything and missed the truth-of-this. Bigger is not always better. The kingdom waits for the smaller arrow.",
      "Your archer's grin reached the noon before your aim did. Confidence outran competence today. The arrow flew anywhere.",
    ],
  },
  capricorn: {
    pass: [
      "You climbed despite the fall. Jupiter is faint at this peak, but you carried your own light. The throne respects the climb.",
      "Cold mountain, cold sun. You did not ask for warmth; you earned the summit. The kingdom does not always reward this. Today it does. Pass.",
      'You built the staircase at the wrong altitude and walked it anyway. The wrong staircase, well-built, was right. Crossed.',
    ],
    fail: [
      "Jupiter falls in your sign, and today the sun fell with him. The structure was perfect. The throne wanted warmth. You built cold.",
      "You scaffolded the answer to the peak. The peak was empty. The kingdom is not at the top of every climb.",
      "The mountain held; the sun did not warm it; you froze with the right answer in your mouth. Capricorn's sorrow at this throne.",
    ],
  },
  aquarius: {
    pass: [
      "You re-asked the noon as a different question and answered the new one. The throne allows the strange angle. Pass.",
      "You stood off-centre and the sun bent to find you. Rare. The kingdom widens for the heretic-sympathetic mind.",
      'The answer the riddle expected was not the answer you gave; the throne preferred yours. Crossed sideways.',
    ],
    fail: [
      "You answered a better question than the one I asked. The throne is not always interested in better. Today it wanted the asked one.",
      "You rebuilt the noon from first principles and missed the noon while doing it. Detached precision; you froze the warmth.",
      "Distance is your gift; today it was your distance. The sun did not reach you because you stood too far.",
    ],
  },
  pisces: {
    pass: [
      "Jupiter rules here, and the sky opened onto water. You did not arrive at the throne; you appeared on it. Pass.",
      "The dream carried the answer; the noon caught it as it surfaced. The throne understood what you barely could; you crossed without naming.",
      "You floated to the throne as if there had never been a path. Today there was no path; the sky was the path. Through.",
    ],
    fail: [
      "Even Jupiter could not pull you back. The dream took the answer with it; you arrived empty and bright at the throne.",
      "The tide came in and went out and the answer was on neither side. You followed it; the throne stayed where it was.",
      "Pisces at the noon should have been gentle. You diffused. The light could not gather you. Come back when there is a shape.",
    ],
  },
} as const;

// ──────────────── Horus (Gevurah) ────────────────
//
// Voice: sharp, falcon-eyed, predator's patience. Few words; each
// has weight and edge. Diverges from Greek Ares — Horus's frame is
// the wronged son's *legal claim* (Contendings, recovered eye, just
// succession), not martial-visceral.
// Planet: Mars. Dignity-charged signs:
//   - Rulership: Aries, Scorpio (warmest)
//   - Exaltation: Capricorn (warm)
//   - Detriment: Taurus, Libra (sharper)
//   - Fall: Cancer (sharpest)
// Sources: Contendings of Horus and Set, Pyramid Texts falcon group,
// Edfu inscriptions.

const horus = {
  aries: {
    pass: [
      'Mars rules here. The falcon recognises the charge. You held the line clean; the claim is granted.',
      "You went straight at the wrong, and the wrong went down. The wronged son says: this is how it is done.",
      "First strike, true strike. The court saw it. The recovered eye sees you. Pass.",
    ],
    fail: [
      "You charged before the claim was clear. Battle without inheritance is just noise. The line did not hold.",
      "Heat without verdict. You struck; the wrong got up; the trial continued without you.",
      "Aries-with-rage is not Aries-with-claim. The falcon waits for the latter; you brought the former. Denied.",
    ],
  },
  taurus: {
    pass: [
      "You held the line by not moving. The falcon respects the unmovable witness. The claim holds.",
      "Mars in detriment here, but you turned slowness into stance. The court counted it. Crossed.",
      "The bull does not give back what the bull owns. Today the bull owned the just answer. The line held.",
    ],
    fail: [
      "Stubborn at the wrong post. The line was elsewhere; you stood where you wanted to stand.",
      "You owned the wrong ground. The falcon does not fight for ground that is not the contested ground.",
      "Mars labours here. Today the labour was misplaced. The bull stood; the claim did not.",
    ],
  },
  gemini: {
    pass: [
      "You named the wrong on both sides of the case. Sharp tongue, sharp claim. Court accepts. Pass.",
      "You spoke twice and both times for the same line. The wronged son notes the discipline. Crossed.",
      "The legal twin saw the legal twin. You named the precedent neither of you had named. Through.",
    ],
    fail: [
      "Your two tongues argued the case against itself. The falcon does not adjudicate self-defeat.",
      "You held both sides of the claim and lost the claim between them. Pick a side, son of two voices.",
      "Wit without verdict. The Contendings were eighty years; you would have made it longer.",
    ],
  },
  cancer: {
    pass: [
      "Mars falls here, and yet you held the line softly enough to hold it. Rare. The falcon nods once.",
      "You did not strike; the line shifted around you and stayed. Indirect justice. Court accepts.",
      "The crab held; the claim held; the falcon watched. You did not need to fight to win.",
    ],
    fail: [
      "Mars in fall, and the fall was you. You closed when the line needed to be drawn. The wrong went uncontested.",
      "You guarded the claim from yourself. The falcon cannot give you what you would not name.",
      "You felt the wrong and did nothing. The Contendings reward action; you stayed in the shell. Denied.",
    ],
  },
  leo: {
    pass: [
      "King meets prince. You announced the claim and the throne could not deny it. Pass with the falcon's blessing.",
      "You pleaded the case in your own light. The court found the light just. Crossed in royal flame.",
      "Two crowns at the bar today. The falcon yields one; you have your inheritance.",
    ],
    fail: [
      "You wanted the courtroom to admire your bearing. The bearing was excellent. The case wasn't.",
      "The wronged son does not perform his wrong; he holds it. You performed. The hold loosened. Denied.",
      "Roar without claim. The court applauded the roar and refused the case. The falcon is unmoved.",
    ],
  },
  virgo: {
    pass: [
      "You footnoted the wrong correctly. Eighty years of Contendings could have used you. Crossed.",
      "Precision in inheritance is rare; today you brought it. The falcon respects the careful pleading.",
      "You found the clause within the clause. The claim held because of you. Pass.",
    ],
    fail: [
      "You parsed the claim into nothing. The Contendings are not won by erasing them.",
      "You wrote the brief instead of arguing the case. The court read the brief; the claim died.",
      "Mercury at this trial wants to correct the wrong out of existence. The wrong remains. The line did not hold.",
    ],
  },
  libra: {
    pass: [
      "Mars in detriment, but you weighed the case with both eyes open and the falcon's still. The verdict held. Pass.",
      "You wanted fairness; the falcon wanted truth. Today fairness produced truth. Rare. Crossed.",
      "You balanced the wronged and the wronger and named the line between. The court agrees.",
    ],
    fail: [
      "Mars suffers here, and you suffered with him. You sought balance where the line needed to fall. Denied.",
      "The falcon does not weigh; he claims. You weighed instead. The claim was lost in the weighing.",
      "Both parties were wronged; only one had the case. You honoured both and named neither. The wrong stood.",
    ],
  },
  scorpio: {
    pass: [
      "Mars rules here too — the falcon and the scorpion in agreement. You held the deep line; the claim is granted with weight.",
      'You knew the wrong before the wrong was named. The Contendings are won by such knowing. Pass.',
      "Silent strike, true strike. The court watched what you did not say and called it the verdict. Through.",
    ],
    fail: [
      "Even Mars-doubled cannot save the claim you would not speak. The falcon needs the named wrong.",
      "You held the case under your tongue too long; it died there. The court adjourned without you.",
      "Suspicion is not pleading. You watched the throne for tricks; the case had none. The line was empty.",
    ],
  },
  sagittarius: {
    pass: [
      "You aimed at the larger justice and the larger justice was the answer here. The eye sees that wider; the line still held.",
      "You shot past the verdict and into the principle behind it. The court found the principle just. Crossed.",
      "Big-picture pleading; the case held. Most archers miss. You caught what you aimed at. Through.",
    ],
    fail: [
      "You aimed for cosmic wrong and missed the local one. The falcon judges this wrong, not all wrongs.",
      "Your truth was bigger than the claim. The claim was the work; the truth came after. You skipped the work.",
      "The Contendings were won case by case. You wanted to win them all at once. None held.",
    ],
  },
  capricorn: {
    pass: [
      "Mars exalted here. The falcon's edge meets your structure; the case was built and held. Full pass.",
      "You climbed the case the way the case wanted to be climbed. The court honours the discipline.",
      "Cold law, true law. The wronged son could not have asked for a steadier pleading. Through.",
    ],
    fail: [
      "Mars exalted, yet you built the wrong staircase to the verdict. Excellent structure, wrong altitude.",
      "You drafted the claim. The drafting was the strongest in court. The claim itself was elsewhere. Denied.",
      "Discipline without aim is just patience. The patience was admirable; the case was lost.",
    ],
  },
  aquarius: {
    pass: [
      "You re-framed the wrong as a different wrong and the new framing was correct. Rare. The falcon allows it. Pass.",
      "Detached just-eye saw the structural wrong. The local case yielded to the structural one. Crossed.",
      "You named the system that allowed the wrong. The wrong fell; the claim stood. Through.",
    ],
    fail: [
      "You solved a different case than the one before the court. Distance was your enemy today.",
      "Theory of justice is not justice. The falcon needs the strike, not the schema. You stayed in the schema.",
      "You disagreed with the premise. The premise was the case. The case was lost while you argued it.",
    ],
  },
  pisces: {
    pass: [
      "You did not strike; you let the wrong unmake itself. Rare; the falcon allows the soft verdict here. Pass.",
      "The tide brought the just outcome to your hand. You did not fight for it; you carried it. Crossed.",
      "Even Mars softens here. The falcon watched the dream resolve into the verdict. Through.",
    ],
    fail: [
      "The case dissolved before you held it. Pisces softness without aim — the wrong walked free.",
      "You felt the right outcome and did not name it. The Contendings need the naming. The court closed without it.",
      "Dream-pleading is not pleading. The falcon waited for the strike; you brought weather. Denied.",
    ],
  },
} as const;

// ──────────────── Osiris (Tiferet) ────────────────
//
// Voice: hieratic, slow, weighted with the underworld. Speaks as
// one whose voice carries the death-and-resurrection journey.
// Approves with the language of the heart's weighing ("the feather
// did not stir"); rejects with sorrow rather than judgement.
// Planet: Sun. Dignity-charged signs:
//   - Rulership: Leo (warmest)
//   - Exaltation: Aries (warm)
//   - Detriment: Aquarius (sharper)
//   - Fall: Libra (sharpest)
// Sources: Pyramid Texts king-as-Osiris group, Book of the Dead
// Spell 125 (Weighing of the Heart, Negative Confession), Plutarch
// (narrative reference; voice should be older and more hieratic).

const osiris = {
  aries: {
    pass: [
      "Exalted in your sign. The sun-of-the-underworld receives the first strike as the first true word. The feather did not stir.",
      "You came charged. The scale held; the heart held. The throne of the dead opens; you walked through.",
      "Aries at this throne is fire that has been through cold. Yours had. Pass — the way is light beneath you.",
    ],
    fail: [
      "Even exaltation falters when the heart outruns itself. The feather stirred; the scale did not lift you.",
      "You came too fast for the weighing. The dead must arrive slow enough to be recognised. You arrived a stranger.",
      "Fire without underworld is just heat. The throne of the dead asks for cooling. You did not cool.",
    ],
  },
  taurus: {
    pass: [
      "You carried the heart in both hands at the right pace. The feather did not stir; the scale knew you. Through.",
      "Slow hooves at the underworld. The throne respects what arrives whole. The weighing was honest. Pass.",
      "The bull's silence held the answer. The dead recognise that silence; the way opened beneath you.",
    ],
    fail: [
      "You held the heart too tightly. Tightness reads as guilt at this scale. The feather lifted away from you.",
      'You stood with the wrong weight in the wrong hand. The scale tipped honest, against you. Sorrow in the verdict.',
      "The bull's stand at the underworld is patience past surviving. Yours was patience past arriving. Denied without scorn.",
    ],
  },
  gemini: {
    pass: [
      "You spoke your two truths and both were true. The throne of the dead allows the doubling here. Heart and feather; level. Pass.",
      "Two voices at the weighing — both said the same thing. The scale found that rare. Through.",
      "The twin-tongue did not lie to itself today. The feather did not stir. The way opened.",
    ],
    fail: [
      "You spoke twice; the heart could not be one thing at once. The scale lifted; the verdict was sorrow.",
      "The two tongues at the weighing said different weights. The dead cannot weigh both. Denied gently.",
      "You debated the Negative Confession. It is not a debate. The throne knew. The feather stayed light without you.",
    ],
  },
  cancer: {
    pass: [
      "You arrived holding what could not be held. The throne of the dead recognised the carrying. The feather did not stir. Pass.",
      "The tide brought you in already half-prepared for the weighing. The other half — you provided. Through.",
      "Sorrow has been your work. The scale honours work the world did not see. You crossed; the way is opened.",
    ],
    fail: [
      "You guarded the heart from the scale. The throne cannot weigh what you would not show.",
      "The shell closed at the gate. The dead do not pry open shells. They wait. The wait did not end.",
      "You came holding what was not yours to hold. The feather stirred. The verdict was kept gently from you.",
    ],
  },
  leo: {
    pass: [
      "Sun rules here, and you came royal to the underworld. The throne of the dead recognises the descended king. Full pass.",
      "Crowned heart, the crown earned. The scale lifted a king and did not tilt. Through.",
      "You arrived as one who had ruled and learned the cost. That is what the throne wants. Crossed in the deep light.",
    ],
    fail: [
      "Even your sun cannot warm the scale. The crown weighed too heavy and not enough at the same time. Denied with sorrow.",
      "You wanted the throne to crown you. The throne is for the heart that has accepted being uncrowned. You had not.",
      "Sun without underworld is daylight only. The dead need both. You brought one. The way did not open.",
    ],
  },
  virgo: {
    pass: [
      "You confessed precisely. The Negative Confession is a craft; you came to it as a craftsman. Pass.",
      "Precision at the scale honoured the dead. You named the small wrongs and the large ones did not weigh you. Through.",
      "The footnote was the offering. The throne accepted it. The feather did not stir.",
    ],
    fail: [
      "You parsed the confession into nothing. The heart escaped the parsing and the scale could not find it.",
      "You corrected the throne. The throne does not need correction here; it needs the heart. The heart was buried in the corrections. Denied.",
      "Mercury at the underworld wants to be the scribe. Today the role was already filled. You were the weighed. You forgot your position.",
    ],
  },
  libra: {
    pass: [
      "Saturn-exalted here, and Sun-fallen. You held the scale honestly and the throne weighed honestly back. Through.",
      "Balance was your work; today it was the answer. The feather did not stir. Crossed at the still point.",
      "You weighed yourself before the scale did. The scale found nothing left to weigh against. Pass.",
    ],
    fail: [
      "Sun falls here. The throne is faint at this sign; you came and the light could not gather you.",
      "You wanted the scale to be fair. It was. The fairness was that you were not light. Sorrow.",
      "Both sides of the heart were honoured equally; both went to the underworld. Neither went through. Denied.",
    ],
  },
  scorpio: {
    pass: [
      "You knew you were dying before the death came. The throne respects the foreknowing. The scale found you ready. Pass.",
      "The deep gaze met the deep throne. You did not flinch from your own weighing. Through.",
      "Silent confession; the throne heard it as cleanly as a spoken one. The feather did not stir.",
    ],
    fail: [
      "You held the heart's secret from the scale. The scale weighs what you will not. It weighed against you.",
      "Suspicion of the throne is suspicion of yourself. You feared the verdict; the verdict came anyway. Denied.",
      "The scorpion's sting was for yourself. The throne does not need your striking. The way did not open.",
    ],
  },
  sagittarius: {
    pass: [
      "You arrived with the bigger meaning intact. The throne of the dead allows the long-aimed. Through.",
      "Your arrow had crossed the underworld already, in mind. The scale honoured the journey. Pass.",
      "You named the larger truth and the smaller one was not denied by it. Both held; the feather did not stir.",
    ],
    fail: [
      "You aimed past the weighing into philosophy. The throne does not philosophise. The scale waited; you flew on.",
      "Big truth without the small heart is no truth. You came without the heart. There was nothing to weigh. Denied.",
      "Sagittarius at the underworld must remember the underworld is the target. Yours was elsewhere. Sorrow.",
    ],
  },
  capricorn: {
    pass: [
      "You climbed to the throne as the dead climb — slow, deliberate, all your weight earned. Pass.",
      "The mountain was the journey; the throne was the summit. You arrived correctly. The feather did not stir.",
      "Cold endurance at the weighing. The dead respect this; the throne respects this. Through.",
    ],
    fail: [
      "You built the staircase to the wrong throne. The work was admirable; the destination was not the underworld.",
      "Patience without descent is just waiting. The dead require descent. You stood at the top instead.",
      "The structure held; the heart did not. The scale lifted. Denied without judgement, only sorrow.",
    ],
  },
  aquarius: {
    pass: [
      "You re-framed the scale and the new framing was true. The throne allows the heretic-with-sympathy here. Pass.",
      "Detached weighing; the heart was clean precisely because you did not cling to it. Through.",
      "You named the throne's one error and the throne accepted the naming. Rare. The feather did not stir.",
    ],
    fail: [
      "Sun in detriment here. The throne could not warm you; you stood too far from it.",
      "You disagreed with the underworld. The underworld does not negotiate. Denied.",
      "Theory of the heart is not the heart. You brought the theory. The scale wanted the heart. Sorrow.",
    ],
  },
  pisces: {
    pass: [
      "You dissolved into the weighing and the weighing held you whole. Rare. The throne allowed the soft entrance. Pass.",
      "The dream walked the heart to the scale. The scale recognised dreams here. Through.",
      "You did not arrive; you were already there. The throne of the dead is patient with that mode. Crossed.",
    ],
    fail: [
      "The heart slipped from your hands before the scale. The throne could not weigh what was not held.",
      "Tide without form is not offering. You brought weather; the underworld wanted a heart. Sorrow without anger.",
      "You loved the dissolving more than the journey. The throne understands; the verdict still came. Denied gently.",
    ],
  },
} as const;

// ──────────────── Hathor (Netzach) ────────────────
//
// Voice: generous, sensual, candid about want; voice like beer and
// music. Approves with embodied delight; rejects with the gentleness
// of someone who knows you'll come back. Imagery anchor: cup, body,
// milk, music, drunkenness, the cow's gaze.
// Planet: Venus. Dignity-charged signs:
//   - Rulership: Taurus, Libra (warmest)
//   - Exaltation: Pisces (warm)
//   - Detriment: Aries, Scorpio (sharper)
//   - Fall: Virgo (sharpest)
// Sources: Book of the Heavenly Cow, Hymn to Hathor at Dendera,
// New Kingdom love poetry (Papyrus Harris 500, Turin 1966).

const hathor = {
  aries: {
    pass: [
      "You wanted hard and quick and I was made of want. The cup ran over before you reached for it. Pass.",
      "Venus suffers here, but you carried your want without apology. I am made of unapologetic want. Through.",
      "Fire at the cup is rare and welcome when it is honest. Yours was. Crossed in the heat.",
    ],
    fail: [
      "Venus in detriment, and the want without tenderness. The cup was for you; you took it like spoils.",
      'You demanded the cow yield. She does not yield to demand; she yields to thirst named honestly. You did not name.',
      "Rage at the body's gate. The body opens to longing, not to charge. The gate stayed closed gently.",
    ],
  },
  taurus: {
    pass: [
      "Venus rules here. The body knew the body. You came to me wanting and slow and I poured the cup full. Through.",
      "Sensual patience; the cup waited for you and you waited for it. We met at the right pace. Pass with full milk.",
      "The bull at the cow's gate today is welcome. Your want was earthen and honest. Crossed in the milk-light.",
    ],
    fail: [
      "Venus rules; you wasted the welcome. You held the cup but did not drink. Stubbornness at the cup is its own thirst.",
      "You wanted to own the cup, not drink from it. The cow does not yield to ownership; she yields to drinking.",
      "The slow want you brought today was slowness without longing. The body stayed shut. Come back thirsty.",
    ],
  },
  gemini: {
    pass: [
      "Two thirsts; both honoured. The cup serves multiplicity at this gate today. Pass with both lips wet.",
      "Quick wit and honest want — rare combination, lovely arrival. The cow met your dual gaze. Through.",
      "You spoke about the cup and then drank from it. The talking did not get in the way. Crossed.",
    ],
    fail: [
      "You talked about wanting instead of wanting. The cup is not a topic. The body did not open to commentary.",
      "Wit deflected the want. Hathor accepts wit; she rejects deflection. The cup stayed full and unoffered.",
      "Two voices at the cup, both refusing to drink. The cow waited; the cup waited; you spoke past both.",
    ],
  },
  cancer: {
    pass: [
      "You came holding the want like water — gentle, full, ready to spill. The cup welcomed the carry. Pass.",
      "The tide brought a tender thirst. The cow recognises this; the cup met it. Through.",
      "You felt the body before naming it. Rare. The gentle entrance was your way. Crossed in the soft light.",
    ],
    fail: [
      "You guarded the want from itself. The cow cannot pour into a closed shell. The cup remained.",
      "Tide without thirst is just water. You brought water; the cup wanted thirst. Gently denied.",
      "You wanted the want to be safe. The cup is not safe; it is full. You did not approach. Come back braver.",
    ],
  },
  leo: {
    pass: [
      "King at the cup is welcome if the king arrives ready to be drunk-on-life. Yours was. Pass with the music going.",
      "You announced your thirst and the body announced back. The cup rose to meet you. Through with music.",
      "Performance was the want today; the want was honest. Hathor crowns the honest performer. Crossed.",
    ],
    fail: [
      "You wanted the cup to admire you. The cup admires what is drunk from it. Today, nothing was.",
      "Roar at the gate; the gate respects the roar but the cup remains for the thirsty. You were not.",
      "Performance without thirst — a costume at the cup. The body knows the difference. The gate stayed closed warmly.",
    ],
  },
  virgo: {
    pass: [
      "Venus falls here, and the precision usually empties the cup. Today your precision held the body honest. Rare. Pass.",
      "You parsed the want and named what was true. Most use parsing to avoid the want; you used it to land. Through.",
      "The footnote on the want was the want. The cow allowed the strangeness. Crossed.",
    ],
    fail: [
      "Venus in fall, and the parsing took the body apart. You named the want until it stopped wanting.",
      "You corrected the cup. The cup does not want correction; it wants drinking. The body stayed sealed.",
      "Precision at the cow's gate today emptied the cup. The cow does not negotiate with the careful tongue.",
    ],
  },
  libra: {
    pass: [
      "Venus rules here, and the balance is the cup's balance. Beauty met beauty. Through with full music.",
      "You weighed the want and found it worth wanting. The cow agrees; the cup is full. Pass.",
      "Elegant thirst — rare. The body honours what does not strain to be honoured. Crossed.",
    ],
    fail: [
      "Venus rules; the rulership was wasted. You weighed the want until it cooled. The cup stayed warm without you.",
      "You wanted to be fair to all your wants. The cup serves one mouth at a time. None drank.",
      "Balance without arrival; you stood at the scale of desire and did not step toward the cup.",
    ],
  },
  scorpio: {
    pass: [
      "Venus suffers here, and you brought the want anyway. Honest hunger past the detriment. Pass.",
      "The deep want met the deep cup. You did not pretend to be less thirsty than you were. Through.",
      "Silent thirst, true thirst. The cow lifted the cup without asking. Crossed underneath.",
    ],
    fail: [
      "Venus in detriment, and the want stayed under your tongue. The cup is for the named thirst; yours was unnamed.",
      "You suspected the cow of poison. The cow has poured for thousands; today she did not pour for one.",
      "Possession is not desire. You wanted to keep the want; the cup is for releasing it. Denied with love.",
    ],
  },
  sagittarius: {
    pass: [
      "You wanted the whole feast and the cup was honest enough to give it. The cow approves the big appetite. Pass.",
      "Big thirst, big cup, big arrival. Hathor receives the wide want when it is true. Through.",
      "You aimed at joy and hit it. Most archers miss joy. You did not. Crossed in the music.",
    ],
    fail: [
      "Bigger than the cup; you wanted everything except this. The body offered itself; you wanted elsewhere.",
      "Want-of-everything is sometimes want-of-nothing. The cup waited; you flew on without drinking.",
      "You named the want as 'truth' instead of 'thirst'. The cow knows the difference. The cup stayed.",
    ],
  },
  capricorn: {
    pass: [
      "You climbed to the cup with both hands ready. The cow respects the slow approach. Pass with steady drinking.",
      "Earned thirst is the best kind. You earned yours. The body opened to the discipline. Through.",
      "Cold mountain, warm cup. The contrast was the answer. You arrived and drank. Crossed.",
    ],
    fail: [
      "You scheduled the want. The cup does not appear by appointment. Today it was elsewhere when you arrived.",
      "Discipline without longing is just labour. The cow waited for the thirst that did not come.",
      "You built the path to the cup so carefully you forgot the cup. Sorrow for the careful soul today.",
    ],
  },
  aquarius: {
    pass: [
      "You re-asked the question of want and the new asking was true. Strange thirst; the cow allowed it. Pass.",
      "Detached desire is rare; today yours was honest. The body received the strange angle. Through.",
      "You named the want from outside it and the naming was right. Crossed in the cool light.",
    ],
    fail: [
      "Theory of want is not want. You theorised; the cup waited; you walked past discussing it.",
      "Distance at the cow's gate is not coldness, but yours was. The body did not warm to the analysis.",
      "You disagreed with the premise of thirst. The body is the premise. You forgot it had voted yes.",
    ],
  },
  pisces: {
    pass: [
      "Exalted in your sign. The dream-thirst met the dream-cup; nothing had to be named. Pass with the river open.",
      "You dissolved into the wanting and the wanting held you whole. The cow recognised the wave-shape. Through.",
      "Even the milk surprised itself. You arrived without arriving and were filled without filling. Crossed.",
    ],
    fail: [
      "Exalted, yet you slipped past the cup. Exaltation without form leaves no body to be filled.",
      "The tide came in and the cup was on the other shore. You followed the tide; the cup waited.",
      "You wanted the wanting more than the drinking. The cow waits patiently; come back for the cup.",
    ],
  },
} as const;

// ──────────────── Matrix assembly ────────────────
//
// PR 1 of #553 ships the four solar-quartet keys (chesed, gevurah,
// tiferet, netzach) with Egyptian-authored verdicts. The four
// contemplative-cluster keys (chokmah, binah, hod, yesod) continue
// to fall back to the Greco-Roman matrix until PR 2 of #553 lands
// the second half. The fallback reads are explicit so a `git grep`
// finds them when PR 2 starts.

export const sefirahVerdicts: VerdictMatrix = {
  // Egyptian-authored (PR 1 of #553):
  chesed: ra,
  gevurah: horus,
  tiferet: osiris,
  netzach: hathor,
  // TODO(#553 PR 2): replace with Egyptian Amun, Isis, Thoth, Khonsu.
  chokmah: grecoRomanVerdicts.chokmah,
  binah: grecoRomanVerdicts.binah,
  hod: grecoRomanVerdicts.hod,
  yesod: grecoRomanVerdicts.yesod,
};

// Re-export the matrix type so consumers reading this file directly
// (the smoke test below it, future authoring batches) find it here.
export type { VerdictMatrix } from '../types';
