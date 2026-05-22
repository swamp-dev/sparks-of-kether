/**
 * Maps arcanum number (0–21) to its Rider-Waite JPG filename in public/rider-waite-cards/.
 * The filename for card #5 preserves the original typo ("Heirophant") so it
 * matches the file on disk.
 */
export const RW_IMAGE_FILE: Readonly<Record<number, string>> = {
  0: 'TheFool.jpg',
  1: 'TheMagician.jpg',
  2: 'TheHighPriestess.jpg',
  3: 'TheEmpress.jpg',
  4: 'TheEmperor.jpg',
  5: 'TheHeirophant.jpg',
  6: 'TheLovers.jpg',
  7: 'TheChariot.jpg',
  8: 'Strength.jpg',
  9: 'TheHermit.jpg',
  10: 'WheelOfFortune.jpg',
  11: 'Justice.jpg',
  12: 'TheHangedMan.jpg',
  13: 'Death.jpg',
  14: 'Temperance.jpg',
  15: 'TheDevil.jpg',
  16: 'TheTower.jpg',
  17: 'TheStar.jpg',
  18: 'TheMoon.jpg',
  19: 'TheSun.jpg',
  20: 'Judgement.jpg',
  21: 'TheWorld.jpg',
};
