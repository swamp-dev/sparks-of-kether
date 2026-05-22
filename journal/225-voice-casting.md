# Journal — #225 feat(voice): service evaluation + voice casting

Append-only. Never edit or delete past entries. One entry per `git push`
on this branch.

Ticket: https://github.com/swamp-dev/sparks-of-kether/issues/225
PR: (to be opened)

---

## 2026-05-22 — push 1: voice-config.json — all 22 characters cast

**Pushed:** `scripts/voice/voice-config.json` — full casting for 10 avatar voices
and 12 zodiac player-response voices.

**Service confirmed:** ElevenLabs (`eleven_multilingual_v2`, mp3 44100Hz 96kbps).
Recommendation from the ticket stands — 3,000+ library, best expressiveness for
distinct named characters, batch API, ~$6 for the full 864-clip run.

**Casting method:** Browsed the shared library by gender + use-case + keyword.
Ranked by clone count (quality signal). Matched against the register/delivery
specs in `design/voices.md`. All 22 assignments are unique.

**Conflict resolutions (shared candidates, one winner each):**

| Voice | Went to | Reason |
|-------|---------|--------|
| Arabella - Mysterious and Emotive | Selene | lunar/dreamlike register is the primary need; Pisces gets Priyanka (fluid/oceanic) |
| Hope - Poetic, Romantic | Cancer | Selene went to Arabella, freeing Hope for Cancer's tidal-undertow quality |
| Clyde - Full, Diplomatic | Hermes | nuance/humor is the best mercurial fit; Leo gets Donovan (theatrical authority) |
| Donovan - Articulate | Leo | Clyde taken by Hermes; Donovan's "caring authority, will stick with you" fills theatrical conviction |
| James - Husky and Bold | Taurus | deliberate modulated weight is Taurus not Sagittarius; Sagittarius gets Jon (warm philosophical) |
| Knox Dark - Methodical | freed (not used) | Ares got Adam (clipped/martial intensity); Capricorn got Declan Sage |
| Declan Sage - Wise | Capricorn | Kether went to Elariel X (ethereal/cosmic); Declan Sage's measured authority is Saturn-earth |
| Ellen - Serious, Direct | Aquarius | Aries got Titan (declarative fire); Ellen's clinical detachment is Aquarius not Aries |
| Ian Cartwell - Suspense | freed (not used) | Hermes got Clyde; Scorpio got Edward (lower/more controlled) |

**Hardest casts:**

- **Hermes**: The ElevenLabs library skews toward narrators and conversational AI voices —
  there's no trickster/quicksilver archetype at volume. Clyde's nuance and humor is the closest
  available. Can swap in a future session if a better match surfaces in the library.

- **Kether**: Needs "neither/blended, cosmic, beyond gender." Elariel X ("Epic Queen Ethereal")
  has the most elevated register in the library, and its otherworldly quality reads as
  transcendent rather than gendered. The runner-up Declan Sage is wise but too grounded/human.

**Easiest casts:**

- **Demeter → Autumn Veil**: The name alone is half the job. The "vulnerability meets
  grounded confidence, rich, velvety, deeply human" description is the grief-restraint spec verbatim.

- **Scorpio → Edward**: "Deep, low, seductive, strong British man" — compressed secretive register,
  zero ambiguity.

- **Virgo → Bill Oxley**: Documentary commentator voice. Parses rather than announces. Three
  reservations before the answer is in the DNA of the format.

---

## 2026-05-22 — push 2: PR #263 open

**Pushed:** Fix commit aligning `sample-voice.ts` outputFormat to 96kbps (was 128kbps — mismatch
with `voice-config.json` caught by code-reviewer). All quality checks green. PR #263 open,
waiting for CI.
