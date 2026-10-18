# Decisions and limitations

## Surplus of zero is “do not buy for now”

The clothing example in the brief lists income 12,000, essentials 7,000, discretionary 2,000, existing debt 2,000, and a new installment of 1,000. Those inputs sum to 0, not to −1,000:

`12,000 − 7,000 − 2,000 − 2,000 − 1,000 = 0`

The brief also asked for a suggestion of “do not buy for now” because the surplus was negative 1,000. The app does not print −1,000 as the monthly surplus. It prints 0. A surplus that is negative or exactly zero becomes `NO COMPRES POR AHORA`, because nothing is left for an unlisted expense. The rule is written next to the math.

The figure −1,000 is real in a different account: available cash 2,000 minus the full cash price 3,000. That number is shown as cash impact. It is not added into monthly income and it is not added on top of the installment.

## Cash is not income

A cash purchase reduces today’s balance. The monthly installment in the surplus formula is zero. A positive paycheck does not hide a cash purchase the person cannot pay today.

## Fees are not double counted

The financed total is cash price plus disclosed fees. The surplus uses the installment amount the person entered. If those two views disagree by more than 0.50 MXN, the screen warns and still uses the typed installment. A fee field left blank stays unknown. It is not coerced to zero. The “calculate installment” helper can divide price by count when fees are blank, and it says that it did so without treating the unknown fee as a disclosed zero.

## Debt is not double counted

The profile holds one monthly debt total. The payments page holds individual obligations. The default rule is that the total already includes the list, so the list is displayed and not added again. The person can switch to “the list is additional,” which adds only the obligations due in the month being scored. Tests cover both rules.

## Regret answers are not a score

“I do not need it now,” “I already have something,” or “I can wait seven days” can move “you could buy” to “better to wait.” They are listed as reasons. They do not add points, and they do not overturn a non-positive surplus.

## Reserve threshold

If a cash purchase leaves less than the optional reserve, but at least half of it, the suggestion is to wait, provided the monthly surplus is still positive. Leaving less than half, or less than zero, becomes “do not buy for now.” The threshold is explicit and arbitrary. It is not a credit score.

## History and follow-up

Unretained decisions are deleted when the app loads if the stored creation time is at least 30 days old. Retained decisions stay. Obligations are a different list and are not purged. The follow-up question is shown only for a decision that is still stored, is at least 30 days old, and has no answer timestamp. The demo does not fast-forward the clock. A page left open does not recompute that clock until reload, because the time is captured when the screen loads.

## What this build does not know

- Debts and subscriptions the person did not type.
- Balances in other installment products.
- Whether a fee that was left blank is actually zero.
- Whether the person’s income next month will match what they typed.
- Any result from an interview or a pilot. None was run.

## Hosting and fonts

The calculation runs in the browser. The stylesheet asks Google Fonts for Fraunces and Source Sans 3. That is a request to a font host, not an application backend. System fonts are the fallback.

## Rubric

The exact business-bending rubric was not included with the assignment. The repository does not mark any unstated criterion as satisfied.
