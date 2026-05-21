
## 2026-05-20T22:24:00-04:00 — initial implementation

**Pushed:** style(movement): change NETZACH_ADJACENT_PATHS JSDoc block to line comment (#65)
**Why:** The `/** ... */` block comment was being picked up by JSDoc tooling as documentation for the next symbol (the exported `applyMove` function), not for the constant. A plain `//` line comment breaks the JSDoc association.
**Notes:** none
**Commit(s):** `HEAD`
