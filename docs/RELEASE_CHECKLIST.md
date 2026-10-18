# Release checklist

Checked on 2026-10-18 in this workspace unless a row says otherwise.

## Product

- [x] Spanish UI on every route named in the brief
- [x] Landing, profile, four-step evaluation, payments, decisions, privacy, demo
- [x] Fictional clothing example and a contrasting affordable example
- [x] Suggestion can be accepted, overridden, or dismissed
- [x] No merchant ranking, affiliate, checkout, or bank login
- [x] Shadow clause visible on the landing page and the suggestion
- [x] Local save, export, single delete, and delete-all
- [x] 30-day history rule and follow-up only when that time has passed
- [x] Disclaimer that the prototype is not financial advice

## Engineering

- [x] `npm install` completed for the declared dependencies
- [x] `npm test` — 18 passed, exit code 0 (`evidence/vitest-output.txt`)
- [x] `npm run build` completed
- [x] `npm run dev` served the app. Verified URL: http://127.0.0.1:5174/
- [x] Nested routes reload in the Vite dev server
- [x] `vercel.json` rewrite is present for a static host
- [x] `.gitignore` excludes `node_modules`, `dist`, `.env`, and `.vercel`
- [x] No secrets added

## Evidence

- [x] Automated test log
- [x] Browser script log
- [x] Desktop and mobile screenshots from the running app
- [ ] Screen recording. Not produced. None is claimed
- [x] Production URL. https://pausa-mx-week10-tau.vercel.app opened, including nested routes. The unsuffixed `pausa-mx-week10.vercel.app` hostname belongs to a different site and is not this release

## Academic limits

- [x] Blueprint described as provisional
- [x] No invented votes, interviews, or pilot metrics
- [x] Interview protocol included as a plan
- [x] Unsupplied rubric items left unclaimed
- [x] Arithmetic conflict in the clothing example documented in `docs/DECISIONS.md` instead of hidden

## Before calling a deploy done

- [x] Hosting account authenticated as the existing Vercel user
- [x] Production deploy finished without an error. Project: `miguel-d52d/pausa-mx-week10`
- [x] https://pausa-mx-week10-tau.vercel.app opens
- [x] `/evaluar`, `/pagos`, `/demo`, and `/privacidad` open on a direct load
- [x] `README.md` updated with that verified URL
