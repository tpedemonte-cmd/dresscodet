# Architecture rules

- Avatar eligibility helpers live under the Edge Functions shared directory and are imported by the client and tests to keep free-model replacement rules aligned.
- Avatar generation uses a per-user database lock and transactional usage/credit recording; free saved-model retention is enforced by a database trigger, not only by visible controls.