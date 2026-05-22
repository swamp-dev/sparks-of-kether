
## Push 1 — c7cf133

Fix: `boxShadow: !reduceMotion && isMagnified ? MAGNIFY_BOX_SHADOW : undefined`

Every other motion style (transform scale, transition, neighbour translateX) was already gated on `!reduceMotion`. The box-shadow was the one omission. Added a test in the `prefers-reduced-motion` describe block confirming `.style.boxShadow === ''` on hover when reduced-motion is set.

Reviewer verdict: ship. Minor note about `transformOrigin` being ungated (intentional — it's structural, not decorative). No critical/significant findings.
