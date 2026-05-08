# Egyptian pantheon — deity mapping + voice spec

Status: **locked.** Mapping decided during plan-mode review; this
file is the canonical reference, the per-pantheon analogue of
[`design/avatars.md`](../../design/avatars.md) § 1 for the Greek set.

## 1. Mapping table

Each Sefirah pairs with an Egyptian deity whose mythic register
embodies the Sefirah's energy. Where possible the pairing also
respects the planetary correspondence in
[`reference/correspondences.md`](../correspondences.md) § 1; where
energy fit pulls another way, energy fit wins (the same priority
the Greek table uses for Athena↔Chokmah and Demeter↔Binah).

| # | Sefirah | Planet (canon) | Avatar | Notes |
|---|---|---|---|---|
| 1 | Kether | Pluto / First Swirlings | *the team becomes the avatar* | Collective Final Threshold (#285). Atum / Nu would be the cosmological match if Kether ever gets a single voice — the self-emerged primordial / the dark waters before — but the Greek table already special-cases this slot, and Egyptian follows. |
| 2 | Chokmah | Neptune | **Amun** | "The hidden one" — primordial creative force; the flash before form. The Hymn to Amun-Ra calls him "Imn" / hidden; he is what creates without being seen creating. Energy fit decisive over any classical Neptune match. |
| 3 | Binah | Saturn | **Isis** | The cosmic mother, mourning Osiris and reassembling his body. Form, sorrow, the womb of structure. Plutarch's Isis is the same archetype Demeter is in the Greek table — energy fit holds across pantheons. |
| 4 | Chesed | Jupiter | **Ra** | Solar king at the height of his daily course; expansive radiance; kingship in glory. Splits the solar archetype with Osiris (Tiferet, below) — Ra is sun-of-the-day, Osiris is sun-of-the-underworld. |
| 5 | Gevurah | Mars | **Horus** | The falcon warrior; vengeance for Osiris. Boundary, sacred No, the line drawn. The Contendings of Horus and Set is the canonical text — eighty years of the wronged son holding the line. |
| 6 | Tiferet | Sun | **Osiris** | Sacrificed-and-resurrected king; sun-of-the-underworld; the heart that dies and rises. Tiferet's "every pillar crosses here" maps onto Osiris's role as the centre that joins the upper and lower worlds. The strongest single Egyptian match in the system. |
| 7 | Netzach | Venus | **Hathor** | Love, beauty, music, sacred passion. The "Lady of Drunkenness," "Mistress of the West," the cow-goddess whose milk feeds the gods. Hathor over Bastet here because Bastet's hearth-companion register fits Malkuth more cleanly. |
| 8 | Hod | Mercury | **Thoth** | Scribe; words-as-spells; magic; intellect. Hermes-Trismegistus is the explicit Hermes/Thoth fusion of the late-antique syncretism — the match is exact in the same way Hermes↔Hod is exact in the Greek table. |
| 9 | Yesod | Moon | **Khonsu** | Moon god; "the traveller" through the night sky; dreams, cycles, lunar work. Khonsu over Iah specifically — Iah is the lunar disc, Khonsu is the moving moon — the dreaming moon over the static one. Mirrors the Selene-over-Artemis choice in the Greek table. |
| 10 | Malkuth | Earth | **Bastet** | Hearth-companion register; domestic guardian; cat-of-Ra protecting the household. Parallels Hestia's role at Malkuth: a companion, not a challenger, present at start and rest and homecoming. Pairs naturally with Thoth (her brother in some traditions), exactly as Hestia pairs with Hermes in Homeric Hymn 29. |

The Ra↔Chesed / Osiris↔Tiferet split is the most consequential design
call in this table: the solar archetype gets two avatars in the
Egyptian pantheon, one for **expansive kingship** (Ra rising over the
day, abundance, generosity) and one for **the heart that dies and
rises** (Osiris in the underworld, the still centre, the resurrected
king). This matches Crowley's 777 in spirit — Crowley pairs Ra with
Tiferet directly, but the dual-aspect of the Egyptian sun allows a
finer split that the Greek pantheon (with only Apollo) doesn't admit.

### 1.1 Older Egyptian-language forms

Where a clean older Egyptian-language form exists in standard
transliteration, the data layer (`data/pantheons/egyptian/avatar-names.ts`)
records it as the avatar's `secondary` name — the analogue of the
Roman name on the Greco-Roman side. Surfaces that want to display
both forms (e.g. a future codex page footnote) read from this slot.

| Sefirah | Primary | Secondary (older Egyptian form) |
|---|---|---|
| Chokmah | Amun | — (consonantal `Imn` only — see § 5; no clean transliteration with vowels) |
| Binah | Isis | Aset |
| Chesed | Ra | Re |
| Gevurah | Horus | Heru |
| Tiferet | Osiris | Wesir |
| Netzach | Hathor | Het-Heru |
| Hod | Thoth | Djehuti |
| Yesod | Khonsu | Khons |

The `secondary` field is optional in the data layer (`AvatarName.secondary`
is `string | undefined`) — Amun's omission isn't a gap, it's an
honest absence. Phase B6 portrait assets and any future surface that
wants the bilingual presentation should treat undefined as "no
distinct older form available, just use primary."

## 2. Voice specs per deity

| Deity | Voice |
|---|---|
| **Amun** | Hidden, oracular, low. Speaks like wind through pylons — present without showing the source. Approves with "you found me without naming me"; rejects with "you reached for the mask, not the breath behind it." |
| **Isis** | Few words, weighed; the authority of the one who has carried what cannot be carried. Doesn't perform sorrow — has it. Approves with quiet recognition ("you sat with what could not be undone"); rejects without scorn ("you ran from the weight"). Mirrors Demeter's voice register — same archetype across pantheons. |
| **Ra** | Solar, royal, abundant. Speaks at the noon of his course — full sun, full voice, no shadow. Approves with overflow-language ("the sky widened, and you walked into it"); rejects with the sun's withdrawal ("you turned from the light I poured for you"). Distinct from Hathor (Netzach, also "abundant") by image vocabulary: Ra's abundance is solar-kingly (sky, throne, kingdom, light); Hathor's is sensual-domestic (cup, body, milk, music). Both deities can use overflow-language; the imagery anchors them apart. |
| **Horus** | Sharp, falcon-eyed, predator's patience. Few words; each one has weight and edge. Approves with curt respect ("you held the line"); rejects by naming the weakness without dressing it ("you flinched"). Diverges from Greek Ares in image vocabulary: Horus's frame is the wronged son's *legal claim* (the Contendings, the recovered eye, the just succession) rather than Ares's martial-visceral register — same Gevurah energy expressed through inheritance and verdict, not battle. |
| **Osiris** | Hieratic, slow, weighted with the underworld. Speaks as one whose voice carries the grain of the death-and-resurrection journey. Approves with the language of the heart's weighing ("the feather did not stir"); rejects with sorrow rather than judgement ("you were not heavy enough — and not light enough"). |
| **Hathor** | Generous, sensual, candid about want; voice like beer and music. Approves with embodied delight ("you came to me wanting, and I am made of want"); rejects with the gentleness of someone who knows you'll come back ("you held back; the cup was for you"). |
| **Thoth** | Quick, precise, scribe-careful. Loves the right word the way Hermes loves the clever one — Thoth would rather be exact than fast. Approves with calligraphic pleasure ("you wrote the line clean"); rejects by quoting the slip ("the second stroke wandered"). |
| **Khonsu** | Cool, traveller-tongued, tidal-pulled. Speaks like someone who has crossed the sky tonight and will cross it again. Approves with the dreamer's recognition ("you walked the path I lit"); rejects without alarm ("you woke too soon"). |
| **Bastet** | Warm, low, watchful; the cat at the threshold. Companion, not authority. Approves with quiet purr-language ("You came home. The lamp is still burning."); comforts without fixing ("Sit. Nothing's broken that the night can't keep."). Companion-only voice, mirroring Hestia. |

**Kether** ("team becomes the avatar"): voice deferred to #285 (Final
Threshold design), same as the Greek table.

