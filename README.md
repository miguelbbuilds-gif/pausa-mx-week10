# PAUSA MX

Buyer-side decision assistant for a purchase someone might pay in installments. The interface is in Mexican Spanish. The person enters their own numbers, sees the arithmetic, and keeps the final decision.

This is a fictional functional prototype for AI 2041, Week 10, Chapter 9. It is not financial advice, not a store, and not a record of interviews or a pilot.

## Setup

```bash
npm install
npm test
npm run build
npm run dev
```

Vite prints the local URL. In this workspace, port 5173 was already in use, so the verified preview was:

http://127.0.0.1:5174/

Direct visits and reloads of `/perfil`, `/evaluar`, `/pagos`, `/decisiones`, `/privacidad`, and `/demo` work in development. `vercel.json` rewrites nested routes to `index.html` for a static host.

## What it does

- Landing page with the product promise and a fictional clothing example.
- Editable profile: net income, stable or variable pay, conservative income, cash, essential spending, discretionary spending, existing monthly debt, and an optional emergency reserve.
- Four-step purchase wizard. Clothing is the default category. Other categories are available.
- Deterministic suggestion: `PODRÍAS COMPRAR`, `MEJOR ESPERA`, `NO COMPRES POR AHORA`, or `INFORMACIÓN INSUFICIENTE`.
- Manual installment list, inclusion rule, 12-month chart, and accessible table.
- Saved decisions, override, optional retention, and a follow-up only after 30 real days on a retained record.
- Local export and deletion. No server, analytics, cookies, or remote model.

## Screenshots

These files were captured from the running app. They are not mockups.

- [Landing, desktop](evidence/landing-desktop.png)
- [Landing, mobile](evidence/landing-mobile.png)
- [Fictional demo](evidence/demo-desktop.png)
- [Suggestion](evidence/recommendation-desktop.png)
- [Suggestion, mobile](evidence/recommendation-mobile.png)
- [Payments and inclusion rule](evidence/payments-desktop.png)
- [Payments, top of page](evidence/payments-viewport.png)
- [Saved override](evidence/decisions-desktop.png)

## Demo

Open `/demo`, load **No compres por ahora**, then open the suggestion. The narration is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

The clothing example uses income 12,000, cash 2,000, essentials 7,000, discretionary 2,000, existing debt 2,000, and a 3,000 jacket in three payments of 1,000. Monthly surplus after the new payment is **0.00 MXN**, so the suggestion is **NO COMPRES POR AHORA**. Paying the full price from available cash would leave **-1,000 MXN**. That cash figure is shown separately and is not added again into the monthly surplus. See [docs/DECISIONS.md](docs/DECISIONS.md).

## Tests

```bash
npm test
```

The last run in this workspace: 2 files, 18 tests, exit code 0. Output: [evidence/vitest-output.txt](evidence/vitest-output.txt).

Browser pass, using Edge through Playwright Core:

```bash
npm install --no-save playwright-core
node scripts/verify-browser.mjs
```

Result: passed. Notes: [evidence/browser-verification.txt](evidence/browser-verification.txt). Playwright Core is not a project dependency. The script needs Microsoft Edge on the machine.

## Limitations

- Numbers exist only in this browser. Another device does not see them.
- The app cannot see debts, subscriptions, or installment apps the person did not type.
- A suggestion is not certainty and not advice.
- Purchase history older than 30 days is removed on the next load unless the person kept it. The 30-day question is not shown for a record that was just created, and the app does not invent an answer.
- The follow-up clock is read when the page loads. A tab left open across the 30-day mark needs a reload.
- There is no account, sync, or bank connection, by design.

## Live URL

Not published yet. A production URL belongs here only after it has been opened and checked, including a nested route.

## More documentation

- [PRODUCT_PACKET.md](PRODUCT_PACKET.md)
- [TEST_PLAN.md](TEST_PLAN.md)
- [BLUEPRINT_ALIGNMENT.md](BLUEPRINT_ALIGNMENT.md)
- [docs/USER_INTERVIEW_PROTOCOL.md](docs/USER_INTERVIEW_PROTOCOL.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
- [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)
