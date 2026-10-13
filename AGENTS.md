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
- Financial consultancy runs in an authenticated server function (`src/lib/insights.functions.ts`) with validated period/account inputs and RLS reads — keeps AI credentials private and analysis aligned with the selected scope.
- Personal goals and contributions persist separately from transactions and do not move bank funds — prevents recorded savings from being mistaken for transfers.
- Pluggy credentials stay server-side; every item must match the authenticated clientUserId before persistence or synchronization — prevents cross-user bank data access.
- Banking, goals and credit review use focused finance components and pure helpers — keeps the main finance screen maintainable and calculation rules testable.
- Bills are separate from bank transactions and use tested pure mapping/summary helpers — avoids double-counting planned payments as bank expenses.
- Pending bill month eligibility and carryover are computed by pure helpers from original reference dates, never by rewriting imported rows — preserves provenance and keeps refreshes idempotent.
- The single bills experience exposes bank connection and transaction reads in a focused collapsible panel with the shared finance-data query — preserves a clean unpaid-bills view without hiding bank access.
- Shared Notion credentials are accessible only after an owner-scoped, non-user-writable organizer authorization — prevents other app users from importing the builder's private workspace.
- Notion refreshes preserve local payment overrides and never infer payment from bank amount matches — keeps reviewed statuses stable and avoids false reconciliation.
