import type { VerdictMatrix } from '../types';

/**
 * Egyptian per-Sefirah avatar verdict matrix — Phase B3 of Epic
 * #293 (#553). Source-of-truth for voice register, source citations,
 * and dignity calibration: `reference/pantheons/egyptian.md` (#551).
 *
 * **All 8 encounter avatars are Egyptian-authored** as of #553 PR 2:
 * solar quartet (Ra, Horus, Osiris, Hathor — shipped PR 1) plus
 * contemplative cluster (Amun, Isis, Thoth, Khonsu — shipped PR 2).
 * The greco-roman fallback that PR 1 used as a stopgap is gone.
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
      'The first-mover finds the first-spoken god. You ran clean; the sun ran with you. Through.',
    ],
    fail: [
      'You charged into noon and called the heat an enemy. The sun does not negotiate; you do.',
      'Speed without throne is just heat. You burned without arriving. Come back when the road is in your eye.',
      'The flame ran at me; you forgot the flame is the path, not the prize. The road stayed lit; you missed it.',
    ],
  },
  taurus: {
    pass: [
      'You stood your ground and the sun came to meet you. The slow reign welcomes the slow walker. Crossed.',
      'Patience under the noon is not laziness; it is faith. The kingdom honoured yours. Pass.',
      'You waited for the light to widen and walked into it. The throne accepts feet that arrive in their own time.',
    ],
    fail: [
      'You stood too long, and the sun moved past you. The throne is not patient with patience that does not move.',
      'You held the answer like a field. Fields need flooding. You did not flood. The kingdom dried.',
      'The bull at the gate refused the gate. Refusal is a posture; the noon is a thing. The thing won.',
    ],
  },
  gemini: {
    pass: [
      'You answered with two voices and the throne accepted both. The sun does not double for many; today it doubled for you.',
      'You spoke quick under heavy light. The kingdom heard you; the heat allowed your wit. Crossed.',
      'Two tongues at the throne, and neither faltered. The kingdom will remember you spoke without scattering.',
    ],
    fail: [
      'You spoke twice when one voice was needed. The sun does not arbitrate between your two answers.',
      'Wit at noon scatters. You scattered. The kingdom watched the pieces fall and did not gather them.',
      'I do not split my light to follow your turning. Pick a tongue. Then return.',
    ],
  },
  cancer: {
    pass: [
      'You felt the throne before you saw it; you came in with the tide. The kingdom welcomes the tidal step. Crossed wide open.',
      'The exalted reading: you arrived holding the unsaid, and the unsaid was the question. Pass with full sun on you.',
      'You read the room beneath the sky and the sky beneath the room. The noon has been waiting for that gentleness.',
    ],
    fail: [
      'You guarded what should have been offered. The sun cannot warm a closed hand. Today the hand stayed closed.',
      'The tide brought the answer; you sent it back. Cancer at noon is meant to land. You drifted off the shore.',
      'You came sideways at the throne. The throne accepts that, but the riddle did not. The light passed over.',
    ],
  },
  leo: {
    pass: [
      'King meeting king. You announced yourself; I answered in kind. The two suns crossed; both held.',
      'You walked in carrying your own light and the throne did not need to dim. Rare. Crossed in mutual blaze.',
      'The performance was the answer. The court applauded. The sun applauded. The riddle had no choice.',
    ],
    fail: [
      'You played the king and forgot that I am one. The sun at noon does not share the stage. The performance ended.',
      'You wanted the throne to admire you. The throne admires what it has reasons for. Today, it did not.',
      'You strode in like a sun and burned out before the light met you. There is only one noon, and it was mine.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the noon into its parts and named them. I do not usually allow that. Today you earned the parsing. Pass.',
      'Mercury at my throne is rare to honour, but you came with the right footnote. The kingdom accepts the precision.',
      'You found the seam in the sunlight. Most never do. The kingdom bows once and the road opens.',
    ],
    fail: [
      'You footnoted the noon. The noon does not footnote itself; it pours. You missed the pouring for the marginalia.',
      'Mercury at the throne wants to correct the sun. The sun does not correct. You learned the wrong lesson.',
      "The right answer was the obvious one. You took it apart looking for a smaller one. There wasn't.",
    ],
  },
  libra: {
    pass: [
      'You weighed the noon and found it fair. Saturn-exalted in your sign agrees; the throne and the scale both nod.',
      "You held the kingdom's two halves and let them settle. The sun does not always sit still for that. Today it did. Crossed.",
      'Elegance was the answer. The throne admires what does not strain to be held. You did not strain.',
    ],
    fail: [
      'You weighed the noon and waited for it to weigh back. The sun does not balance; it pours. You stayed at the scale.',
      'Both sides of the question wanted to be answered fairly. Only one was the answer. You honoured both and named neither.',
      'The court does not need fairness today; it needs a king. You gave it a councillor. The throne stayed empty of you.',
    ],
  },
  scorpio: {
    pass: [
      'You read the secret beneath the noon and the noon beneath the secret. The kingdom permits the deep gaze. Pass.',
      'You came in already knowing. The sun lit what you had carried in. The throne did not punish the foreknowledge.',
      'Your silence carried the answer better than your speech could have. The kingdom heard the silence. Crossed.',
    ],
    fail: [
      'You suspected the noon of something. The noon was just the noon. The throne tires of suspicion brought to court.',
      "You held the answer beneath your tongue and let it die there. Generosity is the king's virtue. You forgot it.",
      'You watched me for the trick. There was no trick — only the throne. You missed it staring at the shadow.',
    ],
  },
  sagittarius: {
    pass: [
      'Jupiter rules here, and the sky widens to its widest. You aimed and the arrow flew the whole kingdom. Through.',
      'You shot past the riddle and hit the kingdom behind it. That is exactly what Sagittarius at my throne should do. Pass with full sky.',
      'The arrow knew. The hand knew. The sun knew. Three knowings agreed; the way opened all at once.',
    ],
    fail: [
      'The arrow flew past the kingdom and into a smaller sky. Even Jupiter cannot pull it back. Try again on a tighter day.',
      'You aimed for the truth-of-everything and missed the truth-of-this. Bigger is not always better. The kingdom waits for the smaller arrow.',
      "Your archer's grin reached the noon before your aim did. Confidence outran competence today. The arrow flew anywhere.",
    ],
  },
  capricorn: {
    pass: [
      'You climbed despite the fall. Jupiter is faint at this peak, but you carried your own light. The throne respects the climb.',
      'Cold mountain, cold sun. You did not ask for warmth; you earned the summit. The kingdom does not always reward this. Today it does. Pass.',
      'You built the staircase at the wrong altitude and walked it anyway. The wrong staircase, well-built, was right. Crossed.',
    ],
    fail: [
      'Jupiter falls in your sign, and today the sun fell with him. The structure was perfect. The throne wanted warmth. You built cold.',
      'You scaffolded the answer to the peak. The peak was empty. The kingdom is not at the top of every climb.',
      "The mountain held; the sun did not warm it; you froze with the right answer in your mouth. Capricorn's sorrow at this throne.",
    ],
  },
  aquarius: {
    pass: [
      'You re-asked the noon as a different question and answered the new one. The throne allows the strange angle. Pass.',
      'You stood off-centre and the sun bent to find you. Rare. The kingdom widens for the heretic-sympathetic mind.',
      'The answer the riddle expected was not the answer you gave; the throne preferred yours. Crossed sideways.',
    ],
    fail: [
      'You answered a better question than the one I asked. The throne is not always interested in better. Today it wanted the asked one.',
      'You rebuilt the noon from first principles and missed the noon while doing it. Detached precision; you froze the warmth.',
      'Distance is your gift; today it was your distance. The sun did not reach you because you stood too far.',
    ],
  },
  pisces: {
    pass: [
      'Jupiter rules here, and the sky opened onto water. You did not arrive at the throne; you appeared on it. Pass.',
      'The dream carried the answer; the noon caught it as it surfaced. The throne understood what you barely could; you crossed without naming.',
      'You floated to the throne as if there had never been a path. Today there was no path; the sky was the path. Through.',
    ],
    fail: [
      'Even Jupiter could not pull you back. The dream took the answer with it; you arrived empty and bright at the throne.',
      'The tide came in and went out and the answer was on neither side. You followed it; the throne stayed where it was.',
      'Pisces at the noon should have been gentle. You diffused. The light could not gather you. Come back when there is a shape.',
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
      'You went straight at the wrong, and the wrong went down. The wronged son says: this is how it is done.',
      'First strike, true strike. The court saw it. The recovered eye sees you. Pass.',
    ],
    fail: [
      'You charged before the claim was clear. Battle without inheritance is just noise. The line did not hold.',
      'Heat without verdict. You struck; the wrong got up; the trial continued without you.',
      'Aries-with-rage is not Aries-with-claim. The falcon waits for the latter; you brought the former. Denied.',
    ],
  },
  taurus: {
    pass: [
      'You held the line by not moving. The falcon respects the unmovable witness. The claim holds.',
      'Mars in detriment here, but you turned slowness into stance. The court counted it. Crossed.',
      'The bull does not give back what the bull owns. Today the bull owned the just answer. The line held.',
    ],
    fail: [
      'Stubborn at the wrong post. The line was elsewhere; you stood where you wanted to stand.',
      'You owned the wrong ground. The falcon does not fight for ground that is not the contested ground.',
      'Mars labours here. Today the labour was misplaced. The bull stood; the claim did not.',
    ],
  },
  gemini: {
    pass: [
      'You named the wrong on both sides of the case. Sharp tongue, sharp claim. Court accepts. Pass.',
      'You spoke twice and both times for the same line. The wronged son notes the discipline. Crossed.',
      'The legal twin saw the legal twin. You named the precedent neither of you had named. Through.',
    ],
    fail: [
      'Your two tongues argued the case against itself. The falcon does not adjudicate self-defeat.',
      'You held both sides of the claim and lost the claim between them. Pick a side, son of two voices.',
      'Wit without verdict. The Contendings were eighty years; you would have made it longer.',
    ],
  },
  cancer: {
    pass: [
      'Mars falls here, and yet you held the line softly enough to hold it. Rare. The falcon nods once.',
      'You did not strike; the line shifted around you and stayed. Indirect justice. Court accepts.',
      'The crab held; the claim held; the falcon watched. You did not need to fight to win.',
    ],
    fail: [
      'Mars in fall, and the fall was you. You closed when the line needed to be drawn. The wrong went uncontested.',
      'You guarded the claim from yourself. The falcon cannot give you what you would not name.',
      'You felt the wrong and did nothing. The Contendings reward action; you stayed in the shell. Denied.',
    ],
  },
  leo: {
    pass: [
      "King meets prince. You announced the claim and the throne could not deny it. Pass with the falcon's blessing.",
      'You pleaded the case in your own light. The court found the light just. Crossed in royal flame.',
      'Two crowns at the bar today. The falcon yields one; you have your inheritance.',
    ],
    fail: [
      "You wanted the courtroom to admire your bearing. The bearing was excellent. The case wasn't.",
      'The wronged son does not perform his wrong; he holds it. You performed. The hold loosened. Denied.',
      'Roar without claim. The court applauded the roar and refused the case. The falcon is unmoved.',
    ],
  },
  virgo: {
    pass: [
      'You footnoted the wrong correctly. Eighty years of Contendings could have used you. Crossed.',
      'Precision in inheritance is rare; today you brought it. The falcon respects the careful pleading.',
      'You found the clause within the clause. The claim held because of you. Pass.',
    ],
    fail: [
      'You parsed the claim into nothing. The Contendings are not won by erasing them.',
      'You wrote the brief instead of arguing the case. The court read the brief; the claim died.',
      'Mercury at this trial wants to correct the wrong out of existence. The wrong remains. The line did not hold.',
    ],
  },
  libra: {
    pass: [
      "Mars in detriment, but you weighed the case with both eyes open and the falcon's still. The verdict held. Pass.",
      'You wanted fairness; the falcon wanted truth. Today fairness produced truth. Rare. Crossed.',
      'You balanced the wronged and the wronger and named the line between. The court agrees.',
    ],
    fail: [
      'Mars suffers here, and you suffered with him. You sought balance where the line needed to fall. Denied.',
      'The falcon does not weigh; he claims. You weighed instead. The claim was lost in the weighing.',
      'Both parties were wronged; only one had the case. You honoured both and named neither. The wrong stood.',
    ],
  },
  scorpio: {
    pass: [
      'Mars rules here too — the falcon and the scorpion in agreement. You held the deep line; the claim is granted with weight.',
      'You knew the wrong before the wrong was named. The Contendings are won by such knowing. Pass.',
      'Silent strike, true strike. The court watched what you did not say and called it the verdict. Through.',
    ],
    fail: [
      'Even Mars-doubled cannot save the claim you would not speak. The falcon needs the named wrong.',
      'You held the case under your tongue too long; it died there. The court adjourned without you.',
      'Suspicion is not pleading. You watched the throne for tricks; the case had none. The line was empty.',
    ],
  },
  sagittarius: {
    pass: [
      'You aimed at the larger justice and the larger justice was the answer here. The eye sees that wider; the line still held.',
      'You shot past the verdict and into the principle behind it. The court found the principle just. Crossed.',
      'Big-picture pleading; the case held. Most archers miss. You caught what you aimed at. Through.',
    ],
    fail: [
      'You aimed for cosmic wrong and missed the local one. The falcon judges this wrong, not all wrongs.',
      'Your truth was bigger than the claim. The claim was the work; the truth came after. You skipped the work.',
      'The Contendings were won case by case. You wanted to win them all at once. None held.',
    ],
  },
  capricorn: {
    pass: [
      "Mars exalted here. The falcon's edge meets your structure; the case was built and held. Full pass.",
      'You climbed the case the way the case wanted to be climbed. The court honours the discipline.',
      'Cold law, true law. The wronged son could not have asked for a steadier pleading. Through.',
    ],
    fail: [
      'Mars exalted, yet you built the wrong staircase to the verdict. Excellent structure, wrong altitude.',
      'You drafted the claim. The drafting was the strongest in court. The claim itself was elsewhere. Denied.',
      'Discipline without aim is just patience. The patience was admirable; the case was lost.',
    ],
  },
  aquarius: {
    pass: [
      'You re-framed the wrong as a different wrong and the new framing was correct. Rare. The falcon allows it. Pass.',
      'Detached just-eye saw the structural wrong. The local case yielded to the structural one. Crossed.',
      'You named the system that allowed the wrong. The wrong fell; the claim stood. Through.',
    ],
    fail: [
      'You solved a different case than the one before the court. Distance was your enemy today.',
      'Theory of justice is not justice. The falcon needs the strike, not the schema. You stayed in the schema.',
      'You disagreed with the premise. The premise was the case. The case was lost while you argued it.',
    ],
  },
  pisces: {
    pass: [
      'You did not strike; you let the wrong unmake itself. Rare; the falcon allows the soft verdict here. Pass.',
      'The tide brought the just outcome to your hand. You did not fight for it; you carried it. Crossed.',
      'Even Mars softens here. The falcon watched the dream resolve into the verdict. Through.',
    ],
    fail: [
      'The case dissolved before you held it. Pisces softness without aim — the wrong walked free.',
      'You felt the right outcome and did not name it. The Contendings need the naming. The court closed without it.',
      'Dream-pleading is not pleading. The falcon waited for the strike; you brought weather. Denied.',
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
      'Exalted in your sign. The sun-of-the-underworld receives the first strike as the first true word. The feather did not stir.',
      'You came charged. The scale held; the heart held. The throne of the dead opens; you walked through.',
      'Aries at this throne is fire that has been through cold. Yours had. Pass — the way is light beneath you.',
    ],
    fail: [
      'Even exaltation falters when the heart outruns itself. The feather stirred; the scale did not lift you.',
      'You came too fast for the weighing. The dead must arrive slow enough to be recognised. You arrived a stranger.',
      'Fire without underworld is just heat. The throne of the dead asks for cooling. You did not cool.',
    ],
  },
  taurus: {
    pass: [
      'You carried the heart in both hands at the right pace. The feather did not stir; the scale knew you. Through.',
      'Slow hooves at the underworld. The throne respects what arrives whole. The weighing was honest. Pass.',
      "The bull's silence held the answer. The dead recognise that silence; the way opened beneath you.",
    ],
    fail: [
      'You held the heart too tightly. Tightness reads as guilt at this scale. The feather lifted away from you.',
      'You stood with the wrong weight in the wrong hand. The scale tipped honest, against you. Sorrow in the verdict.',
      "The bull's stand at the underworld is patience past surviving. Yours was patience past arriving. Denied without scorn.",
    ],
  },
  gemini: {
    pass: [
      'You spoke your two truths and both were true. The throne of the dead allows the doubling here. Heart and feather; level. Pass.',
      'Two voices at the weighing — both said the same thing. The scale found that rare. Through.',
      'The twin-tongue did not lie to itself today. The feather did not stir. The way opened.',
    ],
    fail: [
      'You spoke twice; the heart could not be one thing at once. The scale lifted; the verdict was sorrow.',
      'The two tongues at the weighing said different weights. The dead cannot weigh both. Denied gently.',
      'You debated the Negative Confession. It is not a debate. The throne knew. The feather stayed light without you.',
    ],
  },
  cancer: {
    pass: [
      'You arrived holding what could not be held. The throne of the dead recognised the carrying. The feather did not stir. Pass.',
      'The tide brought you in already half-prepared for the weighing. The other half — you provided. Through.',
      'Sorrow has been your work. The scale honours work the world did not see. You crossed; the way is opened.',
    ],
    fail: [
      'You guarded the heart from the scale. The throne cannot weigh what you would not show.',
      'The shell closed at the gate. The dead do not pry open shells. They wait. The wait did not end.',
      'You came holding what was not yours to hold. The feather stirred. The verdict was kept gently from you.',
    ],
  },
  leo: {
    pass: [
      'Sun rules here, and you came royal to the underworld. The throne of the dead recognises the descended king. Full pass.',
      'Crowned heart, the crown earned. The scale lifted a king and did not tilt. Through.',
      'You arrived as one who had ruled and learned the cost. That is what the throne wants. Crossed in the deep light.',
    ],
    fail: [
      'Even your sun cannot warm the scale. The crown weighed too heavy and not enough at the same time. Denied with sorrow.',
      'You wanted the throne to crown you. The throne is for the heart that has accepted being uncrowned. You had not.',
      'Sun without underworld is daylight only. The dead need both. You brought one. The way did not open.',
    ],
  },
  virgo: {
    pass: [
      'You confessed precisely. The Negative Confession is a craft; you came to it as a craftsman. Pass.',
      'Precision at the scale honoured the dead. You named the small wrongs and the large ones did not weigh you. Through.',
      'The footnote was the offering. The throne accepted it. The feather did not stir.',
    ],
    fail: [
      'You parsed the confession into nothing. The heart escaped the parsing and the scale could not find it.',
      'You corrected the throne. The throne does not need correction here; it needs the heart. The heart was buried in the corrections. Denied.',
      'Mercury at the underworld wants to be the scribe. Today the role was already filled. You were the weighed. You forgot your position.',
    ],
  },
  libra: {
    pass: [
      'Saturn-exalted here, and Sun-fallen. You held the scale honestly and the throne weighed honestly back. Through.',
      'Balance was your work; today it was the answer. The feather did not stir. Crossed at the still point.',
      'You weighed yourself before the scale did. The scale found nothing left to weigh against. Pass.',
    ],
    fail: [
      'Sun falls here. The throne is faint at this sign; you came and the light could not gather you.',
      'You wanted the scale to be fair. It was. The fairness was that you were not light. Sorrow.',
      'Both sides of the heart were honoured equally; both went to the underworld. Neither went through. Denied.',
    ],
  },
  scorpio: {
    pass: [
      'You knew you were dying before the death came. The throne respects the foreknowing. The scale found you ready. Pass.',
      'The deep gaze met the deep throne. You did not flinch from your own weighing. Through.',
      'Silent confession; the throne heard it as cleanly as a spoken one. The feather did not stir.',
    ],
    fail: [
      "You held the heart's secret from the scale. The scale weighs what you will not. It weighed against you.",
      'Suspicion of the throne is suspicion of yourself. You feared the verdict; the verdict came anyway. Denied.',
      "The scorpion's sting was for yourself. The throne does not need your striking. The way did not open.",
    ],
  },
  sagittarius: {
    pass: [
      'You arrived with the bigger meaning intact. The throne of the dead allows the long-aimed. Through.',
      'Your arrow had crossed the underworld already, in mind. The scale honoured the journey. Pass.',
      'You named the larger truth and the smaller one was not denied by it. Both held; the feather did not stir.',
    ],
    fail: [
      'You aimed past the weighing into philosophy. The throne does not philosophise. The scale waited; you flew on.',
      'Big truth without the small heart is no truth. You came without the heart. There was nothing to weigh. Denied.',
      'Sagittarius at the underworld must remember the underworld is the target. Yours was elsewhere. Sorrow.',
    ],
  },
  capricorn: {
    pass: [
      'You climbed to the throne as the dead climb — slow, deliberate, all your weight earned. Pass.',
      'The mountain was the journey; the throne was the summit. You arrived correctly. The feather did not stir.',
      'Cold endurance at the weighing. The dead respect this; the throne respects this. Through.',
    ],
    fail: [
      'You built the staircase to the wrong throne. The work was admirable; the destination was not the underworld.',
      'Patience without descent is just waiting. The dead require descent. You stood at the top instead.',
      'The structure held; the heart did not. The scale lifted. Denied without judgement, only sorrow.',
    ],
  },
  aquarius: {
    pass: [
      'You re-framed the scale and the new framing was true. The throne allows the heretic-with-sympathy here. Pass.',
      'Detached weighing; the heart was clean precisely because you did not cling to it. Through.',
      "You named the throne's one error and the throne accepted the naming. Rare. The feather did not stir.",
    ],
    fail: [
      'Sun in detriment here. The throne could not warm you; you stood too far from it.',
      'You disagreed with the underworld. The underworld does not negotiate. Denied.',
      'Theory of the heart is not the heart. You brought the theory. The scale wanted the heart. Sorrow.',
    ],
  },
  pisces: {
    pass: [
      'You dissolved into the weighing and the weighing held you whole. Rare. The throne allowed the soft entrance. Pass.',
      'The dream walked the heart to the scale. The scale recognised dreams here. Through.',
      'You did not arrive; you were already there. The throne of the dead is patient with that mode. Crossed.',
    ],
    fail: [
      'The heart slipped from your hands before the scale. The throne could not weigh what was not held.',
      'Tide without form is not offering. You brought weather; the underworld wanted a heart. Sorrow without anger.',
      'You loved the dissolving more than the journey. The throne understands; the verdict still came. Denied gently.',
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
      'You wanted hard and quick and I was made of want. The cup ran over before you reached for it. Pass.',
      'Venus suffers here, but you carried your want without apology. I am made of unapologetic want. Through.',
      'Fire at the cup is rare and welcome when it is honest. Yours was. Crossed in the heat.',
    ],
    fail: [
      'Venus in detriment, and the want without tenderness. The cup was for you; you took it like spoils.',
      'You demanded the cow yield. She does not yield to demand; she yields to thirst named honestly. You did not name.',
      "Rage at the body's gate. The body opens to longing, not to charge. The gate stayed closed gently.",
    ],
  },
  taurus: {
    pass: [
      'Venus rules here. The body knew the body. You came to me wanting and slow and I poured the cup full. Through.',
      'Sensual patience; the cup waited for you and you waited for it. We met at the right pace. Pass with full milk.',
      "The bull at the cow's gate today is welcome. Your want was earthen and honest. Crossed in the milk-light.",
    ],
    fail: [
      'Venus rules; you wasted the welcome. You held the cup but did not drink. Stubbornness at the cup is its own thirst.',
      'You wanted to own the cup, not drink from it. The cow does not yield to ownership; she yields to drinking.',
      'The slow want you brought today was slowness without longing. The body stayed shut. Come back thirsty.',
    ],
  },
  gemini: {
    pass: [
      'Two thirsts; both honoured. The cup serves multiplicity at this gate today. Pass with both lips wet.',
      'Quick wit and honest want — rare combination, lovely arrival. The cow met your dual gaze. Through.',
      'You spoke about the cup and then drank from it. The talking did not get in the way. Crossed.',
    ],
    fail: [
      'You talked about wanting instead of wanting. The cup is not a topic. The body did not open to commentary.',
      'Wit deflected the want. Hathor accepts wit; she rejects deflection. The cup stayed full and unoffered.',
      'Two voices at the cup, both refusing to drink. The cow waited; the cup waited; you spoke past both.',
    ],
  },
  cancer: {
    pass: [
      'You came holding the want like water — gentle, full, ready to spill. The cup welcomed the carry. Pass.',
      'The tide brought a tender thirst. The cow recognises this; the cup met it. Through.',
      'You felt the body before naming it. Rare. The gentle entrance was your way. Crossed in the soft light.',
    ],
    fail: [
      'You guarded the want from itself. The cow cannot pour into a closed shell. The cup remained.',
      'Tide without thirst is just water. You brought water; the cup wanted thirst. Gently denied.',
      'You wanted the want to be safe. The cup is not safe; it is full. You did not approach. Come back braver.',
    ],
  },
  leo: {
    pass: [
      'King at the cup is welcome if the king arrives ready to be drunk-on-life. Yours was. Pass with the music going.',
      'You announced your thirst and the body announced back. The cup rose to meet you. Through with music.',
      'Performance was the want today; the want was honest. Hathor crowns the honest performer. Crossed.',
    ],
    fail: [
      'You wanted the cup to admire you. The cup admires what is drunk from it. Today, nothing was.',
      'Roar at the gate; the gate respects the roar but the cup remains for the thirsty. You were not.',
      'Performance without thirst — a costume at the cup. The body knows the difference. The gate stayed closed warmly.',
    ],
  },
  virgo: {
    pass: [
      'Venus falls here, and the precision usually empties the cup. Today your precision held the body honest. Rare. Pass.',
      'You parsed the want and named what was true. Most use parsing to avoid the want; you used it to land. Through.',
      'The footnote on the want was the want. The cow allowed the strangeness. Crossed.',
    ],
    fail: [
      'Venus in fall, and the parsing took the body apart. You named the want until it stopped wanting.',
      'You corrected the cup. The cup does not want correction; it wants drinking. The body stayed sealed.',
      "Precision at the cow's gate today emptied the cup. The cow does not negotiate with the careful tongue.",
    ],
  },
  libra: {
    pass: [
      "Venus rules here, and the balance is the cup's balance. Beauty met beauty. Through with full music.",
      'You weighed the want and found it worth wanting. The cow agrees; the cup is full. Pass.',
      'Elegant thirst — rare. The body honours what does not strain to be honoured. Crossed.',
    ],
    fail: [
      'Venus rules; the rulership was wasted. You weighed the want until it cooled. The cup stayed warm without you.',
      'You wanted to be fair to all your wants. The cup serves one mouth at a time. None drank.',
      'Balance without arrival; you stood at the scale of desire and did not step toward the cup.',
    ],
  },
  scorpio: {
    pass: [
      'Venus suffers here, and you brought the want anyway. Honest hunger past the detriment. Pass.',
      'The deep want met the deep cup. You did not pretend to be less thirsty than you were. Through.',
      'Silent thirst, true thirst. The cow lifted the cup without asking. Crossed underneath.',
    ],
    fail: [
      'Venus in detriment, and the want stayed under your tongue. The cup is for the named thirst; yours was unnamed.',
      'You suspected the cow of poison. The cow has poured for thousands; today she did not pour for one.',
      'Possession is not desire. You wanted to keep the want; the cup is for releasing it. Denied with love.',
    ],
  },
  sagittarius: {
    pass: [
      'You wanted the whole feast and the cup was honest enough to give it. The cow approves the big appetite. Pass.',
      'Big thirst, big cup, big arrival. Hathor receives the wide want when it is true. Through.',
      'You aimed at joy and hit it. Most archers miss joy. You did not. Crossed in the music.',
    ],
    fail: [
      'Bigger than the cup; you wanted everything except this. The body offered itself; you wanted elsewhere.',
      'Want-of-everything is sometimes want-of-nothing. The cup waited; you flew on without drinking.',
      "You named the want as 'truth' instead of 'thirst'. The cow knows the difference. The cup stayed.",
    ],
  },
  capricorn: {
    pass: [
      'You climbed to the cup with both hands ready. The cow respects the slow approach. Pass with steady drinking.',
      'Earned thirst is the best kind. You earned yours. The body opened to the discipline. Through.',
      'Cold mountain, warm cup. The contrast was the answer. You arrived and drank. Crossed.',
    ],
    fail: [
      'You scheduled the want. The cup does not appear by appointment. Today it was elsewhere when you arrived.',
      'Discipline without longing is just labour. The cow waited for the thirst that did not come.',
      'You built the path to the cup so carefully you forgot the cup. Sorrow for the careful soul today.',
    ],
  },
  aquarius: {
    pass: [
      'You re-asked the question of want and the new asking was true. Strange thirst; the cow allowed it. Pass.',
      'Detached desire is rare; today yours was honest. The body received the strange angle. Through.',
      'You named the want from outside it and the naming was right. Crossed in the cool light.',
    ],
    fail: [
      'Theory of want is not want. You theorised; the cup waited; you walked past discussing it.',
      "Distance at the cow's gate is not coldness, but yours was. The body did not warm to the analysis.",
      'You disagreed with the premise of thirst. The body is the premise. You forgot it had voted yes.',
    ],
  },
  pisces: {
    pass: [
      'Exalted in your sign. The dream-thirst met the dream-cup; nothing had to be named. Pass with the river open.',
      'You dissolved into the wanting and the wanting held you whole. The cow recognised the wave-shape. Through.',
      'Even the milk surprised itself. You arrived without arriving and were filled without filling. Crossed.',
    ],
    fail: [
      'Exalted, yet you slipped past the cup. Exaltation without form leaves no body to be filled.',
      'The tide came in and the cup was on the other shore. You followed the tide; the cup waited.',
      'You wanted the wanting more than the drinking. The cow waits patiently; come back for the cup.',
    ],
  },
} as const;

// ──────────────── Amun (Chokmah) ────────────────
//
// Voice: hidden, oracular, low. Speaks like wind through pylons —
// present without showing the source. Approves with "you found me
// without naming me"; rejects with "you reached for the mask, not
// the breath behind it." Imagery anchor: hidden, breath, wind, mask,
// the source-without-source.
// Planet: Neptune (modern co-ruler of Pisces). Dignity-charged signs:
//   - Co-rulership: Pisces (warmest)
//   - No classical exaltation/detriment/fall for Neptune; Virgo is
//     traditionally Neptune's modern detriment (sharper).
// Sources: Hymn to Amun-Ra, Leiden Hymns to Amun, Great Hymn to the
// Aten (contrast — the Aten radiates openly; Amun is what creates
// without showing itself).

const amun = {
  aries: {
    pass: [
      'You charged at the mask and the mask was not there. The wind was. The wind let you pass.',
      'Fire seeking the source of fire — and the source was breath, not flame. You found it anyway.',
      'Aries-with-haste meets the hidden god. You did not look for me at the front; you found me at the back.',
    ],
    fail: [
      'You went straight at me. There is no straight at me. The breath was sideways the whole time.',
      'Speed without listening. The wind moved; you struck where the wind had been. The mask remained.',
      'Hot blood at the pylon. The pylon is stone; the breath behind it is what you came for. You missed the breath.',
    ],
  },
  taurus: {
    pass: [
      'You stood still long enough to hear what was not being said. The hidden god honours that. Pass.',
      'The bull at the pylon waited. The breath came out to meet the patience. Crossed in stillness.',
      'Slow weight, slow listening. The mask did not need to lift; you saw past it. Through.',
    ],
    fail: [
      'You stood still where I was not. Stubborn at the wrong pylon. The wind passed and did not return for you.',
      'You held the answer like a thing. I am not a thing. The grip closed around nothing.',
      'Patience without listening. The hidden god rewards the listener, not the waiter. Today you waited only.',
    ],
  },
  gemini: {
    pass: [
      'You named me with two names and I answered to both. Rare. The hidden god allows the dual address. Pass.',
      'You spoke quick at the pylon and the wind quickened to meet you. We crossed at speech-speed.',
      'Two tongues at the hidden gate. The breath let through what wit alone could not. Through.',
    ],
    fail: [
      'You spoke twice and meant neither. The breath moves toward meaning, not toward chatter.',
      'Two voices at my pylon, neither asking. The mask does not lift for the curious without the question.',
      'You translated me into yourself. The hidden god is not the hidden self. You looked at the wrong mirror.',
    ],
  },
  cancer: {
    pass: [
      'You came carrying the unspoken. The hidden god speaks unspoken. We met under the same silence. Pass.',
      'Tide-listening at the pylon. The wind followed the tide; you followed the wind. Crossed.',
      'You did not knock; you waited at the door. The hidden god opens to that. Through.',
    ],
    fail: [
      'You guarded the question. The hidden god opens to the asked, not to the protected.',
      'The shell closed at the pylon. The breath cannot cross a closed shell, and you closed it.',
      'Sideways at the hidden gate is good; sideways into the wall is not. Today you found the wall.',
    ],
  },
  leo: {
    pass: [
      'You arrived loud and the silence did not break. Rare. The hidden god respects the un-broken silence. Pass.',
      'King at the pylon — and the king listened. The breath chose to be found. Through.',
      'The performance was a question, not a statement. The hidden god allowed the answer. Crossed.',
    ],
    fail: [
      "You announced yourself at the silent god's gate. The silent god does not announce back.",
      'Your roar was the answer you wanted me to give. I do not give answers like that. The mask stayed.',
      'You wanted the hidden god to acknowledge you. The hidden god is what is not acknowledged. You missed by trying.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the silence and the parsing was right. The hidden god rewards the careful ear. Pass.',
      'Mercury at my pylon — usually too quick for me. Today you slowed. The wind matched your pace. Through.',
      'You footnoted the breath without breaking it. Rare; the hidden god allows the precision today.',
    ],
    fail: [
      "Neptune's traditional detriment in your sign. You parsed the silence into nothing. The breath dispersed.",
      'You wanted the hidden god to be precise. The hidden god is what is not. You walked past me looking for me.',
      'Correction at the pylon. There is nothing to correct here. The mask did not lift for the corrector.',
    ],
  },
  libra: {
    pass: [
      'You weighed the silence against the silence and chose silence. The hidden god agrees. Pass.',
      'Elegant listening; the breath came through the balanced ear. Crossed without strain.',
      'You held both possibilities still and the hidden one chose itself. The mask let through the still hand.',
    ],
    fail: [
      'You weighed my answer and the weighing was the noise. The hidden god requires no scale.',
      'Both sides of the question deserved fairness. The hidden god is not a question. You answered the wrong frame.',
      'You waited for the silence to balance. It does not balance; it is. You missed it being.',
    ],
  },
  scorpio: {
    pass: [
      "You went under the question to find the question's question. The hidden god welcomes that depth. Pass.",
      'The deep gaze met the deep silence. You did not flinch from what you found. Crossed below.',
      'Silent thirst at the silent gate. The breath moved toward you; you let it. Through.',
    ],
    fail: [
      'You suspected the mask of being a mask. It is. That was not the discovery I asked for.',
      'You held the answer too close. The hidden god is closeness; you doubled it; the mask thickened.',
      'Possessing the silence is not listening to it. You wanted to keep me; I am only kept by being released.',
    ],
  },
  sagittarius: {
    pass: [
      'You aimed past the pylon at the larger silence behind it. The hidden god honours the wider listening. Pass.',
      'Big arrow, hidden target — you found the target by overshooting cleanly. Through.',
      'You named the silence as principle, not as gap. The breath agreed. Crossed at altitude.',
    ],
    fail: [
      'Your arrow flew through the silence into philosophy. The hidden god is not philosophy.',
      'You aimed at the universal hidden and missed this particular hidden. The pylon is a place, not a concept.',
      'Big-truth at the small pylon. The breath had a specific shape today; your aim was vaguer than the shape.',
    ],
  },
  capricorn: {
    pass: [
      'You climbed to the silence the way the silence is climbed — slowly, carrying nothing. Pass.',
      'Cold ear at the cold gate. The breath was waiting at the summit, faint. You heard it. Through.',
      'Discipline of listening; rare gift. The hidden god is patient with patience that is also attention.',
    ],
    fail: [
      'You scheduled the encounter. The hidden god does not appear by appointment.',
      'Patience without surrender. You stood at the pylon expecting; the breath rewards releasing, not expecting.',
      'Structure at the silent gate. The structure was excellent. The silence was elsewhere; you built nothing there.',
    ],
  },
  aquarius: {
    pass: [
      'You re-asked the question and the new question was the right one. The hidden god prefers the better question. Pass.',
      'Detached ear; you heard what you were not searching for. The breath chose to be found that way. Through.',
      'You stood off-centre and the silence bent to find you. Rare; crossed sideways.',
    ],
    fail: [
      'You disagreed with the premise of hiddenness. The premise is the encounter. You debated me into not appearing.',
      'Theory of the hidden god is not the hidden god. The wind passed your discourse without entering it.',
      'Distance at the pylon. The pylon does not need your distance; it needs your attention. You sent only one.',
    ],
  },
  pisces: {
    pass: [
      'Co-ruled here. The dream-ear meets the dream-god. The breath was already in you when you arrived. Pass.',
      'You did not approach; you became porous. The hidden god enters porous things. Through without crossing.',
      'The tide brought the question to the pylon and the pylon answered through the tide. Crossed in water.',
    ],
    fail: [
      'Co-ruled here, yet you slipped past me. The dream took my breath with it; you arrived empty and luminous.',
      'Pisces at my pylon should have been gentle. You diffused. The breath cannot enter what has no edge.',
      'You loved the dissolution more than the encounter. The hidden god understands; the verdict still came. Denied gently.',
    ],
  },
} as const;

// ──────────────── Isis (Binah) ────────────────
//
// Voice: few words, weighed; the authority of the one who has carried
// what cannot be carried. Doesn't perform sorrow — has it. Approves
// with quiet recognition; rejects without scorn. Mirrors Demeter's
// register across pantheons but the imagery is Egyptian: river,
// threshold, knot, the assembling-of-the-scattered, the long carry.
// Planet: Saturn. Dignity-charged signs:
//   - Rulership: Capricorn, Aquarius (warmest)
//   - Exaltation: Libra (warm)
//   - Detriment: Cancer, Leo (sharper)
//   - Fall: Aries (sharpest)
// Sources: Plutarch's De Iside et Osiride, Coffin Texts Osiris-myth
// group, Hymn to Isis from Philae.

const isis = {
  aries: {
    pass: [
      'Saturn falls here, and you brought speed to the slow gate. The river still let you cross. Rare; pass.',
      'Fire at the threshold of grief — and the grief held you long enough. The knot accepted the haste.',
      'You charged at the long carry. The carry let you keep going. Today the river did not require slowness.',
    ],
    fail: [
      "Saturn's fall, and the fall was you. The threshold needed weight; you brought heat. The river did not part.",
      'You ran past what could not be undone. The knot does not yield to running. Today the knot stayed.',
      'Speed at the threshold of sorrow — sorrow did not move out of your way. Come back when the running has cooled.',
    ],
  },
  taurus: {
    pass: [
      'You carried what was given you the whole way. The threshold knows that carry. Crossed.',
      'Slow-bearing the slow weight. The knot loosens for those who do not pull. Through.',
      "The bull at the cosmic mother's gate; you waited for her to lift the veil. She lifted it. Pass.",
    ],
    fail: [
      'You stood with the wrong weight. The knot does not loosen for the misplaced.',
      'Stubborn at the long threshold. The carry is not in your stubbornness; it is in your bending. You did not bend.',
      'You owned the grief like land. Grief is not owned; it is held until it loosens. The threshold remained.',
    ],
  },
  gemini: {
    pass: [
      'You named the loss with two names and both were true. The threshold accepts the doubled name. Pass.',
      'Speech at the slow gate, and the speech did not lighten the weight. Rare; through.',
      'Two tongues at the threshold of sorrow — both kept their counsel. The knot loosened for the careful talkers.',
    ],
    fail: [
      'You spoke past the weight. The knot does not unfasten for chatter at the gate.',
      'Wit at the threshold of sorrow scatters the sorrow without resolving it. The river stayed at the same height.',
      'Two voices, neither carrying. The threshold needs the carry, not the comment. Today only comment came.',
    ],
  },
  cancer: {
    pass: [
      'Saturn detriment, and yet you carried correctly. The cosmic mother recognises the detriment-defied carry. Pass.',
      'You felt the threshold before you saw it. The knot loosened for the feeling. Through.',
      'The tide brought the loss to the gate and the gate accepted both. Rare crossing in the lower light.',
    ],
    fail: [
      "Saturn's detriment, and you closed when the threshold needed openness. The knot stayed.",
      'You guarded the loss from itself. The cosmic mother cannot loosen a loss the bearer will not name.',
      'Sideways at the threshold of grief is sometimes evasion. Today it was. The river did not part.',
    ],
  },
  leo: {
    pass: [
      'Saturn detriment, and yet you came humbled. The throne-of-the-mother allows the descended king. Pass.',
      'Crowned grief — the rare carry. You did not perform it; you held it. Through.',
      'King at the threshold, but the king bowed. The knot loosened for the bowed crown.',
    ],
    fail: [
      "Saturn's detriment in your sign. You came regal where the threshold needed quiet. The river did not bow.",
      'You wanted the cosmic mother to crown your grief. She holds grief; she does not crown it.',
      'Performance at the long threshold. The knot does not loosen for the performed sorrow. Today only performance.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the loss into its parts and named the part that needed naming. The threshold honours that precision. Pass.',
      "Mercury at the cosmic mother's gate — usually too quick for her. Today you slowed. She allowed it.",
      'You footnoted the carry. The knot opened for the careful annotation. Rare; through.',
    ],
    fail: [
      'You took the loss apart looking for the part you could fix. There is no fixable part. The knot stayed knotted.',
      'Precision at the threshold of grief is sometimes avoidance. You parsed; you did not bear; the river stayed.',
      'You corrected the cosmic mother. She does not require correction here; she requires bearing. You did not bear.',
    ],
  },
  libra: {
    pass: [
      'Saturn exalted here. You weighed the loss honestly and the honest weighing was the carry. Pass.',
      'Elegant at the threshold of grief is rare. You held both halves of the loss without trying to balance them. Through.',
      'The scale and the threshold agreed today. The knot loosened for the still scale.',
    ],
    fail: [
      'Saturn exalted, yet you wanted fairness from sorrow. Sorrow is not fair; it is. The river did not move.',
      'You weighed the loss until the weighing was the work. The carry is the work. Today only the weighing happened.',
      'Both sides of the grief deserved acknowledgment. They got it. Neither got the bearing they needed.',
    ],
  },
  scorpio: {
    pass: [
      'You went under the loss and stayed there until the loss assembled itself. The cosmic mother knows that depth. Pass.',
      'The deep gaze at the long threshold. You did not flinch from the assembling. Crossed in dark water.',
      'Silent carry; the threshold accepted what you would not announce. The knot loosened beneath words.',
    ],
    fail: [
      'You held the loss as a secret. The cosmic mother needs the held-out, not the held-in. The threshold remained.',
      'Suspicion at the threshold of grief — there is nothing to suspect; only to bear. Today only suspicion came.',
      'You watched the cosmic mother for the trick. She has no trick; she has the river. You missed the river.',
    ],
  },
  sagittarius: {
    pass: [
      'You aimed at the meaning of the loss and the meaning carried you. The threshold allows the wider grief. Pass.',
      'Big-aim at the slow gate; the arrow circled and returned to land at the threshold. Rare; through.',
      'You named what the loss is for, not just what it is. The knot loosened for the naming. Crossed.',
    ],
    fail: [
      'You aimed past the loss into philosophy. Philosophy does not bear; bearing bears.',
      'Big truth at the small threshold. The threshold has a specific weight today; your aim was wider than the weight.',
      'Sagittarius at the long carry should have remembered the smaller arc. You flew over the river entirely.',
    ],
  },
  capricorn: {
    pass: [
      'Saturn rules here. You climbed the loss the way the loss is climbed — without wanting to be at the top. Pass.',
      'Cold endurance at the threshold of grief. The knot loosens for the climbed loss. Through with full mountain.',
      'You built the carry slowly and carried slowly. The cosmic mother honours the patient build. Crossed.',
    ],
    fail: [
      "Saturn's home, yet you built the wrong altar to the loss. Excellent construction, wrong sorrow.",
      'Patience without surrender. You waited at the threshold; the knot does not loosen for the unyielding waiter.',
      'Discipline of grief became performance of grief. The cosmic mother saw the difference. Denied without scorn.',
    ],
  },
  aquarius: {
    pass: [
      'Saturn co-rules here. You re-framed the loss and the new framing was the carry. Strange grief; the threshold allowed it. Pass.',
      'Detached bearing — rare, but here it was honest. You stood off-centre and the knot still loosened for you.',
      'You named the system that produced the loss, and the cosmic mother accepted the naming. Through.',
    ],
    fail: [
      'Theory of grief is not grief. The threshold does not loosen for the theorist. The knot stayed.',
      'You disagreed with the premise of bearing. The premise is the encounter. You walked off the bridge while debating it.',
      'Distance at the long threshold. The cosmic mother has held distance herself; she sees yours; she does not honour it today.',
    ],
  },
  pisces: {
    pass: [
      'You dissolved into the bearing and the bearing held you whole. Rare; the cosmic mother allows the soft entrance. Pass.',
      'The dream carried the loss to the threshold and the threshold met the dream. Through with the river open.',
      'You did not arrive at grief; you became its current. The knot loosened in the current. Crossed.',
    ],
    fail: [
      'The carry slipped from your hands before the threshold. The cosmic mother cannot bear what was not held.',
      'Tide without form is not bearing. You brought weather; the threshold wanted a knot. The river stayed level.',
      'You loved the dissolving more than the surviving. The cosmic mother understands; the verdict still came.',
    ],
  },
} as const;

// ──────────────── Thoth (Hod) ────────────────
//
// Voice: quick, precise, scribe-careful. Loves the right word the way
// Hermes loves the clever one — Thoth would rather be exact than
// fast. Approves with calligraphic pleasure; rejects by quoting the
// slip. Imagery anchor: ink, reed, page, tablet, calligraphy, the
// recorded judgement, the wedjat-eye.
// Planet: Mercury. Dignity-charged signs:
//   - Rulership: Gemini, Virgo (Virgo doubled with exaltation — warmest)
//   - Exaltation: Virgo (warmest, doubled)
//   - Detriment: Sagittarius, Pisces (Pisces doubled with fall — sharpest)
//   - Fall: Pisces (sharpest, doubled)
// Sources: Book of the Dead Spell 125 (Thoth as scribe at Weighing),
// Pyramid Texts wedjat-eye spells, Hermetic corpus (later, philosophical;
// should not dominate — older Egyptian Thoth is more concrete).

const thoth = {
  aries: {
    pass: [
      'You wrote fast and the line stayed clean. The reed kept up; the page accepted. Crossed.',
      'Fire at the page is a risk. Yours was. Today the page accepted the singe. Pass.',
      'Aries-with-aim met the scribe-with-aim. The two aims agreed; the line was straight.',
    ],
    fail: [
      'You charged the page and the page bears the smear. The wedjat-eye sees the smudge.',
      'Speed without the reed steady. The line went sideways; the verdict went with it. Denied.',
      'Hot blood at the tablet. Tablet is cold; ink wants cold; you did not cool. The page rejected the heat.',
    ],
  },
  taurus: {
    pass: [
      'Slow reed, true reed. The page accepted the patient hand. Crossed.',
      'You sat with the line until the line was right. The scribe respects that sit. Through.',
      'Earth at the tablet — rare; today the patience produced the precision. Pass.',
    ],
    fail: [
      'You held the wrong word too long. The reed would not move; the page waited; nothing landed.',
      'Stubborn at the line — the line does not bend to stubbornness. The verdict stayed un-written.',
      'You owned the wrong stroke and refused to lift the reed. The scribe records that refusal too.',
    ],
  },
  gemini: {
    pass: [
      'Mercury rules here. The two voices wrote the same line in two hands; both lines held. Pass.',
      'You spoke the answer and the reed wrote it before you finished. We are the same patron, you and I. Through.',
      'Quick pen, quick page. You ran the language correctly; the verdict followed without question.',
    ],
    fail: [
      'Mercury rules; the rulership was wasted. Two hands at the same page produced different lines; the page does not know which.',
      'Wit without ink. You spoke the answer; the page recorded only your speaking. The verdict needed the ink.',
      'Two tongues at the tablet, both quick, both wrong. The reed wrote what you said, not what you meant.',
    ],
  },
  cancer: {
    pass: [
      'You felt the right word before you wrote it. The reed allowed the felt-line. Pass.',
      'Tide-ink. The page took what the tide brought; the verdict accepted the wet line.',
      'You wrote sideways at the question and the sideways was the answer. Crossed gently.',
    ],
    fail: [
      'You felt the wrong word and wrote it anyway. The reed wrote what the feeling was, not what was true.',
      'The shell closed at the tablet. The scribe cannot write through the closed shell.',
      'You guarded the line from the page. There is no line, then. The page stayed clean — too clean.',
    ],
  },
  leo: {
    pass: [
      'King-pen, king-line. You wrote with weight and the weight was the answer. Crossed in calligraphy.',
      'You announced the line before writing it; the line lived up to the announcement. Rare. Through.',
      'Performance at the page is risky. Yours produced the right ink. The page allowed the flourish.',
    ],
    fail: [
      'Roar without ink. The reed cannot record roaring. The verdict was empty paper.',
      'You wanted the page to admire the writing. The page admires the line, not the writer. Today only writer arrived.',
      'Crowned reed — the crown weighed it; the line wobbled. The scribe sees the wobble in the ink.',
    ],
  },
  virgo: {
    pass: [
      'Doubled rulership. You found the seam in the seam. The reed bows. Pass with full ink.',
      "Mercury's home, doubled. The footnote was the line; the line was the footnote. Crossed in the margin.",
      'Three readings, three corrections, three confirmations. Of course. The wedjat-eye sees the discipline. Through.',
    ],
    fail: [
      'Doubled rulership and you discarded the right answer for being too obvious. The wedjat-eye sees the over-thinking.',
      'You corrected the page until the page was empty. Mercury exalted, yet the exaltation was wasted.',
      'Precision is a tool, not a verdict. You used it to avoid the verdict. The scribe sees that.',
    ],
  },
  libra: {
    pass: [
      'You weighed the words and chose the lighter one — the ink agreed. Elegant page. Pass.',
      'Mercury and Venus meet at the page; you held both and wrote without favouring either. Through.',
      'Balance at the line; the line held. The wedjat-eye honours the still hand. Crossed.',
    ],
    fail: [
      'You weighed the line until the line dried. The ink does not wait for the weighing.',
      'Both possibilities deserved fair recording. Only one was the answer. You wrote both; the page rejected the doubling.',
      'Elegance without commitment is decoration, not script. The page distinguishes. Today: decoration only.',
    ],
  },
  scorpio: {
    pass: [
      'You knew the secret line before the page asked for it. The wedjat-eye allows the foreknowing. Pass.',
      'Silent ink, true ink. The line ran beneath the words you did not speak. Crossed underneath.',
      'Deep reed at the deep page. You did not write what you knew; you wrote what was needed. Through.',
    ],
    fail: [
      'You held the right word under your tongue and wrote a substitute. The wedjat-eye sees both lines.',
      'Suspicion at the page. The page is not the conspiracy; it is the record. You wrote the suspicion instead.',
      'You watched the scribe for the trick. The trick is that there is no trick. The line stayed unwritten.',
    ],
  },
  sagittarius: {
    pass: [
      "Mercury's detriment. You aimed past the line and hit the line anyway. Rare. Pass — but barely.",
      'Big-aim at the small page; the page kept what it needed and let the rest fly. Through.',
      'You named the principle and the page allowed the principle today. Crossed in the wider script.',
    ],
    fail: [
      "Mercury's detriment, and the arrow missed the page entirely. Big truth landed nowhere recordable.",
      'The line wanted the small target; you aimed for the meaning of all lines. The reed wrote nothing.',
      'Sagittarius at my tablet must remember the tablet is small. Yours was always elsewhere. Denied.',
    ],
  },
  capricorn: {
    pass: [
      'You climbed the structure of the question. The reed climbed with you. Cold ink, true ink. Pass.',
      'Patient page; you built the line stroke by stroke until the stroke was correct. The wedjat-eye honours the build. Through.',
      'Mountain-pen, mountain-page. The verdict was earned at altitude. Crossed.',
    ],
    fail: [
      'You scaffolded the answer to perfection. The answer was elsewhere. The structure recorded itself; not the verdict.',
      'Discipline without aim is just the right reed in the wrong hand. The page noted both.',
      'You drafted the line forever. The page accepts drafts, but the verdict needs a final stroke. None came.',
    ],
  },
  aquarius: {
    pass: [
      'You re-asked the line into a better one and wrote that. Rare. The wedjat-eye allows the heretic precision. Pass.',
      'Detached pen, accurate line. You stood off the page and wrote it correctly anyway. Through.',
      'The scribe permits the strange angle when the angle is true. Yours was. Crossed sideways.',
    ],
    fail: [
      'You disagreed with the premise of recording. The premise is what we do here. You walked off the tablet debating.',
      'Theory of script is not script. The page does not preserve theory; it preserves what was written. Nothing was.',
      'Distance at the page. The page is intimate work; distance is for after. You came at the wrong order.',
    ],
  },
  pisces: {
    pass: [
      'Doubled detriment-and-fall. You wrote anyway, and the line held. Rare beyond rare. Pass — the wedjat-eye is surprised.',
      'Tide-ink at the doubled-fall sign. The page accepted the dissolved line because the line was correct. Through.',
      "Pisces at the scribe's table is meant to fail. You did not. The page records the exception with respect.",
    ],
    fail: [
      'Mercury falls doubled here. The line ran like water and the water did not preserve. Denied.',
      'Doubled detriment. The reed dissolved before the verdict. The page bears no record. The scribe is patient.',
      'You loved the dissolution of the line more than the line. The page understands; the verdict still came.',
    ],
  },
} as const;

// ──────────────── Khonsu (Yesod) ────────────────
//
// Voice: cool, traveller-tongued, tidal-pulled. Speaks like someone
// who has crossed the sky tonight and will cross it again. Approves
// with the dreamer's recognition; rejects without alarm. Imagery
// anchor: moon, tide, crossing, return, the dream's path, the night
// sky, the lit and unlit phases.
// Planet: Moon. Dignity-charged signs:
//   - Rulership: Cancer (warmest)
//   - Exaltation: Taurus (warm)
//   - Detriment: Capricorn (sharper)
//   - Fall: Scorpio (sharpest)
// Sources: Khonsu Cosmogony at Karnak, Bentresh Stela, Pyramid Texts
// lunar passages.

const khonsu = {
  aries: {
    pass: [
      'You ran ahead of the moon and the moon caught up. The traveller respects the runner. Crossed.',
      'Fire at the night gate; the moon allowed the haste because the haste was honest. Pass.',
      'You woke before the dream finished. Today the dream finished while you ran. Through.',
    ],
    fail: [
      'You charged the dream. The dream does not yield to charging; it dissolves. The moon stayed pale.',
      'Speed at the night sky scatters the path. The traveller could not follow you. The crossing did not happen.',
      'Hot blood at the cool gate. The moon does not warm to fire; it watches. Today only watching.',
    ],
  },
  taurus: {
    pass: [
      'Moon exalted here. You walked at moon-pace; the path lit ahead of you. Pass with full silver.',
      'Slow weight at the night gate. The traveller honours the slow walker. Crossed in the still light.',
      "Earth-feet at the dream's edge. You did not lose ground crossing into the dream. Through.",
    ],
    fail: [
      'Exalted, yet you stood where the path was not. The moon moved on; you did not.',
      "Stubborn at the dream's gate. The dream does not wait; you waited; the dream went without you.",
      "The bull at the moon's path needs to walk, not stand. Today only standing. The crossing failed quietly.",
    ],
  },
  gemini: {
    pass: [
      'Two travellers at the night gate, both quick, both honest. The moon let both pass. Crossed in stereo.',
      'You spoke quick under the cool light; the moon does not usually allow speed but tonight it did. Through.',
      'Wit at the dream-edge — and the wit knew when to stop. Rare; pass.',
    ],
    fail: [
      'You talked through the dream. The dream is not a conversation; it is a crossing.',
      'Two voices at the night gate, both narrating. The moon does not narrate; it lights. The crossing was un-lit.',
      'Wit without crossing. You stood at the gate and described the gate. The traveller passed without you.',
    ],
  },
  cancer: {
    pass: [
      'Moon rules here. You came in with the tide and the tide was the path. Full pass; the crossing welcomed you.',
      'Tidal ear, tidal foot. The traveller and you walked the same shore. Through with full silver.',
      'You felt the dream before you entered it. The dream entered you instead. Rare; crossed.',
    ],
    fail: [
      'Moon rules; the rulership was wasted. You guarded the dream from yourself. The path stayed shut.',
      'The shell closed at the night gate. Even the moon could not lift it tonight. The crossing waited.',
      'You wanted the dream to be safe. The dream is the safety; you misread it. Denied gently.',
    ],
  },
  leo: {
    pass: [
      'King at the night gate, walking quietly. The moon allows the crowned-but-quiet. Crossed.',
      'You did not announce your dream; you carried it. The traveller respects that carry. Pass.',
      'Solar weight at the lunar gate is heavy; tonight the gate accepted the weight. Rare; through.',
    ],
    fail: [
      'Solar roar at the lunar gate. The moon does not amplify; it reflects. There was nothing to reflect.',
      'You wanted the dream to crown you. The dream is not the crown; it is the un-crowning. Denied warmly.',
      'Performance at the night sky. The stars do not applaud; they witness. They witnessed the performance only.',
    ],
  },
  virgo: {
    pass: [
      'You parsed the dream into its parts and the parts still cohered. The traveller respects that. Pass.',
      'Mercury at the night gate, slow tonight; the moon allowed the precision because it was patient. Through.',
      'You footnoted the path and the path did not break under the footnotes. Rare; crossed.',
    ],
    fail: [
      'You parsed the dream into nothing. The moon does not preserve dissected dreams.',
      "Precision at the dream's edge — sometimes useful, today wrong. You corrected the path off the path.",
      'Mercury at the night gate wants to record. The traveller wants to cross. You recorded; you did not cross.',
    ],
  },
  libra: {
    pass: [
      'Elegant at the night gate. You weighed the dream against the not-dream and chose the lighter. Pass.',
      'Both halves of the night were honoured; the crossing happened in the seam. Through with the scale still.',
      'The moon and the scale and the page agreed tonight. The traveller smiled once. Crossed.',
    ],
    fail: [
      'You weighed the dream until the dream was a weighing. Dreams are not scales; they are crossings.',
      'Both possibilities held still. The moon does not wait for stillness; it moves. You stayed at the scale.',
      "Fairness at the dream's gate. The dream is not fair; it is true. You wanted the wrong thing.",
    ],
  },
  scorpio: {
    pass: [
      'Moon falls here. Yet you went under the dream and came back with it intact. Rare. Pass against the fall.',
      'The deep gaze met the cool light. You did not flinch from the un-lit phase. Crossed underground.',
      'Silent dreamer; the moon allows the silent crossing. The traveller honours what is not said.',
    ],
    fail: [
      "Moon's fall, and the fall took you. You held the dream as a secret; the traveller cannot share what you would not name.",
      'Suspicion at the night gate. The moon is not suspicious; it is just the moon. You looked for tricks where none lived.',
      'You watched the dream for the betrayal. There is no betrayal in dreams; only un-lit phases. You missed both.',
    ],
  },
  sagittarius: {
    pass: [
      'You aimed your dream at the larger sky and the larger sky received it. The traveller honours the wide-arc dream. Pass.',
      'Big arrow, lunar target — you lit the arc you flew along. Through with the moon following.',
      'You named what the dream is for, not just what it is. The traveller accepted the naming. Crossed.',
    ],
    fail: [
      'You aimed past the dream into philosophy. The moon cannot light philosophy; it lights paths.',
      'Big truth at the small night. The night was specific; your aim was vague. The crossing missed.',
      'Sagittarius at the lunar gate flew over the gate. The traveller waited at the missed crossing. Denied.',
    ],
  },
  capricorn: {
    pass: [
      'Moon detriment here. You climbed to the dream the slow way and the slow way held. Rare; pass.',
      'Cold mountain, cold moon. You did not ask for warmth; you walked. The traveller respects the climbed dream.',
      'Discipline of dreaming — rare gift. The moon allows the patient phase tonight. Through.',
    ],
    fail: [
      "Moon's detriment. You scheduled the dream; the dream does not arrive on schedule.",
      'Structure at the night gate. The structure was correct; the dream was elsewhere; you stood in your own scaffold.',
      "Patience without surrender at the moon's path. The traveller passed; you stayed at the trailhead, building.",
    ],
  },
  aquarius: {
    pass: [
      'You re-framed the dream and the new framing was the dream. Strange path, true crossing. Pass.',
      "Detached dreamer; you walked the moon's path while standing off it. The traveller allowed the heresy. Through.",
      'You named the system that holds the dreams and the naming carried you. Crossed sideways.',
    ],
    fail: [
      'Theory of dreaming is not dreaming. The moon does not light theory; it lights what is being walked.',
      'You disagreed with the premise of crossing. The premise is the encounter. You walked away from the gate, debating.',
      "Distance at the dream's edge. The dream is intimate work; distance is for after-light. You came at the wrong phase.",
    ],
  },
  pisces: {
    pass: [
      'Dream meeting dream. You did not walk; you appeared at the other side. The traveller accepts that mode. Pass.',
      'The tide carried the dream-walker. You did not need to step; you were stepped through. Crossed in water-light.',
      'Pisces at the lunar gate is the deepest welcome. The path opened wide; you crossed without crossing.',
    ],
    fail: [
      'You dissolved at the gate. The moon cannot light what has no edge to light.',
      'Tide without form is not crossing. You brought weather; the gate wanted a walker. The traveller waited.',
      'You loved the dream-state more than the dream-path. The moon understands; the verdict still came. Denied gently.',
    ],
  },
} as const;

// ──────────────── Matrix assembly ────────────────
//
// All 8 encounter avatars are now Egyptian-authored. The greco-roman
// fallback that PR 1 used as a stopgap is gone.

export const sefirahVerdicts: VerdictMatrix = {
  // Solar quartet (PR 1 of #553):
  chesed: ra,
  gevurah: horus,
  tiferet: osiris,
  netzach: hathor,
  // Contemplative cluster (PR 2 of #553):
  chokmah: amun,
  binah: isis,
  hod: thoth,
  yesod: khonsu,
};

// Re-export the matrix type so consumers reading this file directly
// (the smoke test below it, future authoring batches) find it here.
export type { VerdictMatrix } from '../types';
