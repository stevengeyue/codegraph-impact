# CodeGraph Impact Context

You are codex. Use this impact pack before editing or reviewing this change.

## Summary

- Project: demo-shop
- Base: main
- Changed files: 3
- Churn: +87/-24
- Risk: medium (42)
- CodeGraph: available 0.9.9

## Changed Files

- M src/auth/session.ts (+32/-8)
- M src/api/login.ts (+41/-12)
- M src/config/cookies.ts (+14/-4)

## Likely Changed Symbols

- function `parseToken` in `src/auth/session.ts` around line 18
- route `/login` in `src/api/login.ts` around line 22
- export `cookieOptions` in `src/config/cookies.ts` around line 6

## Risk Signals

- [25] Authentication or authorization path changed: src/auth/session.ts
- [15] API surface changed: src/api/login.ts
- [12] Security-sensitive web setting touched: secure: true, sameSite: "lax"

## Suggested Verification

- npm test -- src/auth/session.test.ts (Near changed file src/auth/session.ts)
- npm test -- src/api/login.test.ts (Near changed file src/api/login.ts)

## CodeGraph Follow-ups

- `codegraph impact parseToken`
- `codegraph impact /login`

## Agent Guardrails

- Start with the changed symbols and risk signals above.
- Prefer CodeGraph impact/callers/callees before broad grep-style exploration.
- Do not edit unrelated files unless the impact chain explains why.
- Verify the suggested tests or explain why a different verification path is better.
