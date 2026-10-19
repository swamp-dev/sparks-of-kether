/**
 * Maps arcanum number (0–21) to its Waite-Smith card image in
 * public/rider-waite-cards/.
 *
 * The runtime WebPs are derived from the public-domain 1910 "Pam-A" scans
 * kept under assets/rider-waite-cards/ — see assets/rider-waite-cards/LICENSE.md
 * for provenance, licence basis and the rebuild recipe.
 */
export const RW_IMAGE_FILE: Readonly<Record<number, string>> = {
  0: '00-fool.webp',
  1: '01-magician.webp',
  2: '02-high-priestess.webp',
  3: '03-empress.webp',
  4: '04-emperor.webp',
  5: '05-hierophant.webp',
  6: '06-lovers.webp',
  7: '07-chariot.webp',
  8: '08-strength.webp',
  9: '09-hermit.webp',
  10: '10-wheel-of-fortune.webp',
  11: '11-justice.webp',
  12: '12-hanged-man.webp',
  13: '13-death.webp',
  14: '14-temperance.webp',
  15: '15-devil.webp',
  16: '16-tower.webp',
  17: '17-star.webp',
  18: '18-moon.webp',
  19: '19-sun.webp',
  20: '20-judgement.webp',
  21: '21-world.webp',
};
