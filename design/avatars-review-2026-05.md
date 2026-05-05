# Avatars voice-consistency review — fresh independent pass (closes #294)

**Reviewer:** classical-humanities critic / dramaturg (subagent dispatch, 2026-05-05).
**Corpus reviewed:** `design/avatars.md` (743 lines, ~864 dialogue cells across 8 encounter avatars + Hestia companion matrix).
**Follows:** `design/avatars-review.md` (initial 2026-04-30 review attached to #276's closing). This is the **second, independent** literary pass requested by #294 — same brief, different reviewer instance, no carry-over of the prior findings into the prompt. Reads the corpus *after* the ~19 touch-ups from the first review were applied.
**Sources verified by web search:** Athena's *Glaukopis* (Wiktionary, Kosmos Society); Hermes as *psychopompos* and "freely crosses worlds" claim (theoi.com, Wikipedia); essential dignities for Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn (saturnandhoney.com, Wikipedia *Essential Dignity*); Apollo's *Loxias* (Wikipedia *Apollo*); Sappho Fragment 1 (Wikipedia *Ode to Aphrodite*, Poem Analysis); Selene/Endymion fifty Menai (theoi.com, Wikipedia *Endymion*); Demeter's nine-day torch-search (Theoi *Homeric Hymns*, Wikisource); Spartan chained-Ares statue (Wikipedia *Ares*, Sparta Reconsidered).

---

## Summary verdict

**Fix-then-ship.** The matrix is unusually disciplined for AI-assisted generation at this scale. The voice specs in §2/§7 are doing real work: the eight avatars are recognizable as eight distinct voices, the per-batch deepening research is visible in the choices (Hermes-as-psychopomp adding gravity beneath wit; Apollo's *Loxias* riddling preserved across all twelve signs; Aphrodite's Sapphic intimacy held), and the dignity table is correct everywhere I checked it.

Three recurring problems block ship-as-is, none of them structural:

1. **Voice-borrowing on the seam between avatars.** A handful of lines hand one avatar a signature image that belongs to another (Hermes carrying torches; Athena reaching for water-vision; Selene using parsing-verbs). These are the lines that would catch a reader's ear as "wait, who's speaking?"
2. **Variant collapse in the fail cells.** Pass cells stay angular across three variants more reliably than fail cells. The fail cells repeatedly use the same metaphor (the wrong staircase, the closed shell, the cold cup) across all three variants and trade only the verb.
3. **Player-line formula hardening for Capricorn and (less severely) Virgo.** "Specs, [god]" / "Itemize, [god]" appears in nearly every Capricorn player→avatar cell. The sign personality is recognizable but the *avatar specificity* of the player line — which is supposed to also reflect who they're speaking to — is gone.

The mythological grounding is mostly sound. Two outright miscalibrations to fix (one classical, one astrological-by-implication); a third worth a sentence in §1.1 if the author wants to defend it. None of these damages the whole — they'd land as line-edit notes in a copy pass.

---

## Per-avatar findings

### Hermes (Hod) — §7.1

**Voice integrity:** minor drift (3 lines).

The voice signature is clear and held: *crossed / road / threshold / weighed / parsed / trade* recurs across all 12 signs; the trickster-coded affirmations ("I'll allow it," "Crossed," "Trade") replace the bare "Pass." consistently. The psychopomp gravity is present where the spec promises it (Pisces v1, Scorpio v2 "underground crossing"). Issues:

1. **L307 — Aries pass v3:** *"You ran the road before I'd finished lighting it. The way was dark; you went anyway. Crossed by torchlight you brought yourself."* Issue: torches are not Hermes's iconography. They are Demeter's (the nine-day search of the *Homeric Hymn to Demeter* II.47–50, *aithomenas daidas meta chersin echousa* — "holding blazing torches in her hands") and Hekate's (joining Demeter at line 51 with her own torch). Hermes's light-image when he crosses, when classical sources give him one at all, is the *kerykeion* (caduceus) and his winged sandals — speed-images, not torch-images. The line gives Hermes another god's prop. **Suggested replacement:** *"You ran the road before I'd finished lighting it. The way was dark; you went anyway. The road yielded to the run, not the messenger."* (Cite: *Homeric Hymn to Demeter* II.47–50, in Theoi Classical Texts Library.)

2. **L317 — Aquarius pass v1:** *"You answered from an angle I didn't see coming. The riddle bends. Pass — the strange way."* Issue: this is the only Hermes line in the 108 cells that uses the bare word "Pass" as a tag — exactly the procedural stamp the voice spec at L290 says Hermes is "too clever for." The other two variants in the same cell ("Strange crossing," "We crossed sideways") show the right register. **Suggested replacement:** *"You answered from an angle I didn't see coming. The riddle bends. Crossed — the strange way."*

3. **L318 — Pisces pass v3:** *"...I'd argue with the route — but it landed. I'll allow it."* Borderline. "I'll allow it" is a Hermes affirmation in the spec, but here it follows "I'd argue with the route" which is conditional/judgmental in a way Hermes-the-trickster usually isn't (he just *crosses*; the trickster doesn't second-guess routes, he uses them). Not a critical fix; flagging as judgment call.

