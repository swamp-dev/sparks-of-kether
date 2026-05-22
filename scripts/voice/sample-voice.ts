/**
 * Generate a single sample clip from a specific ElevenLabs voice.
 * Saves the mp3 to /tmp/voice-sample-<voiceId>.mp3 for quick auditioning.
 *
 * Usage:
 *   pnpm voice:sample --voice-id <ID> --text "Test line"
 *   pnpm voice:sample --voice-id <ID> --character athena
 *   pnpm voice:sample --voice-id <ID>                      # uses default test line
 *
 * Requires ELEVENLABS_API_KEY in env (set in .env.local).
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch { /* rely on shell env */ }

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY not set. Add it to .env.local.');
  process.exit(1);
}

const client = new ElevenLabsClient({ apiKey });

// Sample lines per character — excerpts from the actual verdict/response data
const CHARACTER_SAMPLES: Record<string, string> = {
  athena:    'You saw what others named impossible. The answer was already there.',
  demeter:   'You waited. The earth waited with you.',
  zeus:      'The table was set. You brought what was asked. The gift holds.',
  ares:      'You held the line. Nothing crossed that should not.',
  apollo:    'The chord was struck. Every note was placed.',
  aphrodite: 'You named what you wanted. That takes more than you think.',
  hermes:    "You crossed before I finished asking. That's a way of being right.",
  selene:    'You returned. The moon remembers what the sun forgets.',
  hestia:    'The fire is still burning. You kept it.',
  kether:    'Before the question, there was only this.',
  // Zodiac samples — the sign speaking to the avatar
  aries:     'I ran at it. The answer was on the other side of the wall.',
  taurus:    'I stayed until the ground told me.',
  gemini:    'Which answer did you want? I had two.',
  cancer:    'I came in sideways. The door was unlocked.',
  leo:       'I knew before I spoke. I spoke anyway.',
  virgo:     'I checked the margin twice. The answer was in the margin.',
  libra:     'I held both sides until one was heavier.',
  scorpio:   'I already knew. I waited to see if you did.',
  sagittarius: 'The real question was bigger than the one you asked.',
  capricorn: 'I built the staircase one step at a time.',
  aquarius:  "The question you asked wasn't the question you needed.",
  pisces:    'I drifted toward it. The meaning arrived before the words.',
};

const args = process.argv.slice(2);
function arg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
}

const voiceId = arg('--voice-id');
const character = arg('--character');
const customText = arg('--text');

if (!voiceId) {
  console.error('--voice-id is required. Run pnpm voice:browse to find IDs.');
  process.exit(1);
}

const text =
  customText ??
  (character ? CHARACTER_SAMPLES[character] : undefined) ??
  'The path is open. What you carry, you carry knowing.';

async function main() {
  console.log(`\nGenerating sample for voice ${voiceId}...`);
  console.log(`Text: "${text}"\n`);

  const stream = await client.textToSpeech.convert(voiceId!, {
    text,
    modelId: 'eleven_multilingual_v2',
    outputFormat: 'mp3_44100_128',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
    },
  });

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const audio = Buffer.concat(chunks);

  const outPath = `/tmp/voice-sample-${voiceId}${character ? `-${character}` : ''}.mp3`;
  writeFileSync(outPath, audio);

  console.log(`Saved: ${outPath}`);
  console.log(`\nPlay it:  mpv ${outPath}`);
  console.log(`          ffplay -nodisp -autoexit ${outPath}`);
  console.log(`          xdg-open ${outPath}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
