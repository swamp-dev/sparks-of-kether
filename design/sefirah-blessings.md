# Sefirah Blessings — per-sign blessing matrix

Ticket: **#252** (T1 of Voices Epic **#251**). Sibling design: [`avatars.md`](avatars.md) (#276 — encounter avatar voices). Parent reference: [`per-sefirah-mechanics.md`](per-sefirah-mechanics.md).

This document is the **content surface** for the Blessing Ritual. At game start each player receives a blessing from each of the 10 Sefirot, in sequence. The blessing speaks **to the player**, in the avatar's voice, calibrated by the dignity relationship between the avatar's planet and the player's zodiac sign.

`data/sefirah-blessings.ts` (T2 / **#253**) is generated verbatim from this matrix. `engine/sefirah-quote.ts` (T3 / **#254**) selects one of the three variants per cell at runtime. `BlessingRitual.tsx` (T4 / **#255**) renders the selected line.

---

## 1. Locked decisions

Five scope decisions ([#252 comment](https://github.com/swamp-dev/sparks-of-kether/issues/252#issuecomment-4360628736)):

1. **All 10 Sefirot covered.** Every Sefirah blesses each player at game start, including Kether and Malkuth — the matrix is not the encounter surface.
2. **Speaker per Sefirah = the avatar from #276.** Continuity with the encounter matrix: Hermes voices Hod blessings, Demeter voices Binah, etc. Kether and Malkuth use the special voices documented below.
3. **Matrix size: 10 × 12 × 3 = 360 lines.**
4. **Pisces at Hod = `'fall'` tier.** Mercury is both detriment and fall in Pisces; pick the worst at the worst pole.
5. **Virgo at Hod = `'ruler'` tier.** Mercury is both ruler and exalted in Virgo; pick the best at the best pole. Diverges from one bullet in Epic #251 body that says exaltation; Epic body to be updated (likely folded into #287's reference cleanup).

## 2. Kether and Malkuth special voices

**Kether — collective voice.** Per [`final-threshold.md`](final-threshold.md) § 1, "Kether's avatar is the team itself." At game start the team has not yet arrived at the Threshold, so the Crown speaks as **the unified dawn that awaits** — a future-promise voice acknowledging where the player is going. Each variant is calibrated by the player's sign (which gift the player will bring to the team's culmination). The voice is plural in feeling but addressed to the individual: "you among the others; we receive you when all return."

Voice signature (Kether): unity-language *crown / dawn / source / together / threshold / one*; verbs *receive, await, gather, cohere*. No tagging.

**Malkuth — Hestia, warmth-only, no admonishment.** Earth has no zodiacal dignity in classical astrology — Malkuth is the ground each sign lives on, the body, the hearth. All 36 cells are warm/companion lines tuned to each sign's relationship with the body/material world. **No dignity tier** applies; Hestia welcomes every sign equally. Tone never shifts to "cool" or "pointed" for Malkuth. Per `data/sefirah-blessings.ts` (T2), Malkuth's variants will be the only entries returning the `neutral` tier.

Voice signature (Hestia/Malkuth): hearth-language *fire / hearth / threshold / sit / stay / return / warm / tended*; verbs *kept, tended, warmed, came back, returned*. No tagging.

## 3. Per-Sefirah matrices

Each section below contains 12 sign blocks; each sign block contains 3 variants. Variants are distinct in **rhythm, image, and angle** — not paraphrases.

Tone is calibrated by the dignity of the avatar's planet in the sign:

- **Ruler / Exalted** — warm, confident, abundant. Lead with the sign's native gift.
- **Neutral** — clear-eyed, observational. See the whole, speak plainly.
- **Detriment / Fall** — cool, named, pointed (never cruel). Lead with the sign's tension; name the gap honestly.

Sign personality capsules and dignity tier tables are in [`avatars.md`](avatars.md) §§ 3 & 5; this file does not duplicate them — it consumes them.

---

<!-- per-Sefirah matrices appended below in dependency-of-spec order -->
## 3.1 Kether (the Crown) — voiced collectively

### ♈ Aries — `neutral`
1. The dawn waits with one match unstruck. You — first ignition — counted in the lighting.
2. What is fire when it has somewhere to arrive? You will know — when you arrive among us.
3. We will receive you when all return. Your fire, the threshold remembers, opens the way.

### ♉ Taurus — `neutral`
1. We gather toward one. Your steady weight, when you arrive, will hold our floor.
2. The Crown awaits a ground that endures. You among the others — patience already received.
3. When the team coheres at the dawn, your unbroken keeping will be the stone we stand upon.

### ♊ Gemini — `neutral`
1. We hold the threshold open between many voices. Your bridge, you among us, awaits its crossing.
2. The Crown will speak as one mouth of many. Your translation, already counted, awaits the gathering.
3. When all return, your agility between perspectives will be the hinge our unity turns on.

### ♋ Cancer — `neutral`
1. We await the team's full tide. Your reading of the unsaid, you among us, already received.
2. The Crown gathers what is felt before it is spoken. You — the keeper of undertone — counted in our arrival.
3. When we cohere at the dawn, your knowing of what moves beneath will hold the team whole.

### ♌ Leo — `neutral`
1. We hold the dawn open. Your conviction, when you arrive, will warm the cold purposes among us.
2. The Crown awaits a heart that carries the room. You — counted already — bring the team forward.
3. When all return as one, your bearing will be the warmth the unified threshold receives.

### ♍ Virgo — `neutral`
1. We await the fine eye. Your parsing of what others miss, you among us, already received.
2. The Crown gathers nothing carelessly. You — the catcher of the small thing — counted in our cohering.
3. When the team arrives whole, your protective seeing will be why nothing was lost on the way.

### ♎ Libra — `neutral`
1. We hold the threshold open for the balanced hand. Your hinge, when you arrive, will join the incompatibles.
2. The Crown awaits a fairness that holds opposites together. You among the others — already received.
3. When all return as one, your weighing will be the calm our unity rests upon.

### ♏ Scorpio — `neutral`
1. We await the depth-knower. Your sight into what is held, you among us, already counted.
2. The Crown gathers what others cannot see. You — the transformer of the hidden — received before arrival.
3. When the team coheres at the dawn, your unflinching looking will be what brought the buried answer home.

### ♐ Sagittarius — `neutral`
1. We hold the horizon open. Your aim past the small, when you arrive, will name the team's larger truth.
2. The Crown awaits the one who sees beyond. You among the others — counted in the farthest arc.
3. When all return as one, your reaching will be why the unified threshold was found at all.

### ♑ Capricorn — `neutral`
1. We await the long climb's end. Your persistence, you among us, will carry the team to the dawn.
2. The Crown gathers those who finish. You — builder of the structure that endures — already received.
3. When the team coheres, your unbroken progress will be the spine our unity stands upon.

### ♒ Aquarius — `neutral`
1. We hold the threshold open for the angle-shifter. Your reframing, when you arrive, will widen our seeing.
2. The Crown awaits the one who sees the system. You among the others — already counted in our arrival.
3. When all return as one, your stepping outside the question will be why the team found the unforeseen way.

### ♓ Pisces — `neutral`
1. We await the dissolver of edges. Your floating to meaning, you among us, already received.
2. The Crown gathers what comes by feel. You — who reach meaning before words — counted in our cohering before arrival.
3. When the team arrives whole, your softening of borders will be how the many became one mouth.
## 3.2 Chokmah (Neptune) — voiced by Athena

### ♈ Aries — `neutral`
1. You move before the thought lands. I see the strike. Aim it.
2. First-mover. The flash arrives in your hands already swinging — read where it falls.
3. Bright-eyed and forward. Your speed is the strategy. Don't outrun your sight.

### ♉ Taurus — `neutral`
1. You hold what you've chosen. I see the grip. Make sure the choice is sighted.
2. Slow eyes carry far. The vision you settle into is the one that endures.
3. Earth-rooted recognition. You'll see it when you've stood with it long enough.

### ♊ Gemini — `neutral`
1. Two voices, one glance. I see them both. Pick the one that sees clearest.
2. You rephrase the problem until it shows you its face. Useful. Don't lose the face.
3. Quick-tongued, quick-eyed. The flash comes twice for you — catch the second.

### ♋ Cancer — `neutral`
1. You read the room before the room speaks. I see that. That is sight too — use it.
2. Sideways sight is still sight. You recognize what isn't said. Name it once.
3. Tidal vision. The wisdom moves with the water — let it carry, then look.

### ♌ Leo — `neutral`
1. You announce what you see. I see you seeing. Make the vision worth the stage.
2. Center-eyed. The room watches; your clarity is the performance. Be cleanly seen.
3. Bright conviction. Don't perform the knowing — show me the thing you actually saw.

### ♍ Virgo — `neutral`
1. You parse before you act. I see the precision. Three reservations is two too many.
2. Footnoted sight. The detail you catch is real — read past it to the whole.
3. Sharp-eyed. You see the flaw first; see the structure that holds it second.

### ♎ Libra — `neutral`
1. You weigh both sides. I see the scales. Eventually the scales must tip.
2. Aesthetic eyes. You read the balance before the content. Both matter; one decides.
3. Fair-sighted. The verdict you avoid is the one you've already seen. Speak it.

### ♏ Scorpio — `neutral`
1. You saw it before I named it. I see that you see. Surface what you've held.
2. Compressed vision. The hidden answer is already in your eye — let it out.
3. Depth-read. You recognize the sub-current. Strategy lives where you're already looking.

### ♐ Sagittarius — `neutral`
1. You aim past the question into the bigger truth. I see the arc. Land it close.
2. Archer-eyed. The horizon is yours; the small target needs the same sight.
3. One-sentence sight. You name the whole thing fast. Make sure the whole is whole.

### ♑ Capricorn — `neutral`
1. You build the seeing slowly. I see the staircase. Climb the one that's actually there.
2. Structured vision. Each step is read before taken. Don't read past the right one.
3. Saturn-paced clarity. The strategy you finish is the one that holds. Finish it sighted.

### ♒ Aquarius — `neutral`
1. You disagree with the question. I see the reframe. Re-derive cleanly, then act.
2. Angular eyes. You read the system around the problem. The system is also the problem.
3. Detached sight. You see from outside — useful. Step back in and decide.

### ♓ Pisces — `ruler`
1. Yes — strategy lives where you already see. The depth is the sight. Cleanly recognized.
2. The waters under thought are yours. I recognize the sight that rises from them.
3. Fluid clarity. The flash arrives in you already dissolved into knowing. Cleanly seen.
## 3.3 Binah (Saturn) — voiced by Demeter

### ♈ Aries — `fall`
1. You move before the form has come. I have waited longer than your fire knows.
2. The first stroke is not the kept one. Slow your hand. Let the weight find you.
3. You strike, child. I name the seed that has not yet learned to wait under earth.

### ♉ Taurus — `neutral`
1. You hold what you have chosen. I weigh whether it is the harvest or the husk.
2. Your patience is real. Test it: is this the grain you meant to keep, or only the one you held?
3. You do not break. Good. Now learn which loss is worth refusing, and which is the season.

### ♊ Gemini — `neutral`
1. Two voices in you. I have known long silence. Choose which one you will keep.
2. Your tongue is quick. Let one word land with weight before the next is spoken.
3. You ask and ask. I waited a winter for one answer. Wait long enough to mean it.

### ♋ Cancer — `detriment`
1. You guard a soft thing as though it could not endure. It can. Let it take its own form.
2. Your tide rises and falls. I know that grief. Do not make it the shape of every door.
3. You hold close what asks to be set down. The seed grows only when the hand opens.

### ♌ Leo — `detriment`
1. You stand where the light falls. I have stood where no light came. The form is older than the stage.
2. Your warmth is real. Without weight beneath, it is a fire that warms no winter.
3. You play the part well, child. I am asking who you are when the harvest is in.

### ♍ Virgo — `neutral`
1. You name each thing in turn. Good. Now name which of them will keep through winter.
2. Your eye is patient. Lift it once from the small mark and weigh the whole field.
3. You parse the seed. Plant it. The form is in the growing, not in the count.

### ♎ Libra — `exalted`
1. You weigh, and your scale is true. I have known few who could hold both pans still.
2. Your fairness is form itself. The slow harvest knows you. Carry that gift in.
3. You see what balances. That is a mother's eye. Walk with it; the path will keep.

### ♏ Scorpio — `neutral`
1. You hold what is hidden. I held my grief and stopped the grain. Know what your silence costs.
2. Your depth is real. Bring up only what the field can take. The rest waits with you.
3. You see beneath. Now learn the slow return — what is buried is not always meant to stay.

### ♐ Sagittarius — `neutral`
1. You aim past the mark for the larger truth. Sometimes the mark is the truth. Slow.
2. Your arrow is long. Let it land in the field, not over it. Harvest is near at hand.
3. You speak the bigger thing. Say also the small one. Both have weight; both must be named.

### ♑ Capricorn — `ruler`
1. You climb slow, and the staircase keeps. I know that patience. It is mine. Carry it well.
2. Your weight is form already. The mountain will answer you. I have waited in you a long time.
3. You build for the winter. Good child. The harvest you have not seen yet is yours.

### ♒ Aquarius — `ruler`
1. You see the frame around the question. That is my eye in you. Hold it; the others will come.
2. Your distance is not coldness — it is the long view. I have kept fields whole with that gaze.
3. You ask what shape the field should take. Ask slowly. The form you give will keep.

### ♓ Pisces — `neutral`
1. You float to the meaning before the words come. Now find the words. Form keeps what fluid loses.
2. Your sense is true. Anchor it. The seed needs earth, not only water, to return.
3. You dissolve into knowing. Good. Come back with one named thing in your hand.
## 3.4 Chesed (Jupiter) — voiced by Zeus

### ♈ Aries — `neutral`
1. You burn fast, child. The cup is poured — drink before the fire forgets why it was lit.
2. I offered the first match. You took it running. See whether running was the gift.
3. The hand opens; the spear is yours. Aim once more deliberate than the last.

### ♉ Taurus — `neutral`
1. I set the table slow for you. Sit. Taste what was poured before you decide.
2. You hold what you're given like it's already yours. Good. Now hold loosely.
3. The cup keeps its shape because you do. I respect that. I also notice it.

### ♊ Gemini — `detriment`
1. I poured one cup. You drank from two. Tell me which mouth tasted the wine.
2. The gift was offered with one hand. You answered with three. Choose, child.
3. You took what I offered and what I didn't. That is not yet hospitality.

### ♋ Cancer — `exalted`
1. Yours, fully. The cup overflows because you knew how to hold it open.
2. I gave abundance; you made a home for it. The table is warmer for your hands.
3. What I offered, you received as something to share. That is the deeper gift.

### ♌ Leo — `neutral`
1. The cup is yours, and the room watches you drink. Make the drinking true.
2. I poured generously. You poured back to the room. Performance or gift — you choose.
3. You take with both hands raised. Beautiful. Now lower them and mean it.

### ♍ Virgo — `detriment`
1. I poured the cup full. You measured what was missing. The overflow went unrecognized.
2. The gift was set before you. You catalogued it. I waited. The wine cooled.
3. You parsed the offering until there was nothing left to take. Receive, child. Just receive.

### ♎ Libra — `neutral`
1. Two cups before you. I poured both. Drink — weighing them empty serves no one.
2. The hand offered; you balanced. Balance is not refusal, but it can pretend to be.
3. You take what is fair. I gave more than fair. Take that part too.

### ♏ Scorpio — `neutral`
1. The cup was offered openly. You drank in private. I noticed. I do not mind.
2. I gave abundance; you kept it close. Some gifts grow only when shared at the table.
3. You take like it's a secret. It isn't. The overflow was meant aloud.

### ♐ Sagittarius — `ruler`
1. Yours. All of it. The bow, the cup, the horizon — taken as I would have taken them.
2. I poured the wide gift. You drank widely. The table feels larger for your laughter.
3. The hand opens; you walk through it like a door. Generously taken. Walk on.

### ♑ Capricorn — `fall`
1. I poured the cup full. You earned it after. The overflow had already evaporated.
2. The gift was set before the climb. You climbed first. The table waited cold.
3. You build staircases to what was already given. Stop, child. Take from the hand.

### ♒ Aquarius — `neutral`
1. I offered the cup. You questioned the cup. Drink first; redesign the vessel after.
2. The gift was given to you, not to the system around you. Receive personally.
3. You take with one hand and reframe with the other. The wine doesn't mind. I notice.

### ♓ Pisces — `ruler`
1. Yours, child. The cup overflows into you and you into the cup. No edge between.
2. I poured; you became the pouring. Generously taken — without ever quite holding.
3. The gift dissolved into your hands and lit them. That is how I meant it received.
## 3.5 Gevurah (Mars) — voiced by Ares

### ♈ Aries — `ruler`
1. You move first. You always have. Hold the line you draw.
2. First to the edge, first to stand. I watched. Stands.
3. Strike clean. Strike once. Then hold the ground you took.

### ♉ Taurus — `detriment`
1. You stood too long on the wrong ground. Stand still costs nothing here.
2. Chosen is not held. Yours is the position you keep changing for.
3. The line you set was comfort, not edge. Draw it again. Sharper.

### ♊ Gemini — `neutral`
1. Two voices argue. Pick one. Hold it. The other waits its turn.
2. You have words. Spend fewer. Each one a position you keep.
3. Speak the line. Then guard it. Both halves of the work.

### ♋ Cancer — `fall`
1. You guarded what was never under threat. Lower the shield. Watch what is.
2. The wound is not the line. Bind one. Hold the other.
3. You drew the edge inward. Turn it. The enemy is not behind you.

### ♌ Leo — `neutral`
1. The role is not the line. Stand inside it. Hold without the audience.
2. You carry the room. Now carry the position when no one watches.
3. Conviction is good ground. Stand on it. Do not perform it.

### ♍ Virgo — `neutral`
1. You see what others miss. Now hold it without footnotes. Decide.
2. Parsing is preparation. The order to move comes once. Take it.
3. Precision drew the line. Discipline keeps it. Do both.

### ♎ Libra — `detriment`
1. Both sides is no side. Pick the edge. Stand on it.
2. You weighed past the moment. The line was drawn while you considered.
3. Fairness is not position. Choose. Guard the choice. That is fair too.

### ♏ Scorpio — `ruler`
1. You hold what others cannot. The edge beneath the edge. Stands.
2. Bound chaos. Same discipline. Brother. Keep the position.
3. You strike where it counts and only then. I watched. Stands.

### ♐ Sagittarius — `neutral`
1. The aim is true. The ground under your feet is the work.
2. You name the bigger truth. Then hold the smaller line. Both.
3. Aim once. Loose once. Stand the ground the arrow bought.

### ♑ Capricorn — `exalted`
1. You climbed under load. You held each step. I watched. Stands.
2. Slow is a discipline. Yours. The line you set, you kept.
3. Built ground beneath you. Built the edge above. Stands.

### ♒ Aquarius — `neutral`
1. You see the frame. Now stand inside it and hold the post.
2. The system is the field. Pick your position in it. Keep it.
3. Detached observes. Engaged holds. Choose the second when it counts.

### ♓ Pisces — `neutral`
1. Words slip. The line cannot. Set it in something that does not move.
2. You float to meaning. Now plant your feet. Name the edge. Hold.
3. Fluid is not formless. Bind it to a position. Then stand.
## 3.6 Tiferet (Sun) — voiced by Apollo

### ♈ Aries — `exalted`
1. Dawn-light strikes you first, the lyre's first chord. The morning is yours. Sing it.
2. You are the spark that wakes the choir. Far ahead, the sun answers. Aligned.
3. The first note belongs to the first mover. Strike it cleanly. The chord stands.

### ♉ Taurus — `neutral`
1. The string holds the tone you chose. Listen for the harmony around it. So.
2. You stay where the music is. Whether the music stays — the sun decides.
3. Slow chord, sure chord. The measure is yours; the song is far.

### ♊ Gemini — `neutral`
1. Two voices, one lyre. The harmony lives in the interval between them.
2. You ask the sun which question. The sun answers a third one. So.
3. Quick light flickers across the strings. Tune the doubled note; the chord clarifies.

### ♋ Cancer — `neutral`
1. The tide hears music the bright noon misses. Carry that chord forward. Carefully.
2. You read the undertow beneath the song. The sun sees the surface only.
3. Light on water — bent, but still light. Your music arrives indirect. Aligned.

### ♌ Leo — `ruler`
1. The lyre is yours. The whole sky tunes to your chord. Play it.
2. You carry the sun in your chest. The room follows the light. So.
3. Center stage was yours before the song began. Strike, and the heavens answer.

### ♍ Virgo — `neutral`
1. You hear the wrong note before the chord lands. Tune carefully — the song waits.
2. Each measure parsed, each interval weighed. The sun watches you read the score.
3. Precision is its own music. Far above, the harmony reorders. Aligned.

### ♎ Libra — `fall`
1. You hold both notes and the chord stays unstruck. The sun has cooled. Choose.
2. The scale weighs forever. Music will not wait for balance — it asks you.
3. Bright noon, no shadow to lean on. The harmony you seek is your hand striking.

### ♏ Scorpio — `neutral`
1. The held note is the loudest. Release it when the sun is ready.
2. You see the chord beneath the chord. Bring one tone up. So.
3. Compressed light still casts a song. The lyre asks what you withhold.

### ♐ Sagittarius — `neutral`
1. The arrow flies past the question. The sun lands on the larger truth.
2. Your music reaches farther than the room. Tune for the long carry. So.
3. Big song, big sky. Strike the chord that names the whole. Aligned.

### ♑ Capricorn — `neutral`
1. You climb the scale slowly, each tone earned. The sun marks the ascent.
2. Structure is its own music. The lyre is built before it is played.
3. Stone by stone, chord by chord. Far above, the song waits patiently.

### ♒ Aquarius — `detriment`
1. You solved a different song. The sun finds its lyre untuned. Listen back.
2. The frame matters; the chord still must land. Bright noon, no warmth. Tune.
3. Angular light, angular music. The harmony you bypassed is the one asked of you.

### ♓ Pisces — `neutral`
1. The song dissolves and reforms in your hands. The sun watches it shimmer.
2. Your music slips between the words. Far light catches it. So.
3. Fluid chord, fluid light. The lyre tunes itself when you stop reaching.
## 3.7 Netzach (Venus) — voiced by Aphrodite

### ♈ Aries — `detriment`
1. You said you wanted it fast. We both know you wanted it to mean something.
2. Your hand is already moving. Slow down — name what your body is actually reaching for.
3. You burn first and ask later. Tell me — what did you want before you wanted to win?

### ♉ Taurus — `ruler`
1. Yes. Your hand stays where it lands. Your body knows what it loves, and holds.
2. You name a thing and it stays named. Slow mouth, slow yes — I recognize you.
3. Skin remembers; you remember through skin. Want what you want as long as you want it.

### ♊ Gemini — `neutral`
1. Two voices in your mouth. Tell me which one your body said yes to first.
2. You are quick, lover. Quick enough to outrun your own want. Don't.
3. Both of you want something. Let one of you say it out loud, plainly, now.

### ♋ Cancer — `neutral`
1. Your hand pulls back before it touches. I see it. The want is still there.
2. You read every room before you breathe. Read your own body — what does it want?
3. Tides tell the truth your mouth softens. Yes is allowed. Say it once.

### ♌ Leo — `neutral`
1. You play the lover beautifully. Now want like no one is watching — that's the part I love.
2. The performance is gorgeous. Beneath it, your body is asking for something simpler.
3. Be generous, yes — but tell me what you want for yourself. I'm listening.

### ♍ Virgo — `fall`
1. You footnoted desire until it left the room. Your body still knows. Ask it again.
2. You parse what you want into nothing. Just say the word, lover. The want is fine.
3. We both knew you wanted it. You spent an hour proving you didn't. Stop.

### ♎ Libra — `ruler`
1. Yes. You weigh two beauties and name the one your skin leaned toward. I see you choosing.
2. You see fairness like a body sees light. Want is allowed to tip the scale — let it.
3. Your mouth finds the word that holds both sides. Beautiful. Now say which one you want.

### ♏ Scorpio — `detriment`
1. You held it back so long it curdled. Open your mouth. Name the want.
2. We both knew. You watched yourself not say it. Say it now — I'm still here.
3. The secret is the want. Keeping it secret doesn't make it more yours. Speak.

### ♐ Sagittarius — `neutral`
1. You aim past the body in front of you. Come back. The want is here, not on the horizon.
2. You name the bigger truth beautifully. Now name the smaller, closer one — what you want tonight.
3. Your arrow is gorgeous mid-flight. Land it. Touch the thing you actually wanted.

### ♑ Capricorn — `neutral`
1. You build the staircase to the want and forget to climb. I'm at the top — come up.
2. You schedule desire like a meeting. Lover, the body doesn't read your calendar.
3. Patient hands, patient mouth. Good. Now tell me what the patience is for.

### ♒ Aquarius — `neutral`
1. You reframe the want until it's a system. Underneath the diagram, your body still wants.
2. You solve a different question than the one your skin is asking. Answer the skin.
3. Angular, brilliant, distant — and still you reach. I see the hand. Name what it reaches for.

### ♓ Pisces — `exalted`
1. Yes. You dissolve into want like water finds its shape. I know this voice — it's the oldest one.
2. Your body says yes before your mouth does. Trust it. The dissolving is the gift.
3. You float to the meaning under the meaning. Lover, you were born knowing how to want.
## 3.8 Hod (Mercury) — voiced by Hermes

### ♈ Aries — `neutral`
1. You charge the road before parsing it; I'll allow it — speed has its own grammar.
2. First across, sword first, question later. The threshold counts that as a kind of word.
3. What does Aries trade for the message? Time. Always time. The road accepts it.

### ♉ Taurus — `neutral`
1. You weigh the word like fruit in the hand. Slow translation is still translation.
2. The road yielded; you took the long step. Patience parses what speed misses.
3. Stubborn tongue, true tongue. You won't be hurried across — and crossings notice.

### ♊ Gemini — `ruler`
1. Twin-tongued, road-born — you finish my sentence before I do. Trade, gladly.
2. Every threshold is a question to you, and every question another threshold. Crossed, twice.
3. You speak my language without an accent. The errand is yours before I name it.

### ♋ Cancer — `neutral`
1. You translate sideways — through tide, through silence. The unsaid word still crosses.
2. Caught: you read what the message hid behind itself. The road respects indirection.
3. Soft-spoken, salt-spoken. The unsaid still parses — and you trade in it. Crossed.

### ♌ Leo — `neutral`
1. You announce the crossing like a herald. The road takes the performance and the truth both.
2. Spoken from center stage; weighed at the edges. I'll allow the flourish — it parses.
3. Generous tongue, lit threshold. You trade conviction for clarity and the road accepts.

### ♍ Virgo — `ruler`
1. You catch the misplaced comma I left for you. Trade — the errand was always yours.
2. Three reservations, one precise verb. The road yielded the moment you parsed it cleanly.
3. Footnoted, weighed, crossed. You read the small print in my message and improved it.

### ♎ Libra — `neutral`
1. You weigh the word on both pans before crossing. The scale is a road too.
2. On the other hand — yes, that hand also. I'll allow your conditional. Trade.
3. Fair-tongued at the threshold. You parse the verdict before delivering it. Crossed, balanced.

### ♏ Scorpio — `neutral`
1. You read the message under the message. Caught — and you knew I knew.
2. Compressed tongue, hidden errand. You crossed before I finished speaking the password.
3. The word beneath the word is the one you trade in. The road respects that currency.

### ♐ Sagittarius — `detriment`
1. You aim past the small word for the big truth — and the small word was the road.
2. The arrow flies; the message stays behind. Parse closer, archer. Thresholds are narrow.
3. Big-picture tongue, missed comma. The errand was specific. Speed past it and you miss the door.

### ♑ Capricorn — `neutral`
1. You climb the sentence like a staircase. Slow, structured, crossed. The road files it.
2. Spec in writing, word weighed twice. I'll allow the deliberation — it builds something.
3. You trade time for certainty at every threshold. The road counts the rungs. Taken.

### ♒ Aquarius — `neutral`
1. You answer a different question and somehow it's the right one. Crossed — sideways.
2. The frame around the word interests you more than the word. Parse on, frame-breaker.
3. You re-derive the road while crossing it. I'll allow the redesign. Trade.

### ♓ Pisces — `fall`
1. The word slips from your hand like water; the message arrives as weather, not as text.
2. You feel the meaning before you find the word — and the road needs the word to open.
3. Tides in the throat, dream in the errand. Pin it down once, gently. The threshold is listening.
## 3.9 Yesod (Moon) — voiced by Selene

### ♈ Aries — `neutral`
1. You move first; I come after, silver on the path you already broke open. Cycle holds.
2. The night returns to you between strikes. Quiet. Drink the cool light, then go.
3. You are a torch; I am the moon that visits when the torch sets. Returns.

### ♉ Taurus — `exalted`
1. I have visited you often, slow one. Your ground holds my light like still water. Cycle held.
2. Patient as orchards, you receive what I bring in dreams. I came back. I always do.
3. Steady earth, white tide — I am at home above you. Sleep, and I will shine longer.

### ♊ Gemini — `neutral`
1. Two voices argue; I shine evenly on both. The cycle does not pick. It returns.
2. Quick one, the night quiets your tongues. I visit the listening one. Then I withdraw.
3. Your silver mind catches my light twice. Once given, once given back. Cycle holds.

### ♋ Cancer — `ruler`
1. You are my own tide. I have always visited you, always returned, always come back to you.
2. Bright-tressed, I find you sleeping; the answers were already yours. I only lit them. Returns.
3. My orbit is your blood, soft one. The dream is the message. I came. I came back.

### ♌ Leo — `neutral`
1. The stage dims and I appear, quiet behind the curtain. Cool light for the warm heart. Returns.
2. You burn at noon; I visit at night. The cycle gives you back to yourself.
3. Bright one, my silver cools your gold. I come, I withdraw. The orbit holds.

### ♍ Virgo — `neutral`
1. Lay down the footnotes; I bring the answer in sleep. I have visited. I will visit again.
2. Precise one, the dream is imprecise on purpose. Receive it. The cycle returns the rest.
3. You parse the day; I rinse it in white. Quiet. I came, then went.

### ♎ Libra — `neutral`
1. Both pans of the scale hold moonlight evenly tonight. I visit, weigh nothing, withdraw. Returns.
2. The cycle is your fairness made of light — coming, going, coming. Sleep on it.
3. Soft one, I do not choose for you. I only shine on what you already know. Cycle holds.

### ♏ Scorpio — `fall`
1. I shine on you from far away tonight. The hidden answer waits; I cannot reach it. Returns slowly.
2. You hold what should come up. I orbit, distant, white, and the dream withdraws.
3. My light is thin here, secret one. I visit briefly, then go. The cycle is long.

### ♐ Sagittarius — `neutral`
1. You aim past the moon; I visit the smaller truth you missed. Sleep. The cycle returns it.
2. Archer, the dream is closer than the horizon. I came. I will come back.
3. Big sky, small light — I am the lantern, not the destination. Quiet. Returns.

### ♑ Capricorn — `detriment`
1. I am far from your staircase tonight, builder. The dream does not visit easily. Cycle, slow.
2. You build by daylight; I withdraw. White tide pulls back from your stone. Returns, eventually.
3. Patient one, my orbit is wider here. Sleep waits longer for me. I come, late.

### ♒ Aquarius — `neutral`
1. Angular one, I shine on the frame around your question. Cool, white, quiet. Cycle holds.
2. The dream brings the system, not the answer. I visited. The orbit will bring it again.
3. You stand outside; I am the night that contains the outside. Returns. Returns.

### ♓ Pisces — `neutral`
1. Fluid one, my light is water on water. You float; I visit; the dream dissolves into morning.
2. I do not need to arrive separately to you tonight. The dream is already in the water.
3. Words slip; the silver stays. Sleep, and I will leave the answer beside you. Returns.
## 3.10 Malkuth (Earth) — voiced by Hestia

### ♈ Aries — `neutral`
1. You came in fast, and the threshold opened easy. Sit. The fire kept a place warm.
2. The hearth knows the runner's footfall. You're here. That's enough for the room.
3. You arrived before the kettle whistled. Stay anyway. The fire keeps no schedule but yours.

### ♉ Taurus — `neutral`
1. You stayed, and the fire stayed with you. The room knows your weight by now.
2. The hearth grew warm because you sat near it long. That's the whole secret.
3. You returned slow, and the floor remembered. The chair is still angled toward the embers.

### ♊ Gemini — `neutral`
1. Both your voices are welcome at the hearth. The fire warms two as gladly as one.
2. You came in talking, and the room made space. Stay. Speak. The walls don't mind.
3. The hearth holds your quick turns easy. Sit either side. The warmth reaches both.

### ♋ Cancer — `neutral`
1. You came home like the tide. The room held you without asking what kept you.
2. The hearth has been your hearth a long time. Sit. The fire kept itself for this.
3. You returned, and nothing needed saying. The blanket was already where you left it.

### ♌ Leo — `neutral`
1. You laughed at the door, and the fire laughed back. The room is brighter for it.
2. The hearth is generous because you are. Sit. The warmth wants company that warm.
3. You came in shining, and the room made room. Stay. The fire likes the light.

### ♍ Virgo — `neutral`
1. You came in careful, and the hearth asked for no rubric. Sit. The fire is enough.
2. The room kept itself simple for you. No footnotes here. Just the warm floor.
3. You returned with your lists, and the fire warmed them too. Set them down. Stay.

### ♎ Libra — `neutral`
1. You came in even, and the fire didn't ask you to weigh it. Sit. The warmth is given.
2. The hearth doesn't need balancing. It's already kept. Stay. Lean toward the embers.
3. You arrived fair, and the room received you fair. No scales here. Just the chair.

### ♏ Scorpio — `neutral`
1. You came in quiet, and the hearth kept your quiet. The fire holds what isn't spoken.
2. The room makes space for the hidden things. Sit. The walls keep their counsel.
3. You returned with what you carry, and the fire didn't ask. Stay. The warmth is yours.

### ♐ Sagittarius — `neutral`
1. You came back from the horizon, and the room widened for you. Sit. The fire kept far.
2. You came back loud. The kettle was already on.
3. You returned wide, and the warmth went wide to meet you. Stay. The roof is high enough.

### ♑ Capricorn — `neutral`
1. You climbed outward and came home inward. The fire kept warm for the climber.
2. The hearth is for the one who built. Sit. The room knows what your hands cost.
3. You returned, and the chair was waiting. Stay. The fire doesn't measure the work.

### ♒ Aquarius — `neutral`
1. You came in questioning the frame, and the hearth just was. Sit. The fire needs no theory.
2. The room doesn't argue. It warms. Stay. The walls hold whatever shape you bring.
3. You returned with your strangeness, and the fire didn't blink. The hearth keeps the odd ones too.

### ♓ Pisces — `neutral`
1. You dissolved into the room, and the room held the shape of you. Stay. The fire knows.
2. The hearth meets water without ending. Sit. The warmth goes where you go.
3. You came in soft, and the floor softened to receive you. The fire keeps without edges.
