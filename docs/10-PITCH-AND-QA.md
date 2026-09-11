# Pitch Script and Judge Q&A

---

## The three-minute demo

**Rule: the first sentence contains a rupee figure, not a carbon figure.** You have about eight seconds before a judge decides whether this is another dashboard.

---

### 0:00–0:25 · The problem, through one person

> "Rajesh runs a knitwear dyeing unit in Tirupur. Two weeks ago his German buyer asked him for his embedded carbon emissions. He has no idea. A consultant quoted him three lakh rupees and eight weeks. His buyer wants it this month.
>
> There are sixty-three million MSMEs in India and a growing number of them just got the same email."

*No slides yet. Just the person.*

---

### 0:25–0:50 · What we built

> "Chakra takes ten numbers Rajesh already has — his electricity bill, his coal purchase, his cotton invoices — and in under a second it tells him where his carbon is leaking, and what to do about it, costed in rupees."

*Click the sector chip. Results appear.*

> "Twenty-four thousand tonnes a year. And here is the first surprise: **sixty-four percent of it is not in his factory at all.** It's the cotton he buys. His boiler — the thing he assumed was the problem — is twenty-seven percent."

*Point at the Sankey.*

---

### 0:50–1:25 · The leak detection

> "We don't just add it up. We compare him to his own sector. His electricity intensity is 1,250 kWh per tonne against a Tirupur median of 850 — he's in the worst quarter of his peer group. Same on process heat.
>
> That's what a leak point actually is: not a big number, but a **bigger number than the plant next door achieves on the same product.** Closing those two gaps to median alone is worth 2,600 tonnes a year."

*Point at the peer strip on the leak card.*

---

### 1:25–2:15 · The MACC — the hero moment

> "Now the part that makes this a decision instead of a report."

*Scroll to the MACC. Pause. Let them look at it.*

> "This is a marginal abatement cost curve. Every bar is one intervention. **Width is tonnes of CO₂. Height is rupees per tonne.** Sorted cheapest first.
>
> Everything **below this line has a negative cost** — it pays for itself and removes carbon as a side effect.
>
> For Rajesh that's seventeen interventions: **four crore sixty-six lakh a year of net benefit, four and a half crore of capital, twelve-month blended payback — and it removes a quarter of his footprint.** He should do all of it today whether or not he cares about carbon.
>
> And this bar" — *point to the amber* — "is the biomass fuel switch. It's his single biggest carbon cut. **It costs him sixteen hundred rupees a tonne.** We show that too, because a tool that only shows you the free wins isn't telling you how to decarbonise."

---

### 2:15–2:45 · The trust moment

*Scroll to "Considered and rejected". Switch the sector chip to Pharmaceutical.*

> "One more thing. This is a pharma plant. Our engine evaluated recycled PET for its packaging — and **refused it**, because primary packaging in product contact needs GMP material qualification.
>
> Switch to ceramics: it refuses the biomass switch, because briquette ash ruins a glazed tile kiln.
>
> **A recommender that never says no can't be trusted when it says yes.** That's the difference between this and a calculator."

---

### 2:45–3:00 · Close

> "Ten sectors. Thirty circular interventions. Thirty-one cited emission factors plus a grid factor for every state, every one with an uncertainty band that we carry all the way to the headline.
>
> It runs with the wifi off, because it calls nothing external.
>
> Across all ten sectors, we found the same thing: **roughly forty percent of an Indian SME's carbon is sitting behind a positive business case that nobody has ever computed for them.**"

---

## Judge Q&A

### Methodology

**"Where did your emission factors come from? Are they accurate?"**
> Published sources — CEA for the Indian grid, IPCC and DEFRA for combustion, worldsteel and IAI for materials. Every one carries a low/base/high band and the band propagates to the headline, which is why we report 24,069 tonnes with a range of 19,414 to 29,492, ±21%. We never show a point estimate without its range. And we flag in the tool that these are literature values that need re-verification against the current source editions before commercial use.

*Never defend a point estimate. Always retreat to the band and the source — that is a stronger position, and it is the true one.*

**"Isn't this just a carbon calculator?"**
> A calculator tells you your number. Three things here a calculator can't do. One, it compares you to your sector and tells you you're in the worst quartile on electricity — that needs a benchmark corpus. Two, it de-rates interacting interventions, so seven electricity measures don't stack to 99% of your meter. Three, it refuses recommendations that are technically valid but inadmissible. The output isn't a number, it's a ranked capital plan.

