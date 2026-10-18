# Product packet — PAUSA MX

Course: AI 2041, Week 10, Chapter 9, Isle of Happiness.  
Theme: when someone optimizes your life for you.  
Lesson: supersatisfaction for the person, not on the person.  
Student role: operator.  
Status of the team blueprint: provisional. This packet does not record a five-person vote, a team session, interviews, or pilot results.

## Problem

A buy-now-pay-later offer can make a purchase feel small. The monthly payment is visible. What is easier to miss is the surplus left after income, ordinary spending, debt already in the month, and the new installment. The person can also miss that cash on hand is not the same thing as monthly income.

The primary vacuum is regret prevention: a pause before the purchase, with the accounts in view. Debt guardrails are the secondary module: a manual list of installments and an explicit rule so the same debt is not counted twice.

## User

The intended person is a buyer in Mexico who is considering a purchase, often clothing in the demonstration, and who may pay in installments. They can type a few monthly figures. They are not asked to connect a bank. The operator builds the tool for that person, rather than for a retailer.

No specific individual was interviewed for this prototype. The scenarios in `/demo` are labeled fictional.

## Operator lens

The operator declaration for this build is a manual installment schedule and a conservative view of what is left. Variable income uses a conservative figure the person types, not their best month. Cash is shown as an immediate balance change. The buyer remains the decision maker.

## Value proposition

Before paying in installments, the person can see the surplus that would remain, the assumptions behind that figure, and a suggestion they can dismiss. The product sometimes says not to buy for now. It does not rank merchants, take a commission, or complete a checkout.

## Working slice

A person can:

1. Save a financial profile in the browser.
2. Describe one purchase, including installments and any fee they already know.
3. Answer three regret questions as context, not as a score.
4. Read the arithmetic, warnings, and one of four outcomes.
5. Accept, replace, or dismiss the suggestion and optionally keep the record.
6. Maintain a manual 12-month installment calendar without double-counting the profile total.
7. Export or delete the local data.

## User journey

1. Land on `/` and read what the product will and will not do.
2. Either open `/demo` or enter their own profile at `/perfil`.
3. At `/evaluar`, enter the purchase, answer the three questions, review the math, and see the suggestion.
4. Save a decision or leave without saving.
5. Inspect `/pagos` for overlap between listed obligations and the draft purchase.
6. Return to `/decisiones`. A follow-up question appears only after 30 days on a record they chose to keep.
7. Use `/privacidad` to export JSON or delete everything.

## Architecture

React 19, Vite, TypeScript, Tailwind CSS, React Router, and Recharts. Vitest tests the pure domain. There is no backend.

| Area | Location |
| --- | --- |
| Types, money, months, debt rule, schedule, assessment, history, demo data, storage | `src/domain` |
| React state and `localStorage` | `src/state/store.tsx` |
| Pages | `src/pages` |
| Chart and formula | `src/components` |

`npm run build` emits a static `dist`. `vercel.json` sends every path to `index.html` so a refresh on `/evaluar` still loads the app.

## Data model

Stored under `pausa-mx-state-v1`:

- Profile amounts, income stability, and optional reserve.
- Debt inclusion: `aggregate_includes_listed` or `listed_are_additional`.
- Obligations: description, amount per payment, remaining count, next due month, creation time.
- Draft purchase and regret answers.
- Decisions: engine outcome, user action, override flag, retention flag, numeric snapshot, creation time, and an optional follow-up that starts empty.
- Demo flag and which fictional scenario was loaded.

Corrupt JSON is discarded. The app starts empty and says so. It does not reconstruct a profile.

## Calculations

Monthly surplus on a given month:

`income used − essential expenses − discretionary expenses − debt counted − new installment`

