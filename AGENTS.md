<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Finance math (summaries, savings gap, cut suggestions) lives in `src/lib/finance.ts` as pure functions with tests — keeps rules testable and shared by UI and server.
- AI tips run in an authenticated server function (`src/lib/insights.functions.ts`) that reads the user's rows via RLS — keeps the AI key and prompts server-side.
