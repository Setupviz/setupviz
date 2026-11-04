# SetupViz safeguards and owner checklist

## Implemented

- Fit results state “Estimated fit—verify measurements before buying”; positive results describe the model rather than guaranteeing physical fit. Overlap and off-desk checks are unchanged.
- Product cards expose their catalog measurement source and monitor estimation notes. Photo-derived outlines and panel offsets remain estimates. Affiliate commission text remains beside paid product/cart links.
- Amazon pricing stays off unless `AMAZON_PRICING_ENABLED` is exactly `true`, credentials exist, and `PRICE_RATE_LIMITER` is usable. Missing/broken limiters fail closed; rejected requests return 429 with a 60-second Retry-After. Upstream requests have five-second timeouts. Fixed diagnostic events omit request data and credentials.
- Weekly Dependabot updates cover npm and Actions. Push/PR/weekly checks include npm audit, browser tests and pricing unit tests. Daily live desktop/mobile smoke checks detect JavaScript errors and missing fit/source disclosures. GitHub Actions notifications must be enabled by the owner; this is periodic detection, not real-time error monitoring or an uptime guarantee.

## Before enabling Amazon pricing

Do not enable solely by adding credentials. Confirm Amazon API/affiliate eligibility, permitted display/caching rules, product mapping and required disclosures. Configure and verify a Cloudflare rate limiting binding named `PRICE_RATE_LIMITER` (suggested initial limit 10 requests/60 seconds per IP), load-test caching/upstream request volume and verify billing limits. The binding limiter is per Cloudflare location and permissive/approximate, not a global quota or spending cap. The deploy script preserves existing ratelimit bindings; it does not create one. No binding or Amazon access was provisioned in this change.

## Cloudflare observed on the Mac mini, 2026-11-04

The signed-in dashboard shows Workers Free active, no SetupViz runtime variables or bindings, and Logs, Traces and Issues off. Metrics show errors but are not proactive notifications. Repository builds are not connected; existing releases were manual API uploads. No paid service was enabled.

The Platform Notifications page shows an empty state with “Create a notification”; no configured platform billing notification was visible. Workers/Durable Objects spend-policy availability/enforcement remain unverified. Budget alerts do not cap or stop usage. Cloudflare documents spend policies with `usage_block`, eligibility and asynchronous enforcement caveats; verify actual account configuration before relying on them. Free-tier limits are not an account-wide spending cap, and do not cover future upgrades or other products.

- [Budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)
- [Spend policies](https://developers.cloudflare.com/api/resources/billing/subresources/spend_policies/)
- [Rate limiting semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

## Input and legal review still needed

- Confirm original logo creator, ownership and license. A GitHub organization avatar is not evidence of a license or ownership transfer.
- Have a Puerto Rico business attorney review the terms, including the $50 liability limit, consumer rights, governing-law/jurisdiction provisions, affiliate disclosures and privacy practices. Disclaimers do not eliminate liability or prevent lawsuits. No enforceability conclusion is made here.
- Decide whether to activate error-log retention/alert delivery and confirm costs before paid monitoring. Select a notification recipient and enable GitHub Actions failure notifications.
- Confirm actual billing alerts/spend policy and acceptable availability tradeoffs if requests are blocked.

## Existing test findings

The separate, currently unused Python recommendation backend has three failing recommendation tests because `recommend()` calculates ranking but returns no result. This predates these changes and is not used by the deployed static Worker. The CI check deliberately reports the failure; it is not suppressed. The first-paint test initially exceeded its strict timing threshold during concurrent desktop/browser tests, then passed at 98 ms (home) and 108 ms (builder) worst samples after other tests finished.

## Deployment evidence

Commit `82f2a88` was deployed from the Mac mini through the existing Cloudflare browser session as Worker version `fb052cde`, confirmed at 100% traffic. Live safeguards checks passed at 390px and 1280px and `/api/prices` returned an empty price map. The existing production-only `og-launch-v1.png` was preserved and added to GitHub.

Dependabot ran successfully and opened update PRs. The first GitHub Actions run passed installation, audit, build and all six pricing tests but failed the first-paint budget on the shared runner (255/286 ms). CI now runs functional checks independently of this timing check, and the separate Python job keeps its existing failures visible.

## Follow-up fixes requested by the owner

The owner subsequently requested fixes for the failing checks. The Python
recommender now returns the requested number of ranked results and their size
comparison reasons; all 20 existing tests pass. The generated HTML embeds the
unchanged shared stylesheet and preloads the primary font, removing a blocking
stylesheet request and late font discovery. The first-paint threshold remains
200 ms and CPU throttling remains 4x; no test threshold or assertion was relaxed.