- Stable income uses monthly net income.
- Variable income uses the conservative income. If that field is missing, the outcome is `INFORMACIÓN INSUFICIENTE`.
- For a cash purchase the new installment is 0. Cash after the purchase is `available cash − cash price`, shown separately. Available cash is never added to income.
- For installments, the new installment is the amount the person typed. Disclosed fees are added once into the financed total (`price + fees`). They are not added again on top of the installment. If the sum of installments and the financed total differ by more than 0.50 MXN, the app warns and still uses the typed installment.
- Unknown fees stay unknown. They are not silently treated as zero.
- If listed obligations are already inside the profile total, their amounts are not added again. If the person says the list is additional, only the obligations due in the scored month are added.
- The suggestion uses the installment month with the lowest surplus.
- Surplus below zero, or exactly zero, produces `NO COMPRES POR AHORA`.
- A cash purchase that would leave cash below zero, or below half of a stated emergency reserve, also produces `NO COMPRES POR AHORA`. A remaining balance below the reserve but at least half of it produces `MEJOR ESPERA` when the monthly surplus is still positive.
- Regret answers can move `PODRÍAS COMPRAR` to `MEJOR ESPERA`. They do not create a score and they do not overturn `NO COMPRES POR AHORA`.
- Missing or negative required inputs, an invalid month, or a non-positive installment count produces `INFORMACIÓN INSUFICIENTE`. Dividing by zero returns no amount.

The fictional clothing example:

`12,000 − 7,000 − 2,000 − 2,000 − 1,000 = 0`

Cash if the full price were paid today:

`2,000 − 3,000 = −1,000`

The suggestion is `NO COMPRES POR AHORA` because the monthly surplus is not above zero. The −1,000 is the separate cash figure.

## Shadow clause

The suggestion is explained and can be dismissed. The app does not block a purchase, hide a happiness score, or choose for the buyer. The clause is constant text in the domain layer and is shown on the landing page and on the suggestion step. The stored decision keeps both the engine outcome and the action the person chose.

## Constraints

- Mexican Spanish in the product. English in the documentation.
- Manual input only.
- Local data only.
- Buyer-first: no merchant ranking, affiliate link, advertisement, or checkout.
- Advice must be explainable, dismissible, and overridable.
- History expires after 30 days unless retained. Obligations do not expire with history.
- Do not invent undisclosed debts or cross-platform balances.

## Scope exclusions

- Bank aggregation, open banking, and credential collection.
- Automatic purchases and payment-provider APIs.
- A seller recommendation engine.
- A hidden or numeric happiness score.
- Invented interview findings, pilot metrics, or completed follow-ups.
- Multi-user accounts and cloud sync.
- Legal, tax, or personalized financial advice.

## Validation

- `npm test`: 18 tests, exit code 0, on 2026-10-18. See `evidence/vitest-output.txt`.
- `npm run build`: TypeScript and Vite production build completed.
- Browser script against http://127.0.0.1:5174/: passed. See `evidence/browser-verification.txt`.
- No interview and no pilot were run. The protocol in `docs/USER_INTERVIEW_PROTOCOL.md` is a plan, not a result.

## Risks

- People may type an incomplete month and still read the suggestion as complete. The app lists what is omitted, but it cannot detect a forgotten debt.
- A zero surplus is treated as “do not buy for now,” which is stricter than waiting only for a negative number. The rule is printed with the math.
- Local storage can be cleared by the browser, and it is not a backup.
- Someone could ignore the fictional label on the demo and treat those numbers as their own. The banner stays visible while demo mode is on.
- The exact course rubric for business bending was not supplied. This packet does not claim credit for unstated requirements.

## Success measures

Not measured on real users in this delivery. If a consented test happens later, useful observations would be:

- Whether the person can restate the surplus in their own words.
- Whether they can find how to override or dismiss the suggestion.
- Whether they understand that listed installments are not added twice unless they say so.
- Whether anyone feels blocked, rushed, or scored.

No target rate is claimed, because no such test was run.

## Deployment

The app builds to static files. Nested routes need a host rewrite, which `vercel.json` defines. The public URL is recorded in `README.md` only after a real deploy is opened and a nested route is checked. Until then, deployment is not claimed.
