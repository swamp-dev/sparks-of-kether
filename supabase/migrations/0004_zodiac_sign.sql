-- 0004_zodiac_sign.sql
--
-- #237 (Epic #212 T8): Soul Aspects are gone — the 12-class
-- astrological-sign system fully replaces them. The lobby's class
-- pick now writes a `ZodiacSignKey` instead of a `SoulAspectKey`,
-- and `validateAndBuildSetup` (lib/start-game.ts) reads
-- `players.zodiac_sign` rather than `players.soul_aspect`.
--
-- Schema changes:
--   - Drop the legacy `soul_aspect` column.
--   - Add a `zodiac_sign` text column (nullable, like `soul_aspect`
--     was — null while the player is still picking).
--
-- The DB doesn't enforce the value enum — the engine does — so
-- adding or renaming signs doesn't require a follow-up migration.
-- Mirrors the soul_aspect contract from 0001_init.sql.

alter table public.players
  drop column soul_aspect;

alter table public.players
  add column zodiac_sign text;