**"Why no machine learning? The PS suggests AI/ML."**
> Because there's no training data and the physics is known. There is no labelled corpus of Indian SME plants and their implemented interventions — a model trained on synthetic data just learns our own assumptions back. Emission factors come from thermodynamics and published LCI, not pattern matching. And an auditor asking "why 412 tonnes?" needs a derivation, not a feature-importance plot. ML earns its place in v3, learning the gap between *estimated* and *achieved* abatement from real implementation outcomes — and that's exactly what we'd train it on.

**"How do you know the benchmarks are right?"**
> We don't, fully, and the tool says so on the leak panel. They're indicative screening percentiles from published sector energy-intensity literature — good enough to rank a plant and flag outliers, not a substitute for a BEE audit. Replacing them with a measured corpus from real assessments is the core of our data moat, and it's the first thing that improves with usage.

### Rigour

**"Your savings numbers look too good."**
> They did to us too. Our first run claimed ten and a half crore a year on a thirty-four crore revenue plant — thirty-one percent of turnover. We didn't believe it and found three bugs. First, every energy intervention assumed the whole stream cost vanished, including open access where you still buy the power and fuel switching where you still buy fuel. Second, substitution ignored the blend ceilings declared in its own caveats — it was recommending 52% recycled cotton when staple length caps it near 25%. Third, seven electricity interventions stacked additively. After fixing all three: 4.66 crore, and the biomass switch correctly flipped from free to a net cost.

*This is the single strongest answer in the set. It demonstrates judgement, not features.*

**"What stops a user entering garbage and getting a confident wrong answer?"**
> Nothing in v1, and that's an honest limitation. We accept declared data. v2 adds bill-based validation and cross-checks against sector plausibility ranges — if you claim 200 kWh per tonne in a dyeing unit where p25 is 620, we should challenge it rather than compute on it.

### Market

**"Doesn't this already exist?"**
> The *accounting* layer absolutely exists and is crowded — Persefoni, Watershed, and a real set of Indian ESG vendors. They answer "what is my number." Almost none answer "which twelve things should I do, in what order, at what rupees per tonne" for a plant that can't afford a consultant. And none of them model circular material substitution with physical blend ceilings, which for an Indian auto-component SME is 60-70% of the footprint.

**"Would an SME owner actually use this?"**
> That's our biggest open risk and we've named it. Ten inputs is few but it isn't zero. Which is why our highest-leverage channel isn't direct — it's a large customer with a BRSR Core value-chain obligation handing this to three hundred suppliers. Acquisition cost goes to near zero, the data comes back in one comparable format, and that's the corporate's actual problem.

**"Who pays?"**
> The assessment is free — it's the acquisition. The paywall is at *export*, because that's where the value becomes transferable: the PDF Rajesh forwards to the buyer who asked. Plus consultant seats and corporate supplier programmes.

### Hostile

**"You're telling factories to burn biomass. Isn't that just moving the problem?"**
> Good question, and it's why we handle biogenic carbon explicitly. Under GHG Protocol, biogenic CO₂ is reported separately and excluded from the Scope 1 total — we compute that memo line rather than silently zeroing biomass, which is what most tools do. We also flag the real caveats: seasonal supply volatility, higher ash handling, and boiler warranty implications. And we show it as a **net cost**, not a free win.

**"What if your recommendation damages someone's business?"**
> That's the risk we designed hardest against. Every card carries difficulty, disruption days in production downtime, a confidence rating, and caveats that state failure modes rather than benefits. We block inadmissible interventions outright. And we never claim assurance — this is a screening tool that tells you where to spend an audit, not a replacement for one.

**"Three of your ten sectors show no operational leaks at all. Is your detector broken?"**
> No — that's the detector working. Those plants are genuinely efficient gate-to-gate, and reporting a clean bill of health would be the wrong answer, so the structural-hotspot rule fires instead and tells them their purchased steel is 60% of their footprint. An energy-only detector would have told them they were fine.

---

## Demo safety checklist

- [ ] Server started and hero sector pre-loaded before you walk up
- [ ] **Run once with wifi disabled** — it should work identically
- [ ] Browser zoom set so the MACC is readable from the back of the room
- [ ] Second sector (pharma) ready for the refusal moment
- [ ] Know your own numbers cold: 24,069 · 64% Scope 3 · ₹4.66 Cr · 12 months · 25%
- [ ] Q&A assigned: engine person on methodology, data person on domain, lead on market
- [ ] If something breaks: `/api/demo/textile_dyeing` returns the full JSON. Read the numbers off it and keep talking.
