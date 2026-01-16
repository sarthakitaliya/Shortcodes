/**
 * Build script to generate emoji shortcode map from emojibase-data
 * Run with: node scripts/build-emoji-data.js
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildEmojiData() {
  // Read JSON files directly
  const emojisPath = join(__dirname, '..', 'node_modules', 'emojibase-data', 'en', 'compact.json');
  const shortcodesPath = join(__dirname, '..', 'node_modules', 'emojibase-data', 'en', 'shortcodes', 'github.json');

  const emojis = JSON.parse(readFileSync(emojisPath, 'utf-8'));
  const shortcodes = JSON.parse(readFileSync(shortcodesPath, 'utf-8'));

  const emojiMap = {};
  const reverseMap = {}; // For lookup by emoji character

  // Process emojis with their shortcodes
  for (const emoji of emojis) {
    const hexcode = emoji.hexcode;
    const codes = shortcodes[hexcode];

    if (codes) {
      const codeList = Array.isArray(codes) ? codes : [codes];
      for (const code of codeList) {
        const shortcode = `:${code}:`;
        emojiMap[shortcode] = emoji.unicode;
        reverseMap[emoji.unicode] = shortcode;
      }
    }
  }

  // Generate TypeScript file
  const outputPath = join(__dirname, '..', 'src', 'data', 'emojis.ts');
  const outputDir = dirname(outputPath);

  mkdirSync(outputDir, { recursive: true });

  const content = `/**
 * Auto-generated emoji shortcode map
 * Source: emojibase-data with GitHub shortcodes
 * Generated: ${new Date().toISOString()}
 * Total emojis: ${Object.keys(emojiMap).length}
 */

export const EMOJI_MAP: Record<string, string> = ${JSON.stringify(emojiMap, null, 2)};

export const REVERSE_EMOJI_MAP: Record<string, string> = ${JSON.stringify(reverseMap, null, 2)};

/**
 * Get emoji by shortcode
 */
export function getEmoji(shortcode: string): string | undefined {
  return EMOJI_MAP[shortcode.toLowerCase()];
}

/**
 * Get shortcode by emoji character
 */
export function getShortcode(emoji: string): string | undefined {
  return REVERSE_EMOJI_MAP[emoji];
}

/**
 * Search emojis by partial shortcode
 */
export function searchEmojis(query: string, limit = 10): Array<{ shortcode: string; emoji: string }> {
  const normalized = query.toLowerCase().replace(/^:/, '').replace(/:$/, '');
  const results: Array<{ shortcode: string; emoji: string }> = [];
  
  for (const [shortcode, emoji] of Object.entries(EMOJI_MAP)) {
    if (shortcode.includes(normalized)) {
      results.push({ shortcode, emoji });
      if (results.length >= limit) break;
    }
  }
  
  // Sort by relevance (exact match first, then by position of match)
  return results.sort((a, b) => {
    const aIndex = a.shortcode.indexOf(normalized);
    const bIndex = b.shortcode.indexOf(normalized);
    return aIndex - bIndex;
  });
}

/**
 * Check if a shortcode is a default emoji
 */
export function isDefaultEmoji(shortcode: string): boolean {
  return shortcode.toLowerCase() in EMOJI_MAP;
}
`;

  writeFileSync(outputPath, content);
  console.log('Generated emoji map with ' + Object.keys(emojiMap).length + ' emojis');
  console.log('Output: ' + outputPath);
}

buildEmojiData().catch(console.error);
