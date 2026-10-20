# Architecture rules

- Avatar eligibility helpers live under the Edge Functions shared directory and are imported by the client and tests to keep free-model replacement rules aligned.
- Try-on category selection uses a pure client helper shared with unit tests so duplicate-category rules stay consistent.
- Avatar generation uses a per-user database lock and transactional usage/credit recording; free saved-model retention and lifetime initial eligibility for both plans are enforced in the database. Premium deletion is allowed independently of credits with a client confirmation for the last saved avatar; deletion never resets generation eligibility. Premium options are produced in one server request and recorded as one generation to prevent per-option credit charging.
- Preserve the Plan context identity through Vite hot updates because its module exports both a provider and consumer hooks used by existing mounted routes.
- Keep Try-on session drafts in an account-scoped external store so route changes and off-screen generation completion preserve avatars and selections without new AI requests.