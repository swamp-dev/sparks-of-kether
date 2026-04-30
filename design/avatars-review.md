# Avatars matrix — literary critique

**Reviewed:** 2026-04-30. Reviewer brief: classical-humanities critic + dramaturg.
**Corpus:** `design/avatars.md`, ~936 generated dialogue lines across 9 avatars
(Hermes, Demeter, Athena, Ares, Zeus, Apollo, Aphrodite, Selene each at
12 × 3 × 3 = 108; Hestia at 12 × 2 × 3 = 72).

## Summary verdict

**Fix-then-ship.** The corpus is, on the whole, an unusually disciplined piece
of generated voice work. The voice specs in §2/§7 are doing real work — voice
drift between cells is rare, and where it happens it tends to be small. The
sign-personality capsules in §3 are honored consistently. The mythological
grounding is mostly sound and visibly improved by the per-batch deepening
research.

What needs fixing before merge is a small set of identifiable recurring
patterns rather than scattered one-off problems:

1. **Variant collapse.** A non-trivial number of cells have one variant that
   is a true rephrase of another — same image, same beat — rather than the
   spec's promised "different rhythm, image, angle." Worst offenders cluster
   in the "fail" cells where the metaphor for failure (the wrong staircase,
   the closed shell) gets re-used across variants.
2. **Sign-personality leakage in player→avatar lines.** The player lines
   are *meant* to lead with sign Voice, but in some signs (Capricorn,
   Virgo) the formula has hardened into an interchangeable surface
   ("Specs, [god]" / "Spec the [thing]") that loses the avatar-specific
   color those player lines should also have.
3. **A handful of mythological / astrological miscalibrations** — see
   CRITICAL #1 (Hermes×Pisces) and SIGNIFICANT cross-avatar notes.

None of these is a "the project misunderstood the source material" problem.
They are the kind of finishing-pass issues that a focused revision can clear
in a single session.

## CRITICAL findings (must address before merge)

### C1. §7.1 Hermes × Pisces "Pass" v3 — the line undoes the voice

> *"You answered without speaking. The answer was right. Don't ask me how."*

This is the only line in 108 Hermes cells where Hermes ends an exchange
"don't ask me how." It doesn't read as Hermes — it reads as Selene, or as
Apollo at his most oracular. Hermes is the god of *hermeneutics*, the
patron of explaining; "don't ask me how" is the voice signature of an
avatar who *won't* explain (Selene) or *can't be explained to* (Pisces
itself). The line collapses Hermes's voice into the sign's tension instead
of holding both.

