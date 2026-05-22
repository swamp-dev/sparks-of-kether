import type { SefirahKey, ZodiacSignKey } from './types';

/**
 * Ceremony-specific blessing copy — gift-receiving register (#13).
 *
 * Shaped for the BlessingRitual screen where the player is granted a
 * portion of a Sefirah's stat. Distinct from the encounter-voice table
 * (`data/pantheons/greco-roman/blessings.ts`) whose register is
 * gate-challenge / threshold-test.
 *
 * Contract: 10 sefirot × 12 signs × 3 variants = 360 cells.
 * Pantheon-agnostic: does not live under `data/pantheons/` because the
 * ceremony gift is structural to the game, not voiced by a specific
 * avatar pantheon.
 */
export const sefirahBlessingsCeremony: Readonly<
  Record<SefirahKey, Readonly<Record<ZodiacSignKey, readonly string[]>>>
> = {
  kether: {
    aries: [
      'The first fire is received into the whole. What you ignite, the Crown keeps burning. You are counted.',
      'Your arrival — swift, certain — is exactly what was waited for. The threshold has been open. Welcome.',
      'Initiation is itself a form of belonging. The Crown receives the first and the fierce equally. You are in.',
    ],
    taurus: [
      'What you grow slowly is carried into the eternal. The Crown holds what endures. You are included.',
      'Your patience was the prayer and the answer both. The whole waits for the steady arrival. You are welcomed.',
      'Permanence finds its home here. The Crown receives what does not rush. You arrive, and are already rooted.',
    ],
    gemini: [
      'Both voices are received. The Crown does not choose between your halves. You arrive complete.',
      'The web you carry — every thread — belongs in the pattern. The Crown has space for all your connections. You are in.',
      'What seemed like contradiction becomes coherence here. The Crown holds multiplicity as its nature. You are received whole.',
    ],
    cancer: [
      'Everything you have protected is gathered here. The Crown keeps what you kept. You are received with your whole cargo.',
      'The tenderness you carry reaches even the threshold. The whole is glad of soft arrivals. Welcome.',
      'Home is larger than any house. The Crown is the home that never needs defending. You arrive and rest.',
    ],
    leo: [
      'Your light is not diminished here — it joins. The Crown receives radiance as its own. You are counted among the bright.',
      'The generosity you carry becomes the whole\'s generosity. The Crown gives back through you. You are received.',
      'You shine as you come, and the whole answers with its own shine. Nothing is dimmed. Welcome.',
    ],
    virgo: [
      'Every careful act is a form of faithfulness, and the Crown receives faithfulness. You arrive full of what matters.',
      'What you noticed — the small true things — the Crown has been keeping count. You are recognized.',
      'Precision is a form of love here. The whole receives the careful with open arms. You are in.',
    ],
    libra: [
      'The balance you carry is offered back to you as belonging. The Crown includes the fair. You are received.',
      'Your love of proportion is itself a kind of prayer. The whole receives the one who weighs things carefully. Welcome.',
      'You arrive seeking equilibrium and find it is the ground here. The Crown is already level. You are home.',
    ],
    scorpio: [
      'What you survived is received without flinching. The Crown is not afraid of what you carry. You are in.',
      'Depth is not a barrier to the threshold — it is a credential. The whole welcomes what has been forged. You arrive.',
      'Your intensity is exactly enough. The Crown receives the transformed. You are counted among the honest.',
    ],
    sagittarius: [
      'Every horizon you sought was a gesture toward here. The Crown receives the seeking as arrival. You are found.',
      'Your faith in something larger was not misplaced. This is the larger thing. Welcome.',
      'The meaning you\'ve been pursuing meets you at the threshold. The Crown gives you the answer you were carrying. You are in.',
    ],
    capricorn: [
      'Your endurance brought you here. The Crown receives what has lasted. You are recognized as the work that holds.',
      'Every stone you placed, every step you took — they are recorded in the whole. You arrive with a full account. Welcome.',
      'The weight you\'ve carried is set down at the threshold. The Crown does not ask you to carry it further. You are received.',
    ],
    aquarius: [
      'The future you imagined was always already here, waiting. The Crown receives the visionary. You are in.',
      'Your love of the collective is the Crown\'s own quality. You belong among the ones who hold the whole. Welcome.',
      'The ideas you\'ve given to others arrive here before you. The Crown has been keeping them. You are received.',
    ],
    pisces: [
      'You sensed this place before you arrived. The Crown gathers what comes by feel. You are counted in our cohering.',
      'The boundary between you and the whole dissolves into welcome. The Crown was always the water you were swimming in. Arrive.',
      'Compassion poured outward returns as belonging. The Crown holds the ocean and the wave. You are both, and given home.',
    ],
  },

  chokmah: {
    aries: [
      'The flash of wisdom arrives as speed. Chokmah gives the quick mind its knowing. Yours, now.',
      'Before the question fully forms, the answer is given. Wisdom meets you in the motion. Receive it.',
      'The knowing comes as momentum — you were already moving toward it. Chokmah gives you the first and fastest insight. Yours.',
    ],
    taurus: [
      'Wisdom arrives in the body before the mind knows. Chokmah gives you knowing that settles deep. You receive it in your bones.',
      'The slow certainty you have learned to trust — Chokmah confirms it. What you know, you know rightly. Given.',
      'Insight arrives as solidity. Not a flash but a stone placed gently in your hands. Wisdom is yours to carry.',
    ],
    gemini: [
      'The insight branches immediately — one truth that multiplies. Chokmah gives you the web of connections. You receive the pattern whole.',
      'What lived in both of your minds arrives united. Wisdom is given to you as coherence. Receive it.',
      'The knowing comes already in language, ready to be spoken. Chokmah gives the quick tongue its truth. Yours.',
    ],
    cancer: [
      'Wisdom arrives through feeling — the knowing that rises from depth. Chokmah gives you insight you already trusted. Confirmed.',
      'The intuition you protected without knowing why: it was correct. Wisdom is given back to you as certainty. Receive it.',
      'The insight is wrapped in what you love. Chokmah gives a knowing with a face. Yours, warm and clear.',
    ],
    leo: [
      'The flash of wisdom arrives at the center, where you live. Chokmah gives clear sight to the generous heart. Yours.',
      'Insight lands as confidence — not pride, but the certainty of one who sees truly. The gift is given. Receive.',
      'Wisdom arrives as light from the center outward. Chokmah trusts you with clarity that radiates. You receive it to share.',
    ],
    virgo: [
      'The pattern you have been tracking comes clear. Chokmah gives the attentive eye its confirmation. What you noticed: correct.',
      'Insight arrives as precision — the exact thing, no more. Wisdom falls into careful hands. Received.',
      'The knowing settles into your existing understanding and completes it. Chokmah gives discernment to the discerning. Yours.',
    ],
    libra: [
      'Wisdom arrives as a moment of true balance — the still point where everything is clear. Chokmah gives this to you. Receive.',
      'The insight is the recognition that both sides were right and neither was whole. Wisdom gives you what was between them. Yours.',
      'A knowing of proportion, of rightness — Chokmah gives this. The gift settles as clarity in a fair mind. Receive.',
    ],
    scorpio: [
      'The insight comes from underneath — surfacing from depth. Chokmah trusts you to carry truth that has been through transformation. Receive.',
      'Wisdom arrives forged. What Chokmah gives you has been through the fire before it reaches your hands. Take it.',
      'The knowing goes deep before it is yours. Chokmah gives Scorpio the insight that cost something to find. Received.',
    ],
    sagittarius: [
      'The insight arrives as direction — an arrow of knowing already in flight. Chokmah gives you truth aimed at the horizon. Yours.',
      'Wisdom speaks to you in the language of vision and meaning. The flash arrives as a destination. Receive it.',
      'What you were seeking and what finds you: the same thing. Chokmah gives recognition to the far-seer. Given.',
    ],
    capricorn: [
      'Wisdom arrives solid and certain, built to last. Chokmah gives you knowing that stands. Receive it for the long work.',
      'The insight does not rush — it arrives with the gravity of something earned. Wisdom is given to the patient. Yours.',
      'What you know now you will know in twenty years. Chokmah gives Capricorn truth that endures. Take it.',
    ],
    aquarius: [
      'The insight arrives as a principle — wisdom that belongs to everyone through you. Chokmah gives you truth to carry and release. Received.',
      'The knowing comes from ahead, from the future. Wisdom reaches back to meet you here. The gift is given.',
      'What Chokmah gives you is not only yours — it is for the many. Receive the wisdom and then let it travel.',
    ],
    pisces: [
      'Wisdom arrives before the question. The knowing surfaces whole from the deep. Chokmah gives what was already sensed. Receive it.',
      'The insight comes as recognition — arriving somewhere you have been before, but now you know its name. Wisdom is yours.',
      'The flash of Chokmah dissolves into you like water meeting water. The boundary between knowing and being dissolves. You receive.',
    ],
  },

  binah: {
    aries: [
      'Binah gives the first fire a form to burn in. Understanding arrives as the shape that holds your initiation. Yours.',
      'The container receives the impulse. Binah gives you structure that supports speed. What you begin now has a vessel. Received.',
      'Form is given to the first act. Binah holds what Aries starts. You receive the understanding that shape is not a limit — it is a gift.',
    ],
    taurus: [
      'Binah meets Taurus with recognition — form meeting form. Understanding arrives as weight acknowledged. You are received in your earthiness.',
      'The structure you carry within is recognized. Binah gives you understanding of your own foundation. Yours.',
      'What you have built patiently is given its meaning. Binah names the form of your endurance. Received.',
    ],
    gemini: [
      'Binah receives the multiplicity and gives it coherence. Understanding arrives as the pattern behind all your connections. Yours.',
      'The form that holds both — Binah gives you the vessel large enough for contradiction. Understanding is given. Receive.',
      'What seemed like duality becomes the shape of something whole. Binah gives you the understanding that holds complexity. Yours.',
    ],
    cancer: [
      'Mother meets mother here. Binah gives Cancer understanding that deepens the knowing of shelter. Receive what is given.',
      'The form of Binah is not walls but arms. Understanding arrives as the embrace that makes space. Yours.',
      'Binah recognizes what you protect. Understanding arrives as confirmation that the caring is right. Received.',
    ],
    leo: [
      'Binah gives the generous heart a frame. Understanding arrives as the structure that lets light shine outward. Received.',
      'Form is given to the radiance. Binah holds what you would pour out, so it pours rightly. Yours.',
      'Understanding arrives as the recognition of your place at the center. Binah gives Leo a form worthy of the light. Receive.',
    ],
    virgo: [
      'Form meets precision. Binah gives understanding to the careful mind — the meta-pattern behind every small thing. Yours.',
      'The structure of understanding arrives as completion of your discernment. Binah gives you the shape of the whole. Received.',
      'Binah recognizes precision as a form of love. Understanding is given: your care has a pattern and the pattern is right. Receive.',
    ],
    libra: [
      'Binah gives form to the balance you seek. Understanding arrives as the structure that holds both sides equally. Yours.',
      'The scales themselves have a form — Binah gives it to you. Understanding of what fair means in this moment. Received.',
      'The vessel of understanding is given — wide enough for both, deep enough for truth. Binah receives the seeker of proportion. Yours.',
    ],
    scorpio: [
      'Binah receives transformation without flinching. Understanding arrives as the form that survives change. Given, enduring.',
      'The structure holds even in the deep. Binah gives Scorpio understanding that does not break under intensity. Yours.',
      'Understanding arrives forged and cool. Binah gives the transformed mind a vessel. Received in full.',
    ],
    sagittarius: [
      'Binah gives form to the vision. Understanding arrives as the structure that lets far sight navigate. Yours.',
      'The horizon finds a frame. Binah gives what holds the meaning in one place long enough to be used. Received.',
      'Understanding is given: not as limitation but as the ground the seeker can return to. Binah receives the far-seer. Yours.',
    ],
    capricorn: [
      'Your weight is form already. Binah gives Capricorn understanding that mirrors what you are. The mountain will answer. Received.',
      'Structure recognizes structure. Binah gives you understanding of why the patient work is the right work. Yours.',
      'Understanding arrives as confirmation — what you have built is correct in form. Binah receives what endures. Given.',
    ],
    aquarius: [
      'Binah gives form to the collective. Understanding arrives as the structure that holds the future-thought. Yours to carry.',
      'The container for the vision is given. Binah gives Aquarius the vessel that holds what wants to be shared. Received.',
      'Understanding arrives as the pattern underlying every principle. Binah gives you the structural truth. Yours.',
    ],
    pisces: [
      'Binah receives the one who dissolves and gives back form. Understanding arrives as the vessel that holds the flow. Yours.',
      'The form that Binah gives is not walls but shores — it holds without stopping. Understanding is given. Receive.',
      'Understanding arrives as recognition: the formless needs the vessel and the vessel holds the formless. Binah gives you both. Received.',
    ],
  },

  chesed: {
    aries: [
      'Chesed pours into the first fire and the fire blazes outward. Abundance is given freely. Yours to use and give.',
      'The gift arrives as speed and scale both. Chesed does not stint on Aries. You receive more than you asked.',
      'Abundance falls into eager hands. Chesed gives generosity to the one who moves. Receive it — and there is more.',
    ],
    taurus: [
      'Chesed meets Taurus in the fullness of the earth. Abundance is given deep and slow. You receive what grows.',
      'The gift arrives as richness — the long kind that multiplies over time. Chesed gives Taurus its own nature multiplied. Yours.',
      'Abundance settles like fertile ground receiving rain. Chesed is generous to what endures. You are given more than enough.',
    ],
    gemini: [
      'The gift doubles, as gifts do in Gemini\'s hands. Chesed gives abundance to the one who connects. Receive and share.',
      'Abundance arrives in words, in links, in all the ways connection carries. Chesed is generous through you. Yours.',
      'The cup overflows in every direction. Chesed pours freely for the curious mind. You receive what you can carry and more.',
    ],
    cancer: [
      'Chesed gives abundance to what protects. The gift is fullness for the home you tend. Yours — and all who shelter with you.',
      'The nurturing you give is given back as abundance. Chesed recognizes the one who feeds others. Receive now.',
      'The gift arrives as overflow from the caring. Chesed is generous with Cancer\'s own gifts. More is given than is asked.',
    ],
    leo: [
      'The gift is radiant and wide. Chesed gives to the generous heart abundantly. You receive more than you can hold — and are meant to give.',
      'Abundance arrives as joy that multiplies. Chesed and Leo speak the same language: give freely. Yours, overflowing.',
      'The cup overflows with light. Chesed pours into you and through you. Receive the gift and let it shine.',
    ],
    virgo: [
      'Chesed gives abundance to careful hands. The gift arrives as more than enough precision, more than enough care. Yours.',
      'The gift is fullness — the sense that the work is sufficient, that the attention has been enough. Chesed gives rest. Received.',
      'Abundance arrives as confirmation that the small acts add up. Chesed gives Virgo the harvest. More than was calculated. Yours.',
    ],
    libra: [
      'Chesed is generous to the one who seeks balance. Abundance arrives as resolution — enough for both sides. Yours.',
      'The gift is fair and then some. Chesed gives Libra more than the scales require. Receive the overflow.',
      'Abundance arrives as peace — the fullness of things rightly ordered. Chesed gives this freely. Yours.',
    ],
    scorpio: [
      'Chesed pours into the depths. Abundance is given without fear of what it meets. You receive the full cup.',
      'The gift arrives forged by intensity into something precious. Chesed is generous to those who have been through the fire. Yours.',
      'Abundance arrives in the deep register — not surface plenty but real fullness. Chesed gives Scorpio the gift that holds. Received.',
    ],
    sagittarius: [
      'The gift arrives as freedom and fullness together. Chesed gives Sagittarius more than was expected. Yours.',
      'Chesed gives generously to the one who seeks meaning. Abundance arrives as the horizon opening further. Receive.',
      'The gift is vision with resources. Chesed gives Sagittarius the tools the journey requires. Received.',
    ],
    capricorn: [
      'The gift arrives as sufficiency — the sense that the endurance has been enough, that there is more than needed. Chesed gives rest. Yours.',
      'Chesed pours into the long work. Abundance arrives as the return on patience. You receive the reward of endurance.',
      'The gift is recognition that the long way was the right way and you have arrived with more than you began. Chesed gives this. Received.',
    ],
    aquarius: [
      'Chesed gives abundantly to the one who gives freely. The gift cycles back through you to the many. Receive and release.',
      'The cup overflows for the future. Chesed is generous through the one who sees ahead. Yours to share forward.',
      'Abundance arrives as expansion of what was already being offered. Chesed multiplies the collective impulse. Given freely. Yours.',
    ],
    pisces: [
      'Chesed pours without measure into the one who flows. The gift has no walls. Receive it.',
      'The cup overflows through you. Chesed gives Pisces abundance in the language of water — no edge, no end. Yours.',
      'Abundance arrives as the feeling that there is enough — in you, through you, around you. Chesed gives this freely. Received.',
    ],
  },

  gevurah: {
    aries: [
      'Gevurah gives its own quality to Aries — strength to the strong. A portion of discipline arrives as fire focused. Yours.',
      'The gift is precision of force. Gevurah gives Mars\'s own energy, refined. You receive the cut, made clean.',
      'Strength is granted in the same register you carry it. Gevurah recognizes Aries and gives more of what you are. Received.',
    ],
    taurus: [
      'Strength arrives as the endurance you already know, deepened. Gevurah gives Taurus the kind of strength that holds. Yours.',
      'The gift settles like iron in the earth — not violent but immovable. A portion of Gevurah\'s discipline is given. Receive.',
      'What you can bear is given back as strength. Gevurah recognizes endurance as its own. You receive the grant of it.',
    ],
    gemini: [
      'Gevurah gives strength to the quick mind — the capacity to cut through ambiguity, to decide. Yours.',
      'The gift is discernment — the strength to choose between the threads. Gevurah gives Gemini decisive capacity. Received.',
      'Strength arrives as clarity — the ability to distinguish. Gevurah grants you the cut that separates what matters. Yours.',
    ],
    cancer: [
      'Gevurah gives protective strength — the fierce kind that guards. A portion of disciplined force is granted to the one who shelters. Yours.',
      'The gift is the strength to hold the boundary. Gevurah gives Cancer the capacity that protects what is loved. Received.',
      'Strength arrives in the register of fierceness that love requires. Gevurah gives you the force that defends the tender. Yours.',
    ],
    leo: [
      'Gevurah gives strength to the generous heart — discipline for the radiance. A portion of focused force is yours.',
      'The gift is the strength that gives shape to the brightness. Gevurah grants what holds the fire directed. Received.',
      'Strength arrives at the center. Gevurah gives Leo the capacity of the focused will. Yours, for what matters most.',
    ],
    virgo: [
      'Gevurah gives disciplined strength to the discerning mind — precision in action, capacity in service. Yours.',
      'The gift is strength in the small act — the discipline to do it correctly, every time. Gevurah recognizes this. Received.',
      'Strength arrives as the capacity to hold to what is exact. Gevurah grants Virgo the force of precise commitment. Yours.',
    ],
    libra: [
      'Gevurah gives strength to the one who balances — the capacity to cut, when the scales require it. Yours.',
      'The gift is the strength of decision. Gevurah grants Libra the force to act when action is what fairness demands. Received.',
      'Strength arrives as the willingness to sever what has run its course. Gevurah gives what balance sometimes needs. Yours.',
    ],
    scorpio: [
      'The gift is strength already proven — the discipline that has survived its own test. Gevurah gives to Scorpio what it already knows. More.',
      'Strength arrives already familiar — you know this quality. Gevurah gives Scorpio its native element, more of it. Yours.',
      'The gift is strength in the deep register — the kind that endures transformation. Gevurah gives what Scorpio has already been using. More.',
    ],
    sagittarius: [
      'Gevurah gives strength to the vision — the discipline that carries meaning into action. A portion is granted. Yours.',
      'The gift is strength of direction — the focused force that makes the arrow true. Gevurah gives Sagittarius precision. Received.',
      'Strength arrives as the capacity to commit to the far thing. Gevurah grants the discipline the journey requires. Yours.',
    ],
    capricorn: [
      'Gevurah and Capricorn share the language of discipline. The gift is strength in the long register — more of what you are. Yours.',
      'The grant is deep: strength that Capricorn amplifies back. Gevurah gives to the sign that carries discipline as nature. Received.',
      'Strength arrives as confirmation of the endurance you have already shown. Gevurah recognizes Capricorn. More is given.',
    ],
    aquarius: [
      'Gevurah gives strength to the collective impulse — the discipline of the one who holds a vision for many. Yours.',
      'The gift is strength of principle — the capacity to act on what is true even when it is difficult. Received.',
      'Strength arrives as the force of conviction. Gevurah gives Aquarius the discipline the future requires. Yours.',
    ],
    pisces: [
      'Gevurah gives strength to the one who flows — the capacity to be present in the deep without losing form. Yours.',
      'The gift is the strength of compassion — what it takes to feel fully and remain steady. Gevurah grants this. Received.',
      'Strength arrives as the capacity to hold the suffering without becoming it. Gevurah gives Pisces the force of loving endurance. Yours.',
    ],
  },

  tiferet: {
    aries: [
      'Beauty arrives as ignition — the first fire seen clearly. Tiferet gives harmony to the initiation. Yours.',
      'The gift is the beauty of beginning — the moment before the first act, luminous. Tiferet gives this to Aries. Received.',
      'Harmony arrives in motion. Tiferet gives beauty to the speed and the start. You receive light in the instant.',
    ],
    taurus: [
      'Beauty arrives as the deep satisfaction of what has grown slowly. Tiferet gives harmony to patient work. Yours.',
      'The gift is the beauty of permanence — the thing made rightly and made to last. Tiferet recognizes this. Received.',
      'Harmony settles into the body like sunlight into soil. Tiferet gives beauty to what endures. You receive it fully.',
    ],
    gemini: [
      'Beauty arrives as the elegant connection — the thread that makes two things one. Tiferet gives harmony to the linking mind. Yours.',
      'The gift is the beauty of correspondence — when both voices resolve into a chord. Tiferet gives this. Received.',
      'Harmony arrives in the space between the twins. Tiferet gives beauty to duality seen rightly. You receive the resolution.',
    ],
    cancer: [
      'Beauty arrives as the tender thing held carefully. Tiferet gives harmony to the one who protects. Yours, warm.',
      'The gift is the beauty of memory at its best — the face you carry as light. Tiferet gives this. Received.',
      'Harmony settles into the home place. Tiferet gives beauty to what is loved and kept. You receive it in the heart.',
    ],
    leo: [
      'Tiferet gives the heart its fullest radiance. Beauty arrives as the thing you were already reaching toward. Receive it.',
      'Beauty arrives at the center — the gift of radiance that is also harmony. Tiferet gives Leo its home frequency. Yours.',
      'The gift is the beauty of the generous center — light that warms without consuming. Tiferet gives this. Received.',
    ],
    virgo: [
      'Beauty arrives as the perfected form — the thing made exactly right. Tiferet gives harmony to precision. Yours.',
      'The gift is the beauty of careful attention — the small act done completely. Tiferet recognizes this. Received.',
      'Harmony arrives in the completion of the work. Tiferet gives beauty to what is tended. You receive the rightness.',
    ],
    libra: [
      'Beauty arrives as perfect proportion — the moment of balance made visible. Tiferet gives this to Libra. Yours.',
      'The gift is harmony as fairness — the beauty of things rightly ordered. Tiferet speaks your language. Received.',
      'Tiferet gives beauty to the one who seeks it. The gift arrives as the resolution of the scales into radiance. Yours.',
    ],
    scorpio: [
      'Beauty arrives from the depths — transformed, luminous. Tiferet gives harmony to what has been through the dark. Yours.',
      'The gift is the beauty of the thing that survived — the depth that became radiance. Tiferet recognizes this. Received.',
      'Harmony arrives in the wake of transformation. Tiferet gives beauty to the intensity that found its form. Yours.',
    ],
    sagittarius: [
      'Beauty arrives as the meaning made visible — the vision that lands clear. Tiferet gives harmony to the far-seer. Yours.',
      'The gift is the beauty of direction found — the horizon that becomes a home. Tiferet gives this. Received.',
      'Harmony arrives as the sense that the journey was the point. Tiferet gives beauty to the seeking itself. Yours.',
    ],
    capricorn: [
      'Beauty arrives as the completed work — the long labor arrived at, the view given. Tiferet honors what endured. Yours.',
      'The gift is the beauty of patient form — the thing built slowly and exactly right. Tiferet gives this. Received.',
      'Harmony arrives as culmination. Tiferet gives beauty to the long work made whole. You receive the radiance of completion.',
    ],
    aquarius: [
      'Beauty arrives as the future glimpsed — the clarity of what could be. Tiferet gives harmony to the visionary. Yours.',
      'The gift is the beauty of the collective chord — many voices into one resonance. Tiferet gives this to Aquarius. Received.',
      'Harmony arrives as the principle made radiant. Tiferet gives beauty to what you hold for all. Yours.',
    ],
    pisces: [
      'Beauty arrives as dissolution into the luminous — the moment the self becomes light. Tiferet gives this to Pisces. Yours.',
      'The gift is harmony felt before named — the beauty that moves through the body first. Tiferet gives this. Received.',
      'Beauty arrives as the feeling of being held in something vast and warm. Tiferet gives Pisces the light it already knows. Yours.',
    ],
  },

  netzach: {
    aries: [
      'Desire arrives as the first wanting — clear, forceful, already moving. Netzach gives passion to the initiator. Yours.',
      'The gift is desire in its purest form — uncomplicated wanting. Netzach gives Aries what it already is. More of it.',
      'Passion arrives at full force. Netzach gives the fire of wanting to the first fire. You receive it burning.',
    ],
    taurus: [
      'Desire arrives as appetite for the beautiful and the real. Netzach gives passion grounded in the body. Yours.',
      'The gift is the deep wanting of Taurus — pleasure, fullness, the beautiful thing held. Netzach amplifies this. Received.',
      'Passion arrives as the desire for what endures. Netzach gives Taurus its own heart\'s frequency. More. Yours.',
    ],
    gemini: [
      'Desire arrives in all its forms at once — wanting to know, to connect, to speak. Netzach gives Gemini its many appetites. Yours.',
      'The gift is the passion of curiosity — the desire that opens the world further. Netzach gives this freely. Received.',
      'Passion arrives as the wanting to connect and be connected. Netzach gives Gemini the feeling it is always chasing. Yours.',
    ],
    cancer: [
      'Desire arrives as the deep wanting to love and be loved. Netzach gives this to Cancer fully. Yours.',
      'The gift is the passion of the one who feels — the desire to protect what is tender. Netzach gives Cancer its depth. Received.',
      'Passion arrives as the wanting of home — the desire that builds, shelters, tends. Netzach gives this. Yours.',
    ],
    leo: [
      'Desire arrives as the wanting to give — the passion of the generous heart. Netzach gives Leo its native fire. Yours.',
      'The gift is the passion of radiance — the wanting to shine and to warm. Netzach gives this in abundance. Received.',
      'Passion arrives at the center of the heart. Netzach gives Leo the desire that is also a gift to others. Yours.',
    ],
    virgo: [
      'Desire arrives as the wanting to do it right — the passion of precision and service. Netzach gives this to Virgo. Yours.',
      'The gift is the passion that lives in care — the wanting that shows up in every small act. Netzach recognizes this. Received.',
      'Passion arrives as the desire for the perfect form. Netzach gives Virgo the love that is also discipline. Yours.',
    ],
    libra: [
      'Desire arrives as the wanting of beauty and balance — the passion of the one who loves what is fair. Netzach gives this. Yours.',
      'The gift is the deep wanting of Libra — to love and be in love, to create the beautiful. Netzach amplifies this. Received.',
      'Passion arrives as the desire for harmony with another. Netzach gives Libra the feeling of the beloved. Yours.',
    ],
    scorpio: [
      'Desire arrives from the depths, already tested. Netzach gives Scorpio the passion that survives. The feeling is real. Yours.',
      'The gift is passion that knows its own depth — the desire that does not flinch. Netzach recognizes Scorpio. Received.',
      'Passion arrives forged. Netzach gives Scorpio the desire that has been through transformation and came out clear. Yours.',
    ],
    sagittarius: [
      'Desire arrives as the wanting of meaning — the passion for the larger thing. Netzach gives this to the seeker. Yours.',
      'The gift is the passion of vision — the desire for the far thing that turns out to be real. Netzach gives this. Received.',
      'Passion arrives as the wanting to understand why. Netzach gives Sagittarius the fire of meaning. Yours.',
    ],
    capricorn: [
      'Desire arrives as the passion of the long work — the wanting that sustains across years. Netzach gives this. Yours.',
      'The gift is the desire for mastery — the wanting that builds the thing slowly and rightly. Netzach recognizes this. Received.',
      'Passion arrives in the register of commitment — the desire that does not leave. Netzach gives Capricorn this. Yours.',
    ],
    aquarius: [
      'Desire arrives as the wanting of the future — the passion for what does not yet exist. Netzach gives this to Aquarius. Yours.',
      'The gift is the passion of the collective — the desire for what is possible for all. Netzach gives this freely. Received.',
      'Passion arrives as the wanting of the world made differently. Netzach gives Aquarius the fire of vision. Yours.',
    ],
    pisces: [
      'Desire dissolves the boundary between wanting and having. Netzach gives Pisces the feeling of already-arriving. Yours.',
      'The gift is the passion of compassion — the desire to feel what others feel and to help. Netzach gives this fully. Received.',
      'Passion arrives as the wanting to dissolve into something larger and more beautiful. Netzach gives this to Pisces. Yours.',
    ],
  },

  hod: {
    aries: [
      'Clarity arrives at speed. Hod gives the quick mind its road. You receive understanding ready to move.',
      'The gift is the path made visible in the instant. Hod gives Aries the knowing of direction. Yours.',
      'Intelligence arrives ahead of itself. Hod gives the first mind its clearest thought. Received.',
    ],
    taurus: [
      'Clarity arrives as the deep knowing that does not need words. Hod gives understanding to the patient body. Yours.',
      'The gift is the path made solid — not abstract but real and walkable. Hod gives Taurus clarity with weight. Received.',
      'Intelligence arrives as the recognition of what has always been true. Hod gives Taurus clarity that lasts. Yours.',
    ],
    gemini: [
      'Twin-tongued, road-born — the gift is the joy of the path itself. Hod gives Gemini the full intelligence of connection. Yours.',
      'Clarity arrives doubled — both directions visible, both voices clear. Hod gives Gemini the home frequency. Received.',
      'The gift is the web of thought made luminous. Hod gives the connecting mind its full tool. Yours.',
    ],
    cancer: [
      'Clarity arrives wrapped in feeling — the understanding that comes from within. Hod gives Cancer the intelligence of intuition. Yours.',
      'The gift is the path of the tender thing — the understanding that protects what is carried. Hod gives this. Received.',
      'Intelligence arrives as the knowing of what is needed. Hod gives Cancer clarity in the language of care. Yours.',
    ],
    leo: [
      'Clarity arrives as the understanding of the center — what everything radiates from. Hod gives Leo intelligent radiance. Yours.',
      'The gift is the path made brilliant — the understanding that announces itself. Hod gives Leo clarity with presence. Received.',
      'Intelligence arrives at the heart and expands. Hod gives the generous mind its sharpest tool. Yours.',
    ],
    virgo: [
      'Hod gives Virgo its native element — the gift is precision of mind. Yours, fully.',
      'Clarity arrives as the exact thought — no more, no less. Hod gives the discerning mind its own sharpness. Received.',
      'The gift is the path laid out correctly — every step accounted for. Hod gives Virgo the intelligence it already carries, amplified. Yours.',
    ],
    libra: [
      'Clarity arrives as the understanding of proportion — the intelligence of what is fair. Hod gives this to Libra. Yours.',
      'The gift is the path between the two — the understanding that holds both. Hod gives balanced intelligence. Received.',
      'Intelligence arrives as the capacity to weigh rightly. Hod gives Libra clarity in the register of justice. Yours.',
    ],
    scorpio: [
      'Clarity arrives from the deep — the intelligence that has been through transformation. Hod gives this to Scorpio. Yours.',
      'The gift is the understanding of what is really happening — depth intelligence. Hod gives Scorpio the mind that sees beneath. Received.',
      'Intelligence arrives in the deep register. Hod gives the gift of knowing what others miss. Yours.',
    ],
    sagittarius: [
      'Clarity arrives as direction — the understanding of where to go. Hod gives the far-seer its road. Yours.',
      'The gift is the path made meaningful — the intelligence of the journey, not just the destination. Hod gives this. Received.',
      'Intelligence arrives as the understanding of why. Hod gives Sagittarius the clarity of meaning. Yours.',
    ],
    capricorn: [
      'Clarity arrives as the understanding of structure — the intelligence of what holds. Hod gives this to Capricorn. Yours.',
      'The gift is the path made rigorous — the intelligence of long careful work. Hod gives Capricorn clarity for the mountain. Received.',
      'Intelligence arrives as the recognition of the right method. Hod gives Capricorn clarity that lasts across time. Yours.',
    ],
    aquarius: [
      'Clarity arrives as the understanding of the collective — the intelligence of what connects everyone. Hod gives this to Aquarius. Yours.',
      'The gift is the path made visible to all — intelligence that belongs to the future. Hod gives this. Received.',
      'Intelligence arrives as the principle clearly stated. Hod gives Aquarius the language of what is true for many. Yours.',
    ],
    pisces: [
      'Clarity arrives through the feeling first — the intelligence of the deep. Hod gives Pisces the understanding that surfaces from within. Yours.',
      'The gift is the path made luminous in the dark — intelligence in the register of dream. Hod gives this. Received.',
      'Intelligence arrives as the recognition of connection — everything linked. Hod gives Pisces the mind that moves through water. Yours.',
    ],
  },

  yesod: {
    aries: [
      'The foundation receives the first fire and holds it steady. Yesod gives Aries the ground beneath the speed. Yours.',
      'The gift is the dreaming of initiation — the image of the first act, held in the moon\'s light. Received.',
      'Foundation arrives as the sense that the speed has somewhere to stand. Yesod gives Aries the ground. Yours.',
    ],
    taurus: [
      'Moon meets earth. Yesod gives Taurus the dream of permanence made real. The foundation holds you deeply. Yours.',
      'The gift is the foundation already beneath you, recognized. Yesod gives what Taurus already is its name. Received.',
      'Foundation arrives as the body\'s knowing that it is held. Yesod gives Taurus the moon\'s long confirmation. Yours.',
    ],
    gemini: [
      'The foundation holds the connection in place. Yesod gives Gemini the dreaming that links what is separated. Yours.',
      'The gift is the dream of both threads meeting. Yesod gives Gemini the ground that holds duality in rest. Received.',
      'Foundation arrives as the place beneath the movement — Yesod gives the quick mind its root. Yours.',
    ],
    cancer: [
      'The moon holds what you love while you sleep. Yesod gives Cancer the dreaming that keeps watch. Returns. Yours.',
      'The foundation is the place of memory — the moon holds what you have loved. Yesod gives this back to you. Received.',
      'Foundation arrives in the register of home and dreaming. Yesod gives Cancer the ground it already knows. Yours.',
    ],
    leo: [
      'The foundation receives the radiance and gives it depth. Yesod gives Leo the dreaming of the generous heart. Yours.',
      'The gift is the dream of the center — the moon\'s long held image of what you are. Received.',
      'Foundation arrives as the ground beneath the light. Yesod gives Leo the root of the radiance. Yours.',
    ],
    virgo: [
      'The foundation holds the careful work in place. Yesod gives Virgo the dreaming of completed service. Yours.',
      'The gift is the ground beneath precision — the dream of the thing done right. Yesod gives this. Received.',
      'Foundation arrives as the confirmation that the small act is held. Yesod gives Virgo the moon\'s quiet witness. Yours.',
    ],
    libra: [
      'The foundation holds the scales in place. Yesod gives Libra the dreaming of equilibrium held. Yours.',
      'The gift is the ground beneath the balance — the dream of proportion achieved. Yesod gives this. Received.',
      'Foundation arrives as the sense that the ground is level. Yesod gives Libra the dreaming of fairness at rest. Yours.',
    ],
    scorpio: [
      'The foundation holds what has survived transformation. Yesod gives Scorpio the dream of depth made stable. Yours.',
      'The gift is the ground beneath the intensity — the moon\'s image of what has endured. Yesod gives this. Received.',
      'Foundation arrives in the deep register. Yesod gives Scorpio the dreaming of the thing that holds through change. Yours.',
    ],
    sagittarius: [
      'The foundation holds the vision in place. Yesod gives Sagittarius the dreaming of the horizon arrived at. Yours.',
      'The gift is the ground beneath the journey — the moon\'s image of meaning held. Received.',
      'Foundation arrives as the place the vision can return to. Yesod gives Sagittarius the root of the seeking. Yours.',
    ],
    capricorn: [
      'The foundation recognizes what has been built. Yesod gives Capricorn the dreaming of the completed work. Yours.',
      'The gift is the ground beneath the mountain — the moon\'s long knowledge of endurance. Yesod gives this. Received.',
      'Foundation arrives as the confirmation of the long labor. Yesod gives Capricorn the dream of the work proved right. Yours.',
    ],
    aquarius: [
      'The foundation holds the future in place. Yesod gives Aquarius the dreaming of the collective arrived at. Yours.',
      'The gift is the ground beneath the vision — the moon\'s image of what is possible for all. Received.',
      'Foundation arrives as the sense that the future has somewhere to stand. Yesod gives Aquarius the root of the possible. Yours.',
    ],
    pisces: [
      'The foundation holds the one who flows. Yesod gives Pisces the dreaming of the deep made safe. Yours.',
      'The gift is the ground beneath the dissolving — the moon\'s image of the boundary softened without loss. Received.',
      'Foundation arrives as the place the dreaming returns to. Yesod gives Pisces the ground that holds the ocean. Yours.',
    ],
  },

  malkuth: {
    aries: [
      'The earth receives the first fire. Malkuth gives Aries the ground it lands on. You belong here. Yours.',
      'The gift is the kingdom that receives the initiator. Malkuth gives Aries the place to begin from. Received.',
      'Ground arrives under the speed. Malkuth gives Aries the belonging of the body in the world. Yours.',
    ],
    taurus: [
      'The earth recognizes earth. Malkuth gives Taurus the deepest belonging — the body in its home element. Yours.',
      'The gift is the kingdom that knows your weight. Malkuth gives Taurus the belonging it was born for. Received.',
      'The ground opens into deeper ground. Malkuth gives Taurus the full rootedness of belonging. Yours.',
    ],
    gemini: [
      'The earth receives all of you — both. Malkuth gives Gemini the belonging of the whole. Yours.',
      'The gift is the kingdom that holds every connection. Malkuth gives Gemini the ground beneath the web. Received.',
      'Belonging arrives as the place where all the threads are rooted. Malkuth gives Gemini the earth that holds. Yours.',
    ],
    cancer: [
      'The earth is the first home. Malkuth gives Cancer the deepest belonging — the body, the hearth, the ground. Yours.',
      'The gift is the kingdom that is always home. Malkuth gives Cancer the belonging it spends its life building. Received.',
      'Ground arrives as the sense of being held by the world itself. Malkuth gives Cancer the earth\'s embrace. Yours.',
    ],
    leo: [
      'The earth receives the radiant. Malkuth gives Leo the kingdom — the belonging of the one who shines from the center. Yours.',
      'The gift is the ground beneath the light — the kingdom that holds the center. Malkuth gives Leo its place. Received.',
      'Belonging arrives at the heart of the manifest world. Malkuth gives Leo the belonging of the generous sovereign. Yours.',
    ],
    virgo: [
      'The earth receives the careful. Malkuth gives Virgo the belonging of the one who tends the world. Yours.',
      'The gift is the kingdom that values precision and service. Malkuth gives Virgo the ground it has always worked. Received.',
      'Belonging arrives as the recognition that the careful work matters. Malkuth gives Virgo the earth that rewards attention. Yours.',
    ],
    libra: [
      'The earth receives the one who seeks balance. Malkuth gives Libra the belonging of the fair world. Yours.',
      'The gift is the kingdom that holds both sides in equal regard. Malkuth gives Libra the ground of proportion. Received.',
      'Belonging arrives as the sense that the world is large enough for fairness. Malkuth gives Libra the earth that supports justice. Yours.',
    ],
    scorpio: [
      'The earth receives what has transformed. Malkuth gives Scorpio the belonging of the thing that has survived. Yours.',
      'The gift is the kingdom that is not afraid of depth. Malkuth gives Scorpio the ground that holds what has been through fire. Received.',
      'Belonging arrives in the deep register. Malkuth gives Scorpio the earth that holds the transformed. Yours.',
    ],
    sagittarius: [
      'The earth receives the far-seer. Malkuth gives Sagittarius the belonging of arriving — the ground beneath the journey. Yours.',
      'The gift is the kingdom that rewards the search. Malkuth gives Sagittarius the belonging of the meaning-seeker who arrives. Received.',
      'Belonging arrives as the discovery that the journey has a home. Malkuth gives Sagittarius the ground the meaning lands on. Yours.',
    ],
    capricorn: [
      'The earth recognizes Capricorn as its own. Malkuth gives the belonging of the one who has climbed and arrived. Yours.',
      'The gift is the kingdom that rewards endurance. Malkuth gives Capricorn the deep belonging of the work completed. Received.',
      'Belonging arrives as the sense that the long way was the right way and the earth confirms it. Malkuth gives Capricorn home. Yours.',
    ],
    aquarius: [
      'The earth receives the visionary. Malkuth gives Aquarius the belonging of the collective in the world. Yours.',
      'The gift is the kingdom that holds the future in the present. Malkuth gives Aquarius the belonging of the possible made real. Received.',
      'Belonging arrives as the world becoming the vision. Malkuth gives Aquarius the earth that holds the future now. Yours.',
    ],
    pisces: [
      'The earth holds the one who flows. Malkuth gives Pisces the belonging that does not require a boundary. Receive it wherever you are.',
      'The gift is the kingdom that holds the one who flows. Malkuth gives Pisces the earth that holds the ocean. Received.',
      'Belonging arrives as the dissolution of the boundary between self and world. Malkuth gives Pisces the belonging of the everywhere. Yours.',
    ],
  },
} as const;
