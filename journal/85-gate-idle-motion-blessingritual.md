# #85 — fix(encounter): gate idle motion in BlessingRitual stage portrait

## Push 1 — 5cd0663

Fix: add `pose="speaking"` to the `<AvatarPortrait>` call in BlessingRitual. Without it, stage-size portraits default to `pose="idle"`, which triggers idle motion (jitter for Hod/Hermes, drift for Yesod/Selene). The blessing ceremony has a quieter tone than an encounter.

Test advances to Hod (7 steps) — the primary regression target (Hermes jitter) — and asserts `data-avatar-pose="speaking"`. Reviewer suggested this over a simpler Kether-only assertion for a stronger regression guard.

Reviewer verdict: ship. No critical/significant findings.
