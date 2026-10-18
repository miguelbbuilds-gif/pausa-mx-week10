# Blueprint alignment

The Week 10 team blueprint is provisional. It is not a completed five-person vote, and this file does not claim that a team session happened. “Confirmed” below means the behavior is in this build. “Provisional” means it was an input to the build, not a recorded group decision.

## 1. Buyer-first

Provisional condition: no retailer commissions, seller rankings, or checkout incentives.

Implemented:

- The product never lists merchants, offers, affiliate links, or a checkout.
- Copy on `/` states that it does not recommend stores and does not buy anything.
- There is no payment button and no external commercial link in the interface.

Confirmed in the build. Not confirmed as a team vote.

## 2. Transparent math, evidence, unknown costs, and missing obligations

Provisional condition: show the arithmetic, the unknowns, and the obligations that are not in the account.

Implemented:

- The review step prints the inputs, the subtraction, the inclusion rule, assumptions, warnings, and a list of what is omitted.
- Unknown financing fees stay unknown. They are not stored as zero.
- An installment total that does not match price plus disclosed fees is labeled a mismatch. The surplus still uses the installment the person typed.
- The fictional example shows surplus 0 and, separately, cash −1,000. It does not rename one figure as the other.
- The app states that unlisted debts are not visible.

Confirmed in the build and covered by tests. Not confirmed as a team vote.

## 3. Spanish-first, low-friction, manual input, no mandatory bank connection

Provisional condition: Mexican Spanish, short manual entry, no bank requirement.

Implemented:

- Product UI, labels, errors, and outcomes are in Spanish. Documentation is in English.
- Profile and purchase forms accept typed amounts. Zero is allowed. Empty required fields block a half-saved profile.
- No credential field, no bank button, and no provider login.

Confirmed in the build. A fluency review with Spanish-speaking buyers was not done.

## 4. Shadow clause

Provisional condition: explainable and dismissible advice; no blocking, manipulation, or hidden happiness score; the buyer decides.

Implemented:

- `SHADOW_CLAUSE` is shown on the landing page and on the suggestion.
- Outcomes are words, not a score. Tests assert there is no `score` or `happinessScore` field.
- The person can accept the suggestion, record a different posture, or dismiss it.
- The stored record keeps the engine outcome when they override it.
- The app does not disable a path that represents “I choose differently.”
- Regret answers are reasons. They cannot turn a non-positive surplus into “you could buy.”

Confirmed in the build. Not confirmed as a team vote.

## 5. Privacy by default

Provisional condition: deletion controls, and purchase history expires after 30 days unless explicitly saved.

Implemented:

- One `localStorage` key. No application server and no analytics script.
- Export JSON and delete-all live on `/privacidad`. Single decisions and obligations can be deleted.
- Unretained decisions are removed on load once they are 30 days old, using the stored creation time.
- Obligations are not removed by that purge.
- Corrupt storage is reset instead of repaired into fake numbers.
- Google Fonts is requested from the browser for Fraunces and Source Sans 3. That is a network request to a font host, disclosed here. It is not an analytics call. If the fonts fail, the page uses Georgia and Segoe UI.

Confirmed in the build, with the font-host caveat. Not confirmed as a team vote.

## 6. Consent-based testing, interview protocol, and 30-day regret follow-up

Provisional condition: a real protocol and a follow-up. Do not invent results.

Implemented:

- `docs/USER_INTERVIEW_PROTOCOL.md` has a consent script and non-leading questions. No interview was run, so there are no findings.
- A follow-up form appears only when a retained decision is at least 30 days old and has no `answeredAt`.
- New demo decisions do not show a follow-up. The demo page says the clock is not simulated.
- Answering can be yes, no, or “prefer not to answer.” Nothing is pre-filled.

Confirmed as a plan and as software behavior under injected dates in tests. Not confirmed with a real 30-day participant.

## Provisional versus confirmed

| Topic | Status |
| --- | --- |
| Six conditions as a team decision | Provisional. No vote is claimed |
| Primary vacuum: regret prevention | Used as the build priority. Not a recorded vote |
| Secondary module: debt guardrails | Used as the manual calendar and inclusion rule |
| Operator slice: manual schedule and conservative cash left | Implemented |
| Exact business-bending rubric | Not supplied. Not claimed |
| Interviews, pilot metrics, completed follow-ups | Not done. Not invented |