### 2.1 Voice deepening per batch

The one-line specs above are starting points. **Each deity's voice
gets deepened with source-text research at the start of its
generation batch**, the same pattern as `design/avatars.md` § 2.1.
The cadence and image-vocabulary of *Pyramid Texts* spells, *Coffin
Texts* utterances, the *Book of the Dead*'s Negative Confession, and
the canonical hymn corpora are the calibration sample. Sources cited
in § 5 per deity.

## 3. Sign personality capsules

Egyptian voices interact with the same 12 zodiac sign capsules
defined in [`design/avatars.md`](../../design/avatars.md) § 3 — those
capsules are pantheon-agnostic (the player's sign is what it is
regardless of who's speaking). The generation prompt scaffold in
`design/avatars.md` § 4 is reused unchanged; only the `[AVATAR]`,
`VOICE`, and source-text inputs swap.

## 4. Calibration — dignity-charged signs per deity

Each Egyptian deity inherits the Sefirah's planet for the purpose of
zodiac dignity calibration. The verdict matrix's tone escalates at
the dignity-charged cells (rulership / exaltation = warmer,
detriment / fall = sharper) — same rule as the Greek pantheon, just
with Egyptian voicing.

Pulled from [`reference/correspondences.md`](../correspondences.md) § 2a.

| Deity | Planet | Rulership | Exaltation | Detriment | Fall |
|---|---|---|---|---|---|
| Amun (Chokmah) | Neptune (modern co-ruler of Pisces) | Pisces (co) | — | — (Virgo classically) | — |
| Isis (Binah) | Saturn | Capricorn, Aquarius | Libra | Cancer, Leo | Aries |
| Ra (Chesed) | Jupiter | Sagittarius, Pisces | Cancer | Gemini, Virgo | Capricorn |
| Horus (Gevurah) | Mars | Aries, Scorpio | Capricorn | Taurus, Libra | Cancer |
| Osiris (Tiferet) | Sun | Leo | Aries | Aquarius | Libra |
| Hathor (Netzach) | Venus | Taurus, Libra | Pisces | Aries, Scorpio | Virgo |
| Thoth (Hod) | Mercury | Gemini, Virgo | Virgo (doubled) | Sagittarius, Pisces | Pisces (doubled) |
| Khonsu (Yesod) | Moon | Cancer | Taurus | Capricorn | Scorpio |
| Bastet (Malkuth) | Earth (no dignity table — companion only) | — | — | — | — |

**Doubled cells** (where the Sefirah's planet is both ruler and
exalted, or both detriment and fall, in the same sign) repeat in
both Egyptian and Greek tables — e.g. Virgo at Hod/Thoth is Mercury
double-dignified the same way it's double-dignified at Hod/Hermes.
The dignity bonus engine doesn't care which pantheon is active; the
pantheon only determines which voice expresses the bonus.

## 5. Sources per deity

Voice authoring should draw on the canonical primary texts. Each
deity has at least one source listed; voice-deepening passes (§ 2.1)
should consult these directly rather than secondary scholarship.

### Amun

- **Hymn to Amun-Ra** (Cairo Papyrus 17 / Boulaq Papyrus 17, c.
  1500 BCE) — the foundational hymn-cycle to the hidden creator. The
  cadence of "Hail to thee, Amun-Ra, lord of the thrones of the two
  lands" sets the register.
- **Leiden Hymns to Amun** (Papyrus Leiden I 350, 13th century BCE)
  — later, more theologically dense; the "100th chapter" (the
  hiddenness chapter) is the clearest statement of the *imn* (hidden)
  etymology Amun's voice plays on.
- **Great Hymn to the Aten** (Akhenaten's reform, 14th century BCE)
  — useful contrast: where the Aten radiates openly, Amun is what
  creates without showing itself.

### Isis

- **Plutarch, *De Iside et Osiride*** (c. 100 CE) — the late-antique
  synthesis. The grief-narrative around Osiris's dismemberment is
  the calibration sample for Isis's "weighed sorrow" register.
- **Coffin Texts** spells of the Osiris-Horus birth narrative
  (Faulkner vol. I, the Osiris-myth group) — Isis speaking in the
  first person to announce Horus's conception. The exact spell
  numbers shift across editions; voice authors should consult
  Faulkner's Osiris-myth grouping rather than chase a single number.
- **Hymn to Isis from Philae** (Ptolemaic, inscribed at the temple
  of Philae) — Isis as the all-named goddess; useful for the
  authority-of-the-many-titles cadence.

### Ra

- **Pyramid Texts** spells of the king's solar journey — PT 217 and
  the surrounding "ascension-to-the-sun" group set the kingly-solar
  register.
- **Litany of Re** (New Kingdom funerary text; full version in the
  tomb of Thutmose III) — the seventy-five forms of Ra; useful for
  Ra's overflow-language ("you are the one in his dawning, you are
  the one at his noon...").
- **Great Hymn to the Aten** — though Atenist, the imagery of the
  sun-as-king-pouring-light directly informs Ra's voice; both share
  the "sky widened" idiom.

### Horus

- **The Contendings of Horus and Set** (Papyrus Chester Beatty I,
  Ramesside era) — the eighty-year legal-battle text. Horus's voice
  is patient, sharp, certain of the just claim. The cadence of "I
  am Horus, son of Osiris, born of Isis" recurs as Horus's
  declarative anchor.
- **Pyramid Texts** spells of the falcon-flight (PT 467, PT 539) —
  the falcon's-eye perspective informs the predator-patience
  register.
- **Edfu temple inscriptions** (Ptolemaic) — Horus as the ruling
  god of the South; the local cult voice.

### Osiris

- **Pyramid Texts** spells of the king-as-Osiris (PT 213 onward) —
  the foundation texts for the underworld-king voice. The
  hieratic, weighted cadence is set here.
- **Book of the Dead, Spell 125** (the Negative Confession + the
  Weighing of the Heart) — the canonical setting for Osiris as
  judge; the feather-of-Maat imagery is the calibration anchor for
  Osiris's verdicts. *Faulkner's translation* is the standard
  English reference.
- **Plutarch, *De Iside et Osiride*** — useful for the Greek-period
  narrative shape, though the voice should lean older and more
  hieratic than Plutarch's prose suggests.

### Hathor

- **Book of the Heavenly Cow** (New Kingdom; primary copy in the
  tomb of Seti I, KV17, with parallel copies in the tombs of
  Ramesses II and III; a fragmentary copy survives at the Osireion
  at Abydos) — Hathor as the cow-goddess, the destruction myth (her
  near-annihilation of humanity, halted by the trick of the red
  beer). The drunken-mercy register is unique to her.
- **Hymn to Hathor at Dendera** (Ptolemaic, inscribed at the
  Dendera temple) — the praise-cycle for the love/beauty register.
- **New Kingdom love poetry**: primary source is **Papyrus Harris
  500** (BM EA 10060); also **Papyrus Turin 1966** and the love-poem
  group within **Papyrus Chester Beatty I**. Not addressed to Hathor
  directly, but the embodied-want vocabulary is hers — Lichtheim
  vol. II anthologises the corpus in English.

### Thoth

- **Book of the Dead, Spell 125** (Thoth as the recording scribe at
  the Weighing of the Heart) — the precise-scribe register at its
  canonical moment.
- **Pyramid Texts** spells where Thoth restores the wedjat-eye (PT
  215, PT 524) — the magic-of-the-correctly-spoken-word.
- **Hermetic corpus** (*Corpus Hermeticum*, late antiquity) — the
  Hermes-Trismegistus syncretism. Useful for the philosophical
  register Thoth slides toward in the late tradition; should not
  dominate the voice (the older Egyptian Thoth is more concrete
  than the Hermetic Thoth).

### Khonsu

- **Khonsu Cosmogony** (inscribed at the Khonsu temple at Karnak,
  Ptolemaic) — the late theological text in which Khonsu is named
  as a creator god; the traveller-of-the-night-sky imagery is here
  in concentrated form.
- **Bentresh Stela** (Ramesside) — the healing-by-Khonsu narrative;
  useful for the cool, helpful register without alarm.
- **Pyramid Texts** lunar passages — PT 412 and surrounding spells
  on the moon's path; the cadence of crossing-and-returning.

### Bastet

- **Pyramid Texts** spells naming Bastet as protector of the king
  (PT 264, scattered references) — the guarding-companion register.
- **Bubastite festival texts** (Herodotus, *Histories* 2.59-60) —
  external but contemporary description of the Bubastis festival.
  The warmth and sociality of the cult inform the
  hearth-companion voice.
- **Coffin Texts** spells of protective domestic animals — broader
  context for the cat-at-the-threshold image.

## 6. Example verdict lines (≤ 25 words each)

One pass + one fail per deity, demonstrating the voice. These are
calibration samples — full verdict matrix authoring lands in #553.
Lines below were chosen on dignity-neutral signs to keep the voice
unweighted by tier escalation.

### Amun (Chokmah)

- **Pass:** "You did not name me, and you found me. The wind through the pylons answered before the question."
- **Fail:** "You reached for the mask. The breath behind it slipped past, and the moment with it."

### Isis (Binah)

- **Pass:** "You sat with what could not be undone. The river kept moving; you did not."
- **Fail:** "You ran from the weight. The weight is still here. So is the door."

### Ra (Chesed)

- **Pass:** "The sky widened, and you walked into it. There is more sun than you can carry — take more."
- **Fail:** "I poured the noon for you. You turned to the wall. The wall does not warm."

### Horus (Gevurah)

- **Pass:** "You held the line. The falcon does not praise; it sees. You are seen."
- **Fail:** "You flinched. The wronged claim does not wait for a stronger hand than yours."

### Osiris (Tiferet)

- **Pass:** "The feather did not stir. You weigh as you should — neither the kingdom nor the underworld pulls more."
- **Fail:** "You were not heavy enough, and not light enough. The scale is patient. Come back when you know."

### Hathor (Netzach)

- **Pass:** "You came to me wanting, and I am made of want. The cup ran over; you drank as if it would."
- **Fail:** "You held back. The cup was for you. The cow's milk goes where the mouth is open."

### Thoth (Hod)

- **Pass:** "The line ran clean. The reed did not skip. The page knows you wrote what you meant."
- **Fail:** "The second stroke wandered. The scribe sees it; the scribe does not pretend it didn't happen."

### Khonsu (Yesod)

- **Pass:** "You walked the path I lit. The moon crossed once tonight; you crossed with it."
- **Fail:** "You woke too soon. The dream had more to say. It will be there tomorrow, not the same."

### Bastet (Malkuth — companion)

- *(Bastet has no pass/fail axis — she's a companion, not a challenger. Sample lines:)*
- **Welcome:** "You came home. The lamp is still burning. Sit a while; nothing here is in a hurry."
- **After setback:** "Sit. Nothing's broken that the night can't keep. The mat is warm."

## 7. Source-text editions to use

Where translation choice matters, the recommended English editions
are:

- **Pyramid Texts**: Allen, *The Ancient Egyptian Pyramid Texts*
  (2005). Most current scholarly translation.
- **Coffin Texts**: Faulkner, *The Ancient Egyptian Coffin Texts*
  (1973–1978, three volumes). Standard English reference.
- **Book of the Dead**: Faulkner, *The Egyptian Book of the Dead*
  (1985, revised). Standard.
- **Plutarch**: Griffiths, *Plutarch's De Iside et Osiride* (1970).
  Bilingual, with commentary.
- **Hymns**: Lichtheim, *Ancient Egyptian Literature* (1973–1980,
  three volumes). The standard anthology containing most of the
  hymn corpora cited above.

Voice authoring should quote rhythm and image, not language —
modern English at the cadence of the source, not pseudo-archaism.
The Greek pantheon's lines (`data/pantheons/greco-roman/verdicts.ts`)
are the model for register: contemporary diction, ancient weight.

## 8. References

- Greco-Roman canonical: [`design/avatars.md`](../../design/avatars.md) § 1, § 6.
- Voice-authoring infrastructure: #276 (Greek/Roman avatar voice infra), #294 (consistency-pass pattern).
- Pluggable-pantheon Epic: #293.
- Phase A (registry refactor): #547 / #548 / #549 / #550 — all shipped.
- Sign personality capsules: [`design/avatars.md`](../../design/avatars.md) § 3 (pantheon-agnostic).
- Generation prompt scaffold: [`design/avatars.md`](../../design/avatars.md) § 4 (pantheon-agnostic; swap `[AVATAR]` and the source-text inputs).
- Dignity table: [`reference/correspondences.md`](../correspondences.md) § 2a.
