# Architecture rules

- Keep occasion presentation shared between Outfit and weekly planning, and gate the visual icon trial with one presentation flag so the prior emoji appearance can be restored without changing category searches or saved data.

- Avatar eligibility helpers live under the Edge Functions shared directory and are imported by the client and tests to keep free-model replacement rules aligned.
- Try-on category selection uses a pure client helper shared with unit tests so duplicate-category rules stay consistent.
- Avatar generation uses a per-user database lock and transactional usage/credit recording; free saved-model retention and lifetime initial eligibility for both plans are enforced in the database. Premium deletion is allowed independently of credits with a client confirmation for the last saved avatar; deletion never resets generation eligibility. Premium options are produced in one server request and recorded as one generation to prevent per-option credit charging.
- Preserve the Plan context identity through Vite hot updates because its module exports both a provider and consumer hooks used by existing mounted routes.
- Keep Try-on session drafts in an account-scoped external store so route changes and off-screen generation completion preserve avatars and selections without new AI requests.
- Charge try-on events to their generation-time plan; shared pure quota helpers drive client/server UTC counters and a service-role-only transactional recorder enforces monthly/daily caps without deleting usage on upgrades.
- Apply confirmed try-on usage to the account/plan query cache immediately after success, cancel stale reads and reconcile in the background so counters never wait for polling.