### Demeter (Binah) — §7.2

**Voice integrity:** pass.

The spec is tightest here and the matrix is the most consistent of the eight. Demeter's "doesn't perform grief — has it" reads through 36 cells. The "no Pass tag" rule is held perfectly. Sister-language for Cancer ("sister") and Scorpio ("Sister") respects the dignity-mirror framing. Two minor notes:

1. **L329 — player→Demeter Aries v3:** *"What's the cost? I'll pay it standing up."* Reads slightly more like an Ares-player line than a Demeter-player line — "standing up" is the boundary/posture-language of §7.4. The Aries-to-Demeter formula across the other variants ("be quick," "let me get on with it") leans on impatience-with-grief. v3 leans on warrior-stance. Fine, but if any line gets re-angled for distinctness, this is a candidate. **Suggested replacement:** *"What's the cost? Tell me while I keep moving. I'll pay it on the way."*

2. **Spec note on §1.1 / §2:** *"Demeter stopped the seasons over her loss"* (L82, L133) is repeated as a voice-grounding claim. Per the *Homeric Hymn to Demeter* II.305–333: Demeter caused famine and barrenness — she withheld grain — *until* the Zeus-brokered compromise restored Persephone for two-thirds of the year, which is when seasonal alternation *begins*. The seasonal cycle is the resolution, not the protest. The protest was famine. Most of the lines in §7.2 don't actually rely on this — they lean on the loss/grief, not the seasons — so this is a docstring quibble, not a line-by-line problem. **Suggested fix to §1.1 L80 and §2 L133:** *"stopped the seasons"* → *"made the earth barren"* (the seasons are the truce, not her weapon). Cite: *Homeric Hymn to Demeter* II.305–333; Foley, *The Homeric Hymn to Demeter* (Princeton, 1994), already in §8.

### Athena (Chokmah) — §7.3

**Voice integrity:** minor drift (1 line).

The sight-language signature is clean — *saw, see, vision, eye, look* recurs across all 12 signs, and the *Glaukopis* grounding (verified: γλαυκός + ὤψ, light-blazing-from-eyes, not just colour — Wiktionary, Kosmos Society) supports the "eye that strikes" cluster. *Two-eyed work / earth-eyed work / cleanly seen* — these tags do the work the bare-affirmation spec asks for.

1. **L376 — Pisces pass v1:** *"You knew without knowing how. That's the deep eye, the one I share with you under the water."* Issue: Athena under water is a category error against *Glaukopis*. The epithet means brightness blazing forth from the eyes (verified: Wiktionary; Kosmos Society *"Athena, Protector of Cities"* — "the point is not the colour of Athena's eyes but that they blaze forth light"). The cell-header even flags Pisces as her "shadow-home" — but the variant goes further than tonal shadow, putting Athena *in the water* as a mode of sight. That's Aphrodite (sea-born) or Selene (tidal) territory. The cell can deliver the same recognition (knowing-without-knowing) without giving Athena's eyes water as their medium. **Suggested replacement:** *"You knew without knowing how. The eye saw before the mind formed the seeing. Rare. Cleanly anyway."* (Keep v2 *"Below my surface, you saw what I saw. The strike came up through the water. We met in the air"* — that one works because Athena is *above* the water; v1 has Athena dwelling in it.)

