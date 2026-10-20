# Architecture rules

- Route client function calls through the fixed Cloud endpoint with the configured data project's session; validate that session against the selected allowlisted backend and keep quota writes and locks request-scoped to it, so external data never mixes with Cloud identities while AI billing stays in Cloud.

- Keep occasion presentation shared and render emoji-bearing interface labels and stored/AI text through the shared IconText presenter; gate the visual trial with one presentation flag so prior appearance can be restored without modifying searches, prompts or saved data.

- Avatar eligibility helpers live under the Edge Functions shared directory and are imported by the client and tests to keep free-model replacement rules aligned.
- Try-on category selection uses a pure client helper shared with unit tests so duplicate-category rules stay consistent.
- Avatar generation uses a per-user database lock and transactional usage/credit recording; free saved-model retention and lifetime initial eligibility for both plans are enforced in the database. Premium deletion is allowed independently of credits with a client confirmation for the last saved avatar; deletion never resets generation eligibility. Premium options are produced in one server request and recorded as one generation to prevent per-option credit charging.
- Preserve the Plan context identity through Vite hot updates because its module exports both a provider and consumer hooks used by existing mounted routes.
- Keep Try-on session drafts in an account-scoped external store so route changes and off-screen generation completion preserve avatars and selections without new AI requests.
- Charge try-on events to their generation-time plan; shared pure quota helpers drive client/server UTC counters and a service-role-only transactional recorder enforces monthly/daily caps without deleting usage on upgrades.
- Apply confirmed try-on usage to the account/plan query cache immediately after success, cancel stale reads and reconcile in the background so counters never wait for polling.
- The Android APK bundles the built web app (webDir dist, no server.url) so it runs standalone; it talks to the same backend, and code changes require npm run build + cap sync + a new APK.
