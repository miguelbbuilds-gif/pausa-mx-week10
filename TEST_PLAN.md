# Test plan — PAUSA MX

Execution date: 2026-10-18.  
Automated command: `npm test` (`vitest run`). Result: 2 files, 18 tests, exit code 0. Log: `evidence/vitest-output.txt`.  
Build command: `npm run build`. Result: completed (`tsc -b` and Vite).  
Browser command: `node scripts/verify-browser.mjs` against http://127.0.0.1:5174/ using Edge. Result: passed. Log: `evidence/browser-verification.txt`.

No interview was conducted. Persona rows below use the fictional demo only.

## Functional

| Case | Expectation | Status |
| --- | --- | --- |
| Landing explains the product and links to the demo and profile | Hero, three promises, shadow clause, local-data note | Passed in the browser. Screenshot: `evidence/landing-desktop.png` |
| Profile saves income, expenses, debt, cash, and optional reserve | Values persist in `localStorage` and survive reload | Passed for the loaded demo profile; negative input is rejected. A full manual edit of every field was not repeated after the demo load |
| Wizard collects purchase, three questions, review, and suggestion | Steps render and the suggestion step shows an outcome | Passed via `/evaluar?paso=sugerencia` after demo load. The three question radios were not each clicked in the browser script |
| Payments add, edit, and delete | Manual obligations update the list and calendar | Add/edit/delete were implemented and the demo obligation rendered. The browser script did not click edit and delete |
| Decisions save the engine outcome and the person's action | Override keeps both | Passed. Screenshot: `evidence/decisions-desktop.png` |
| Demo load and reset | Fictional banner, replace data, clear all | Load, corrupt recovery, and full delete passed |
| Unknown route | Spanish not-found page | Passed |

## Calculation

| Case | Expectation | Status |
| --- | --- | --- |
| Negative monthly surplus | Income 12,000, expenses 7,000 and 2,000, debt 2,000, installment 2,000 → surplus −1,000 and `do_not_buy` | Passed, automated |
| Fictional clothing example | Surplus 0, cash impact −1,000, debt counted 2,000 even though a 500 obligation is listed, outcome `do_not_buy` | Passed, automated and in the browser |
| Affordable contrast | Surplus 8,100 and `could_buy` | Passed, automated and in the browser |
| Cash purchase | Cash is not added to income; installment used in the surplus is 0 | Passed, automated |
| Financing fees | 1,100 × 3 matches 3,300; a 1,000 installment with a 300 fee is a mismatch and the surplus still uses 1,000 | Passed, automated |
| Variable income | Conservative 10,000 is used instead of nominal 15,000 | Passed, automated |
| Overlapping installments | Two obligations in one month sum on the schedule; a later obligation is not added to earlier scored months | Passed, automated |
| No double counting | Included list adds 0; additional list adds 500 and changes surplus from 0 to −500 | Passed, automated. The payments screen shows added amount 0.00 for the demo |

## Edge

| Case | Expectation | Status |
| --- | --- | --- |
| Missing profile | `insufficient`, no surplus number | Passed, automated |
| Negative amounts | `insufficient` | Passed, automated and in the profile form |
| Invalid month `2026-13` | `insufficient`; `addMonths` returns null | Passed, automated |
| Zero or negative installment count | `insufficient`; `splitAcrossInstallments` returns null | Passed, automated and by the calculate button |
| Exactly zero surplus | `do_not_buy`, with the zero shown rather than relabeled as −1,000 | Passed |
| Emergency reserve | Cash left of 200 against a 1,000 reserve is severe; 800 is moderate and becomes `better_wait` while surplus stays positive | Passed, automated |
| Regret context | “I do not need it” moves a positive case to `better_wait` and does not rescue a negative surplus. No score field | Passed, automated |
| Huge installment count | Computation stops at 120 months and warns | Implemented. Not separately asserted in the browser |

## Privacy

| Case | Expectation | Status |
| --- | --- | --- |
| Data stays local | No network call is required to calculate or save | Design matches. The browser script did not audit the network log for third-party calls. Fonts are requested from Google Fonts when the page loads |
| Export JSON | Download `pausa-mx-datos.json` with a disclaimer | Passed in the browser |
| Delete one decision or obligation | Confirmation, then removal | Implemented. Browser script used full deletion, not single-item deletion |
| Delete all | Second step, then empty state | Passed |
| Corrupt storage | Reset, Spanish notice, no invented profile | Passed, automated and in the browser |
| 30-day expiry | Unretained record at exactly 30 days is removable; retained record stays; obligations stay | Passed, automated |
| Follow-up | Not due before 30 days; due for a retained record at 30 days; absent after an answer; absent for an expired unretained record; answer is not pre-filled | Passed, automated. Not exercised in the browser, because that would require a false clock |

## Accessibility

| Case | Expectation | Status |
| --- | --- | --- |
| Form controls have labels | Text, number, month, and radio groups | Passed for the fields the browser script addressed by role and name. Not a full screen-reader pass |
| Errors use alerts | Invalid profile and divide-by-zero note | Passed in the browser |
| Suggestion is a status region | `data-testid="outcome"` with `role="status"` | Passed |
| Calendar has a caption and a table | Chart is marked as a graphic; the table repeats the figures | Implemented and the table was found in the browser. Screen-reader behavior of Recharts was not tested |
| Keyboard | Native radios, buttons, and inputs | Not a dedicated keyboard-only pass. Controls are native |
| Skip link | First focusable control | Implemented. Not tabbed in the browser script |

## Mobile

| Case | Expectation | Status |
| --- | --- | --- |
| 390×844 landing and suggestion | Readable, no horizontal page overflow required for the main column | Screenshots captured: `evidence/landing-mobile.png`, `evidence/recommendation-mobile.png`. The payment table is inside a horizontal scroller on purpose |
| Bottom navigation | Primary sections on small screens | Implemented with `md:hidden`. Not separately asserted by the script |
| Desktop navigation | Sections visible at 1280px | Seen in desktop screenshots |

## Persona

| Case | Expectation | Status |
| --- | --- | --- |
| Fictional buyer who cannot absorb the jacket installment | `NO COMPRES POR AHORA`, surplus 0, cash −1,000 shown apart, headphones not double counted | Passed |
| Fictional buyer who can absorb the belt installment | `PODRÍAS COMPRAR`, surplus 8,100 | Passed |
| Real buyer interview | Consent script only | Not run. See `docs/USER_INTERVIEW_PROTOCOL.md` |

## Negative

| Case | Expectation | Status |
| --- | --- | --- |
| Negative income in the profile form | Save is blocked and an alert is shown | Passed in the browser |
| Installment count 0 | No division; status message | Passed in the browser |
| Empty evaluation | `INFORMACIÓN INSUFICIENTE` | Passed, automated |
| Corrupt JSON `{` | Recovery notice | Passed in the browser |
| Override toward buying when the engine says not to | Engine outcome remains `do_not_buy`; stored action is the person's choice | Passed, automated and in the browser |

## Not verified

- A full keyboard-only or screen-reader session.
- Edit and delete of a single obligation from the browser, beyond the demo row rendering.
- Every wizard radio clicked by the script. The domain tests cover the regret rules.
- Production hosting, until a deploy is actually opened.
- Any academic rubric item that was not provided with this assignment.
