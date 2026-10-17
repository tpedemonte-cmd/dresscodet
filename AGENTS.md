# Architecture rules

- Avatar eligibility helpers live under the Edge Functions shared directory and are imported by the client and tests to keep free-model replacement rules aligned.
- Try-on category selection uses a pure client helper shared with unit tests so duplicate-category rules stay consistent.
- Avatar generation uses a per-user database lock and transactional usage/credit recording; free saved-model retention is enforced by a database trigger, not only by visible controls.
- Preserve the Plan context identity through Vite hot updates because its module exports both a provider and consumer hooks used by existing mounted routes.