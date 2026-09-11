# Users and Personas

The PS names four user groups: **SMEs, factory operators, sustainability consultants, industry regulators.** Below, each is expanded into who they actually are, what they are trying to do, and what the product must therefore do. Two adjacent users the PS does not name are included because they are where the money and the distribution come from.

---

## Primary users

### P1 — Rajesh · SME owner / Managing Director
**The buyer. The one whose signature releases capex.**

| | |
|---|---|
| Context | 35–55, runs a ₹20–80 Cr turnover plant, often second-generation. Deeply knows the process, does not know GHG Protocol and has no reason to. |
| Trigger | An email from his European customer asking for embedded emissions data, with a deadline. Or a bank asking for an ESG declaration on a term loan. |
| Current behaviour | Forwards it to whoever seems least busy. Gets a quote from a consultant for ₹3 lakh and 8 weeks. Stalls. |
| Job to be done | *"Give me a number I can defend and a plan I can afford, before I lose this customer."* |
| Fears | Looking incompetent to his customer. Spending capex on something with no return. Being told to do something that breaks his process. |
| What he does NOT care about | Tonnes of CO₂, in the abstract. Climate framing. Certificates. |

**Product consequences**
- Lead with **rupees**, close with tonnes. The headline KPI is `₹4.66 Cr/yr` not `6,013 tCO₂e`.
- Every recommendation must carry **payback in months**, because that is the unit he thinks in.
- The output must be **showable** — something he can forward to the customer who asked.
- Never recommend anything that would break the process. This is why **blocking** exists; one bad recommendation ends his trust permanently.

---

### P2 — Priya · Plant manager / Works engineer
**The implementer. The one who decides whether anything actually happens.**

| | |
|---|---|
| Context | Engineer, 10–20 years on the floor. Knows exactly which compressor leaks and which trap has been failed for two years. Has no budget authority and no spare hours. |
| Trigger | Rajesh forwards the report and says "look into this". |
| Job to be done | *"Which two of these can I start on Monday without stopping production, and what do I tell the boss it costs?"* |
| Fears | Downtime. Being blamed when a vendor over-promises. Another initiative that dies in three months. |

**Product consequences**
- The **quick wins** portfolio exists entirely for Priya: payback ≤ 2 years **and** difficulty ≤ 2.
- Every intervention carries **`disruption_days`** — she needs to know whether it takes the line down.
- Every intervention carries a **physical statement**: *"Avoids about 120,000 kWh a year"*. She validates against her own intuition before she believes the rupees.
- **Caveats are a feature, not a disclaimer.** "Savings regress within 6–9 months without sub-metering" is exactly the sentence that earns her trust, because she has watched it happen.

---

### P3 — Anand · Sustainability consultant
**The power user and the highest-leverage distribution channel.**

| | |
|---|---|
| Context | Runs a 3–10 person practice, or is a solo BEE-certified energy auditor. Currently rebuilds an Excel model per client. |
| Trigger | Wins an engagement; needs to produce a credible report faster than the fee justifies at current effort. |
| Job to be done | *"Do twenty of these a month instead of two, without my margin collapsing or my name going on a number I can't defend."* |
| Fears | A tool that makes him look like he used a toy. Numbers he cannot trace to a source when the client's auditor asks. |

**Product consequences**
- **Every figure must be traceable to a cited factor.** This is non-negotiable for Anand and it is why the reference endpoint exists.
- Assumptions must be **overridable** — his client's actual tariff, actual cost of capital.
- The engine must be **reproducible**: same inputs, same outputs, every time. No hidden randomness, no model drift.
- He is the channel: one consultant brings 20 plants. Pricing and packaging should reflect that (see [`08-SCALE-AND-BUSINESS-MODEL.md`](08-SCALE-AND-BUSINESS-MODEL.md)).

---

### P4 — Regulator / auditor / lender
**The verifier. Does not use the tool; judges its output.**

| | |
|---|---|
| Context | State pollution control board officer, BRSR assurer, or a SIDBI credit officer assessing a green term loan. |
| Job to be done | *"Is this claim credible enough to accept, or do I have to send it back?"* |
| Fears | Accepting a number that later proves fabricated. |

**Product consequences**
- **Uncertainty bands on every headline.** A number without a range reads as false precision to this reader.
- **Declared exclusions.** "CBAM precursor emissions are excluded because we do not hold supplier-specific data" is far more credible than a complete-looking number that quietly guessed.
- **Explicit scope statement** — what is counted and what is not, per GHG Protocol.
- The product must never claim **assurance**. It produces working papers; a licensed assurer signs them.

---

## Secondary users (not named in the PS, but decisive)

### S1 — Meera · Corporate sustainability lead at a large customer
**The demand creator. The reason Rajesh opens the email at all.**

She has 300 suppliers and a BRSR Core value-chain obligation. She sends a spreadsheet; most come back blank or obviously guessed. She cannot use inconsistent data.

**Product consequences** — this is the **B2B2B distribution wedge**. If Meera's company hands Chakra to its supplier base, acquisition cost per SME approaches zero and the data comes back in one consistent, comparable format. It also creates the benchmark corpus. This is the single most important growth mechanism in the model.

### S2 — Cluster association / MSME-DFO officer
Tirupur Exporters' Association, an induction furnace association, a District Industries Centre. One meeting reaches 200 near-identical plants. **Cluster concentration is why SME distribution is tractable in India at all** — and it is why sector templates matter more than a generic form.

---

## Non-users, stated deliberately

| Who | Why not |
|---|---|
| Large listed corporates | Already served by enterprise carbon SaaS with sustainability teams. We would lose and should not try. |
| Individual consumers | Different product entirely. |
| Carbon credit buyers/traders | We do not issue, verify or trade credits. |
| Service businesses (offices, IT) | No process, no material bill, no leak to find. The whole method assumes a factory. |

---

## The user insight that shapes everything

> **An SME owner is not buying a sustainability product. He is buying a cost-reduction product with a compliance side-benefit.**

Every design decision follows from this:

| Decision | Because |
|---|---|
| MACC sorted by ₹/tCO₂e, not by tonnes | He optimises cash, not carbon |
| Headline KPI is annual rupee benefit | It is the number he repeats to his CFO |
| Payback shown in months under two years | Months is his unit; years feels like "someday" |
| "Quick wins" portfolio filtered by difficulty | Priya needs a Monday list, not a strategy |
| Cash-positive interventions separated out | *"Do these regardless of your view on climate"* is the only pitch that survives a sceptical owner |
| CBAM panel | Converts a nice-to-have into a deadline with a rupee figure attached |

A tool that opens with "reduce your carbon footprint" loses this user in four seconds. A tool that opens with *"₹4.66 crore a year, 12-month payback, and it happens to remove a quarter of your emissions"* keeps him for the whole meeting.