It is also notable because v1 ("you let the words come through you like a
tide") and v2 ("the word arrived after the meaning, like a translator
catching up") *both* nail the brief — Mercury falls in Pisces, both
losing, language overrun by current. v3 is the weak one in the set.

**Suggested replacement:**
> *"You arrived at the answer the long way and the long way was right.
> I'd argue with the route — but it landed. I'll allow it."*

This keeps Hermes-as-translator (admitting the route was strange to him),
keeps the dignity-fall ("the long way," not the direct one), and keeps the
trickster tag style ("I'll allow it" — already a v1-Aries tag) instead of
ceding the line to mystery.

### C2. §7.4 Ares × Cancer "Pass" v2 — the rhetorical question breaks the spec

> *"Boundary held. Heart open. Few do both. The line had a door. You guarded both."*

The §7.4 voice spec says explicitly: *"No questions. No flowery imagery.
Statements only."* The first three sentences of v2 honor that. The fourth —
*"The line had a door."* — is fine on its own, but combined with v3's
"Hold without closing. Closing without holding. You knew the difference"
the cell as a whole tilts toward a softer, more pedagogical Ares than
§7.4 commits to. The bigger problem is in the *Player→Ares* column for
this same row:

> *"Give me the reason, Ares. The hold needs a heart."*

The player says this *to Ares*. It's a sentiment Hestia might say back to
Ares, but in the soldier-reporting-to-CO frame the §7.4 spec sets up
("ready, deferential, direct"), this is a soldier explaining feelings to
an austere commanding officer. Cancer's tension *is* the heart, but the
player line should still feel like reporting, not pleading.

**Suggested replacement (player line v3):**
> *"Tell me who's behind the line, Ares. I'll hold harder for the reason."*

(This is one word away from v1 — fold v3 entirely or rewrite to:
*"My hold has a heart in it, Ares. Point me at what it's protecting."*)

### C3. §7.10 Hestia × Cancer — sister-coding read

> *"Sister. You know this fire better than most. Welcome back."*

Cancer is glossed in the row header *"sister hearth-keepers"*. This is
defensible — Cancer's ruler is the Moon, and the Cancer capsule is "Reads
emotional undertone; knows what's unsaid," which fits Hestia's domain.
But classically, Hestia has no sister-figure pairings in the surviving
corpus; her *brother* relationships (Zeus, Hades, Poseidon) and her vow
of virginity define her position. The "sister" address appears here and
in the Hestia × Cancer fail-equivalent, and it appears nowhere else in
Hestia's matrix.

This isn't *wrong* — the move is to identify Cancer-the-sign with Hestia's
domain by analogy, and the corpus does it elsewhere (Demeter × Cancer's
*"sister"* address; Athena × Pisces's deep-eye coding). But three uses of
*sister* in three different cells (Demeter × Cancer pass v1, Demeter ×
Scorpio pass v3, Hestia × Cancer pass v1) is starting to lean on the
device. **Recommend:** keep Demeter's two uses — they're earned by the
Persephone myth and the mother-mother resonance — and rewrite Hestia ×
Cancer pass v1 to lead with Hestia's own register:

**Suggested replacement:**
> *"You always know which fire is mine. The door knew you were coming.
> Sit close — closer than that."*

(Loses *sister*; keeps the recognition; adds Hestia's tactile small-detail
register from the §7.10 spec.)

## SIGNIFICANT findings (should address)

### Per-avatar voice integrity

#### Hermes — overall: strong, with one critical and three minor drifts

The deepened voice (trickster + psychopomp + boundary-crosser) is the most
sharply executed in the corpus. The tag-style discipline ("Crossed.", "I'll
allow it.", "Trade.", "The road yielded.") is consistent; bare "Pass."
genuinely never appears. Hermes × Sagittarius (Mercury detrimented) is a
particular strength — the archery-meets-trickster collision is well
calibrated.

- §7.1 Hermes × Cancer Pass v3 (*"Sideways works. The right answer doesn't
  always come through the front door. You knocked at the back."*) — this
  is borderline Hestia-warm. *"Sideways works"* is fine; the back-door
  metaphor warms the line into hospitality register. Suggested rewrite:
  *"Sideways works. The riddle had a side entrance. You found it before I
  pointed at it. Crossed."*
- §7.1 Hermes × Leo Pass v2 (*"You delivered the answer with a flourish.
  I'd be annoyed if it weren't correct. It was. Take a bow."*) — *"Take a
  bow"* is the exact register Apollo would use on a Leo. Hermes here is
  cleverly indulgent; the bow-cue tilts him toward presenter-mode.
  Suggested rewrite: *"You delivered the answer with a flourish. I'd be
  annoyed if it weren't correct. It was. Trade complete."*
- §7.1 Hermes × Aquarius Pass v3 (*"The riddle had four sides. You found
  the fifth. I'll allow it — once."*) — strong line, but *"once"* makes it
  feel scolding. Hermes is amused by Aquarius, not warning them off.
  Suggested rewrite: *"The riddle had four sides. You found the fifth. We
  crossed sideways."*

#### Demeter — overall: the most consistently voiced avatar in the corpus

The "no Pass tag" rule is honored. The few-words-weighed register is held
through all 36 verdict cells. Saturn-dignity coloring is correctly applied
where called out (Aries Saturn-falls leans into "the loss is faster than
you"; Libra Saturn-exalted gets the just-scale weight). The Persephone-
resonance gloss on Scorpio earns its keep.

- §7.2 Demeter × Aquarius Player v1 (*"What if we reconsider what's being
  lost? Maybe the loss is structural, not personal."*) — works but is the
  most *modern-therapy-discourse* line in the corpus ("structural, not
  personal"). It's true to Aquarius's frame-questioning, but Demeter is a
  pre-modern goddess and the surrounding lines don't carry this idiom.
  Acceptable; flag only.
- §7.2 Demeter × Sagittarius Pass v3 (*"You pilgrim'd toward the meaning
  AND mourned the road there."*) — *pilgrim'd* as a verb is an unusual
  English coinage. Lovely image; flag for whether the corpus wants this
  level of word-coinage in player-facing copy.

#### Athena — overall: voice held, but the metaphor inventory is narrow

Athena's eye/strike cluster is everywhere by design (the *Glaukopis*
grounding earns it). What I'd watch is that *strike* and *cut* and *eye*
do most of the metaphorical work; cells like Athena × Capricorn fail v2
("Eyes on the blueprint, not the field") are deploying the same image
twice in the same row's cells.

- §7.3 Athena × Pisces Pass v3 (*"Two of us looked. One of us was you. The
  other was deeper than seeing. Both right."*) — beautiful line. The
  *"Pisces (Neptune co-ruler — Athena's 'home' but tonally her shadow)"*
  framing is the cleverest dignity-rationale move in the corpus and the
  generated cells reward it.
- §7.3 Athena × Cancer Fail v2 (*"You shelled the target instead of striking
  it. The shell is mine? No. Mine is the spear. Use the spear."*) — the
  rhetorical-question-then-self-correction is unusual for Athena's "no
  setup" register. Suggested rewrite: *"You shelled the target. Mine is
  the spear, not the shell. Use the spear."*

#### Ares — overall: held tight; one metaphor risk

The chained-Ares / Roman-Mars framing is honored. The
soldier-reporting-to-CO player register works. Ares × Pisces ("the line
in moving water") is the corpus's clearest demonstration that the matrix
*is* sign-aware and not just god-aware — it would have been easy to write
generic "discipline" lines for Pisces; instead the lines wrestle with the
fluid-vs-fixed tension specifically.

- §7.4 Ares × Pisces Fail v2 (*"You were the line. The line was the water.
  The water doesn't hold. Neither did you."*) — strong, but the §7.4 spec
  specifically warns *"No flowery imagery."* This is metaphor-stacked. It
  earns its keep because the Pisces dignity-handling is the point, but
  flag.
- See CRITICAL C2 for Ares × Cancer.

#### Zeus — overall: voice held, gift-language consistent

The Zeus Xenios / hospitality grounding is doing real work — the lines
genuinely read as host-and-guest, not as patriarchal-blessing. The
*mētíeta* note about advisor-Zeus shows up in Cancer pass v1 (*"the way
one mother receives from another"*). The cornucopia attribute is
honored (cup / pour / table / gift recur correctly).

- §7.5 Zeus × Sagittarius (Jupiter rules) Pass v2 (*"Your aim was big.
  The gift was bigger than you'd expected — and you took the bigger
  version."*) — the dignity is correct, but the line doesn't use Zeus's
  voice signature (gift / hand / cup / table). Acceptable; would be
  stronger as: *"Your aim was big. The cup was bigger. You drank the
  whole of it."*
- §7.5 Zeus × Capricorn (Jupiter falls) — entire row is excellent. The
  ledger / docket / contract collision with hospitality register is the
  cleanest dignity-handling in the corpus.

#### Apollo — overall: the Loxias riddle-tone is the corpus's bravest move

The oblique-from-distance voice is the hardest spec to execute and the
hardest to evaluate. Most lines hit. The oracular fragment tags ("So.",
"Aligned.", "The chord stands.") are the right register. Apollo × Libra
(Sun falls) is particularly well-handled — the "weighing forever" rejection
maps cleanly to Libra's tension.

- §7.6 Apollo × Cancer Pass v3 (*"Felt it. Held the feeling. The song
  followed the feeling. Apollo and the moon, one note."*) — Apollo
  speaking of *himself in third person* ("Apollo and the moon") is
  strange. He doesn't do this elsewhere. Suggested rewrite: *"Felt it.
  Held it. The song followed the feeling. The moon and the sun, one note
  for once."*
- §7.6 Apollo × Aquarius (Sun detrim) — strong row; the dignity is
  correctly handled by treating Aquarius's frame-questioning as something
  the *oracle itself* respects rather than as defiance.

#### Aphrodite — overall: voice held with care; the body-language is calibrated

The Sappho-grounding is visible in the register: *"Yes."* as tag,
present-tense direct address, body before mind. The Pandemos/Ourania
duality is best honored in Aphrodite × Pisces (Venus exalted) — the
"loved at the scale of the sea" failure is specifically *Ourania-without-
Pandemos*, an exalted-Venus pathology rather than ordinary Pisces drift.

- §7.7 Aphrodite × Aries (Venus detrim) Player v1 (*"Tell me what to want,
  Aphrodite. I'll burn for it."*) — slightly *too* on-the-nose; reads as
  parody of Aries. Suggested rewrite: *"Name the want, Aphrodite. I'll
  meet it on fire."*
- §7.7 Aphrodite × Capricorn Fail v2 (*"The plan was sound. The want
  wasn't there. You executed the form perfectly and forgot to love the
  content."*) — beautiful articulation of structural Capricorn fail under
  Venus's gaze. Strong line; preserve.

#### Selene — overall: voice held; one cross-avatar leakage risk

The dream-visitation grounding is doing real work — many cells frame
Selene's interaction explicitly as *visit*, which respects the source
distinction from Artemis. The Endymion gloss is not directly invoked,
which is fine; it doesn't need to be on the surface.

- §7.8 Selene × Cancer Pass v2 (*"My visit and your feeling rose at the
  same hour. Of course they did. We're the same body of water."*) —
  excellent. *"Same body of water"* is dignity-correct (Moon home + water
  cardinal) and Selene-voiced (no mention of strike, edge, light-as-
  weapon).
- §7.8 Selene × Sagittarius Pass v2 (*"You aimed at meaning and the dream
  gave you both meaning and itself. Two birds. One arrow."*) — *two birds,
  one arrow* is a Sagittarius-voiced metaphor inside a Selene line. It
  actually works because the v3 grounds it back ("Took the dream big. The
  dream stayed real"). Flag for awareness.

#### Hestia — overall: a different beast; voice holds

Hestia's matrix is the most distinct because she has no fail axis. The
"warmth IS the tag" rule is honored — many cells have no tag at all,
correctly. The Hermes-and-Hestia complementary-opposite framing from
Homeric Hymn 29 is felt across the corpus (Hermes is sharp, Hestia is
warm; both are crossing-thresholds avatars but from different angles).

- §7.10 Hestia × Aquarius Pass v3 (*"Re-derive me later. Tonight the
  fire's warm and you're tired. Both true."*) — perhaps the single most
  Hestia-voiced line in the corpus. Preserve the pattern.
- §7.10 Hestia × Sagittarius — the *"I'll send you off with bread"*
  detail in v1 is the corpus's most economical demonstration of voice +
  sign + hearth-domain interaction. Strong.
- See CRITICAL C3 for Hestia × Cancer.

### Cross-avatar sign consistency

I read the Aries, Virgo, Pisces, and Aquarius columns top-to-bottom across
all 9 avatars. Findings:

#### Aries

The Aries player-lines are reliably blunt-imperative, fast, and
sign-correct ("Tell me where to charge", "Just say what you mean",
"Reporting, Ares. Position?"). The avatar-side Aries lines correctly
handle Aries's fire/cardinal/Mars character — most avatars frame Aries's
*Native* (first-mover instinct) differently:
- Ares: respect ("you held the line before you crossed it")
- Hermes: amused ("Quick. You hit the answer before the question
  landed")
- Demeter: the harder yes ("you slowed. The loss caught up")
- Apollo: light-meets-aim
- Selene: charge-vs-stillness tension

This is what the matrix is supposed to do; it's working.

#### Virgo

Virgo player-lines hit a formula that should be loosened. A representative
sample:
- Hermes: *"I have three reservations and a footnote. Shall I number
  them?"*
- Athena: *"I have several frameworks to consider. Help me choose the
  cutting one."*
- Apollo: *"Show me the structure, Apollo. I'll find every measure of
  it."*
- Ares: *"I have three concerns about the boundary, Ares. Where is it
  exactly?"*
- Zeus: *"What are the terms exactly, Zeus? I want to receive it
  correctly."*
- Aphrodite: *"I have concerns about this want, Aphrodite. Are they
  fair concerns?"*
- Selene: *"Walk me through the dream, Selene. I'll catalog it
  correctly."*
- Demeter: *"Can you specify what's being taken? I want to grieve the
  right thing."*
- Hestia: *"Hestia. The fire's running low on the left side. I'll add
  a log."*

**Hestia is the standout** — she gets a *concrete, hearth-specific* Virgo
line (the kettle, the log) instead of the abstract "frameworks /
concerns / specifications" device. The other 8 should be pushed in this
direction. The current pattern reads as *"Virgo asks the god for a list"*
across the board; the Hestia version is *"Virgo notices Hestia-specific
small detail and offers help."* That's the model.

**Recommended action:** rewrite Virgo player-line v1 across at least
Apollo, Selene, and Athena to put a *concrete, avatar-domain-specific*
detail at the front instead of "I have N concerns / frameworks /
reservations."

#### Pisces

Pisces is the dignity-richest sign in the corpus (Mercury falls, Venus
exalted, Neptune co-rules, Jupiter co-rules). The dignity work is
correctly done in every avatar:
- Hermes (Mercury falls + detrim): "tongue dissolves," "translator
  catching up" — dignity-fall correctly read as *language-undone*.
- Aphrodite (Venus exalted): "loved at the scale of the sea" failure;
  "love at the source" success — dignity-exalt correctly read as
  *Ourania-without-Pandemos* risk.
- Athena (Neptune co-ruler): "two of us looked. The other was deeper
  than seeing" — dignity correctly read as Athena's strategic clarity
  meeting Neptunian depth.
- Zeus (Jupiter co-rules): the through-flow line — dignity correctly
  read as *let some go*, not pure abundance.

This is the strongest internal evidence that the matrix is doing what
the design says it does. Preserve carefully.

One nit: the Pisces player-lines across avatars lean repeatedly on *"I'll
arrive when I arrive"* / *"I dissolved hours ago"* / *"I'm in the X
already"*. That pattern is sign-correct (Pisces *Reaction*: receives like
rain) but starting to feel formulaic. Rewriting one or two of these to
put the avatar's domain at the front (Hestia × Pisces does this — *"Fire
keeps me anchored"*) would help.

#### Aquarius

The Aquarius pattern *"What if [premise], [god]?"* runs across multiple
avatars and is correct — that's literally the sign capsule's
*Reaction*: re-derives, suggests a better question. The variation
between avatars is mainly thematic substitution (Hermes: axioms; Athena:
frame; Zeus: architecture; Apollo: parallel oracles). This is fine.

The Aquarius *fail* lines, however, are the most repetitive cluster in
the corpus. Almost every avatar's Aquarius fail is some version of *"you
re-derived [thing] into a new system. The system is fine. The [original]
is the [original]."* Hermes, Athena, Zeus, Apollo, Selene, Aphrodite all
have a near-identical structural twin at v1 of the fail cell. The
sign-tension *is* this — solving a different problem — but the pattern
should be more varied across avatars.

**Recommended action:** for at least 2-3 avatars, rewrite the Aquarius
fail v1 to be *avatar-domain-specific* (e.g., for Aphrodite: *"You proved
desire away. The body's still in the room. It still wants. You're not
listening to it."* — already roughly v2). Aphrodite v3 is good already;
v1 is the formula. Push v1 toward v3's specificity.

### Variant distinctness

I sampled ~40 cells across avatars looking for variant collapse — pairs
of variants where the underlying image, beat, and rhythm are too close.
Most cells pass this test cleanly. Real collapses I found:

- **§7.1 Hermes × Capricorn Fail v1 and v2**: both built on the
  *staircase-built-to-wrong-target* metaphor. v3 (*"You scaffolded the
  answer to perfection..."*) keeps the staircase image *again* but pivots
  to *load-bearing*. Rewrite one of v1/v2 to use a different image for
  the same beat. Suggested v2 replacement: *"You drafted the road. The
  road went somewhere. The answer was somewhere else. Both were excellent
  destinations. Neither was here."*
- **§7.2 Demeter × Capricorn Fail v1, v2, v3**: all three are filed-paper
  metaphors (filed away, docket number, drawer that doesn't close).
  Excellent dignity-handling (Saturn home + Binah loss-as-form) but
  three variants on the same image. Replace v3 with a non-paperwork image:
  *"You added the loss to the inventory of things you carry. Inventories
  list. Grief weighs. The list got longer. The weight didn't move."*
- **§7.4 Ares × Aquarius Fail v1, v2, v3**: all three work the
  *re-drew the battlefield / line / map* image. Replace v3 with: *"You
  refused the order on principle. The principle is sound. The line was
  also sound. Both lost the moment."*
- **§7.6 Apollo × Capricorn Fail v1, v2, v3**: all three on
  *built/constructed the wrong approach* (climbing isn't tuning;
  temple's wrong center; plan wasn't the song). Replace v3 with a
  cleaner pivot to song-language: *"You built every measure of the
  scaffolding. The chord was meant to play in the open air, not inside
  the structure. The song needed less, not more."*
- **§7.7 Aphrodite × Pisces Fail v1, v2, v3**: all on *love-at-the-scale-
  of-the-sea / loved everything / nothing stayed specific*. The most
  collapsed variant set in the matrix. Replace v3 with: *"You wanted in
  the plural. The body wants in the singular. You diluted the want
  across many until none of them got fed."*

Below that, there are smaller cases of v3 paraphrasing v1 with a different
adjective. Those aren't urgent but a sweep would catch them.

### Tag inconsistency

The §7 deepened voice specs commit each avatar to specific tag-style
discipline. Spot-check across all avatars:

- **Hermes** ("not bare 'Pass.'"): clean. No bare "Pass." appears.
  Excellent.
- **Demeter** ("no Pass tag"): clean. Recognition-as-verdict held.
- **Athena** ("clipped affirmations: Cleanly seen, Earth-eyed work,
  Two-eyed work"): mostly clean. *"Aligned"* appears once in Apollo's
  spec, not Athena's; it doesn't appear in Athena cells. Athena's tags
  are sometimes absent (acceptable per spec).
- **Ares** ("Stands.", "Held."): clean.
- **Zeus** ("Yours.", "Generously taken.", "Recognized."): clean.
- **Apollo** ("So.", "Aligned.", "The chord stands."): clean.
- **Aphrodite** ("Yes."): clean. The single most disciplined tag in the
  corpus — *"Yes."* appears 24 times across the 36 pass cells.
- **Selene** ("Cycle held.", "Returns.", "Cycle held — your way of
  letting it."): clean.
- **Hestia** ("Warm.", "Kept.", "Still here." — or no tag): clean,
  though Hestia uses *no tag* most often, which the spec explicitly
  allows.

No tag-discipline failures. This is genuinely good work.

## MINOR findings (optional polish)

- The Sefirah heading on Selene reads "Yesod (Foundation / Intuition)"
  but reference docs use "Foundation / Subconscious." Cosmetic.
- §7.3 Athena Pisces row label reads *"Athena's 'home' but tonally her
  shadow"* — phrasing is unusual. The astrological claim (Neptune
  co-rules Pisces, Athena substituting for Neptune) is correct; the
  phrasing reads as if Pisces were a *home sign for Athena*, which
  isn't quite the dignity framing. Minor; the cell content is fine.
- The Hestia×Capricorn pass v1 (*"You built the walls. I keep the fire.
  We do different work for the same home."*) is excellent and could
  serve as a model line in the design doc itself.
- §7.6 Apollo's voice spec has *"Bright daylight clarity, not warm sun
  — somewhat detached. He sees all parts equally."* — strong design
  decision but it can read as "Apollo is cold" in some lines. Apollo
  × Aquarius pass v2 walks this line carefully: *"You retuned my
  lyre to a scale I don't usually use. Then you played a chord that
  worked anyway. Strange. Aligned."* — the *"Strange"* keeps Apollo
  warm enough. Worth preserving as a model.
- Hermes × Pisces player v1 (*"You're so quick, Hermes. I get there
  too — I just take a longer way around."*) is a model Pisces
  player-line: avatar-specific, sign-voiced, gentle. Use as the
  template for tightening other Pisces player rows.

## Mythological / astrological notes

(I sampled the corpus's specific epithet, myth, and dignity claims. Did
not exhaustively check.)

### Hermes-as-psychopomp
- Confirmed. The corpus invokes this in §7.1's voice spec ("walks souls
  down to Hades; only god besides Hades and Persephone who freely
  crosses between worlds"). The classical sources are clear: Homer's
  *Odyssey* book 24 opens with Hermes leading the suitors' ghosts to
  the underworld; the *psychopompos* epithet is well-attested in
  Diodorus Siculus and Pausanias. The "only god who freely crosses"
  framing is a slight overclaim — Iris also moves between realms in
  some traditions, and Dionysus retrieves Semele from Hades — but as a
  shorthand for game flavor it's defensible. The deepened voice spec's
  use of the trope (gravity beneath wit) is the correct dramaturgical
  read.

### Loxias as Apollo's epithet
- Confirmed. *Loxias* (Λοξίας, "oblique") is well-attested as an Apollo
  epithet specifically tied to Delphic ambiguity. Aeschylus (*Eumenides*
  19, *Agamemnon* 1074) uses it. The §7.6 grounding is exact.

### Glaukopis for Athena
- Confirmed. *Glaukopis* (γλαυκῶπις, "bright/owl-eyed") is Athena's
  most frequent Homeric epithet, deployed dozens of times in the *Iliad*
  and *Odyssey*. The voice-grounding ("sight language drawn from her
  Homeric epithet") is correct, and the "cluster *optiletis /
  ophthalmitis / oxuderkês*" the corpus cites is genuine — though
  *optiletis* is more obscure (it survives in Pausanias's account of
  Spartan cults). The grounding is solid.

### Spartan-chained-Ares tradition
- Mostly confirmed but with caveats. Pausanias 3.15.7 describes a
  statue of Ares Enyalios in chains at Sparta, with the explanation
  that "Ares would never run from Sparta." The interpretation
  *"chained to bind the chaos"* is the corpus's gloss; the source is
  more ambiguous (it could equally read as keeping Ares *in* Sparta
  for Spartan benefit, not binding chaos). The voice-decision (Ares as
  bound discipline rather than war-glutton) is dramatically right and
  defensibly grounded; the *interpretation* of the chains is one
  reading among several. Not a problem — just flag that the corpus
  treats one scholarly reading as authoritative.

### Aristotle "fire crackling = goddess laughing" for Hestia
- Could not directly verify the attribution to Aristotle. The image
  appears across late-antique and modern sources but the Aristotelian
  citation is weak — I could not find this specific gloss in the
  surviving Aristotelian corpus. It may be a later attribution (some
  sources credit it to Plutarch or to a Pythagorean tradition). The
  image itself is beautiful and works for Hestia's voice; the
  Aristotle citation in §7.10 should probably be softened to *"a
  classical gloss that the crackling..."* or *"a tradition (variously
  attributed) that..."* unless the author has a specific source.

### Sun exalted in Aries
- Confirmed. Standard Hellenistic/Ptolemaic dignity table: Sun is
  exalted at 19° Aries. The corpus uses this on Apollo × Aries
  ("the light moved toward you too" — exalted Sun-Aries reading is
  correct).

### Mars exalted in Capricorn
- Confirmed. Mars is exalted at 28° Capricorn (Ptolemy's
  *Tetrabiblos*). The corpus uses this on Ares × Capricorn ("strategic
  discipline") — dignity reading is exactly right; this is the Mars-as-
  Roman-Mars-of-discipline that §7.4 commits to, *and* it's the
  classical exaltation. Strong.

### Venus exalted in Pisces
- Confirmed. Venus exalted at 27° Pisces. The corpus uses this on
  Aphrodite × Pisces ("Aphrodite at her most divine") — and the
  voice-handling correctly reads this as the *Ourania* aspect of
  Aphrodite (heavenly love at the source) with the failure mode
  being *Pandemos-without-specificity* (loving the sea without loving
  any fish). This is the corpus's strongest single dignity-handling
  cell.

### Saturn exalted in Libra
- Confirmed. Saturn exalted at 21° Libra. The corpus uses this on
  Demeter × Libra and the cell handles it correctly (the just-scale
  weighing of grief).

### Mercury exalted in Virgo
- Confirmed. Mercury is *both* domiciled and exalted in Virgo (rare;
  some traditions only credit the domicile). The corpus uses *Mercury
  exalted* on both Hermes × Virgo and Athena × Virgo — exactly
  consistent with the Hellenistic table.

### Jupiter exalted in Cancer
- Confirmed. Jupiter exalted at 15° Cancer. The corpus uses this on
  Zeus × Cancer ("the way one mother receives from another") and
  handles it as a tender mother-resonance, which is the right
  dignity-coloring (Jupiter's overflow + Cancer's nurture).

### Moon exalted in Taurus
- Confirmed. Moon exalted at 3° Taurus. Selene × Taurus handles this
  correctly.

### Mercury falls in Pisces
- Confirmed. Mercury's fall is Pisces. Hermes × Pisces handles this
  excellently in v1/v2, weakly in v3 (see CRITICAL C1).

### Saturn falls in Aries
- Confirmed. Demeter × Aries (Saturn-falls) handles this correctly —
  the loss-runs-faster reading is exactly the Saturn-in-Aries pathology.

### Sun falls in Libra
- Confirmed. Apollo × Libra handles this correctly.

### Saturn detriments in Cancer / Leo
- Confirmed. Saturn detriments in Cancer and Leo. Demeter × Cancer
  and Demeter × Leo handle these correctly.

### Mars detriments in Taurus / Libra
- Confirmed. Ares × Taurus and Ares × Libra handle these correctly.

### Mars falls in Cancer
- Confirmed. Ares × Cancer handles this correctly.

### Venus detriments in Aries / Scorpio; falls in Virgo
- Confirmed. Aphrodite × Aries, Aphrodite × Scorpio, Aphrodite × Virgo
  all reflect this.

### Jupiter detriments in Gemini / Virgo; falls in Capricorn
- Confirmed. Zeus's row labels are exact.

### Moon detriments in Capricorn; falls in Scorpio
- Confirmed. Selene × Capricorn and Selene × Scorpio handle these
  correctly.

### Sun detriments in Aquarius
- Confirmed. Apollo × Aquarius handles this — and notably handles it
  *generously* (the dignity-detriment doesn't make Aquarius wrong,
  just *strange* — which is the right register for Apollo's oracular
  distance).

**Overall:** the dignity table the corpus uses is the standard
Hellenistic/Ptolemaic one, deployed accurately. No miscalibrations
detected.

## What's working well

A short list, kept brief on purpose so the author preserves these
patterns:

- **Tag discipline is exemplary.** Across 936 lines, every avatar's
  tag-style commitment is honored. This is rarer than it sounds in
  generated dialogue work.
- **Dignity-handling is the corpus's strongest single feature.** The
  dignity table is standard and correctly applied; the *interpretive*
  choices about what each dignity feels like in the avatar's voice
  are inventive and consistent. Aphrodite × Pisces (Venus exalted),
  Zeus × Cancer (Jupiter exalted), Demeter × Libra (Saturn exalted),
  Ares × Capricorn (Mars exalted) are all model cells.
- **The Hermes-and-Hestia complementary pairing** (Homeric Hymn 29
  framing) is felt across the matrix without ever being heavy-handed.
  Hermes is sharp; Hestia is warm. They share threshold/crossing
  domain but from opposite stances. That this comes through *in the
  generated lines themselves* and not just in the design doc is the
  best evidence the prompt-scaffold is doing structural work.
- **Hestia × Capricorn pass v1** (*"You built the walls. I keep the
  fire. We do different work for the same home."*) is, I think, the
  single best line in the corpus. It earns its keep on every axis:
  hearth-voice (Hestia), structural register (Capricorn's *Voice*),
  shared-home framing (Malkuth as starting node), companion-not-
  challenger (no verdict, just recognition).
- **The Persephone-resonance gloss on Demeter × Scorpio** is the
  single best dignity / mythic-resonance call in the doc. It
  unlocks the right register — descended-and-returned — for both
  Demeter and Scorpio at once.
- **The §3 sign capsules are, with one or two exceptions, the
  cleanest sign-personality work I've seen in a procedural-narrative
  context.** The four-field structure (Voice / Tension / Native /
  Reaction) is doing real work in the prompt scaffold and it shows in
  the lines.

Preserve carefully.
