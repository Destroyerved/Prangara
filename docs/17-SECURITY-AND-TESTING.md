# Security, Tenancy and Testing

---

# Part 1 — Security model

## 1. Authentication

| Decision | Choice | Why |
|---|---|---|
| Password hashing | **bcrypt** with per-password salt | Adaptive cost; salt embedded in the hash; no way to store a password by accident |
| Session model | **Server-side rows**, not JWT | Revocable. A user who suspects compromise is logged out everywhere by deleting rows. No key rotation problem. JWTs buy horizontal scale we do not need at a scale we are not at. |
| Token | `secrets.token_urlsafe(32)` | 256 bits from a CSPRNG |
| Cookie | `HttpOnly`, `SameSite=Lax`, 30-day expiry | JavaScript cannot read it; cross-site POSTs cannot carry it |
| Minimum password | 8 characters | Low bar, honestly stated — see gaps below |

### 1.1 No account enumeration

Login returns an **identical** status and message whether the account does not exist or the password is wrong:

```python
if not u or not verify_password(password, u["pw_hash"]):
    raise HTTPException(401, "Email or password is incorrect.")
```

Registration necessarily reveals that an email is taken (409). That is unavoidable for a self-serve signup and is the standard trade.

**Tested:** `test_wrong_password_rejected_without_revealing_account` asserts both responses are byte-identical.

---

## 2. Tenancy — the important one

**Authorisation is enforced at the data layer, not in route handlers.**

Every function in `repo.py` that touches plant data takes an `org_id` and scopes its query by it:

```python
def get_plant(org_id: str, plant_id: str) -> dict:
    p = db.one("SELECT * FROM plants WHERE id=? AND org_id=? AND archived_at IS NULL",
               (plant_id, org_id))
    if not p:
        raise HTTPException(404, "Plant not found.")
```

This matters because the common failure mode is a route that forgets its check. Here, **there is no query in the module that would return another organisation's rows** — a forgetful route cannot leak data, because the function it calls cannot produce it.

### 2.1 404, not 403

A plant belonging to another org returns **404 Not Found**, never 403 Forbidden. 403 confirms the row exists, which is itself a disclosure. An attacker enumerating plant IDs learns nothing.

### 2.2 Identity cannot be hijacked through the payload

`POST /api/plants/{id}/assess` accepts a profile, but overwrites its identity fields from the plant record:

```python
profile["sector"] = plant["sector"]
profile["name"]   = plant["name"]
```

Without this, a client could re-sector a plant through the assessment endpoint — which would also poison the benchmark corpus for a sector it does not belong to. **Tested:** `test_plant_identity_cannot_be_hijacked_via_profile`.

---

## 3. Privacy posture

| Property | Status |
|---|---|
| Anonymous sandbox stores **nothing** | ✅ Tested — assessment count unchanged after `/api/assess` |
| Plant data never leaves the request in sandbox mode | ✅ No persistence path |
| No third-party calls at runtime | ✅ Zero external requests, by design |
| No analytics, no trackers, no CDN | ✅ Frontend has no external dependencies |
| Corpus is aggregate-only | ✅ Percentiles across a sector; no plant identity reachable from a benchmark |
| A plant's own data excluded from judging it | ✅ Enforced in SQL |

**The one-sentence answer to "where is my data stored?"** — in the sandbox, nowhere; signed in, in your own organisation's rows, and the only thing that ever leaves them is an anonymous contribution to a sector percentile.

This matters commercially, not just ethically. Energy and material consumption is competitively sensitive; an SME that believes its data is pooled with a rival's will not enter it.

---

## 4. Known gaps — stated, not hidden

| # | Gap | Risk | Mitigation today | Fix |
|---|---|---|---|---|
| S1 | **No rate limiting on auth** | Brute force unthrottled | bcrypt cost makes it slow, not impossible | Per-IP limiter before public deploy |
| S2 | **No CSRF token** | Cross-site state change | `SameSite=Lax` + JSON-only API + no form posts | Double-submit token |
| S3 | No email verification | Signup with someone else's address | None | Verification link |
| S4 | No password reset | Account unrecoverable | None | Emailed token |
| S5 | Sessions never pruned | `sessions` table grows | Expiry checked on read | Periodic sweep |
| S6 | Single-org users | No teams, no roles beyond `owner` | None | Invites + roles |
| S7 | SQLite single writer | Contention under load | Fine at current scale | Postgres |
| S8 | No audit log | Cannot see who changed an action | `updated_at` only | Append-only log |
| S9 | Errors may leak detail | Minor information disclosure | Messages are user-facing, not stack traces | Error taxonomy |