2. **L370 — Virgo pass:** all three variants are paraphrases of "the order of operations was right." See paraphrase findings.

### Ares (Gevurah) — §7.4

**Voice integrity:** pass.

The "chained Ares" framing in the spec at L390–397 (Spartan tradition: the statue chained at the temple of Enyalios so the spirit of war doesn't leave the city — verified per Pausanias *Description of Greece* III.15.7, in Wikipedia *Ares* and the Sparta Reconsidered blog) lands cleanly: *line / edge / hold / bind / stand / yield* signature is held. No questions. No flowery imagery. The player-lines-as-soldier-reports framing at L399 is honored — every player→Ares line reads like a deferential subordinate ("Reporting, Ares," "Position me, Ares"). The fail-line *diagnoses-the-broken-discipline* pattern is consistent.

1. **L411 — Scorpio pass v3:** *"Hidden hold. Real hold. I don't usually see them. I see this one."* Borders on Athena's sight-tag ("I see"), but in context — Ares saying he doesn't *usually* see, that the rare visibility *is* the surprise — it holds to Ares-as-edge, not Athena-as-eye. No fix needed; noted as a near-miss the author got right.

2. **Variant uniformity in fail cells:** see paraphrase findings.

### Zeus (Chesed) — §7.5

**Voice integrity:** pass.

The xenia framing in the spec at L435–439 (verified: Zeus Xenios as protector of guest-host bonds, Iliad opens on a xenia violation — Wikipedia *Xenia (Greek)*, theoi.com Zeus) is doing real work in the fail lines: *"Hospitality has a clock too"* (L444 Taurus fail v1), *"Hospitality doesn't schedule"* (L452 Capricorn fail v3) — these are recognizably Zeus, not generic-paternal-deity. The cup/table/poured/kept signature holds across 36 cells.

1. **L443 — Aries pass v3:** *"You took without ceremony. Sometimes ceremony is the obstacle. You skipped it. Yours."* Slightly out of register: Zeus Xenios *is* the god of ceremony in receiving (the host-guest bond is ritual reciprocity — the Iliad's central war is caused by Paris breaking that ceremony). Zeus shrugging at ceremony in his approving voice undercuts the spec's "the gift binds both" gravity. v1 ("Strange way to receive, but the hand opened") and v2 ("Generous of both of us, in different ways") preserve the binding-tension. v3 dissolves it. **Suggested replacement:** *"You took it without waiting to be offered. Some receive that way. The cup empties either road. Yours."*

2. **L446 — Cancer pass v1:** *"You received my gift the way one mother receives from another — knowing what it costs to give. Generously taken."* Zeus speaking *as a mother* is a stretch but the cell deliberately cues it (Cancer ruled by Moon, mother-archetype) and Zeus-as-cosmic-parent is a defensible move (he is the cornucopia-giver, after all). Judgment call. I'd keep it; it earns the sister-frame the way Demeter×Cancer earns its own.

### Apollo (Tiferet) — §7.6

**Voice integrity:** pass.

The deepened spec at L460–479 — *Phoebus / Loxias / hekēbolos / Musegetes*, oblique-clarity, far-distance, lyre-as-cosmic-order — is implemented to spec. *Loxias* (verified: Wikipedia *Apollo*, λοξός = oblique, Delphic ambiguity preserved-by-design) is held especially in the Aquarius and Gemini cells where the riddling-as-frame works hardest. Tags ("Aligned," "The chord stands") replace literal "Pass."

1. **L487 — Leo pass:** all three variants converge on "the lion didn't perform / the light is light." See paraphrase findings.

2. **L490 — Scorpio pass v1:** *"You saw under and I saw far. We saw the same harmony from different sides."* Strong line. *hekēbolos* (far-shooter / far-worker, "from afar" — verified theoi.com Apollo, Wikipedia *Apollo* "god who threatened or sent from afar") is precisely Apollo's vantage. No issue.

### Aphrodite (Netzach) — §7.7

**Voice integrity:** pass.

The Sapphic-confidante framing (Fragment 1 / *Ode to Aphrodite* — verified: Wikipedia *Ode to Aphrodite*, Poem Analysis on the *poikilothron / doloplokos / "weaver of wiles"* tradition) is the most distinctive voice in the matrix. *Yes / named / said / opened / want* with body-language (*skin, mouth, breath, hand, hip*) is held across all 36 cells. The Ourania/Pandemos dual-aspect grounding (verified: Wikipedia *Aphrodite Urania* / *Aphrodite Pandemos*) lets the matrix range from sublime (Pisces, where Venus is exalted — verified) to bodily (Taurus, Venus rules — verified) without either feeling out of frame.

1. **L527 — Gemini pass v3:** *"Three names. One want. You found the agreement underneath the words. Most just stay in the words."* Borderline-Hermes voice — "underneath the words" / "agreement under the words" is hermeneutic-language, not desire-language. Defensible (Aphrodite-as-cunning includes language-craft, per *doloplokos*), but the line could equally have been spoken by Hermes. Judgment call.

2. **L536 — Pisces fail:** all three variants are paraphrases of "you diluted the want by un-specifying it." See paraphrase findings.

### Selene (Yesod) — §7.8

**Voice integrity:** minor drift (2 lines).

Most of the matrix preserves the Homeric Hymn 32 sweet-voiced/mild/luminous register cleanly. The Endymion grounding (verified: theoi.com *Selene*, Wikipedia *Endymion*, fifty Menai = lunar months per Pausanias) gives the longing/elegiac depth the spec promises. *Visit / return / cycle / orbit* signature is consistent.

1. **L575 — Virgo pass v1:** *"You parsed the dream and the parsing didn't break it. Most break the dream by parsing. You held it whole."* Issue: this is voice-blurring with Hermes. Hermes is the parsing god (Virgo-cousin, Mercury exalted in Virgo). Selene's job is to *visit*, not to comment on parsing as a method. The Selene-Virgo cell can recognize a Virgo player without using the Hermes-coded verb. **Suggested replacement:** *"You took the dream apart by phase and the dream stayed lit. Most lose the light when they catalog it. You didn't."* (Keeps the Virgo native — ordering, naming-the-parts — without giving Selene Hermes's verb.)

2. **L576 — Libra pass v1:** *"You weighed the dream against your day and let both be true. That's how you walk in moonlight. Returns."* Borderline — "weighed" is a scale-verb that lives in Apollo's signature (lyre-tuning) and Athena's signature (judgment-of-evidence). Selene weighing rather than receiving feels slightly off, but the closing ("walk in moonlight") pulls it back to her register. Judgment call.

3. **L578 — Sagittarius pass v2:** *"You aimed at meaning and the dream gave you both meaning and itself."* The *dream* gives, not Selene. Most Selene cells frame her as the actor (she visits, she shines, she returns); this one displaces the agency. Minor. Judgment call.

### Hestia (Malkuth, companion) — §7.10

**Voice integrity:** pass.

Hestia is the most distinct voice in the matrix — *fire, hearth, kettle, sit, stay, kept, warm* recurs every cell, and the "doesn't perform care; just provides it" line in the spec (L606) is honored consistently. The "fire keeps its own counsel" / "hearth doesn't interview its returns" Scorpio cell (L637) is the strongest single piece of voice-writing in the document.

No issues found.

---

## Per-cell paraphrase findings

The spec at L209 promises three variants per cell are *"different rhythm, image, angle"* on the same recognition. Most cells deliver this. The cells below have two or more variants that read as the same beat in different rhythms, not different angles on the same beat.

### Hermes × Capricorn fail (L316)

> v1: *"You built the wrong staircase very carefully. The answer wasn't at the top."*
> v2: *"You drafted the road. The road went somewhere. The answer was somewhere else..."*
> v3: *"You scaffolded the answer to perfection. The answer wasn't load-bearing here..."*

All three are "you carefully built the wrong structure." The metaphor (staircase / road / scaffold) varies, but the *angle* is identical: precision wasted on the wrong target. **Suggested re-angle for v3:** something using time rather than structure — *"You wanted the question in writing before answering. By the time the spec was approved, the riddle had moved on. Different question now."* (Re-angles to the temporal cost of Capricorn's deliberation, distinct from the spatial/structural error of v1+v2.)

### Athena × Virgo pass (L370)

> v1: *"You parsed and then you decided. Most don't make it to the second step. Cleanly done."*
> v2: *"You measured. You named. Then you struck. The order was right. Few keep it."*
> v3: *"Parse, see, decide, strike. Four motions, one continuous arc. Well done."*

All three are "the order of operations was right." v3 is essentially a list-form of v2. **Suggested re-angle for v3:** instead of restating the sequence, give Athena recognizing what Virgo got *without* the sequence — *"You knew the rubric and the strike at once. Most need the rubric to find the strike. You struck through the rubric. Cleanly seen."* (Different angle: not the order, but the integration.)

### Ares × Aries fail (L404)

> v1: *"You charged because charging is what you do. The discipline asked you to wait. You didn't."*
> v2: *"All motion. No edge. The line wasn't there because you didn't draw it."*
> v3: *"You moved when standing was the order. Different battle. Same loss."*

All three are "you moved when the discipline was to hold." v1 and v3 are nearly the same sentence with different pacing. **Suggested re-angle for v3:** put it at the diagnosis-of-after, not the same moment — *"The charge brought you somewhere. The hold would have brought you here. You're at the wrong place now. Reform."* (Same Aries-vs-discipline tension, different angle: the consequence rather than the act.)

### Zeus × Capricorn fail (L452)

> v1: *"You built a ledger before opening my hand. The gift went stale waiting to be entered."*
> v2: *"You needed a docket number for the gift. By the time the form was approved, the cup was empty."*
> v3: *"You wanted to schedule the receiving. Hospitality doesn't schedule. The cup gets cold while you're allocating."*

All three are "you bureaucratized the gift until it spoiled." Same beat, three near-paraphrases. The *imagery* differs (ledger / docket / schedule) but the *recognition* is identical. **Suggested re-angle for v3:** instead of restating the bureaucracy frame, put the failure at the relational level — *"You wanted to repay before receiving. The gift only works one way at a time. You held the door for the return-trip and missed the arrival."* (Different angle: not the delay, but the inversion of the gift-economy.)

### Apollo × Leo pass (L487)

> v1: *"You stood in my light and let it light you, not your performance. That's the lion at full noon."*
> v2: *"You held the throne and the sun at once. The throne caught the light, not the other way around. Aligned."*
> v3: *"My light. Your stance. Both true. The lion didn't perform. The light didn't have to."*

v1 and v3 say almost the same thing with rhythm rearranged ("the lion didn't perform" appears in both). v2 is the most distinct. **Suggested re-angle for v3:** push it toward the *song* register that the rest of Apollo's matrix uses — *"My light. Your stance. The chord between them played itself. You didn't have to strike it. Aligned."*

### Aphrodite × Pisces fail (L536)

> v1: *"You loved everything and named nothing. The naming is the holding..."*
> v2: *"Everything became want. Nothing stayed specific..."*
> v3: *"You wanted in the plural. The body wants in the singular. You diluted the want across many until none of them got fed."*

All three are "you diluted the want by un-specifying it." v2 is the cleanest; v1 and v3 are paraphrases of v2 with different verbs (named/specified/wanted-in-the-plural). **Suggested re-angle for v3:** instead of dilution-language, use the boundary-failure that Pisces-as-fall-of-Mercury makes available — *"You forgot which name was the want's. By the time you remembered, the want had moved into another body. Yours, briefly. Then someone else's."* (Different angle: the specificity-failure as identity-failure rather than dilution.)

### Selene × Capricorn fail (L579)

> v1: *"You waited for the dream at the time you'd planned. The moon was elsewhere..."*
> v2: *"You allotted the dream a time slot. The dream operates on lunar time..."*
> v3: *"You set an alarm for the visit. Alarms don't work on moonlight..."*

All three are "you scheduled the moon and she didn't keep your appointment." Three rephrases of the same beat. The alarm-vs-moonlight image (v3) is the strongest of the three — keep it. **Re-angle v1 instead:** *"You sat up to receive the dream at the hour you'd marked. It came two nights later. You'd already turned the page on the calendar. The visit knocked at a closed door."* (Different angle: the dream came, but to a player who'd moved on — moon kept the appointment, player didn't.)

---

## Cross-avatar sign-personality drift

For each sign, I read across all 8 avatars to check whether the player-personality holds. The signs below show drift; the others (Aries, Taurus, Cancer, Pisces) come through cleanly.

### Capricorn — formula-hardening across player→avatar lines

Capricorn's spec at L174 is "Structured, slow-climbed, deliberate; wants the spec in writing." That is a real personality. But across the 8 avatars, the player→avatar lines for Capricorn collapse into:

- L316 Hermes: *"Specs, Hermes. I work better with constraints."*
- L334 Demeter: *"Itemize, goddess. I'll account for each."*
- L374 Athena: *"Specs, Athena. I'll execute."*
- L413 Ares: *"Spec received. Execution begins. Stand by, Ares."* / *"Itemize the discipline, Ares."*
- L452 Zeus: *"Specify the obligation, father."*
- L492 Apollo: *"Specs for the chord, Apollo."*
- L534 Aphrodite: *"Specs for the want, goddess."*
- L579 Selene: *"Schedule the visit, Selene."*

Eight times "specs / itemize / specify / spec" used as the player's first move. The pattern *is* the Capricorn capsule, but it has hardened into a one-word formula that loses every avatar's specificity. **Suggested fix:** keep the formula in three or four cells where it lands strongest (Hermes, Athena, Ares — gods who deal in specifications natively), and re-angle the others. Examples:

- **Aphrodite Capricorn player line v2** could be: *"I want, Aphrodite. I want it on a long timeline and I want it sustained. Show me the slow burn."* (Capricorn personality intact; "specs" word dropped; engages with want-language.)
- **Selene Capricorn player line v2** could be: *"I'll keep the hour open, Selene. Not because I expect you on the dot. Because I want to be ready when you come."* (Drops the schedule-and-execute frame; honors the long-haul Capricorn-receives-the-moon angle.)
- **Apollo Capricorn player line v3** (currently *"Detail the structure, Apollo. I'll build the oracle properly."*) could be: *"I'll build the temple, Apollo. Tell me what to leave open. The oracle needs space to land."* (Capricorn-as-builder honored; opens the cell to Apollo's *Loxias* register instead of the spec-language register.)

### Virgo — same hardening, slightly less severe

L312, L334, L370, L409, L448, L488, L530, L575: "three reservations and a footnote" / "footnotes have footnotes" / "subclause two" / "spec the X" recurs. Less monolithic than Capricorn but in the same shape. The Virgo capsule (L170) is rich — *parsing, footnotes, asking-for-the-rubric* — and the matrix uses the rubric-language repeatedly without varying the Virgo *attitude*. **Suggested re-angle in one or two cells:** Virgo's Native is also "sees what others miss; catches hidden commas." That's not the same as "asks for a rubric." For example:

- **Aphrodite Virgo player line v3** (L530, currently *"List the imperfections with me, Aphrodite. I want to want correctly."*) could be: *"I see what's wrong with this want. I see what's right too. Help me hold both without choosing."* (Honors the parsing-into-parts capsule without using the rubric-formula.)

### Aquarius — formula-hardening at the construction level

The Aquarius capsule at L175 is *"angular, frame-questioning, detached; disagrees with the premise."* All 8 avatars implement this as some variant of "you re-derived the [thing] / you proved the [thing] should not exist / you drew a better diagram / you retuned the lyre to a scale you'd invented." Six of eight use *drew / re-derived* in the same construction:

- L317 Hermes fail v3: *"You re-derived the riddle into a new system."*
- L339 Demeter fail v1: *"You re-derived the loss into a new category."*
- L375 Athena fail v3: *"You re-drew the battlefield."*
- L453 Zeus fail v3: *"You drew a better diagram of what generosity should be."*
- L493 Apollo fail v1: *"You retuned the lyre to a scale you'd invented."*
- L535 Aphrodite fail v3: *"You drew a better diagram of love."*
- L580 Selene fail v3: *"You drew the moon as a map of light frequencies."*

Less severe than Capricorn (the *metaphors* do shift — diagram, lyre, map — by avatar). But the *grammatical move* ("you [verb-of-redrawing] the [domain]") is identical, and a player who sees more than one Aquarius cell will notice the formula. **Suggested fix:** in one or two cells, have the avatar describe the Aquarius failure *without* mirroring the player's reframing-move. For example, **Aphrodite Aquarius fail v3** (currently *"You drew a better diagram of love..."*) could be: *"You proved want was a construct. The body kept wanting anyway. You lost the argument with yourself in the most articulate way possible."* (The diagnosis is the same; the construction is different.)

### Sagittarius — honored, but cross-avatar emphasis narrows the capsule

Sag's capsule at L173 is "big-picture, philosophical, blunt-truth, archer-aimed." The player lines are good (the "I'm aimed at the next thing" / "tell me bigger" pattern is recognizable). But several Sag avatar-verdict fail-lines all moralize in the same direction: "you wanted philosophy, the body was here" / "you aimed at meaning, the answer was small."

- L315 Hermes Sag fail v2: *"You overshot. The truth was small..."*
- L337 Demeter Sag fail v2: *"You zoomed out until the loss looked small..."*
- L491 Apollo Sag fail v2: *"You shot at meaning. The song was at the body..."*
- L533 Aphrodite Sag fail v2: *"You wanted the meaning of want. Meaning is for after..."*
- L578 Selene Sag fail v2: *"You searched the dream for cosmic significance..."*

Five separate avatars, same beat: "the body / the small thing / the now is what matters; you chose meaning instead." It's correct, but the *cross-avatar* sameness suggests the matrix's collective view of Sag is narrower than the capsule. Judgment call: re-angle one or two cells to use the *other* Sag failure-mode (the capsule admits "names the bigger truth nobody asked for" — a *correctness* problem rather than a *scale* problem). For instance, **Aphrodite Sag fail v2** could be: *"You named what want is for. The naming is excellent. The wanting was waiting for you to stop naming."* — same Sag failure (names rather than does), different from the body-vs-meaning frame.

### Cancer — held cleanly. Pisces — held cleanly.

No issues found.

### Aries, Taurus, Gemini, Leo, Libra, Scorpio — held with minor variation

The strongest cross-avatar consistency is Aries (charging through 8 different gods reads as the same player) and Scorpio (the "what's under the question" / "I'll show you mine if you show me yours" pattern carries every cell). Leo's "audience / throne / center stage" has the most variation in vocabulary across avatars and lands well. No issues.

---

## Suggested ship list

In priority order. The first three are merge-blockers; the rest are polish.

1. **Fix Hermes × Aries pass v3 (L307).** Replace the torch image — torches belong to Demeter and Hekate, not Hermes (per *Homeric Hymn to Demeter* II.47–51). The voice-borrowing is the kind of thing a classicist will spot and trust the rest of the document less for. Suggested replacement above.
2. **Fix Athena × Pisces pass v1 (L376).** Athena under water is a category error against *Glaukopis* (light-blazing-from-eyes); v2 of the same cell already does the work without giving Athena's eyes the wrong medium. Suggested replacement above.
3. **Fix Hermes × Aquarius pass v1 (L317).** The bare *"Pass —"* tag contradicts the spec's L290 *"Hermes is too clever for procedural stamps."* One-word fix: "Pass" → "Crossed".
4. **Reduce the Capricorn "specs" formula** in player→avatar lines. Keep it in 3–4 cells where it lands (Hermes, Athena, Ares); re-angle 4–5 others to give each avatar a Capricorn player who's also engaging with *that* avatar's domain. Examples above for Aphrodite, Selene, Apollo.
5. **Re-angle one variant in each of the paraphrase-cluster cells** identified above (Hermes×Capricorn fail; Athena×Virgo pass; Ares×Aries fail; Zeus×Capricorn fail; Apollo×Leo pass; Aphrodite×Pisces fail; Selene×Capricorn fail). The fail cells are the worst offenders — the metaphor-recycling is most visible there.
6. **Update §1.1 L80 and §2 L133 Demeter rationale**: *"stopped the seasons"* → *"made the earth barren"*. The current phrasing conflates Demeter's protest (famine) with its resolution (the seasonal compromise after Persephone's return). Per the *Homeric Hymn to Demeter* II.305–333.
7. **Address Aquarius cross-avatar formula-hardening** in 1–2 cells. Less urgent than Capricorn; the capsule itself is so distinctive that the formula reads as "the Aquarius style" until the reader notices it's the same construction in every cell.
8. **Fix Selene × Virgo pass v1 (L575).** Replace the parsing-verb — "parsed" is Hermes's signature, and Selene saying it in her own voice blurs the seam. Suggested replacement above.

Anything below #8 is judgment-call territory: the Sagittarius-as-philosophy emphasis, the Selene×Libra "weighed" verb, the Selene×Sag dream-as-actor, the Zeus×Aries v3 ceremony-shrug, the Aphrodite×Gemini v3 hermeneutic register, the Demeter×Aries player v3 standing-up. The author wrote these lines with intent; a copy editor should consider them but the matrix doesn't depend on them.

---

## Sources cited in this review

- *Homeric Hymn to Demeter* II.47–51, 305–333 — Theoi Classical Texts Library; Wikisource (Hesiod, Homeric Hymns and Homerica/Hymn II to Demeter).
- Helen Foley, *The Homeric Hymn to Demeter: Translation, Commentary, and Interpretive Essays*, Princeton (1994) — already in the doc's §8 Demeter sources.
- Wikipedia: *Athena*, *Hermes*, *Apollo*, *Aphrodite*, *Selene*, *Endymion (mythology)*, *Ares*, *Xenia (Greek)*, *Essential dignity*, *Exaltation (astrology)*, *Ode to Aphrodite*.
- Wiktionary: γλαυκῶπις (*Glaukopis* etymology — γλαυκός + ὤψ).
- Kosmos Society: *Athena, Protector of Cities* (Glaukopis interpretation: "the point is not the colour of Athena's eyes but that they blaze forth light").
- theoi.com: Hermes, Athena, Apollo, Selene, Aphrodite, Zeus, Ares, Hestia (epithet surveys).
- saturnandhoney.com: *Domicile, Exaltation, Detriment and Fall* (essential-dignity table cross-check — used to verify dignity tags throughout §7).
- Sparta Reconsidered (blog): *"Nothing in Excess or Ares Chained"* (Spartan Ares-statue-in-chains tradition, citing Pausanias).
- Pausanias, *Description of Greece* III.15.7 (chained statue of Ares at Sparta — cited via Wikipedia *Ares*).
- Pausanias on Endymion / fifty Menai = lunar months — via Wikipedia *Endymion (mythology)*.
- Sappho, *Ode to Aphrodite* (Fragment 1) — Wikipedia *Ode to Aphrodite*; Poem Analysis on poikilothron / doloplokos / cunning epithet.
