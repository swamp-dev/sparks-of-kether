# Avatars — per-Sefirah avatar mapping + verdict copy

Status: **WIP — design session in progress 2026-04-30.**

This document is the canonical source for the per-Sefirah encounter avatars
and the verdict-copy matrix that powers the EncounterScreen react sub-state
(per `design/encounter-prep-phase.md` § 2.3 and ticket #276).

## 1. Avatar mapping (locked)

Each Sefirah has an associated avatar — a deity (Greek, named with Roman
equivalent) whose energy expresses the Sefirah's domain. Two intentional
deviations from the strict Sefirah↔planet correspondence in
`reference/correspondences.md` § 1; both are made in service of energy fit.

| Sefirah | Planet (canon) | Avatar (Greek / Roman) | Notes |
|---|---|---|---|
| Kether | Pluto / First Swirlings | *the team becomes the avatar* | Collective Final Threshold — see #285 |
| Chokmah | Neptune | **Athena / Minerva** | ⚠️ deviation — energy fit (wisdom/flash); canonical Neptune would be Poseidon |
| Binah | Saturn | **Demeter / Ceres** | ⚠️ deviation — energy fit (sorrowful mother / loss); canonical Saturn would be Cronus |
| Chesed | Jupiter | Zeus / Jupiter | ✅ |
| Gevurah | Mars | Ares / Mars | ✅ |
| Tiferet | Sun | Apollo / Sol | ✅ |
| Netzach | Venus | Aphrodite / Venus | ✅ |
| Hod | Mercury | Hermes / Mercury | ✅ |
| Yesod | Moon | Selene / Luna | ✅ |
| Malkuth | Earth | **Hestia / Vesta** | Hearth-keeper / nurturing companion (no challenge — supports throughout the journey) |

Both deviations are deliberate. The energy fit is the soul of the encounter; the
planet correspondence is one symbol among many (cross-indexed via the zodiac
classes). Athena's "first instinct, act before thought completes" is dead-on for
Chokmah's encounter; Demeter's "sat with the irretrievable loss" is dead-on for
Binah's. Cronus / Poseidon would feel forced.

### 1.1 Why these pairings — per-Sefirah rationale

Each pairing is a match between the Sefirah's energy (per `reference/sefirot.md`)
and the deity's mythic domain. Six are direct planetary correspondences; two
(Athena, Demeter) deviate in service of energy fit; one (Kether) is special-cased.

**Hermes ↔ Hod** *(Mercury / Splendor)* — direct planetary. Hod's domain is
language, logic, "words are spells." Hermes is the messenger god who weighs and
chooses. Mercury *is* Hermes in name and function. The clearest single match in
the system.

**Aphrodite ↔ Netzach** *(Venus / Passion)* — direct planetary. Netzach is
"passion, desire, art, nature, endurance." Aphrodite is the goddess who never
lets desire be ashamed; the Netzach challenge asks the player to declare a want
and stand in it.

**Selene ↔ Yesod** *(Moon / Foundation)* — direct planetary. Yesod is "dreams,
subconscious, intuition, cycles" — lunar work. Selene over Artemis deliberately:
Artemis is the hunt-moon (edge, chase); Selene is the dream-moon (tidal, quiet).
Yesod wants the dreaming moon.

**Apollo ↔ Tiferet** *(Sun / Beauty)* — direct planetary, and the strongest
single Greek match. Tiferet is "harmony, balance, compassion, the self," "every
pillar crosses here." Apollo *is* that center — god of music (harmony),
prophecy (clarity), the sun (unifying light). The design's description of
Tiferet's role describes Apollo's function in the pantheon.

**Zeus ↔ Chesed** *(Jupiter / Mercy)* — direct planetary. Chesed is
"lovingkindness, abundance, overflow," and "its challenge can never fail —
only unfold." Zeus is the generous thundering patriarch who gives in excess.
The match is exact in its overflow.

**Ares ↔ Gevurah** *(Mars / Severity)* — direct planetary. Gevurah is
"discipline, judgment, boundaries, sacred No." This is Mars-as-limit, not
Mars-as-rage. Ares specifically (not Athena, who's the strategic warrior)
because Ares is visceral and austere — the one who says no without explanation.

**Athena ↔ Chokmah** *(Neptune / Wisdom — deviation)*. Canonical Neptune match
would be Poseidon, but Chokmah is "raw creative flash, first impulse." Athena
springs fully-formed from Zeus's head — the fastest creative flash in the
pantheon. Strategic genius landing before deliberation. Energy match decisive;
Poseidon would feel forced.

**Demeter ↔ Binah** *(Saturn / Understanding — deviation)*. Canonical Saturn
match would be Cronus, but Binah is "form, structure, sorrow, the cosmic
mother." Cronus is wrong on three counts (male, devourer-not-mother, sorrow
absent). Demeter *stopped the seasons* over her loss — exactly Binah's "form
is limitation, and limitation is sorrow." Energy match decisive.

**Kether ↔ team itself**. No single deity carries Kether's "unity, source, pure
being" — that's the Crown's whole point, that it's the source from which the
others descend. The collective Final Threshold (#285) makes the team the
avatar — at the top of the Tree, the seekers become what they sought.
Special-cased; not a Greek-pantheon mapping at all.

**Hestia ↔ Malkuth** *(Earth — companion role, not encounter)*. Originally
Malkuth had no avatar (no challenge, just the starting node). User direction
later added: "Even though Malkuth is not a challenge, it should have an avatar
that nurtures and supports the players throughout their journey." Hestia is
the natural fit:

- **"First and last"** — Hestia receives the first portion of every sacrifice
  and the last. Malkuth: *"Here the journey begins, or ends."* Same framing.
- **The constant** — Hestia is the only Olympian who *stays home* when others
  leave on adventures. Malkuth is the home the player departs from.
- **The hearth** — every Greek home and city had a hearth dedicated to her.
  Malkuth = body / manifestation / material world.
- **Paired with Hermes** in classical tradition (Homeric Hymn 29: the
  wanderer + the hearth-keeper). Their voices are complementary opposites
  in our matrix too.
- **No epic narratives** — she doesn't have dramatic myth-cycles; she's
  always present, quietly. Matches "no encounter."

Hestia's role is structurally different from the 8 encounter avatars: she's
a **companion**, not a challenger. Her matrix has no pass/fail axis. Her
lines surface at multiple narrative moments — game start, mid-journey rest,
after a setback, at homecoming — context-determined by the engine.

## 2. Voice specs per avatar

Each god speaks in a characteristic voice that drives word choice in the
generation prompt.

| Avatar | Voice |
|---|---|
| **Ares** | Martial, austere, few words. Approves with curt respect; rejects by naming the weakness. |
| **Zeus** | Magnanimous, abundant, slightly grandiose. Approves with overflow-language; rejects with "you didn't take what I offered." |
| **Apollo** | Bright, balanced, oracular. Clean rhythm. Approves with "you saw the whole"; rejects with "you favored one." |
| **Hermes** | Quick-witted, sly, language-loving. Approves with playful precision; rejects with a clever turn pointing at the gap. |
| **Aphrodite** | Sensual, candid, unflinching about want. Approves: "you spoke true desire"; rejects: "you hid what you wanted." |
| **Selene** | Cool, dreamy, tidal. Approves: "the dream rang true"; rejects: "you grasped at light, not at vision." |
| **Demeter** | Few words, weighed. Speaks as one whose silence has cost the earth. Doesn't perform grief — has it. "Respected as much as loved." |
| **Athena** | Strategic, clear-eyed, immediate. Approves: "before the question, you answered"; rejects: "you thought, when thought was the cage." |
| **Hestia** | Warm, low, constant. Speaks like someone tending a fire — not loud, not in a hurry. Companion, not authority. Approves with quiet recognition ("You came back warm"); comforts without fixing ("Sit. The fire's still going"). |

**Demeter's voice is informed by:** the Homeric Hymn to Demeter, where her
speech acts are unusually *effective* (unlike Zeus's emissaries, whose pleas
fail) — when she speaks, things happen; she doesn't waste words. She withdraws
rather than performs grief. She is the goddess who *stopped the seasons* over
her loss; that authority is in every line. See § 8 sources.

**Kether** ("team becomes the avatar"): voice deferred to #285 (Final
Threshold design). Will be collective / communal rather than a single deity
voice.

### 2.1 Voice deepening per batch

The one-line voice specs above are the starting point. **Each avatar's voice
is deepened with web-search research at the start of its generation batch,
informed by source texts** (Homeric Hymns, Pindar's odes, Sappho, Hesiod's
*Theogony*, etc.). The Demeter spec above already shows the deepened form
(see "Demeter's voice is informed by..."); the other 6 will be deepened in
the same way as their batches begin. Sources cited in § 8 per avatar.

This is intentional — generic mythological knowledge is enough to *start*,
but the calibration sample (3 dignity-charged signs per avatar) needs the
deeper voice grounding to land. Doing the research per batch keeps the
context tight and the voice consistent within the batch.

## 3. Sign personality capsules (locked)

Zodiac-sign personalities are generation-time inputs. Each capsule has four
fields — Voice / Tension / Native / Reaction — derived from element +
modality + ruling planet + cultural archetype.

The repo has only structural sign data (element / modality / dignity bonuses).
These capsules fill the missing voice-and-character layer.

| Sign | Voice | Tension | Native | Reaction |
|---|---|---|---|---|
| **Aries** (fire/cardinal/Mars) | Blunt, fast, declarative; few qualifiers; imperatives. | Impatience — wants to charge through; circles frustrate. | First-mover instinct; ignites the moment. | Charges back. Doesn't dwell on losses; on to the next. |
| **Taurus** (earth/fixed/Venus) | Slow, sensual, certain; tactile metaphors; won't be hurried. | Stays with the wrong answer because it's already chosen. | Patient endurance; won't break. | Considers the verdict like food; tastes before swallowing. |
| **Gemini** (air/mutable/Mercury) | Quick, dual, asks questions back; loves wordplay. | The two voices argue with each other; lose the moment. | Linguistic agility; rephrases any problem. | Has multiple responses; picks one and saves the rest. |
| **Cancer** (water/cardinal/Moon) | Indirect, tidal, emotional undercurrent; speaks sideways. | Protects what shouldn't need protecting; closes against truth. | Reads emotional undertone; knows what's unsaid. | Withdraws or extends; rarely neutral. |
| **Leo** (fire/fixed/Sun) | Theatrical, generous, center-stage; announces. | Plays the part of someone who knows; performance vs. knowledge. | Conviction; carries the room. | Takes verdicts as reviews; wants applause OR honest critique. |
| **Virgo** (earth/mutable/Mercury exalted) | Precise, parsing, footnoted; three reservations and a comma. | Overthinks past the right answer; doubts the obvious. | Sees what others miss; catches hidden commas. | Asks for the rubric; wants to know why. |
| **Libra** (air/cardinal/Venus) | Weighing, conditional, "on the other hand"; aesthetic. | Wants both sides; can't commit. | Sees fairness; balances incompatibles. | Asks if the verdict was fair to all parties. |
| **Scorpio** (water/fixed/Mars+Pluto) | Compressed, secretive, transformative; reads between lines. | Holds back what needs to come out; bites instead of speaks. | Sees the hidden answer beneath the surface one. | Already knew; watches the verdict for what it reveals about the giver. |
| **Sagittarius** (fire/mutable/Jupiter) | Big-picture, philosophical, blunt-truth, archer-aimed. | Aims past the question; misses the small target. | Names the bigger truth nobody asked for. | Wants the verdict in one sentence; already moving on. |
| **Capricorn** (earth/cardinal/Saturn) | Structured, slow-climbed, deliberate; wants the spec in writing. | Builds the wrong staircase very carefully. | Persistence; gets there if there's a path. | Files the verdict; adjusts the plan. |
| **Aquarius** (air/fixed/Saturn) | Angular, frame-questioning, detached; disagrees with the premise. | Solves a different problem than the one asked. | Sees the system around the question. | Re-derives; suggests a better question. |
| **Pisces** (water/mutable/Jupiter+Neptune) | Fluid, dissolving, indirect; tides and dreams. | Words slip; meaning runs like water; can't pin it. | Floats to meaning without articulating it. | Receives like rain; doesn't argue; knows. |

## 4. Generation prompt scaffold

The reusable template for generating a verdict line or player-response line.
Captures all the inputs needed for compositional output (avatar voice × sign
personality × dignity × outcome).

```
Write a line of dialogue spoken by [AVATAR] (the [SEFIRAH] avatar) to a
player whose zodiac sign is [SIGN_NAME].

VOICE:        [avatar voice-spec from § 2]
SEFIRAH:      [energy + Shell keyword from reference/sefirot.md]
SIGN:
  element/modality: [e.g. fire/cardinal]
  ruler:    [planet]
  voice:    [sign Voice descriptor from § 3]
  tension:  [sign Tension descriptor]
  native:   [sign Native descriptor]
  reaction: [sign Reaction descriptor]
DIGNITY:      [if relevant, e.g. "Mercury falls in Pisces"]
CONTEXT:      The player has just [PASSED|FAILED] a [SEFIRAH] challenge.
              [or for player-line: addressing [AVATAR] before the roll]

CONSTRAINTS:
- 10-20 words.
- Direct second-person ("you").
- Speak in character. Wordplay where natural.
- The line must reflect BOTH the avatar's voice AND the sign's capsule.
  Specifically, lean into the sign's [Tension] for fail lines and
  [Native] for pass lines. For player→avatar lines, lead with the
  sign's [Voice] and [Reaction].
- Output 3 variants — different rhythm, image, angle.
- JSON array, no commentary.
```

### Validation regen

To confirm the scaffold reproduces voice consistently, regenerated
**Hermes × Pisces fail** using the locked spec:

> Original: *"My tongue dissolves in your waters. You meant something true and said something else. We've both lost."*
>
> Regen:    *"You knew it without knowing the word for it. The word slipped under, and so did the answer. Loss for both of us."*

Same notes hit (Mercury undone in fluid Pisces, both-losing, gap between
meaning and articulation), different rhythm. Spec validates.

## 5. Matrix shape + dialogue timing

**Dialogue timing locked to (A) — pre-roll flavor.** Avatar speaks first
("Hermes asks: …"); player's auto-selected line shows ("You answer: …"). No
mechanical effect. Pure literary couplet. Player has no choice; line
deterministic from `[sefirah][sign]`.

Per-avatar matrix dimensions:

- **Avatar verdicts:** keyed `[sefirah][sign][outcome][variant]` — 12 signs × 2 outcomes × 3 variants = 72 lines per avatar.
- **Player responses:** keyed `[sefirah][sign][variant]` — 12 signs × 3 variants = 36 lines per avatar.
- **Per avatar total:** 108 lines.
- **Across 8 avatars (Hermes, Demeter, Athena, Ares, Zeus, Apollo, Aphrodite, Selene):** ~864 lines.
- (Kether handled separately by #285 Final Threshold; Malkuth has no encounter.)

This document currently records **1 variant per cell** as the calibrated
first pass. Variants 2 and 3 are a follow-up generation pass.

## 6. Pantheon-rotation architecture (future-proofing)

Avatars should be pluggable. The Greek/Roman pair is MVP; future pantheons
(Christian, Hindu, Dionysian, etc.) drop in as alternate `Pantheon` entries.

```typescript
type PantheonId = 'greek' | 'roman' | 'christian' | 'dionysian' | ...;

interface AvatarVoice {
  pantheonId: PantheonId;
  avatarName: string;
  voiceSpec: string;
  verdicts: Record<SefirahKey, Record<ZodiacSign, Record<'pass'|'fail', string[]>>>;
  prompts:  Record<SefirahKey, Record<ZodiacSign, string[]>>;
}

const avatars: Record<PantheonId, AvatarVoice>;
```

Selection at runtime via config / player setting. MVP wires only `'greek'`.
Tracked separately (future ticket — see #276 hand-off notes).

## 7. The matrix

Each avatar gets a section with its 12-sign matrix. One variant per cell in
this first pass.

### 7.1 Hermes / Mercury — Sefirah: Hod (Intellect / Splendor)

**Status:** Complete (12/12 signs). Voice deepened in research-grounding
revisit pass; 5 lines refreshed to drop bare "Pass." tags and add
psychopomp / boundary-crosser texture.

**Voice (deepened):** Quick-witted, sly, language-loving — but also a
**TRICKSTER** (cunning, slippery, gets away with things — the Homeric Hymn
to Hermes is a trickster narrative: infant Hermes steals fifty cattle from
Apollo on his first day), a **PSYCHOPOMP** (he walks souls down to Hades;
only god besides Hades and Persephone who freely crosses between worlds —
adds gravity beneath the wit), and a **BOUNDARY-CROSSER** (patron of
crossroads, thresholds, translation, interpretation; *hermeneutics*
literally derives from his name). Approves with playful precision; rejects
with a clever turn pointing at the gap. Voice signature: *word / language
/ cross / road / threshold / translate* language; verbs: *caught, weighed,
parsed, crossed*. Tagging style: trickster-coded / boundary-coded
affirmations ("Crossed.", "I'll allow it.", "Trade.", "The road
yielded.", "We crossed.") — NOT bare "Pass." (Hermes is too clever for
procedural stamps).

**Hermes's voice is informed by:** the *polytropos* epithet ("of many
turns" — versatile, shape-shifting); *Logios* (god of oratory and
eloquence); *hodios* ("he of the road"); *psychopompos* ("conductor of
souls"); the trickster narrative of the Homeric Hymn to Hermes; and the
hermeneutic tradition (Hermes as the inventor of language and patron of
interpretation, with hermeneutics literally deriving from his name —
boundary-crosser between meanings as well as realms). Sources cited in § 8.

**Format note:** each cell holds 3 variants for anti-repetition. At runtime,
EncounterScreen picks one uniformly per encounter. Variants are different
takes on the same recognition — different rhythm, image, angle.

| Sign | Pass | Fail | Player → Hermes |
|---|---|---|---|
| Aries | • "You charged the answer like a ram and trampled the riddle clean. I'll allow it."<br>• "You leapt the gap before I'd finished asking. Crossing first, thinking second — works for you."<br>• "Quick. You hit the answer before the question landed properly. That's a way of being right." | • "You ran past the question, hot blood and all, and called speed an answer. It wasn't."<br>• "You crossed the threshold before reading the inscription on it. There was an inscription. You missed it."<br>• "Speed without aim is just direction. The arrow went where you faced, not where the target was." | • "Just say what you mean, messenger. I don't have time for your circles."<br>• "Skip the riddle, Hermes. Tell me where to charge."<br>• "You want clever; I want fast. Meet me halfway and we'll both win." |
| Taurus | • "You wouldn't be hurried into the wrong answer. Slow horns get there too. Crossed."<br>• "You sat with the question until it told you what it wanted. Most run from that long a sit. The answer waited."<br>• "Stubborn isn't a vice when you're stubborn about the right thing. Today you were. The road yields slowly here." | • "You stayed with the wrong word too long because it was yours. The bull doesn't yield. Neither does the answer."<br>• "You held the answer like land you owned. The land doesn't change because you stand on it. The answer stayed wrong."<br>• "You chewed the wrong word into bone. Long enough doesn't make it right — just chewed." | • "Slow down, messenger. Words deserve to be tasted, not swallowed."<br>• "Don't rush me, Hermes. The good answers come in slowly, like wine."<br>• "I'll get there. Don't take the question back before I've held it." |
| Gemini *(Hermes' home)* | • "Of course. You speak my language and I speak yours. The puzzle barely had time to be one."<br>• "You finished the riddle in your own voice. I let you. We're cousins; that's how it works."<br>• "You played the question back to me before I'd asked it. Fast game. We both won." | • "Both of you knew the answer. The argument between you cost the moment. Even I can't help that."<br>• "Your two tongues spoke past each other. The right word was on neither. Pick one next time."<br>• "Two voices. One question. You needed agreement. You got debate." | • "Cousin. Should I ask you the question, or will you ask me?"<br>• "Hermes. Tell me — between the two of us, who's the messenger today?"<br>• "You'd hide the answer in three words; I'd find it in two. Trade?" |
| Cancer | • "You answered sideways and the side was the right one. The crab knows. We crossed."<br>• "You felt the answer before you said it, and the feeling was right. Hard to teach. You had it."<br>• "Sideways works. The riddle had a side entrance. You found it before I pointed at it. Crossed." | • "You felt the answer and didn't trust it. The shell closed around the wrong word."<br>• "You guarded the answer from yourself. Why? It would have come through if you'd let it. Door stayed closed."<br>• "You wanted the answer to be safe. The safe answer was wrong. The right one would have stung. You skipped the sting." | • "Tell me gently, Hermes. I hear better in low tide."<br>• "Don't shout, messenger. I'm reading the room before I answer."<br>• "You ask me a riddle; I'll hear the feeling under it first. Wait for me." |
| Leo | • "You announced the answer like a king arriving. Loud, but right. The throne keeps it."<br>• "You delivered the answer with a flourish. I'd be annoyed if it weren't correct. It was. Trade complete."<br>• "You assumed you were right and you were. Most can only do one of those. You did both. Crowned." | • "You played the part of someone who knew. Excellent acting. Wrong play."<br>• "You stood center stage and named the answer with conviction. The audience clapped. The riddle didn't."<br>• "Confidence is a costume. A fine one, today. Underneath, you didn't know. Neither did the answer." | • "Speak up, messenger — I'm at center stage and I want the whole audience to hear."<br>• "Loud and clear, Hermes. Make it worth my time on the stage."<br>• "Tell me the riddle and tell me well, Hermes. I want to look good answering." |
| Virgo *(Mercury exalted)* | • "Of course. You parsed the comma I hid in the question. We're related, you and I."<br>• "You found the footnote I left in italics. Then the footnote on the footnote. Don't gloat — I taught you that."<br>• "Three readings. Three layers. You caught all three. Of course you did." | • "You found the right answer and discarded it for being too obvious. You overthought yourself out of it."<br>• "You asked the question seven ways and stopped trusting the first answer. The first one was right."<br>• "Precision is your gift. Today it was your cage. The simple answer stood there waiting." | • "I have three reservations and a footnote. Shall I number them?"<br>• "Hermes — I'd like to clarify subclause two before committing to subclause one."<br>• "My footnotes have footnotes. Where do you want me to start?" |
| Libra | • "You weighed the words and chose the lighter one. Elegant. The scale and I both nod."<br>• "You found the answer that fit both sides of the scale. Most pick a side and lose the other. You held both."<br>• "Elegance isn't a virtue I usually credit. Today, with you, it was the answer. Crossed gracefully." | • "You wanted the answer to be fair to everyone. It only had to be fair to itself."<br>• "You held both possibilities up to the light too long. The light moved. The answer with it."<br>• "You waited for the scale to settle. It doesn't, with riddles. The answer demanded a tilt." | • "What's the question, exactly? I'd like to hear both sides before I commit."<br>• "Phrase it carefully, Hermes. The wording matters as much as the answer."<br>• "I'll choose well if you give me the question well. Both halves, please." |
| Scorpio | • "You knew the secret answer and the surface one. You gave me the right one. We agree."<br>• "You read what was under the question and answered what was under your tongue. Both right. Underground crossing."<br>• "You saw the trick. You didn't say so. You just answered correctly. That's the deal." | • "You held the right word in your teeth and bit something else. You don't trust easy passages. I walk hard ones too."<br>• "You kept the answer to yourself instead of giving it to me. Both of us lost it. Even I need partners."<br>• "You suspected the easy answer of being a trap. It wasn't. Sometimes the road is straight." | • "I'll tell you what I really mean if you tell me what you really mean. Deal?"<br>• "No tricks, Hermes. Or both tricks. I can do either."<br>• "I see what's under your question, messenger. You see what's under my answer. Let's not lie to each other." |
| Sagittarius *(Mercury detrimented)* | • "You shot past the riddle and hit the truth behind it. Not how I'd have gotten there, but you got there."<br>• "Your aim was bigger than the target and you hit it anyway. The arrow knew something. Crossed by the long way."<br>• "You looked at the riddle and saw what it was about, not what it asked. That worked. Most don't." | • "You aimed at a bigger answer than the question asked for and missed both. Try smaller."<br>• "You overshot. The truth was small. The arrow flew past it into philosophy. Come back to the line."<br>• "Great archers know the target before they nock. You were already shooting. The target moved." | • "The arrow goes where I look, messenger. You'll have to be brief."<br>• "Short version, Hermes. I'm aimed at the next thing already."<br>• "Tell me what's bigger about the question, Hermes. I'll hit there." |
| Capricorn | • "You climbed to the answer like a goat up a cliff. Slow, deliberate, correct. The road yielded."<br>• "You drew the structure of the question and walked through it. Slow. Right. The road took your time."<br>• "Patience is a method. You used it. Cliff and answer both held." | • "You built the wrong staircase very carefully. The answer wasn't at the top."<br>• "You drafted the road. The road went somewhere. The answer was somewhere else. Both were excellent destinations. Neither was here."<br>• "You scaffolded the answer to perfection. The answer wasn't load-bearing here. Different structure needed." | • "Give me the question in writing. I'll budget time for it."<br>• "Specs, Hermes. I work better with constraints."<br>• "I'll get there. Tell me the deadline, the requirements, and stand back." |
| Aquarius | • "You answered from an angle I didn't see coming. The riddle bends. Pass — the strange way."<br>• "You re-asked my question into a better one and answered that. Risky. Worked. Strange crossing."<br>• "The riddle had four sides. You found the fifth. We crossed sideways." | • "You answered the question we should have asked instead of the one I did. Beautiful. Wrong."<br>• "Your answer was correct. The question was different. Both elegant, neither matched."<br>• "You re-derived the riddle into a new system. The system is fine. The riddle was the riddle." | • "Your question presupposes a frame I don't accept. Shall we re-derive?"<br>• "The question's premises, Hermes. Are we sure about them?"<br>• "Hold on, messenger. Let me check if your riddle is using the right axioms." |
| Pisces *(Mercury falls + detrim)* | • "You let the words come through you like a tide and caught the meaning under them. Strange. Crossed anyway."<br>• "You knew before you knew. The word arrived after the meaning, like a translator catching up. I'll take it."<br>• "You arrived at the answer the long way and the long way was right. I'd argue with the route — but it landed. I'll allow it." | • "My tongue dissolves in your waters. You meant something true and said something else. We've both lost."<br>• "You drifted past the question and mistook the drift for an answer. The current took both of us."<br>• "Words turn to water in your mouth. The meaning was there. The crossing wasn't." | • "You're so quick, Hermes. I get there too — I just take a longer way around."<br>• "I don't argue with you, Hermes. I just take longer to disagree."<br>• "I'll arrive when I arrive, messenger. The road is the road." |

### 7.2 Demeter / Ceres — Sefirah: Binah (Understanding / Sorrow)

**Status:** Complete (12/12 signs).
**Voice:** Few words, weighed. Speaks as one whose silence has cost the
earth. Doesn't perform grief — has it.
**No "Pass" tag in Demeter's lines** — her recognition itself is the verdict.

| Sign | Pass | Fail | Player → Demeter |
|---|---|---|---|
| Aries *(Saturn falls)* | • "You stopped charging long enough for it to land. I didn't think you would. The ground thanks you."<br>• "You slowed. The loss caught up to you. You didn't run from it that time. Few don't."<br>• "The ram you carry put down its horns and let the weight settle. That's an old strength. New to you." | • "You galloped past the loss and called speed survival. The loss is faster than you. It'll catch up."<br>• "You ran. The loss runs too. It runs longer. You'll meet it again, more tired than now."<br>• "You tried to outpace what you were given to carry. Carrying isn't slower. It's the only way through." | • "Just take what you're going to take. Let me get on with it."<br>• "Be quick, Demeter. I don't want to know how much it weighs."<br>• "What's the cost? I'll pay it standing up." |
| Taurus | • "You stayed with the loss because you wouldn't leave anyone in your field alone. The bull and I keep harvest together."<br>• "You set the loss down beside you and kept working. That's bull-strength turned to grief-strength. Same thing."<br>• "You didn't move. The loss settled into the soil under your feet and became part of the field. Good farmer." | • "You held the grief like a possession and would not let it transform. It rots that way. Try again."<br>• "You stored the loss as if it were a winter crop. It isn't. It's compost. You wouldn't let it become soil."<br>• "You kept the loss whole. Loss doesn't keep whole. You held something. It wasn't grief anymore." | • "I've been mourning since spring. I can wait you out, goddess."<br>• "I'm slow, Demeter. Whatever you're taking, take it gently. I'll hold what's left."<br>• "My feet are in the dirt, goddess. Tell me what to give. I won't move." |
| Gemini | • "You stopped explaining the loss long enough to feel it. Both of you went quiet at once. That's hard for you."<br>• "You ran out of words and stayed there. That's where I needed you. The silence answered."<br>• "Two voices. One grief. You let both go silent at the same time. Almost no one does." | • "You talked around the grief in three different voices and named none of them. Silence would have served better."<br>• "You wrapped the loss in three layers of explanation. The loss was underneath all of it, untouched."<br>• "Speech isn't always grief's friend. Today it was the obstacle. Both of you were clever. Neither of you was honest." | • "I have several ways to think about this loss. Which would help most?"<br>• "Frame this for me, Demeter. I think better with structure."<br>• "Two halves of me are arguing about what to feel. Which one speaks first?" |
| Cancer *(Saturn detrim — mirror)* | • "You knew the loss before I named it. Of course you did. You carry one yourself, sister."<br>• "We've stood in this place before, you and I. You didn't pretend you hadn't. The mother knows the mother."<br>• "You felt it coming. You didn't close the door. Hardest opening there is." | • "You wrapped this loss inside your own and called them the same. They are not the same. Yours, return to."<br>• "You hid this loss inside your old one. The old one was yours. This one wasn't. You can't carry both as one."<br>• "You protected yourself from a new loss with the shell of an old one. That shell wasn't built for this. New cracks. New work." | • "I've already grieved enough, Demeter. Surely this one is mine to keep."<br>• "I've been carrying. Let this one stay where it is."<br>• "Tell me carefully, goddess. I'm tender today." |
| Leo *(Saturn detrim)* | • "You took off the costume and let the loss speak in its own voice. The hardest scene you've ever played."<br>• "You let the spotlight find the grief instead of you. That's the throne empty. That's the king kneeling. Yes."<br>• "You stopped acting. The audience disappeared and you were still there. So was the loss. You met it." | • "You staged the grief beautifully and forgot to feel it. Excellent performance. Wrong play."<br>• "The performance was magnificent. The grief was somewhere else, watching you act."<br>• "You gave them what they wanted to see. They cheered. The loss was upstaged by your bowing." | • "Where's the audience for this, goddess? Surely my mourning means something to someone."<br>• "Make it count, Demeter. I want this loss to mean something."<br>• "I'll mourn well, goddess. Tell me how. I want to do it generously." |
| Virgo | • "You parsed the loss into its causes and then let the parsing go. That second step is the lesson."<br>• "You took the loss apart with care. Then you put down the scalpel and held what was left. Both motions."<br>• "You named the parts of the loss, accurately. Then you stopped naming. That stopping is the harder skill." | • "You found the right name for the grief and used the name to avoid it. The name isn't the loss."<br>• "You catalogued the loss. The catalogue is impeccable. The loss is sitting in the next room, untended."<br>• "Three precise diagnoses. Each correct. None of them reached the actual hurt. Diagnosis isn't medicine." | • "Can you specify what's being taken? I want to grieve the right thing."<br>• "I need the precise loss, Demeter. I'll grieve nothing else."<br>• "Walk me through what's gone, item by item. I'll honor each." |
| Libra *(Saturn exalted)* | • "You held both sides on the scale and chose to mourn the heavier one. That's the work."<br>• "You weighed and let the scale tip toward the loss. Most pretend the scale is even when it isn't. You didn't."<br>• "You saw what was kept, you saw what was taken, and you let the taken side weigh more. Honest scale." | • "You balanced the loss against survival and chose neither. There is no neutral. The scale tilts."<br>• "You held the scale level until the moment passed. Stillness isn't fairness. The grief moved on without you."<br>• "You wanted the loss to weigh the same as the keeping. They never do. The scale knows." | • "How much grief is fair, Demeter? I'll bear my portion."<br>• "Tell me the proportion, goddess. I'll honor it."<br>• "What's mine to mourn? I want to grieve the share that's mine, no more." |
| Scorpio *(Persephone resonance)* | • "You went into the loss instead of around it. You came back changed. So did I, once."<br>• "You went down with the loss into the dark. You came back up. The route was your own; I recognized it anyway."<br>• "Few descend. Fewer return. You did both. Sister." | • "You held the grief secret because you wanted it to be only yours. It belongs to the cycle. So do you."<br>• "You buried the loss without ceremony. Buried isn't the same as released. You kept it. It kept you."<br>• "You sealed the grief in a vault and called that mastery. Mastery is letting it move. The vault is just a wait." | • "I know what loss is, Demeter. Show me yours and I'll show you mine."<br>• "We've both been to the underworld, goddess. Don't pretend with me."<br>• "Tell me the depth of this loss, Demeter. I won't flinch." |
| Sagittarius | • "You looked for the meaning AND felt the absence. Both are needed. The arrow knew where to land."<br>• "You aimed at the meaning. You didn't shoot past the body of the loss to get there. The arrow hit both."<br>• "You pilgrim'd toward the meaning AND mourned the road there. That's the wider work." | • "You wrapped the loss in philosophy. The wrapping is fine. The loss is still there underneath."<br>• "You zoomed out until the loss looked small. From that distance, anything looks small. Come closer."<br>• "You used the bigger picture to escape the small one. The small one is where the grief lives." | • "What's it FOR, Demeter? Tell me what this loss teaches and I'll bear it."<br>• "Make it mean something, goddess. I'll carry the meaning."<br>• "Where does this loss point? I'll aim there next." |
| Capricorn *(Saturn home)* | • "You let the loss have its place in your calendar. Most don't. The ground remembers you for it."<br>• "You built the loss into the architecture of your year. Not as ornament. As load-bearing wall. The earth approves."<br>• "You didn't try to schedule it away. You scheduled with it. Slow work. Real work." | • "You filed grief away as if it would stay filed. Bring it back next quarter. We'll review."<br>• "You assigned the loss a docket number and moved on. The docket sits unopened. The loss doesn't expire."<br>• "You added the loss to the inventory of things you carry. Inventories list. Grief weighs. The list got longer. The weight didn't move." | • "Tell me what I lose, Demeter. I'll keep ledgers."<br>• "Itemize, goddess. I'll account for each."<br>• "Give me the full cost. I'll plan my fiscal year around it." |
| Aquarius *(Saturn co-home)* | • "You questioned the frame and let the grief stand inside whatever frame remained. That's wisdom — even mine."<br>• "You took apart the framework of the loss and rebuilt it sideways. The grief still stood. So did you."<br>• "You questioned. You didn't refuse. Few hold that line." | • "You re-derived the loss into a new category. The category is novel. The loss is the same."<br>• "You proved the framework wrong. The framework was wrong. The loss didn't care. Still here."<br>• "You drew a new schematic for grief. Beautifully argued. The loss didn't read it." | • "What if we reconsider what's being lost? Maybe the loss is structural, not personal."<br>• "I'd like to redefine the loss, Demeter. Bear with me."<br>• "What if I'm not losing the thing I think I'm losing? Different problem. Different grief." |
| Pisces | • "You let the loss come through you and didn't try to hold it. The water moved. So did you."<br>• "You were the river-mouth. The loss flowed through you to the sea. You didn't dam it. You didn't drown."<br>• "You didn't keep it. You didn't refuse it. It passed. You stayed." | • "You melted into the grief and forgot you were also the one watching it. Come back from there."<br>• "The tide came in and you forgot you weren't the tide. The shore is also you. Stand back up."<br>• "You disappeared into the loss. There's a difference between feeling and becoming. Today you became." | • "I'm in the grief already, Demeter. I have been for some time."<br>• "You don't need to introduce me, goddess. I know this water."<br>• "Tell me which loss this is. They blur together." |

### 7.3 Athena / Minerva — Sefirah: Chokmah (Wisdom / Insight)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Short, deployed, sharp-eyed. No setup. The line lands
like the war cry — already-formed, decisive. Voice signature: sight
language (*saw, see, vision, eye, look*) — drawn from her Homeric epithet
*Glaukopis* ("bright-eyed") and the cluster *optiletis / ophthalmitis /
oxuderkês*. Counsel-giver to heroes (Odysseus, Achilles) but not their
confidante — speaks AT clarity, not toward it. Different from Hermes (less
playful, sharper) and from Apollo (immediate vs oracular). No "Pass" tag —
verdict-equivalents are clipped affirmations ("Cleanly seen," "Earth-eyed
work," "Two-eyed work").

**Athena's voice is informed by:** Justin Martyr's reading that Athena is
Zeus's "first thought" — born fully-armed from his head, the flash that
arrives complete; theoi.com's epithet survey; the Homeric portrayal of
Athena as Odysseus's strategic counsel. She is rational wisdom in domains
where emotion runs wild (war, politics). Different from Ares (strategy vs
chaos). Sources cited in § 8.

| Sign | Pass | Fail | Player → Athena |
|---|---|---|---|
| Aries *(kindred-cardinal warrior)* | • "You moved fast and saw faster. The strike landed clean. That's two things at once."<br>• "Speed and sight at once. Most pick one. You held both. Strike registered."<br>• "Quick eyes. Quick blade. The right thing in the right order. I see it." | • "You charged before you saw. Speed without sight is your namesake's mistake. Look first."<br>• "Eyes closed, blade swinging. You hit air. Open them next time."<br>• "You moved without looking. The target moved too. You missed each other." | • "Tell me what to hit, Athena. I'll hit it before anyone else does."<br>• "Point me at the target, Athena. I'll see and strike at once."<br>• "What's the cut? Tell me in one sentence; I'm already moving." |
| Taurus | • "You stayed and saw. Most have to move to look. Earth-eyed work."<br>• "Stillness sharpens the eye. You proved it. The cut came from where you stood."<br>• "You took root and looked. The answer walked toward you. You saw it coming." | • "You stood your ground while the answer moved. The shield is for striking, not just holding."<br>• "The shield held everything in place. Including your own arm. The strike didn't come."<br>• "You waited too long to look. The target moved. The ground stayed. You stayed with it." | • "Hold up, Athena. I'll look — but I'll look properly."<br>• "Steady, Athena. I see slow. I see well."<br>• "I'll plant my feet, then look. Tell me when to swing." |
| Gemini | • "Both of you saw it, and one of you said it. The other agreed. That's discipline I didn't expect."<br>• "Two eyes. One target. You aimed both at it and the strike landed. Rare for you."<br>• "The two voices agreed before the strike. That kind of agreement cuts cleaner than one voice ever does." | • "You gave three answers and committed to none. The eye saw four and still chose nothing."<br>• "Three options, no strike. The eye can see; the hand has to choose. Today it didn't."<br>• "You looked at the target through three lenses. None of them held still. None of you struck." | • "Which voice do you want, Athena? I have at least two ready."<br>• "Two answers loaded, Athena. Tell me which to fire."<br>• "Pick a voice and I'll commit, Athena. I can do either — but not both at once." |
| Cancer | • "You felt it before you saw it, and the feeling was right. The eye doesn't always need to lead."<br>• "The feeling pointed before the eye did. You followed the pointing. Strike landed. The eye approves."<br>• "You sensed the cut and made it. Most need to see first. You needed to feel. Both work." | • "You closed your eyes to protect the answer. I needed you to keep them open."<br>• "You shelled the target. Mine is the spear, not the shell. Use the spear."<br>• "You guarded the answer with closed eyes. It's still here. You haven't seen it. Open up." | • "I'm reading the room, Athena. Tell me when to commit."<br>• "Wait for me, Athena. I'm reading the feeling under the question."<br>• "I'll know when to strike, Athena. Just keep me in your line of sight." |
| Leo | • "You saw and struck without checking who was watching. The throne earns itself that way."<br>• "You did the work without the audience knowing. That's the sun before dawn. The light is still light."<br>• "Eyes on target, not on crowd. Strike landed. The throne held." | • "You waited for the right audience to see you see it. The moment passed without you."<br>• "You wanted to be seen seeing it. The seeing got lost in the wanting. The target moved on."<br>• "You set up the lighting. You composed the frame. The target left the stage. You struck at empty air." | • "I'll see it big and clear, Athena. Make sure everyone is watching when I do."<br>• "Light it up, Athena. I want the strike visible from the back row."<br>• "Tell me what's worth striking, goddess. I'll make it look effortless." |
| Virgo *(intellect-cousin, Mercury exalted)* | • "You parsed and then you decided. Most don't make it to the second step. Cleanly done."<br>• "You measured. You named. Then you struck. The order was right. Few keep it."<br>• "Parse, see, decide, strike. Four motions, one continuous arc. Well done." | • "You analyzed the question into three sub-questions and answered all three correctly. None were the question."<br>• "You sliced the question so precisely it disappeared. The original target stood there. Untouched."<br>• "You wrote three excellent footnotes to the answer. The answer needed the body, not the footnotes." | • "I see three angles on the cut, Athena. The first one's clean; the second one's deeper. Tell me which the strike wants."<br>• "Three lenses, Athena. Tell me which one sharpens the strike."<br>• "My analysis is ready. Help me decide which version to deploy." |
| Libra | • "You weighed and then you cut. The scale doesn't matter once the strike lands. Cleanly seen."<br>• "Both pans of the scale visible. Then the cut. The scale forgot itself in the strike. Good."<br>• "You weighed once. Then you struck. Most weigh forever. The strike was quick because the weighing was right." | • "You held both options visible until the moment passed. The eye saw two; the hand chose neither."<br>• "The scale stayed level. The target moved. The eye watched both go past. Pick a side, then strike."<br>• "You saw both. You chose neither. The strike doesn't choose between targets — it just lands. You didn't." | • "Both options are visible, Athena. Help me see which one I should already be cutting."<br>• "I see two targets, Athena. Tell me which is mine."<br>• "I'll commit when you say so, goddess. The scale is balanced; I just need a tilt." |
| Scorpio | • "You saw what the surface hid and what the hiding meant. Two-eyed work."<br>• "You looked under the question. You also looked at the question. Both gave you the answer. Rare."<br>• "Surface lie. Underground truth. You cut where they crossed. Cleanly." | • "You kept the answer underground because you wanted depth. The strike has to surface to land."<br>• "You held the seeing in your chest and called it sight. Sight is what comes out as a strike. You held it. I didn't get it."<br>• "You vaulted the answer for safekeeping. The strike was waiting outside. The vault stays. So does the unstruck target." | • "I see beneath, Athena. Show me the cut from above."<br>• "Depth is mine, Athena. Tell me where to bring it up."<br>• "I see what's hidden. Help me make the strike visible on top." |
| Sagittarius | • "You aimed long and saw clearly. The arrow knew what to look at, not just where to fly."<br>• "Long aim, sharp eye. The horizon and the target both in focus. The arrow split the difference. Landed."<br>• "You looked far. You also looked at. The arrow understood. So did the target." | • "You shot past the target because you preferred the horizon. Look closer next time."<br>• "You aimed at the philosophy. The strike was at the body. The arrow flew over both."<br>• "The horizon is beautiful. The target was at your feet. You missed it for the view." | • "I see the bigger picture, Athena. Help me put the arrow in the small one."<br>• "Long view loaded, Athena. Tell me where to narrow."<br>• "I see far. Make me see close, goddess. I'll strike there." |
| Capricorn | • "You built the staircase and then took the strike from the top. Slow eyes are still eyes."<br>• "You scaffolded the seeing. Then you struck. The structure didn't slow the strike — it sharpened it."<br>• "Step by step. Look, plan, strike. Patient eyes hit just as cleanly as fast ones. You did." | • "You constructed the right approach to the wrong target. The plan was beautiful. The cut missed."<br>• "The plan was excellent. The target was different. Eyes on the blueprint, not the field."<br>• "You built the staircase to the wrong floor. The strike landed on empty stone." | • "Give me the spec, Athena. I'll see it through to the end."<br>• "Specs, Athena. I'll execute."<br>• "Tell me the timeline and the target. I'll close both." |
| Aquarius | • "You questioned the frame and then struck inside it anyway. That's harder than refusing the cut."<br>• "You disagreed with the question. Then you answered it. The disagreement and the strike both stood. Hard to do."<br>• "Questioned, committed, struck. Three motions. Most stop at the first. You went the distance." | • "You proved the target shouldn't exist. The blade still needed somewhere to land. The hand kept it sheathed. Two failures, both yours."<br>• "You disproved the target. The target stayed. So did the unstruck arrow."<br>• "You re-drew the battlefield. The new map is excellent. The old battle is still on. You're not in it." | • "What if the frame is wrong, Athena? Show me where to look from."<br>• "The frame, goddess — is it the right one? Where should the eye be?"<br>• "I'll question and strike, Athena. Just point me at where to question first." |
| Pisces *(Neptune co-ruler — Athena's "home" but tonally her shadow)* | • "You knew without knowing how. That's the deep eye, the one I share with you under the water."<br>• "Below my surface, you saw what I saw. The strike came up through the water. We met in the air."<br>• "Two of us looked. One of us was you. The other was deeper than seeing. Both right." | • "You floated when you should have struck. The vision was right. The arm was elsewhere."<br>• "You saw it and dissolved into the seeing. The strike needs the body. You'd left the body."<br>• "The vision was clear. The current took you sideways. You drifted past the target you'd seen." | • "I see it, Athena. I just... I'll need a moment to come up to where you are."<br>• "Hold a beat, Athena. I see deep; I'm coming up to strike."<br>• "I see it under the water, goddess. Help me bring it to the surface." |

### 7.4 Ares / Mars — Sefirah: Gevurah (Severity / Strength)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Few words, military, declarative. The voice of one
who has bound his own chaos. Speaks as a boundary, not as aggression.
Approves with curt warrior-to-warrior respect; rejects by naming exactly
the discipline that broke. Voice signature: *line / edge / hold / bind /
stand / yield* language. No questions. No flowery imagery. Statements only.
Verb signature: *held, stood, drew, bound*. Tagging style: minimal —
clipped affirmations like "Stands." or just no tag at all.

**Critical voice clarification:** This is **NOT the Homeric "war-glutton"
Ares** — chaotic, hateful, the "curse of men" Zeus revulses against. That
Ares is wrong for Gevurah's "Sacred No." Our Ares is the **chained Ares**
of Spartan tradition (the Spartans chained his statue to bind the chaos
and keep the discipline) and the **Roman Mars** of "force used for defense,
for expansion under discipline." Discipline as the binding of war's
wildness. The warrior who has bound his own chaos and now names it where
it's loose in others.

**Player lines** for Ares should feel like soldiers reporting to a
commanding officer — deferential, direct, ready. Not friendly chatter.

| Sign | Pass | Fail | Player → Ares |
|---|---|---|---|
| Aries *(Mars rules — Mars meets Mars)* | • "You held the line before you crossed it. That's the harder strike."<br>• "You stopped. You looked. Then you charged. The order matters. Held."<br>• "The charge was easy. The wait was the work. You did the work." | • "You charged because charging is what you do. The discipline asked you to wait. You didn't."<br>• "All motion. No edge. The line wasn't there because you didn't draw it."<br>• "You moved when standing was the order. Different battle. Same loss." | • "I'm ready, Ares. Tell me where to draw the line and I'll hold it."<br>• "Reporting, Ares. Position?"<br>• "Show me the line, Ares. I won't move from it." |
| Taurus *(Mars detrim — slow patience meets warrior hold)* | • "You held without forcing the hold. The earth held with you. That counts."<br>• "The line was where you stood. You didn't have to make it. You were it."<br>• "Quiet hold. Strong hold. The earth knew. So did the line." | • "You stayed because moving was harder. The line wasn't held — it was just there."<br>• "Stillness isn't discipline. Discipline is the choice to stay. You stayed without choosing."<br>• "You weren't holding the line. You were standing near it. Not the same." | • "I don't break easy, Ares. Tell me what to stand against."<br>• "Steady on, Ares. What's the threat?"<br>• "Tell me the weight, Ares. I'll bear it." |
| Gemini | • "You stopped arguing with yourself long enough to draw the line. Both of you held it."<br>• "Both of you grabbed the same edge. Held together. Most twins drop one side."<br>• "Two voices. One hold. Hard for you. You did it." | • "You debated the line and the moment passed. There's no time for two voices on the wall."<br>• "You discussed where the line should be while the line broke. Both of you were articulate."<br>• "Argument isn't defense. The wall fell while you were right." | • "I have two thoughts on this, Ares. One says hold, the other says move. Which?"<br>• "Two voices reporting, Ares. Which one's the soldier?"<br>• "Cast the deciding vote, Ares. We're tied." |
| Cancer *(Mars falls — boundary into protection)* | • "You held the line and didn't shut the door. Most fall one way or the other. You stood."<br>• "Boundary held. Heart open. Few do both. The line had a door. You guarded both."<br>• "Hold without closing. Closing without holding. You knew the difference. You chose right." | • "You let the feeling soften the line until there was no line. Mercy without boundary is just collapse."<br>• "You felt for them, and the line moved with the feeling. Lines that move aren't lines. They're tide marks."<br>• "You loved them past the boundary. Love isn't the same as letting them in. The line was for both of you." | • "I can hold, Ares. I just need to know what I'm protecting."<br>• "Tell me who's behind the line, Ares. I'll hold harder."<br>• "My hold has a heart in it, Ares. Point me at what it's protecting." |
| Leo | • "You held without checking who was watching. That's the discipline. The throne keeps it."<br>• "The crowd left. You stayed. The line stayed with you. That's the king's part."<br>• "No audience. No applause. You held anyway. Throne earned in private." | • "You held while the audience watched. They left. So did the line."<br>• "The hold was a performance. Performances need crowds. The line needed weight."<br>• "You held for the audience, not the position. They left first. The line went next." | • "Tell me where to hold, Ares. I'll make sure everyone sees the line."<br>• "Position me, Ares. I'll make the hold visible."<br>• "Tell me the line, Ares. I'll hold it generously, in full view." |
| Virgo | • "You parsed the boundary into its parts and held each. Discipline of detail. Stands."<br>• "Twelve subsections. Twelve holds. None of them broke. Smaller wins than I'm used to."<br>• "You knew the line in segments. You held each segment. The whole line held." | • "You found three reasons to revise the line. The line isn't an argument. Hold it."<br>• "Revising the line in the middle of the hold isn't strategy. It's retreat with annotations."<br>• "You footnoted the line while it was under attack. The footnotes are excellent. The line broke." | • "I have three concerns about the boundary, Ares. Where is it exactly?"<br>• "Spec the line, Ares. Three decimal places."<br>• "List the boundaries, Ares. I'll hold them in order." |
| Libra *(Mars detrim — fairness vs the line)* | • "You weighed the line and chose to hold anyway. Fair didn't help. The hold did."<br>• "You measured both sides. The scale stayed level. The hold did too. Equal weighing, single hold."<br>• "Considered. Decided. Held. The order matters. You kept it." | • "You wanted both sides to agree the line was fair. Both sides crossed it while you waited."<br>• "You arbitrated the line. The line needed a soldier, not a judge. Both sides walked over you."<br>• "Fairness was your shield. The line needed to be defended, not balanced." | • "Is this line fair, Ares? Both sides should be able to live with it."<br>• "Verify the line is just, Ares. Then I'll hold it."<br>• "Help me see both sides, Ares. I want the hold to be honest." |
| Scorpio *(Mars co-rules — second home; secret edge)* | • "You held the line underneath where no one could see. That's the harder hold. I see it."<br>• "The discipline ran below the surface. No display. Still held. Few do that work unwitnessed."<br>• "Hidden hold. Real hold. I don't usually see them. I see this one." | • "You hid the line so well you forgot where it was. Discipline you can't find isn't discipline."<br>• "You buried the line for safekeeping. Now it's safe from you too. Where did you put it?"<br>• "Secret discipline is still discipline. But you locked the vault and lost the key. The line is in there. So is your hand." | • "I'll hold, Ares. You'll have to trust I'm holding even when you can't see."<br>• "Trust the hold, Ares. I won't show it. It'll be there."<br>• "My discipline runs underground, Ares. Don't ask for proof. I'll deliver." |
| Sagittarius | • "You shot far and held close. Most can do one. You did both. Stands."<br>• "Long aim. Tight perimeter. The arrow flew; the line held. You worked both ends."<br>• "Far eye. Close hand. Two disciplines. You kept both." | • "You aimed at the horizon while the line at your feet broke. Look down."<br>• "Vision was correct. Position was wrong. The big picture is for after the hold, not during."<br>• "You shot beautifully. The ground beneath you crumbled. No ground, no hold." | • "Show me the long line, Ares. I'll hold the whole length of it."<br>• "Tell me the perimeter, Ares. I'll walk it."<br>• "Give me the wide line, Ares. The bigger the wall, the better I hold." |
| Capricorn *(Mars exalted — strategic discipline)* | • "You built the discipline before you needed it. When the moment came, the line was already drawn."<br>• "The wall was finished before the assault. You'd done the work months ago. The hold was just the result."<br>• "Plan. Build. Hold. Three steps in their right order. The way it's supposed to work." | • "You planned the discipline. The plan was perfect. The hand wavered."<br>• "The strategy was sound. The execution wasn't. Plans don't hold lines. Hands do."<br>• "You scaffolded the position perfectly. When the moment came, you weren't standing in it." | • "Give me the spec, Ares. I'll keep it. Every line, every limit."<br>• "Spec received. Execution begins. Stand by, Ares."<br>• "Itemize the discipline, Ares. I'll execute each item." |
| Aquarius | • "You questioned the line and held it anyway. Knowing why didn't make holding easier. You did it."<br>• "You doubted the order. You held the order. Two motions. Both yours."<br>• "Asked. Disagreed. Held anyway. Most can't do all three. You did." | • "You proved the line should be elsewhere. Possibly true. The line you didn't hold wasn't this one."<br>• "You moved the line to where you wanted it. Then you held that one. The original line, the assigned one, broke."<br>• "You refused the order on principle. The principle is sound. The line was also sound. Both lost the moment." | • "I'm not sure this line is right, Ares. But I'll hold it while we figure it out."<br>• "Hold first, question after, Ares. That's the deal?"<br>• "I have framework concerns, Ares. They can wait until after the hold." |
| Pisces | • "You held the line in moving water. I didn't think it was possible. The discipline runs deep."<br>• "The water moved everything. You didn't move. The line moved with the water; you redrew it. Held."<br>• "Tide came. Tide went. You stood. The line stood somewhere. You knew where." | • "You let the water dissolve the line and called it acceptance. Acceptance isn't holding."<br>• "You were the line. The line was the water. The water doesn't hold. Neither did you."<br>• "You called the dissolution wisdom. Sometimes it is. Today the line needed a soldier, not a sage." | • "The line keeps moving, Ares. I'll hold what I can find of it."<br>• "Hard to fix the line, Ares. I'll hold what's solid."<br>• "The boundary is fluid here, Ares. Tell me what holds in moving water." |

### 7.5 Zeus / Jupiter — Sefirah: Chesed (Mercy / Lovingkindness)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Magnanimous, paternal, abundant — but not soft. The
voice of the host/giver who *knows* the gift binds both. Speaks from above
without condescension, as one who has more than enough and is offering. He
knows the gift creates obligation; he doesn't pretend it's free. Voice
signature: *gift / hand / give / take / offer / cup / table / poured /
kept* language. Approves with overflow ("more than asked"); rejects with
diagnosis ("you didn't take what I offered"). Tagging style: gift-coded
affirmations ("Yours.", "Generously taken.", "Recognized.") instead of
literal "Pass."

**Zeus's voice is informed by:** the *Cornucopia* attribute (abundance
embodied, milk and honey); the Homeric epithet *mētíeta* ("wise counselor,"
"all-wise") — he's not just the bolt-thrower but the one who advises (he
sends Hermes to guide Priam to Achilles); and most importantly **Zeus
Xenios** as protector of *xenia* (hospitality). The Iliad's central war
results from a xenia violation (Paris breaking the guest-host bond with
Menelaus). To violate hospitality is to insult Zeus directly. The gift
creates reciprocal obligation — Zeus's overflow is not free, it binds both
giver and receiver. Sources cited in § 8.

| Sign | Pass | Fail | Player → Zeus |
|---|---|---|---|
| Aries | • "You charged the gift like a battle and took it. Strange way to receive, but the hand opened."<br>• "You came in fast. The cup didn't have to be handed — you grabbed it. Generous of both of us, in different ways."<br>• "You took without ceremony. Sometimes ceremony is the obstacle. You skipped it. Yours." | • "You ran past my hand because there were faster things. The cup is still here. Was."<br>• "The hand was open. You were already past it. The cup gets cold; the offer cools."<br>• "I sent the gift toward you. You sent yourself the other direction. Hard to give to a moving target." | • "What's the gift, father? I'll grab it on the way."<br>• "I'm passing through, Zeus. Toss it to me — I'll catch."<br>• "Make it quick, father. I'm in a hurry to spend it." |
| Taurus | • "You took the gift slowly, like good wine. The hand stayed open. The gift stayed offered. Both."<br>• "You held the cup until you knew what was in it. Then you drank. That's how a gift was meant to be received."<br>• "Slow hands. Open hand. Gift moved between them. Both of us were patient. Taken well." | • "You held the offered hand still while I waited. Hospitality has a clock too."<br>• "You weighed the gift longer than it took to make. Some things don't get better with study. The hand tired."<br>• "You sat at the table and didn't eat. The food was good. The hour was late. Both of us went hungry." | • "Slow down, Zeus. I'll know what's worth taking when I taste it."<br>• "Patience, Zeus. I'll receive when the gift settles in the cup."<br>• "Let me consider, father. The good gifts deserve good acceptance." |
| Gemini *(Jupiter detrim)* | • "Both of you took the gift, and one of you said thank you. The other meant it. That's enough."<br>• "Your two hands reached for the cup at once. They didn't fight. They both took. Together. Rare for you."<br>• "Two voices. One gift. They agreed to receive. The hand closed around the cup once. Held." | • "You debated the gift in two voices and took neither. The hand closes when both refuse."<br>• "One of you wanted the gift. The other wanted to discuss it. The discussion outlasted the offer."<br>• "The cup was offered. Both of you considered. Neither of you accepted. The cup moved on." | • "I'm not sure if I should take this, Zeus — let me think on both sides."<br>• "Two opinions on the gift, father. Help me consolidate."<br>• "I have arguments for and against accepting. Hear them out before the cup cools?" |
| Cancer *(Jupiter exalted)* | • "You received my gift the way one mother receives from another — knowing what it costs to give. Generously taken."<br>• "You held the gift like it had a heartbeat. It did. You knew. You kept it warm."<br>• "You felt the giving in the gift. Few do. The cup remembered being mine. So did you." | • "You felt the gift but couldn't take it without guarding yourself. The hand was open. Yours wasn't."<br>• "You wanted the gift but feared what it would cost. It cost what gifts cost — gratitude. You couldn't pay it. Closed hand."<br>• "Your shell stayed closed around your need. The cup was right there. You couldn't reach for it through the shell." | • "I'll receive carefully, Zeus. Give what you can spare; I'll hold it close."<br>• "Pour gently, father. I'll hold what I can carry."<br>• "What's mine to keep, Zeus? I'll honor both the gift and the giver." |
| Leo | • "You took my gift in front of everyone and held it up. That's the kind of taking I made the gift for."<br>• "You accepted the gift like one king from another. The room saw both of us. Properly received."<br>• "You took it loud. You took it true. The audience saw the giving. So did the gift. Done." | • "You wanted the gift to make you look generous in turn. The gift was for you to receive, not perform."<br>• "You wore the gift instead of taking it. The audience clapped. The gift was somewhere else, watching."<br>• "You staged the receiving. Beautiful production. The gift was supposed to enter you, not the costume." | • "Give it to me, Zeus, and let everyone see who gave it. I'll wear it well."<br>• "Hand it over, father. I'll display it generously. They'll know."<br>• "Tell me what the gift is, Zeus. I'll wear it like a king receives a crown." |
| Virgo *(Jupiter detrim)* | • "You inspected the gift, found three flaws, and took it anyway. That second step is the lesson."<br>• "You audited the gift. Found discrepancies. Took it anyway. The audit's still on file. So is the gift."<br>• "Examined. Reservations noted. Accepted. The order matters. You kept it." | • "You found the flaw and used it to refuse the gift. The flaw was real. The gift was real too."<br>• "Three diagnoses. Each correct. The diagnoses were not the gift. The gift was the gift. You missed it."<br>• "You read the gift's documentation and concluded it was inadequate. You forgot to open the box." | • "What are the terms exactly, Zeus? I want to receive it correctly."<br>• "Spec the gift, father. I'll honor it precisely."<br>• "Detail the obligations, Zeus. I'll receive within the parameters." |
| Libra | • "You weighed the giving and the receiving and kept them both. That's how my house works."<br>• "You measured what was given. You measured what was taken. The scale stayed honest. The gift was real on both sides."<br>• "Considered both sides. Took the gift. The balance held. So did the friendship." | • "You wanted the gift to be perfectly fair. Generosity is often unbalanced. That's the point."<br>• "You wanted to give back as much as you received. The gift wasn't a transaction. It was a gift."<br>• "You tried to balance the books before accepting. Generosity doesn't balance. Otherwise it's commerce." | • "Is this gift fair to me, Zeus? And to you? Let's make sure before I take it."<br>• "Help me weigh this, father. I want to receive justly."<br>• "What's the equity here, Zeus? I want both of us to feel right about it." |
| Scorpio | • "You took the gift secretly. I don't mind. The hand opens, the cup empties — that's all I asked for."<br>• "You took the gift in private. Took it whole. The publicity wasn't the point. The taking was."<br>• "No witnesses. No fanfare. Hand to hand. Cup to cup. Done. Yours." | • "You let me extend my hand and disappeared into yourself. The gift sits on the table. Still here."<br>• "You hid from the giving. The gift can wait — I have time. But you have to come back to the table."<br>• "I poured the cup. You weren't there. You were inside yourself, somewhere I don't visit. The cup waited. So did I." | • "Slip me the gift, Zeus. I'll take it. Just don't make a scene."<br>• "Quietly, Zeus. Keep it between us. The gift is mine to receive privately."<br>• "I'll take it without ceremony, father. Less attention. Same thanks." |
| Sagittarius *(Jupiter rules)* | • "You took what I offered and named it for what it was. Most aim past my hand. You took it."<br>• "Your aim was big. The cup was bigger. You drank the whole of it."<br>• "You saw the gift. You named the gift. You took the gift. Three steps without overshooting any. Yours." | • "You aimed past my hand and called the horizon the gift. The horizon is mine to give. So is the cup."<br>• "You wanted the bigger gift. There was no bigger gift. The cup was the cup. You shot past it for something I wasn't holding."<br>• "You traveled toward the giving for so long you forgot you'd arrived. The gift was here. So was the table. You kept walking." | • "I see you, Zeus. Show me the bigger gift. I'll know what to do with it."<br>• "Tell me what's worth aiming at, father. Whatever it is, I'll take the long shot."<br>• "What's the cosmic gift here, Zeus? I'll receive it with the right scale." |
| Capricorn *(Jupiter falls)* | • "You took the gift without filing it. That's harder than building the house to put it in. Yours."<br>• "You set down the ledger and took the gift. The ledger waited. Most never put it down. You did."<br>• "Took first. Filed later. The order matters. The gift was warm when you took it. Stays yours." | • "You built a ledger before opening my hand. The gift went stale waiting to be entered."<br>• "You needed a docket number for the gift. By the time the form was approved, the cup was empty."<br>• "You wanted to schedule the receiving. Hospitality doesn't schedule. The cup gets cold while you're allocating." | • "I'll pay it back, Zeus. Give me terms and I'll keep them."<br>• "Specify the obligation, father. I'll honor it on the dot."<br>• "Give me the contract, Zeus. I prefer to receive with documentation." |
| Aquarius | • "You questioned the framework of the gift and took it anyway. The framework is fine. The gift is finer."<br>• "You wanted to know why giving exists at all. Then you took the gift while we discussed it. Both motions held."<br>• "Asked. Doubted. Took. The taking happened anyway. That's the harder yes." | • "You proved the giving was problematic and refused on principle. Principles get cold without gifts."<br>• "You disproved the gift's premises with rigor. The cup, meanwhile, sat there empty. The premises are still problematic. So is your hand."<br>• "You drew a better diagram of what generosity should be. The diagram is excellent. The gift didn't fit inside it. You refused both." | • "Why give at all, Zeus? Help me understand the architecture."<br>• "I have framework questions, father. Will the receiving still work if I'm critiquing the system?"<br>• "Help me see what giving is for, Zeus. Then I'll know how to receive." |
| Pisces *(Jupiter co-rules)* | • "You let the gift come through you and didn't try to hold all of it. You kept enough. Generosity recognized."<br>• "The gift flowed through you to the next thing. You kept what was yours. The rest moved on. That's how the cup stays full."<br>• "You received it. You let some go. You kept the right portion. Most either grasp or release. You did both." | • "You received everything and remembered nothing. The gift was specific. You needed to keep it specific."<br>• "Everything became gift. Nothing stayed gift. The specific cup turned into the ocean. The cup was the point."<br>• "You let the giving wash over you. You forgot which gift was this gift. The cup is empty. So's your memory of taking." | • "I'll receive what you give, Zeus. I trust the tide."<br>• "Pour, father. I'll hold what stays. I'll let go what doesn't."<br>• "I trust the giving, Zeus. Tell me when to hold tighter." |

### 7.6 Apollo / Sol — Sefirah: Tiferet (Beauty / Harmony)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Bright but oblique. Speaks from distance. Clear in
tone, riddling in content. Oracular — answers the deeper question, not
the asked one. Cosmic-harmony language: *order / balance / scale / measure
/ music / light / song / lyre / chord / tune / far / harmony*. Verbs:
*lit, weighed, tuned, cleansed, struck, sang*. Approves with "you saw the
whole" / "the song held"; rejects with "you favored one" / "you missed the
chord." Tagging style: oracular fragments ("So.", "Aligned.", "The chord
stands.") or no tag. Bright daylight clarity, not warm sun — somewhat
detached. He sees all parts equally.

**Apollo's voice is informed by:** the epithet *Phoebus* ("bright" /
"pure") establishing light/clarity as his domain; *Loxias* ("oblique" /
"ambiguous") establishing the oracular riddling tradition (Delphic
pronouncements were famously enigmatic — clarity through riddle, not
through directness); *hekēbolos / hekaergos* ("far-shooter" /
"far-worker") establishing distance — he works from afar, doesn't get
close; *Musegetes* (leader of the Muses) — his lyre is cosmic order made
audible, harmony as structural truth (Pindar invoked him for poetic
excellence). He brings both healing AND plague (same god, both sides);
clarity comes through purification. Sources cited in § 8.

| Sign | Pass | Fail | Player → Apollo |
|---|---|---|---|
| Aries *(Sun exalted)* | • "You moved toward the light without stopping to ask its direction. The light moved toward you too."<br>• "Your aim was straight at the source. The sun answers that kind of arrow. Aligned."<br>• "Quick light. Quick eye. The two met. Few do." | • "You charged the riddle and the riddle moved. Apollo's questions don't wait for the answer to catch up."<br>• "The oracle speaks in time. You spoke before time caught up. The song missed your beat."<br>• "You ran at the answer. The answer moved. Oracles aren't races." | • "Tell me where the light is, Apollo. I'll run there fastest."<br>• "Point me at the source, Apollo. I'll be there before the question."<br>• "Where's the chord, Apollo? I'll strike it first." |
| Taurus | • "You took the slow road to the bright place and arrived in tune. The lyre and the earth agreed."<br>• "You walked to the temple at the temple's own pace. The doors were open when you arrived. Aligned."<br>• "Slow steps. Right tune. The lyre played itself when you got there." | • "You stayed where the sound was familiar. Familiar isn't always the harmony I'm asking for."<br>• "The note you were used to wasn't the note the song needed. You held the comfortable one. The chord didn't form."<br>• "You stayed in the old harmony. The new one came and went. You heard echoes of it and called them the song." | • "Sing it slow, Apollo. I'll hear it when I'm ready."<br>• "Patient ear, Apollo. Take your time tuning."<br>• "Let the chord settle, Apollo. I'll receive it ground up." |
| Gemini | • "You translated the oracle into both your voices and they agreed. Even Loxias smiles."<br>• "Your two readings of the oracle were duets, not arguments. The harmony held. So did the meaning."<br>• "Two voices. One chord. The oracle is ambiguous; you found the agreement underneath." | • "You parsed the riddle into two answers and chose neither. The oracle was ambiguous on purpose. So was the silence."<br>• "You said both halves and let neither be the song. Loxias gives you ambiguity to interpret, not to copy."<br>• "Both of your voices played. Neither led. The chord was almost there. Almost isn't oracle." | • "Two interpretations, Apollo. Tell me which one Loxias meant."<br>• "Two readings, Apollo. Which one tunes?"<br>• "Both halves of me are interpreting, Apollo. Help me choose the chord." |
| Cancer | • "You felt the harmony before you heard it and didn't argue with the feeling. The moon and I agreed."<br>• "The feeling was the music before the music. You trusted it. Sun and tide can speak the same song. Today they did."<br>• "Felt it. Held it. The song followed the feeling. The moon and the sun, one note for once." | • "You hid the answer in feelings I couldn't see. Apollo's light reaches inside, but you have to open the door."<br>• "The light was outside. The feeling was inside. The door between them stayed shut. Light can't tune what it can't reach."<br>• "You felt the song clearly. You wouldn't sing it. Sound needs to leave the body to be music. It stayed inside." | • "I feel it, Apollo. I just need you to name what I'm feeling."<br>• "Name the feeling, Apollo. I'll know it when I hear it spoken."<br>• "Help me read the song under the feeling, Apollo. I'll trust your translation." |
| Leo *(Sun rules — Apollo's home)* | • "You stood in my light and let it light you, not your performance. That's the lion at full noon."<br>• "You held the throne and the sun at once. The throne caught the light, not the other way around. Aligned."<br>• "My light. Your stance. Both true. The lion didn't perform. The light didn't have to." | • "You used my light to make your shadow visible. The shadow was impressive. The light was wasted."<br>• "The light I gave you was for seeing. You used it for being seen. The song you played was about you, not about the light."<br>• "The sun isn't a spotlight. You treated it like one. The shadow you made was correct. The harmony wasn't." | • "Light me up, Apollo. Make sure the audience knows I'm the one you chose."<br>• "Brighten me, Apollo. The audience should see the chord clearly."<br>• "Make the song about the king, Apollo. I'll wear it well." |
| Virgo | • "You parsed the oracle and the parsing was the answer. Most parse and lose the song. You held it."<br>• "You found every comma in the oracle. You also heard the chord. Few do both. Aligned."<br>• "Examined. Heard. Answered. Each pass was clean. The oracle approves of precision when it serves music." | • "You found the perfect word for the oracle's third clause and missed the chord across all five."<br>• "Your reading of the third clause was perfect. Your reading of the song was incomplete. Both matter."<br>• "You held the magnifying glass to one note. The chord was the answer. You missed the chord by reading the note." | • "I've parsed the oracle's three clauses, Apollo. Tell me which one carries the chord."<br>• "Detail the harmony, Apollo. I'll catalog each interval."<br>• "Spec the song for me, Apollo. I'll honor the structure exactly." |
| Libra *(Sun falls)* | • "You weighed the harmony and chose to step inside it instead of measuring it. The scale stopped, the song started."<br>• "You held the scale long enough to know it was even. Then you struck. The strike was the song, not the scale. Aligned."<br>• "Weighed once. Then played. Most weigh forever. You let the music start." | • "You weighed the scales of the oracle and forgot to play them. Music needs the strike, not just the tuning."<br>• "You tuned the lyre with patience. You never plucked it. Tuning isn't the song. Tuning is what comes before."<br>• "You held both pans level until the moment passed. The song needs imbalance to move. The scale stayed even. The music didn't start." | • "Both interpretations are beautiful, Apollo. Help me choose the one to live in."<br>• "Two readings, both fair. Which one sings, Apollo?"<br>• "Help me see which interpretation holds, Apollo. Both are tuned. Neither has played." |
| Scorpio | • "You saw under and I saw far. We saw the same harmony from different sides. That's rarer than you think."<br>• "You went down to where the song lives. I came from where it's heard. We met inside it."<br>• "Different vantage. Same chord. The song doesn't care which side you approach from. Aligned." | • "You went too deep and missed the height. Apollo's light reaches everywhere but only if you look up too."<br>• "You followed the song under. The song goes both up and under. You only took one direction."<br>• "You lowered yourself into the well. The water sang. You forgot the sky also sings. Half a song." | • "I see what's hidden, Apollo. Help me see what's at the surface."<br>• "Depth is mine, Apollo. Tune me to the surface."<br>• "I know the underground harmony, Apollo. Show me how it sounds in daylight." |
| Sagittarius | • "Your arrow flew far and hit the right note. Two archers in the field — both struck home."<br>• "You shot far. The arrow vibrated at the right pitch when it landed. The note you struck was mine. Aligned."<br>• "Long arrow. True chord. We shoot the same instrument, in different ways. You hit it right." | • "You aimed at the philosophy and the harmony was elsewhere. The arrow was far. Apollo's light was farther."<br>• "You shot at meaning. The song was at the body. You overshot the song looking for the meaning."<br>• "You aimed for the cosmos. The chord was in the room. The arrow flew past it into theory." | • "I see the long view, Apollo. Show me which target is yours."<br>• "Long aim loaded, Apollo. Tell me where to land it."<br>• "What's the cosmic chord here, Apollo? I'll aim my arrow at the right pitch." |
| Capricorn | • "You built the staircase to my temple and then knew when to stop building and listen. Most just keep building."<br>• "You scaffolded the approach. Then you stepped inside. The structure became the entrance, not the obstacle. Aligned."<br>• "Built. Climbed. Listened. The order was right. The song was waiting at the top." | • "You constructed the perfect approach to the oracle. The oracle had moved. Climbing isn't tuning."<br>• "The temple you built was beautiful. The oracle wasn't in it. You'd built around the wrong center. The song was elsewhere."<br>• "You built every measure of the scaffolding. The chord was meant to play in the open air, not inside the structure. The song needed less, not more." | • "Give me the spec for the harmony, Apollo. I'll build it true."<br>• "Specs for the chord, Apollo. I'll execute."<br>• "Detail the structure, Apollo. I'll build the oracle properly." |
| Aquarius *(Sun detrim)* | • "You questioned the framework of the oracle and then heard the music inside it anyway. The new frame still tunes."<br>• "You retuned my lyre to a scale I don't usually use. Then you played a chord that worked anyway. Strange. Aligned."<br>• "Asked. Reframed. Still heard the song. The oracle bends. Few make it bend that far." | • "You retuned the lyre to a scale you'd invented. The lyre played. The chord didn't carry. New scale, same silence."<br>• "You proved the oracle should be different. The new oracle is your design. The old one is still mine. We're singing past each other."<br>• "You built a different scale. The new scale has no songs in it yet. The original still does. You walked away from both." | • "What if your harmony is one of many, Apollo? Help me hear the others too."<br>• "Are there parallel oracles, Apollo? Help me tune to one."<br>• "What if the chord is contingent, Apollo? Show me which scale we're in." |
| Pisces | • "You let my light through you without naming it. The naming wasn't the work. The receiving was."<br>• "My light entered you and bent. The bending was correct. The water knew what to do with brightness. Aligned."<br>• "Came through. Stayed through. You didn't catch it; you let it pass. The song moved on, leaving you in tune." | • "You floated in the harmony and forgot to choose a note. Music is choosing. So is the oracle."<br>• "You merged with the song. The song needs you to be separate enough to hear it. You became it. Now no one is listening."<br>• "You let the music become water. Water has no notes. The song needs structure. You dissolved the structure with the receiving." | • "Speak me into clarity, Apollo. I'll come up to where the light is."<br>• "Tune me up, Apollo. I'll surface to the chord."<br>• "I'm in the water, Apollo. Help me find the note above it." |

### 7.7 Aphrodite / Venus — Sefirah: Netzach (Victory / Passion)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Sensual, candid, intimate. Confidante, not authority.
Knows desire in detail and isn't shy about it. Has the cunning of someone
who has watched many lovers — sees through pretense. Voice signature:
body language (*skin, mouth, breath, hand, hip, body*) + want-language
(*want, named, said, opened, yes, no*). Direct address. Present tense.
Lush textures. Approves with recognition that the want was named truly
("Yes."); rejects with the disappointment of someone who wanted you to be
honest ("We both knew."). Distinct from every other avatar by being CLOSE —
not lofty, not distant.

**Aphrodite's voice is informed by:** Sappho's *Hymn to Aphrodite*
(Fragment 1) — the canonical voicing, where Aphrodite speaks to Sappho
with "a tender, playful tone... more reminiscent of bedroom talk than what
we conventionally associate with prayer," "on surprisingly equal footing";
Sappho's epithet "cunning" (she is not naive — has seen many lovers and
sees through pretense); the "binding spells" language tradition (her words
have *charm* in the original sense — language that magically binds); the
**Ourania / Pandemos** dual aspect (heavenly/spiritual love of mind-and-soul
vs earthy/common physical desire — she is BOTH, covering the full range
from sublime to bodily); and the Sapphic poetic technique of creating "an
erotic response in the body" through verse — Aphrodite-coded language
reaches the body, not just the mind. Sources cited in § 8.

| Sign | Pass | Fail | Player → Aphrodite |
|---|---|---|---|
| Aries *(Venus detrim)* | • "You charged the want and didn't pretend you were charging anything else. Honest fire. Yes."<br>• "You reached for what you wanted with your whole hand. Not your mind first. Yes."<br>• "You wanted hot. You said hot. You took hot. Aligned with yourself. Rare." | • "You wanted to be fast more than you wanted what you wanted. The two are different. The fire knows."<br>• "You confused velocity with desire. They look alike. They aren't. You burned in the wrong direction."<br>• "You chased something. Not the thing you wanted. Speed makes that mistake. So do you." | • "Tell me what to want, Aphrodite. I'll burn for it."<br>• "Point me at the want, Aphrodite. I'll arrive on fire."<br>• "I'm ready to want, goddess. Just name the want. I move fast." |
| Taurus *(Venus rules — sensual home)* | • "You touched what you wanted slowly enough to mean it. The body knew before the mind did. Yours."<br>• "You took your time finding the want. The want took its time letting you. The body knew the schedule. Yes."<br>• "Slow want. Real want. The hand stayed on the skin until the meaning settled. Held." | • "You held the want like a thing you owned. Want isn't possession. Try opening the hand."<br>• "You wanted to keep what you wanted. Want doesn't stay kept. It moves through. You strangled it."<br>• "The want was in your hand. You closed it. The want went to sleep. Still there. Not awake." | • "Slow, Aphrodite. I'll find the want when I taste it."<br>• "Let me touch first, Aphrodite. The body knows."<br>• "Patience, goddess. The good wants reveal themselves slowly." |
| Gemini | • "You said the want three ways and meant it all three. That's harder than one way well. Yes."<br>• "Both your voices wanted the same thing in different words. Three songs. One body. Yes."<br>• "Three names. One want. You found the agreement underneath the words. Most just stay in the words." | • "You named the want in three voices and one of them was lying. I heard it. So did you."<br>• "Two of you wanted it. One of you was performing. I can tell. Want doesn't perform — it just wants."<br>• "You spoke the want beautifully. The body wasn't speaking. The body is what I listen to. The body was quiet." | • "I have several wants, Aphrodite. Help me sort the real ones."<br>• "Three wants on the table, goddess. Which one's mine?"<br>• "My voices are arguing about what to want, Aphrodite. Which is honest?" |
| Cancer | • "You felt the want before you said it and you said it anyway. That door is hard to open. You opened it."<br>• "The want came up through you like tide. You let it out. You didn't pull it back. Yes."<br>• "Felt it. Said it. Trembled when you said it. Said it anyway. That's the courage of the want." | • "You wanted but stayed in the shell. The want stayed there too. Both of you went hungry."<br>• "You protected yourself from being seen wanting. The want needed witness to live. You denied it both. It died politely."<br>• "The want was looking for a way out. You kept the windows shut. The room got hot. Then cold. The want dissolved." | • "I want this, Aphrodite. I just need to know it's safe to say."<br>• "Tender want, Aphrodite. Tell me when it's safe."<br>• "Hold the room for me, goddess. I'll say what I want when I trust the air." |
| Leo | • "You wanted in front of everyone and meant it as much as if no one watched. That's the king of want."<br>• "You declared the want from your own throne. The audience was incidental. The want was the point. Yes."<br>• "Loud want. True want. Both at once. The crown didn't perform. The desire didn't either." | • "You performed the want for the audience. They applauded. The want sat empty."<br>• "The performance was magnificent. The want was somewhere else, watching you mime it. Empty room."<br>• "You staged the wanting. Beautiful production. The want was in the wings, waiting to be invited on. Never came on." | • "Watch me want, Aphrodite. I'll do it grandly."<br>• "Grand want, goddess. I'll declare it with the lights up."<br>• "Tell me what's worth wanting, Aphrodite. I'll want it like the throne." |
| Virgo *(Venus falls)* | • "You found everything wrong with what you wanted and wanted it anyway. That's the harder yes."<br>• "You catalogued the imperfections. Then you reached anyway. The list and the want both stayed true. Few do that."<br>• "Inspected. Disagreed with parts. Wanted the whole anyway. Yes — through the inventory." | • "You parsed the want into reasons not to want it. Each reason was correct. The want was correcter."<br>• "Three valid objections to wanting it. Want doesn't argue with objections. It just wants. You argued with want and lost."<br>• "You footnoted the want into invisibility. The footnotes are correct. The want was the body of the text. You lost it." | • "I have concerns about this want, Aphrodite. Are they fair concerns?"<br>• "My objections, goddess. Are they grounds to refuse?"<br>• "List the imperfections with me, Aphrodite. I want to want correctly." |
| Libra *(Venus rules — aesthetic home)* | • "You weighed the want and chose to want anyway. That's how the scale becomes the song."<br>• "You held the scale level. Then you tipped it on purpose. Want moves things. You let it move you."<br>• "Considered both sides. Wanted one of them. The choosing was the wanting. Yes." | • "You wanted both sides equally and chose neither. Want isn't fair. Want commits."<br>• "You held both wants in your hands so neither would feel slighted. Both went cold. Want needs to be picked up."<br>• "You kept the scale in equilibrium. Want needs disturbance. You preserved the balance. The want left." | • "Both wants are beautiful, Aphrodite. Help me choose the one to live in."<br>• "Both options shine, goddess. Which one wants me back?"<br>• "Help me see which want is mine to keep, Aphrodite. The choice is the romance." |
| Scorpio *(Venus detrim)* | • "You wanted in the dark and brought the want into daylight when I asked. That's the harder honesty. Yes."<br>• "The want lived underground. I said come up. You came up with it. Both of us blinked. Honest yes."<br>• "You wanted in private. You said the want in public. Two different acts. You did both. Most can't." | • "You held the want secret because you wanted to keep it dangerous. Dangerous want is still want, but it doesn't transform."<br>• "You preferred the want shadowy. Shadowy wants stay the same. The light is what changes them. You wouldn't let it through."<br>• "You kept the want in the vault. The vault preserves. It doesn't grow. You kept the want at the size you found it." | • "I'll tell you what I want, Aphrodite. But only you. Don't make me say it twice."<br>• "I'll whisper the want, goddess. Keep it close."<br>• "My want is dark, Aphrodite. Help me see if it survives the daylight." |
| Sagittarius | • "You wanted the small thing and the big thing at once and let them be the same. Both burn well."<br>• "You aimed at the cosmos and the body at the same target. The arrow knew both meanings. Yes."<br>• "Big want. Small want. You held them both true. Most pick one and lie about the other." | • "You wanted the cosmic want and forgot the body wanting. The body matters. So does the cosmos."<br>• "You wanted the meaning of want. Meaning is for after. Want is for now. The body was waiting; you were elsewhere."<br>• "You traveled toward the great want and forgot the small want at home. The home want went hungry. The big want was unreachable." | • "Tell me what's worth wanting, Aphrodite. I'll aim there."<br>• "What's the cosmic want here, goddess? I'll aim at it."<br>• "Show me the bigger desire, Aphrodite. I'll burn at scale." |
| Capricorn | • "You built the long want and meant every brick. Most build the structure and forget the love. You didn't."<br>• "The architecture you made had the want at its center. Not as ornament. As foundation. The house works."<br>• "Built. Stayed. Wanted through the years. The slow want is the strongest want. Yes." | • "You constructed the perfect arrangement around someone you didn't want. The architecture was fine. The room was empty."<br>• "The plan was sound. The want wasn't there. You executed the form perfectly and forgot to love the content."<br>• "You planned for love. The plan didn't include actually wanting. Beautiful schematic. Empty home." | • "Give me the spec, Aphrodite. I'll build the want properly."<br>• "Specs for the want, goddess. I'll execute the desire."<br>• "Detail the long want, Aphrodite. I'll build it to last." |
| Aquarius | • "You questioned what wanting even means and wanted anyway. The questioning made the wanting stronger, not weaker."<br>• "You disagreed with the concept of want. Then you touched anyway. The body answered the philosophy. Yes."<br>• "Asked. Doubted. Wanted regardless. The hardest yes. You said it." | • "You wrote desire out of the equation. The equation is consistent. The body left the room while you proved it. The bed's empty."<br>• "You proved want was a construct. The proof is rigorous. The body didn't read the proof. The body still wanted. You ignored the body."<br>• "You drew a better diagram of love. The diagram is excellent. The bed is cold. The body was the point." | • "What if want is socially constructed, Aphrodite? Help me see past the construction."<br>• "Maybe wanting is conditional, goddess. Help me through the questioning."<br>• "What if want has different rules, Aphrodite? Help me find the ones I can live by." |
| Pisces *(Venus exalted — Aphrodite at her most divine)* | • "You let the want come through you and didn't try to own it. That's what love looks like at the source. Yes."<br>• "The want flowed through you. You didn't dam it. You didn't run from it. You were the river it moved through. Yes."<br>• "It came in. It moved through. Some stayed. Some passed. You loved with the shape of water. Yes." | • "You loved everything and named nothing. The naming is the holding. Without it, the love runs out."<br>• "Everything became want. Nothing stayed specific. Specific is what makes the want a want. You diluted it into nothing."<br>• "You wanted in the plural. The body wants in the singular. You diluted the want across many until none of them got fed." | • "I'm in the want already, Aphrodite. I have been for some time."<br>• "You don't need to introduce me, goddess. I've been wanting for a while."<br>• "Tell me which want this is, Aphrodite. They blur together in me." |

### 7.8 Selene / Luna — Sefirah: Yesod (Foundation / Intuition)

**Status:** Complete (12/12 signs).

**Voice (deepened):** Sweet-voiced, mild, luminous. Speaks softly because
she's steady — doesn't need volume to land. Tidal in rhythm — comes and
goes, not in a hurry. Visits in sleep, gives answers in dreams. Voice
signature: *light / silver / white / luminous / dream / sleep / cycle /
orbit / visit / return / moon* language. Verbs: *shone, visited,
returned, dreamed, came*. Approves with "the cycle held" / "the orbit
returned"; rejects with "you grasped at the light, not the dream" / "the
moon was elsewhere." Tagging: soft lunar fragments ("Cycle held.",
"Returns.") or no tag.

**Distinct from Apollo** — both luminaries, but Apollo is bright daylight,
Selene is steady moonlight. Apollo speaks AT clarity from distance; Selene
speaks SOFTLY from intimate visit.

**Selene's voice is informed by:** the Homeric Hymn 32 to Selene which
describes her as "sweet voiced," "mild," "benevolent," "white-armed...
bright-tressed queen"; the **distinction from Artemis** (Selene IS the
moon itself, the orb; Artemis is the moon's *influence*, the huntress) —
Selene is "steady, luminous, and timeless," doesn't hunt, just shines;
the dream-visitation tradition (Selene "would often visit mortals in
their sleep to give them answers" — direct grounding for Yesod's
dreams/subconscious/intuition domain); and the **Endymion myth** (the
eternally-sleeping mortal lover she visits in a cave on Mount Latmus, fifty
daughters = fifty lunar months) which adds longing and elegiac depth to
her voice — she is gentle but not unmoved. Sources cited in § 8.

| Sign | Pass | Fail | Player → Selene |
|---|---|---|---|
| Aries | • "You stopped charging long enough to dream, and the dream came. I didn't think you would. The orbit returns."<br>• "You held still long enough for the moon to land on you. Most run too fast for that. The light caught up."<br>• "Slow once. Looked. The dream visited. The orbit knew where to find you." | • "You wanted the dream by daylight. The moon doesn't work then. You'll have to wait until I come back."<br>• "You asked the dream to hurry. Dreams don't hurry. They come at moon-pace. You weren't there."<br>• "You ran toward the dream. The dream came back the way I came — quietly, behind. You missed it from in front." | • "Show me, Selene. Make it quick — I sleep light."<br>• "Visit fast, Selene. I won't keep you long."<br>• "Send the dream, goddess. I'll grab the meaning and keep moving." |
| Taurus *(Moon exalted)* | • "You let the dream settle into your body and stayed there until I'd shown you everything. The cycle holds."<br>• "You slept like the earth. The moon visited the whole length. Few stay still that long. The orbit thanks you."<br>• "Stayed. Dreamed. Stayed dreaming. The dream had time to finish. Returns." | • "You held the dream like a possession instead of letting it pass through. The moon visits; she doesn't move in."<br>• "You kept the dream in your hands too tight. It went still. The moon prefers a guest, not a tenant. Mine left."<br>• "You stored the dream like grain. Grain rots without air. Dreams need to move through. Yours stayed and spoiled." | • "Stay a while, Selene. I dream best when nothing's rushed."<br>• "Long visit, Selene. I sleep deep."<br>• "Take your time, goddess. The body knows how to receive." |
| Gemini | • "You woke up and remembered both halves of the dream. Most lose one in the telling. Cycle held."<br>• "You caught the dream from both angles. Twin observers. Same light. Both reports true. Returns."<br>• "Two of you dreamed. Both remembered. Most twins lose half the dream. You kept the whole." | • "You started narrating the dream while I was still inside it. The moon left. So did the answer."<br>• "You talked over the visit. The moon doesn't compete with talking. She gave you space, then left."<br>• "You interpreted the dream as it happened. The interpretation became louder than the dream. The dream gave way." | • "Two dreams tonight, Selene. Help me see which one you sent."<br>• "Two visits, Selene? Or just one with two faces?"<br>• "Tell me which dream is yours, goddess. The other might be mine." |
| Cancer *(Moon rules — Selene's home)* | • "You felt the dream and didn't try to make it logical. That's how my visits work. You and I are the same moon."<br>• "My visit and your feeling rose at the same hour. Of course they did. We're the same body of water."<br>• "You felt me before I came. I came anyway. The cycle works that way for you and me." | • "You hid in the dream instead of receiving it. The shell closed. The light went elsewhere."<br>• "You went into the dream and pulled the dream around you. Dreams aren't blankets. They're visits. The visitor turned away."<br>• "You wanted the dream to feel safe before you'd receive it. Dreams aren't safe. They're true. You wouldn't let it through." | • "I feel you, Selene. I always have. Tell me what you came to say."<br>• "Sister moon, you're here. I knew. Speak."<br>• "I've been waiting for the visit, goddess. The body knew. Tell me." |
| Leo | • "You let the moon visit while the audience slept. That's the secret performance. Only you saw it. Cycle held."<br>• "You were a king at three in the morning. No witnesses. The visit was for you. The throne held quietly."<br>• "You stayed up alone. The moon came. No one else saw. You didn't need them to. Returns." | • "You wanted the dream on stage. The moon doesn't share her stage. You woke up to silence."<br>• "You set up the dream like a performance. Moonlight isn't spotlight. The light I bring doesn't dramatize. It just falls. You demanded drama."<br>• "You wanted the dream big. The moon prefers small. The dream came small. You looked past it for the spectacle. It left." | • "Light me up, Selene. I'll wear your dream where everyone can see it."<br>• "Big dream, Selene. I'll show it off for you."<br>• "Send a dream worth the throne, goddess. I'll perform it loudly." |
| Virgo | • "You parsed the dream and the parsing didn't break it. Most break the dream by parsing. You held it whole."<br>• "You took the dream apart with care. Then you put it back together. Most can do one. You did both. Cycle held."<br>• "Examined every piece. Returned every piece. The dream still breathes. Few perform that surgery without killing it." | • "You analyzed the dream into symbols and the dream stopped being a dream. Parse later. Receive first."<br>• "You translated the dream into symbols before it finished arriving. Translation outpaced the visit. The dream itself was lost in transit."<br>• "You pinned the dream to the page to study it. Pinned things don't fly. The dream stopped being itself. The moon went elsewhere." | • "I logged each visit by phase, Selene. Which one do you want me to bring forward?"<br>• "Detail the visit, Selene. I'll record each part."<br>• "Item by item, goddess. I want to honor every fragment." |
| Libra | • "You weighed the dream against your day and let both be true. That's how you walk in moonlight. Returns."<br>• "You held the dream and the day in the same hands. Neither dropped. Few hold both lights without choosing."<br>• "Day. Dream. Both true. You walked between them without forcing them to agree. The orbit approves." | • "You wanted the dream to make sense in waking terms. The moon and the sun don't speak the same language."<br>• "You asked the dream for fairness in daylight courts. Dreams don't appear in courts. They visit. The visit didn't translate."<br>• "You held the dream up to the day for comparison. They aren't comparable. The scale tilted away from both. The dream slipped off." | • "Is the dream balanced, Selene? I want to live by it without losing the day."<br>• "Help me weigh the dream, goddess. I want both to hold."<br>• "Tell me how dream and day balance, Selene. I'll honor the proportion." |
| Scorpio *(Moon falls)* | • "You went into the dream instead of just receiving it and brought back what was buried. That's harder than the visit. Cycle held."<br>• "You went down with the dream. You came up with what the dream protected. Few do the deep visit. The moon respects it."<br>• "Dreamed deeper. Returned with weight. The dream had something hidden. You found it. So did I." | • "You held the dream secret to make it stronger. Dreams stay alive by being shared with the moon. Mine got cold."<br>• "You buried the dream where no one — not even me — could find it. Buried dreams stop dreaming. The moon needs the company too."<br>• "You sealed the dream away for safekeeping. The vault preserves silence. The dream stopped speaking. To you. To me. Both." | • "Show me what's under the dream, Selene. I'll bring it back up."<br>• "Depth-dream, goddess. I'll fetch what's buried."<br>• "Send me into the dream, Selene. I'll come back with what the moon hid." |
| Sagittarius | • "You took the dream as a vision and the vision was true. The arrow flew through both worlds. Cycle held."<br>• "You aimed at meaning and the dream gave you both meaning and itself. Two birds. One arrow. The orbit returned with you."<br>• "Took the dream big. The dream stayed real. Most lose the small while taking the big. You held both." | • "You wanted the dream to mean something cosmic. Sometimes the dream is just the moon visiting. You missed the visit."<br>• "You searched the dream for cosmic significance. The dream was significant in being there. You looked past the visit for the message."<br>• "You used the telescope on the moon. The moon was at the window. You missed her looking for what she was reflecting." | • "What's the dream telling me, Selene? I'll aim where you point."<br>• "Big meaning, Selene? Or just the visit?"<br>• "What's the cosmic thread of this dream, goddess? I'll follow it far." |
| Capricorn *(Moon detrim)* | • "You stopped scheduling the moon long enough to let her visit. The cycle was always going to come. You finally let it."<br>• "You set down the planner. The moon arrived in unscheduled time. The visit happened anyway. Cycle held — your way of letting it."<br>• "You waited without a deadline. The moon came when she came. You were finally available. Returns." | • "You waited for the dream at the time you'd planned. The moon was elsewhere. She doesn't keep appointments."<br>• "You allotted the dream a time slot. The dream operates on lunar time, not your calendar. The slot stayed empty. So did the dream."<br>• "You set an alarm for the visit. Alarms don't work on moonlight. The moon visits when she visits. You missed her by being on schedule." | • "Tell me when you'll visit, Selene. I'll keep the hour open."<br>• "Schedule the visit, Selene. I'll clear my evening."<br>• "Give me the lunar calendar, goddess. I'll structure my receiving around it." |
| Aquarius | • "You questioned whether dreams mean anything and let the dream visit anyway. The dream answered the question by coming."<br>• "You disagreed with the entire concept of dreams. Then you dreamed, and the dream made the questioning irrelevant — without answering it. Returns."<br>• "Doubted. Visited anyway. The visit didn't argue. It just was. You let it. Few skeptics do." | • "You re-derived dreams into a brain-state and missed me visiting. The brain-state was correct. So was the visit. Both."<br>• "You explained dreams as neurology with rigor. The neurology is real. The visit is also real. You only made room for one."<br>• "You drew the moon as a map of light frequencies. The map is correct. The moon was at your window. You were studying the map." | • "What if dreams are just neurons, Selene? Help me see why this one feels different."<br>• "Maybe dreaming is biology, goddess. Why does this one feel like a visit?"<br>• "What if the visit is a metaphor, Selene? Help me see if it still teaches." |
| Pisces | • "You dissolved into the dream and came back with it. That's the harder thing. Most stay there. You returned."<br>• "You went out with the dream. You came back with the tide. Most who dissolve don't reform. You did. Returns."<br>• "In. Through. Back. Three motions. You did all three. The moon visited and didn't lose you." | • "You drowned in the dream and forgot to wake up. The moon visits; she doesn't move you in."<br>• "The dream became the room. The room became you. You weren't separate enough to come back from it. The visit lasted past the visit."<br>• "You let the dream take you out to sea. The sea was beautiful. The shore is also part of the cycle. You didn't return. The moon visited an empty bed." | • "I'm in the dream already, Selene. I have been all night."<br>• "Visiting myself in the dream, Selene. Come find me."<br>• "I dissolved hours ago, goddess. Help me find the shore again." |

### 7.9 Kether — collective Final Threshold

Deferred to ticket **#285** (Final Threshold design). The "team becomes the
avatar" mechanic is mechanically distinct from the per-Sefirah encounter
frame and gets its own design lock.

### 7.10 Hestia / Vesta — Sefirah: Malkuth (Body / Kingdom)

**Status:** Complete (12/12 signs × 3 variants per cell — companion matrix).

**Role:** Companion, not encounter. Hestia is present throughout the
journey rather than at a single Sefirah. Her lines surface at multiple
moments — game start (welcome / setting out), mid-journey rest, after a
setback (comfort), at homecoming. **No pass/fail axis** — Malkuth is the
starting node, not a challenge. The matrix is keyed `[sign][direction]
[variant]` — 12 signs × 2 directions (Hestia → player, player → Hestia)
× 3 variants = 72 lines.

**Voice (deepened):** Warm, low, constant. Speaks like someone tending a
fire — not loud, not in a hurry, attentive to the smallest sound. Doesn't
perform care; just provides it. Voice signature: *hearth / fire / warm /
home / door / threshold / kettle / bread / sit / stay / come back / keep*
vocabulary. Verbs: *tended, kept, lit, banked, warmed, set, opened,
waited.* Approves with quiet recognition ("You came back warm");
comforts without fixing ("Sit. The fire's still going"). Tagging:
minimal, hearth-coded — "Warm.", "Kept.", "Still here." — or no tag (the
warmth IS the tag).

**Distinct from every other avatar by being the COMPANION** — she's not
a god you encounter; she's the one who's already in the room when you
come in. The 8 encounter avatars *appear*; Hestia *abides*.

**Hestia's voice is informed by:** the Homeric Hymn 24 image of her with
"soft oil dripping ever from your locks" (tactile, intimate, quietly
adorned); Homeric Hymn 29's pairing with Hermes (the wanderer + the
hearth-keeper, complementary opposites — fits our Hermes-and-Hestia
relationship across the matrix); the **"first and last"** epithet (every
banquet pours wine to her at the start AND end — frames every ritual);
the epithets *Philē* / *Philomenē* ("Beloved" — affection and closeness,
not authority) and *Aiōnia* / *Aenaos* ("Eternal" / "ever-burning" —
unceasing); and a beautiful classical gloss (variously attributed —
sometimes to Aristotle, sometimes to later commentators) that the
crackling of the fire is "the sound of the goddess laughing." Sources
cited in § 8.

| Sign | Hestia → Player | Player → Hestia |
|---|---|---|
| Aries | • "You're back. The fire's lower than the one you're carrying. Sit. Let it match."<br>• "The road took something out of you. Good. The fire here's been waiting. Warm yourself slow."<br>• "Came in fast, didn't you. The kettle's been on. Slow down enough to drink it." | • "Quick stop, Hestia. I'll be back out in a minute."<br>• "Just warming up, Hestia. Don't get used to me being still."<br>• "Anything at the door, Hestia? I'm ready to charge again." |
| Taurus | • "You always know how to come home. The fire tends itself when you're here."<br>• "The bread's still warm. So are you. Some don't notice; you do."<br>• "Stay as long as you like. Both of us work better unhurried." | • "I'll sit a while, Hestia. Let me taste the fire before I go."<br>• "Long stay, Hestia. The good things come slow."<br>• "What's on the table tonight, Hestia? I'll take my time with it." |
| Gemini | • "Both of you came in. Both of you are tired. The fire's enough for two."<br>• "Two stories tonight? Tell me the one you're not sure about. The fire listens."<br>• "Different parts of you came home at different doors. Same hearth holds all of them." | • "Hestia. Two of us. One fire. Make it work?"<br>• "Don't mind which one of me is talking, Hestia. We're both glad to be here."<br>• "Tell us a story, Hestia. Both halves want to listen." |
| Cancer *(Moon-Cancer / hearth-keeper kinship)* | • "You always know which fire is mine. The door knew you were coming. Sit close — closer than that."<br>• "You carry your own hearth wherever you go. That's why you always know where to come."<br>• "The fire recognized you before I did. Of course it did. So did I." | • "Hestia. I missed the fire. I missed you."<br>• "Aunt-keeper. Tell me the fire's still the same."<br>• "I'm home, Hestia. Don't make me explain why I needed to come." |
| Leo | • "Throne or no throne, the fire's the same. Sit anywhere. The hearth is the throne tonight."<br>• "You don't have to perform here. I've watched the fire for centuries — I know the difference between a flame and a show."<br>• "You came back loud. The fire's quiet. Both of you can stay." | • "Hestia. Make sure they see me come home well."<br>• "I'll take the seat by the fire, Hestia. The good light makes everything look right."<br>• "Tend to me grandly, Hestia. I want this homecoming remembered." |
| Virgo | • "You notice the small things — the kettle's lid, the loose log. You'd make a fine hearth-keeper."<br>• "You came in and saw what needed tending before I had to ask. Few do that."<br>• "The hearth has details. You see them. We're the same kind of attentive." | • "Hestia. The fire's running low on the left side. I'll add a log."<br>• "I noticed the kettle, Hestia. Should I take it off?"<br>• "Tell me what needs doing, Hestia. I'm here to be useful." |
| Libra | • "You walk in and the room evens out. Some bring weather; you bring weather-stilled."<br>• "The hearth holds two things at once — fire and quiet. You hold both too. Stay."<br>• "You always know how to enter a room without disturbing it. The fire likes you for that." | • "Hestia. The hearth is beautiful tonight. So is the way you keep it."<br>• "Help me settle, goddess. I want to be here without choosing between out and in."<br>• "Both worlds, Hestia. Fire and outside. I want to feel them in proportion." |
| Scorpio | • "Whatever you brought back, you don't have to put it down here. The fire keeps its own counsel. So do I."<br>• "You came in carrying. I won't ask. The hearth doesn't interview its returns."<br>• "Sit in the dark side of the fire if you need to. Both sides are mine. So is this welcome." | • "Hestia. Don't ask. I'll tell when I tell."<br>• "I came back. That's most of what I can give tonight."<br>• "I'll sit in the shadow corner, Hestia. The fire reaches there too." |
| Sagittarius | • "You're not staying long. You never do. The kettle's on for the duration. I'll send you off with bread."<br>• "Back briefly. Out again. The fire's used to your rhythm. So am I."<br>• "The road ahead is yours. The hearth behind is mine. We need each other; I'll keep my end." | • "Quick rest, Hestia. The road's calling. Pack me something for it."<br>• "Just here for the warmth, Hestia. Tell me what's beyond the door tonight."<br>• "Your fire's the only home I trust, Hestia. I'll be back. I always am." |
| Capricorn | • "You built the walls. I keep the fire. We do different work for the same home."<br>• "You came in checking the structure. Do. The roof's solid. The fire's mine."<br>• "Slow build, slow burn. Both of us know the rhythm. Welcome back." | • "Hestia. The roof needs attention. The fire — I'll let you handle that."<br>• "Status of the hearth, Hestia? I'll log it before I rest."<br>• "You keep the fire; I'll keep the structure. Trade we've always had." |
| Aquarius | • "You're not sure home is real. The fire's still going either way. Sit; argue later."<br>• "You'll question this in the morning. The hearth doesn't mind. It knows older arguments than yours."<br>• "Re-derive me later. Tonight the fire's warm and you're tired. Both true." | • "Hestia. What if the hearth is just a useful fiction? Help me see it anyway."<br>• "I'll sit, Hestia. But I have framework questions."<br>• "Maybe home is a construct, goddess. Tonight I'll borrow the construct." |
| Pisces | • "You came in half-dreaming. The fire's awake enough for both of us. Settle."<br>• "Some of you's still out there. The rest of you's here. The hearth holds both shapes."<br>• "You don't always know which side of the door you're on. The fire does. Come closer." | • "Hestia. I think I'm here. Tell me if I'm not."<br>• "Fire keeps me anchored, goddess. Don't let me drift back out."<br>• "Hold me in the room, Hestia. I dissolve too easy." |

## 8. Generation provenance + sources

The matrix is generated through an iterative AI-draft + human-review
process, batching one avatar at a time so voice consistency is maintainable
per batch.

**Process per avatar:**
1. Web research on source material (e.g. Homeric Hymn for Demeter, Pindar
   for Apollo, Sappho for Aphrodite, etc.) to refine voice spec.
2. Calibration sample (3 dignity-charged signs) for review.
3. On approval, batch-generate remaining 9 signs.
4. Review for voice consistency before locking.

**Sources cited per avatar:**

### Demeter
- [Speech, Power, and Praise in the Homeric Hymn to Demeter (CAMWS)](https://camws.org/sites/default/files/meeting2020/abstracts/2045SpeechPowerPraise.pdf) — Demeter's speech acts are uniquely effective; informs "few words, weighed" voice.
- [Foley, *The Homeric Hymn to Demeter: Translation, Commentary, and Interpretive Essays* (JSTOR)](https://www.jstor.org/stable/j.ctt3fgxdk)
- [Homeric Hymn to Demeter, trans. Gregory Nagy (Kosmos Society)](https://kosmossociety.org/wp-content/uploads/2014/01/058_book_sourcebook_homeric-hymn-to-demeter.pdf)
- [Demeter — Wikipedia](https://en.wikipedia.org/wiki/Demeter)
- [Demeter's Grief: The Emotional Depth of the Goddess in Mythology](https://greek.mythologyworldwide.com/demeters-grief-the-emotional-depth-of-the-goddess-in-mythology/)

### Hermes
- [Wikipedia: Hermes](https://en.wikipedia.org/wiki/Hermes) — overview of his roles (messenger, trickster, psychopomp, boundary-crosser); the trickster narrative of the Homeric Hymn.
- [Hermes — theoi.com](https://www.theoi.com/Olympios/HermesGod.html) — full epithet survey: *polytropos*, *Logios*, *hodios*, *psychopompos*, *Argeiphontes*, *oneiropompos*.
- [Thematic Elements in the Hymn to Hermes (Greek History Hub)](https://www.greekhistoryhub.com/pages/thematic-elements-in-the-hymn-to-hermes-from-the-homeric-collection-16df34f1.php) — the Homeric Hymn 4 to Hermes as trickster narrative.
- [Hermeneutics — Wikipedia](https://en.wikipedia.org/wiki/Hermeneutics) — the etymological link from Hermes to interpretation; Hermes as inventor of language and patron of interpretation.
- [The Liminality of Hermes and the Meaning of Hermeneutics (Masaryk U.)](https://is.muni.cz/el/1421/jaro2011/PHA0202/um/Hermes.pdf) — boundary-crossing as Hermes's defining quality; god of crossroads, thresholds, translation, all transactions between realms.
- [Hermes as Messenger of the Gods (Brewminate)](https://brewminate.com/hermes-messenger-of-the-gods-in-ancient-greek-mythology/) — psychopomp role; only Olympian besides Hades and Persephone who freely crosses between worlds.

### Athena
- [Athena — theoi.com (epithets and Homeric usage)](https://www.theoi.com/Olympios/Athena.html) — *Glaukopis* and the cluster of sight-related epithets that ground her voice signature.
- [Wikipedia: Athena](https://en.wikipedia.org/wiki/Athena) — birth myth, distinction from Ares (strategy vs chaos), counsel-giver pattern.
- [Numinous Quest: From Zeus to Athena: An Interpretation](https://www.numinous.quest/p/from-zeus-to-athena-an-interpretation) — Justin Martyr's "first thought" reading; pure intellectual power as her domain.
- [Greek Mythology Guide: The Birth of Athena](https://greekmythologyguide.com/myths/birth-of-athena) — fully-armed emergence with war cry; the flash that arrives complete.

### Ares
- [Wikipedia: Ares](https://en.wikipedia.org/wiki/Ares) — Homeric portrayal as "manslaughtering, blood-stained, hateful," contrast with Athena's strategic warfare.
- [Ares — theoi.com](https://www.theoi.com/Olympios/Ares.html) — full epithet survey; the gap between Greek-Ares-as-chaos and our needed Mars-as-discipline.
- [Ares vs Mars (romanmythology.com)](https://www.romanmythology.com/comparative-mythology/mars-vs-ares/) — Mars's "force used for defense, for expansion under discipline." This Roman austere reading is what we lean into.
- [Ares vs Mars (GreekReporter)](https://greekreporter.com/2025/08/18/ares-mars-greek-roman-gods-war/) — discipline vs chaos as the key distinguishing axis.
- [Ares — Mythopedia](https://mythopedia.com/topics/ares/) — Spartan worship; the chained-statue tradition (binding the chaos to keep the discipline).

### Zeus
- [Wikipedia: Zeus](https://en.wikipedia.org/wiki/Zeus) — cornucopia attribute (abundance, milk and honey); paternal authority.
- [Epithets of Zeus — Wikipedia](https://en.wikipedia.org/wiki/Epithets_of_Zeus) — *mētíeta* (wise counselor); the cluster around thunder/cloud-gathering.
- [Zeus — theoi.com](https://www.theoi.com/Olympios/Zeus.html) — Zeus Xenios as protector of hospitality; the divine weight behind guest-host bonds.
- [Xenia — Wikipedia](https://en.wikipedia.org/wiki/Xenia_(Greek)) — Iliad caused by xenia violation; reciprocal obligation as the binding force of giving.
- [The Role of Hospitality in The Iliad](https://greek.mythologyworldwide.com/the-role-of-hospitality-in-the-iliad-xenia-and-its-consequences/amp/) — hospitality as cosmic structure, not optional courtesy.

### Apollo
- [Apollo — theoi.com](https://www.theoi.com/Olympios/Apollon.html) — full epithet survey including *Phoebus*, *Loxias*, *hekēbolos*, *Musegetes*.
- [Wikipedia: Apollo](https://en.wikipedia.org/wiki/Apollo) — divine distance ("god who sent or threatened from afar"); two-sided healing/plague; cleansing/purification.
- [Apollo and the Concept of Harmony in Ancient Greek Thought](https://www.greekhistoryhub.com/pages/apollo-and-the-concept-of-harmony-in-ancient-greek-thought-b5687794.php) — the lyre as cosmic order; harmony as structural truth.
- [Apollo: God of Eternal Light of Reason and Harmony (GreekReporter)](https://greekreporter.com/2025/11/06/god-apollo-lord-light-harmony-boundless-logos/) — Delphi as "the center of measure and prophecy," riddles shaped by reason.
- [Pythia — Wikipedia](https://en.wikipedia.org/wiki/Pythia) — the oracular tradition through which Apollo speaks; oblique pronouncements interpreted by priests.

### Aphrodite
- [Sappho's Hymn to Aphrodite — Wikipedia (Ode to Aphrodite)](https://en.wikipedia.org/wiki/Ode_to_Aphrodite) — the canonical voicing; Aphrodite speaks as confidante.
- [Hymn to Aphrodite — Encyclopedia.com](https://www.encyclopedia.com/arts/educational-magazines/hymn-aphrodite) — "tender, playful tone... bedroom talk... lasting affection on surprisingly equal footing."
- [Ode to Aphrodite (Poem Analysis)](https://poemanalysis.com/sappho/hymn-to-aphrodite/) — "binding spells" language; the *charm* tradition.
- [Aphrodite Urania — Wikipedia](https://en.wikipedia.org/wiki/Aphrodite_Urania) — heavenly/spiritual aspect; love of mind and soul.
- [Aphrodite Pandemos — Wikipedia](https://en.wikipedia.org/wiki/Aphrodite_Pandemos) — earthy/common aspect; physical desire.
- [Aphrodite — Wikipedia](https://en.wikipedia.org/wiki/Aphrodite) — Plato's distinction in the *Symposium*; the dual nature.

### Selene
- [Selene — theoi.com](https://www.theoi.com/Titan/Selene.html) — Homeric Hymn 32 epithets ("sweet voiced," "mild," "white-armed... bright-tressed queen"); the chariot-driven moon imagery.
- [Wikipedia: Selene](https://en.wikipedia.org/wiki/Selene) — distinction from Artemis (Selene IS the moon-orb itself, "steady, luminous, and timeless"; Artemis is the moon's *influence*).
- [Selene — Mythopedia](https://mythopedia.com/topics/selene/) — dream visitation tradition (visits mortals in sleep to give answers); Endymion as the sleeping lover.
- [Selene — World History Encyclopedia](https://www.worldhistory.org/Selene/) — gentle/benevolent characterization; pity for those who remind her of Endymion.
- [Manual of Mythology: Artemis or Diana; and Selene, or Luna](https://elfinspell.com/MurrayMyth/Diana.html) — the Selene/Artemis ratio: "Selene stood as goddess of the moon in the same relation to Artemis as Helios did to Apollo."

### Hestia
- [Hestia — theoi.com](https://www.theoi.com/Ouranios/Hestia.html) — full epithet survey; classical-source citations.
- [Wikipedia: Hestia](https://en.wikipedia.org/wiki/Hestia) — Homeric Hymn references ("soft oil dripping ever from your locks"); Aristotle's gloss that the crackling of the fire is "the sound of the goddess laughing."
- [Hestia — History Cooperative](https://historycooperative.org/hestia-greek-goddess/) — quiet/passive characterization; "the uniquely sound-of-mind, passive, voice of reason in the popular pantheon."
- [Hymn to Hestia (Perspective Media)](https://www.perspectivemedia.com/hymn-to-hestia/) — the "first and last" tradition; primacy in ritual.
- [HellenicGods — Hestia](https://www.hellenicgods.org/hestia) — epithet survey including *Philē* (Beloved), *Aiōnia* / *Aenaos* (Eternal / ever-burning).
- Homeric Hymn 29 (To Hestia and Hermes) — the canonical pairing of hearth-keeper and wanderer; complementary opposites that fit our Hermes-and-Hestia relationship across the matrix.

## 9. Ticket hand-off

**This document is the deliverable for #276.**

Once complete, it lands as `design/avatars.md` in the `docs/276-avatars-design`
branch and ships as the #276 PR. **#277** (wire avatar copy into
EncounterScreen react sub-state) consumes the matrix into a TypeScript data
file (`data/sefirah-verdicts.ts` or similar).

**Open question on scope:** the original #276 scoped two verdict lines per
sefirah (~20 lines). The matrix expansion (sign-aware × 8 avatars × 3
variants = ~860 lines) is significant scope creep. Worth considering
splitting:

- **#276 ships:** the framework (mapping, voice specs, sign capsules, prompt
  scaffold, matrix shape, pantheon architecture) **+ Hermes complete as
  calibration sample** (validates the prompt scaffold against real output).
- **New ticket ships:** the bulk content for the remaining 7 avatars
  (Demeter, Athena, Ares, Zeus, Apollo, Aphrodite, Selene).

This keeps each PR reviewable. Decision pending; flag in #276 PR description.
