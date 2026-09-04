# Contributing

Thanks for taking a look. Small, focused pull requests are the easiest to review and merge.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env        # add your own ANTHROPIC_API_KEY
npm run typecheck
npm test
```

Unit tests need no API key. The evals (`npm run evals`) and anything that runs a real check do.

## What a good change looks like

- One topic per pull request. A new notification channel and a chart fix are two pull requests.
- Keep the style of the code around you: TypeScript, ESM, no comments where a good name does the job, no new dependencies unless the pull request explains why.
- Run `npm run typecheck` and `npm test` before pushing. CI runs the same two commands.
- If you touch the prompt or the extraction, run `npm run evals` and put the result in the pull request description. Accuracy must not drop.

## Adding an eval case

```bash
npm run evals:capture -- <product-url> <case-name>
```

Open `evals/cases/<case-name>.json`, read the captured text, and fill in `expected` by hand from the shop page. An eval case with a guessed answer is worse than no case.

## Adding a notification channel

`src/notify.ts` has `notifyDiscord(change)`. A new channel is one more function with the same signature, wired in `src/watch.ts`, with its settings read in `src/config.ts` and documented in `.env.example`.

## Reporting problems

Use the issue templates. For anything security related, see [SECURITY.md](SECURITY.md) instead of opening a public issue.
