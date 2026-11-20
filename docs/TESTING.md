# Verification record

Verified locally on November 20, 2026 using Java 21, Maven 3.9, Node 24, Google Chrome, Docker Desktop and real MySQL 8.4. No mock backend was used for browser verification.

## Executed checks

| Check                                        | Result                                               | Evidence on this machine                                                                              |
| -------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| JUnit / Mockito / real-MySQL MockMvc         | **19 passed**, 0 failures/errors/skipped             | `backend/target/surefire-reports`, `.runtime/backend-tests.log`                                       |
| React storefront production build            | Passed                                               | `.runtime/frontend-build.log`                                                                         |
| React OMS production build                   | Passed                                               | `.runtime/frontend-build.log`                                                                         |
| Full Compose image build and startup         | Passed; four services running, API and MySQL healthy | `.runtime/docker-build-final.log`, `docker compose ps`                                                |
| Chrome end-to-end suite against Docker/Nginx | **5 passed** in about 1.5 minutes                    | `.runtime/browser-production.log`                                                                     |
| npm dependency audit                         | 0 reported vulnerabilities                           | `.runtime/npm-audit.log`                                                                              |
| Database persistence across MySQL restart    | Passed; API reconnected                              | `.runtime/persistence-check.log`, `.runtime/persistence-before.txt`, `.runtime/persistence-after.txt` |
| Live OpenAPI and API health                  | OpenAPI 3.1 returned; health UP                      | `/v3/api-docs`, `/actuator/health`                                                                    |
| Automated visual inspection                  | 0 FAIL for homepage and OMS at 1440, 768 and 390px   | `.taste-skill/inspect/storefront/report.json`, `.runtime/visual/admin-report.json`                    |

The final OMS build also replaces ambiguous date-only truncated order labels with each order's unique suffix. Its dashboard was inspected after rebuilding. A final expanded responsive pass **passed**, including a populated cart and checkout alongside all management pages (66 route/viewport combinations); see `.runtime/browser-responsive-final.log`.

A final product-page refinement supplies featured catalog products when a category has no other items. After the storefront container was rebuilt, a focused Chrome check verified four live recommendations, loaded images, no document overflow and no page errors at all three widths; `.runtime/related-final.log` contains the result.

## Backend coverage

`CommerceIntegrationTest` runs 16 tests against the dedicated **novara_test** MySQL database through MockMvc. It exercises registration and hashed passwords, login/refresh rotation/logout revocation, product retrieval and validation, duplicate SKU protection, server-calculated totals and shipping, insufficient stock rollback, checkout idempotency, simulated decline/retry, cancellation/refund and exactly-once inventory restoration, sequential fulfillment and COD collection, customer ownership, backend role restrictions, stock adjustment validation, deactivated products, concurrent purchase of the final item, filtering and database-derived analytics.

`CatalogServiceTest` contains two Mockito service tests. `OrderRulesTest` checks every pair of order states against the permitted transition graph. Tests use generated identifiers so they can be rerun without deleting test data. An expected duplicate-SKU database error appears in the log as part of its negative test.

During implementation the concurrent purchase test exposed stale inventory reads under MySQL repeatable-read isolation. Explicit pessimistic inventory reads fixed it. The final suite passed with that fix.

## Browser coverage

1. Register a customer, purchase through the storefront, confirm/process/create shipment/dispatch/deliver as staff, and observe tracking changes as that customer.
2. Decline a simulated card payment, verify no stock allocation, retry successfully, cancel, and verify the original stock is restored.
3. Create a product as manager, upload a real JPEG, stock it in, inspect movement history, and deactivate the test product while retaining its audit trail.
4. Search and sort products, add to bag, change quantity, remove an item, and persist a newsletter subscription.
5. Render storefront and OMS routes at **1440, 768 and 390px**. Check for document overflow, failed/undecoded images, missing headings, OMS API error panels, and uncaught page errors. Scroll lazy images into view before asserting their dimensions. Capture representative pages.

Tests create clearly named browser customers and orders in the demo database. These records remain visible in analytics; test products are archived. This is intentional audit history, not fabricated UI state.

## Repeat the checks

Run from the project root in PowerShell:

```powershell
.\scripts\test-backend.ps1
npm run build
docker compose up -d --build --wait
npm run test:e2e
.\scripts\check-persistence.ps1
npm audit --audit-level=moderate
```

The persistence check deliberately restarts **this project's MySQL service**. Run it when no one is checking out. It compares order count/sum/latest ID, five recent orders, every inventory balance, and payment aggregates before and after the restart. The verified snapshot contained 37 orders totaling $16,922.45 across all statuses; that sum is not the paid revenue metric.

Chrome must be installed for the configured browser channel. For another environment, install Playwright Chromium and remove `channel: 'chrome'` from `playwright.config.js`. Both frontends and the API must be running on their documented ports. Run browser tests against the demo environment only. Integration tests require a separate database; never point `TEST_DB_URL` at business data.

`npm run test:e2e` produces a local HTML report and retains traces/screenshots for failures. `npx playwright show-report` opens it. Generated reports, runtime logs, native uploads and secrets are Git-ignored.

## Scope of the evidence

This is functional and responsive verification in Chrome on Windows, including actual containers and database restart. It is not a load test, penetration test, exhaustive accessibility certification, or a physical iOS/Android device test. Firefox and Safari were not tested. Payment/carrier behavior is deliberately simulated. Visual judgments and accepted inspection warnings are recorded in [VISUAL_REVIEW.md](VISUAL_REVIEW.md).