**None of these block the demo. S1 and S2 block a public deployment.** Saying so is more useful than a security section that implies completeness.

---

# Part 2 — Testing

## 5. What is tested

`prototype/backend/tests/test_stack.py` — **20 tests, all passing**, against a throwaway SQLite file so the working database is never touched.

```bash
cd prototype/backend
python -m pytest tests/test_stack.py -q
```

| Area | Tests | What they prove |
|---|---|---|
| **Anonymous surface** | 3 | Sandbox persists nothing; demo needs no auth; protected routes 401 |
| **Authentication** | 5 | Register/login/logout cycle; duplicate rejected; wrong password indistinguishable from missing account; weak password rejected; **password never stored in plaintext** |
| **Tenancy** | 1 | Org B cannot list, read, assess or delete Org A's plant |
| **Plants & assessments** | 3 | Assessment persists and round-trips; identity cannot be hijacked via profile; unknown sector rejected |
| **Action tracking** | 2 | Actions seeded from recommendations; **status and actuals survive reassessment**; invalid status rejected |
| **Data flywheel** | 4 | Blending begins only at sufficient n and with the correct weight; **a plant is never benchmarked against itself**; **only the latest assessment per plant counts**; corpus endpoint reports provenance |
| **Portfolio** | 1 | Rollup sums correctly; realisation moves when an action completes |
| **Reporting** | 1 | HTML and PDF render; **MACC embedded as vector, not omitted** |

### 5.1 The tests that matter most

Three assertions carry disproportionate weight, because each guards a property that would be invisible if it broke:

```python
# A plant that benchmarks against itself drags its own percentile toward its
# own value. The detector goes quiet and the product silently stops working.
assert n_without == n_with - 1

# A reassessment that resets someone's tracker destroys months of their work
# without an error message.
assert after[iid]["status"] == "done"
assert after[iid]["act_abatement_tco2e"] == 42.0

# One plant assessed twelve times must not outvote eleven plants assessed once.
assert len(vals) == 1
```

---

## 6. Engine invariants

Checked across all 10 sectors on every run, independent of the unit tests:

| Invariant | Why it would be invisible |
|---|---|
| Stream emissions sum to the reported total | A dropped stream just makes the number smaller; nothing errors |
| No intervention abates more than its target stream contains | Produces a plausible-looking oversized recommendation |
| De-rated abatement never exceeds standalone | Silently inflates the portfolio |
| Substitution never exceeds its declared blend ceiling | Recommends something the process cannot physically accept |

**Current result: 0 violations across 10 sectors.**

---

## 7. Manual verification performed

Beyond automated tests, the full journey was driven in a real browser:

- Registered a consultancy account through the actual form
- Created 9 plants across 3 sectors and assessed each
- **Watched the flywheel flip** — plants 1–3 benchmarked against literature, plant 4 onward `blended`, confirming self-exclusion is wired in
- Marked an action `planned`, another `done` with actuals recorded
- Confirmed realisation moved from `null` → 3.6%, abatement accuracy 119%, capex accuracy 83%
- Generated the per-assessment PDF: 3 pages, all 7 sections, MACC present on page 2

### 7.1 Bugs found by manual testing that the unit tests missed

| Bug | Why tests missed it |
|---|---|
| `.modal{display:flex}` beat the `hidden` attribute, so the modal showed on page load | CSS specificity — no API test can see it |
| Sector names rendered as raw keys on a direct load to `/portfolio` | State only populated by a different view |
| Action rows re-sorted the instant a dropdown changed, jumping under the cursor | Correct data, bad interaction |

All three are UI-layer, which is exactly the class of defect an API test suite cannot reach. **A green test suite is not a working product** — it is a working backend.

---

## 8. Not tested

| Gap | Consequence |
|---|---|
| No frontend unit tests | Chart maths is verified by eye and by DOM inspection, not by assertion |
| No load or concurrency testing | SQLite write contention is untested |
| No property-based testing on the engine | Edge cases in band arithmetic could hide |
| No browser-automation regression suite | UI bugs can reappear silently |
| No security scanning or dependency audit | Vulnerable transitive dependency would go unnoticed |

At 48 hours these are correct omissions. At a real deployment, the frontend regression suite is the first to add — it is where all three manually-found bugs lived.
