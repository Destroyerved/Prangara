/* Chakra front end. No external dependencies by design: the demo must render
   with the venue wifi switched off. Both charts are hand-built SVG.

   Structure:  api helpers -> formatting -> router -> views -> result renderers.
   The result renderers are shared verbatim between the anonymous sandbox and
   the signed-in plant view, so there is exactly one place charts can break. */

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- api ---------- */
async function api(path, opts = {}) {
  const r = await fetch(path, {
    credentials: "same-origin",
    headers: opts.body ? { "Content-Type": "application/json" } : {},
    ...opts,
  });
  const ct = r.headers.get("content-type") || "";
  const body = ct.includes("json") ? await r.json() : await r.text();
  if (!r.ok) throw new Error((body && body.detail) || r.statusText);
  return body;
}
const GET = (p) => api(p);
const POST = (p, b) => api(p, { method: "POST", body: JSON.stringify(b) });
const PATCH = (p, b) => api(p, { method: "PATCH", body: JSON.stringify(b) });

/* ---------- formatting ---------- */
const nf = (n, d = 0) => Number(n).toLocaleString("en-IN", {
  minimumFractionDigits: d, maximumFractionDigits: d });

function inr(v) {
  if (v === null || v === undefined) return "—";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e7) return `${s}₹${nf(a / 1e7, 2)} Cr`;
  if (a >= 1e5) return `${s}₹${nf(a / 1e5, 1)} L`;
  if (a >= 1e3) return `${s}₹${nf(a / 1e3, 1)}k`;
  return `${s}₹${nf(a)}`;
}
const t = (v) => `${nf(v)} t`;
const pay = (m) => m === null || m === undefined ? "—" : m < 1 ? "immediate" : m < 24 ? `${m} mo` : `${nf(m / 12, 1)} yr`;
const when = (ts) => new Date(ts * 1000).toLocaleDateString("en-IN",
  { day: "numeric", month: "short", year: "numeric" });

/* ---------- state ---------- */
const S = { user: null, sector: null, sectors: [], plant: null, result: null, tab: "assessment" };

/* =======================================================================
   ROUTER
   ======================================================================= */
const VIEWS = ["view-sandbox", "view-auth", "view-portfolio", "view-plant"];

function showView(id) {
  VIEWS.forEach(v => { const n = $(v); if (n) n.hidden = v !== id; });
}
function showResults(on) { $("results").hidden = !on; }
function boot(msg) {
  const b = $("boot");
  if (msg === null) { b.hidden = true; return; }
  b.hidden = false; b.className = "loading"; b.textContent = msg;
}
function bootErr(e) {
  const b = $("boot");
  b.hidden = false; b.className = "";
  b.innerHTML = `<div class="err">${esc(e.message || e)}</div>`;
}

async function route() {
  const hash = location.hash || (S.user ? "#/portfolio" : "#/sandbox");
  const [, page, arg] = hash.split("/");
  showResults(false); boot(null);

  try {
    if (page === "auth") { showView("view-auth"); renderNav(); return; }
    if (page === "portfolio") {
      if (!S.user) return void (location.hash = "#/auth");
      showView("view-portfolio"); renderNav(); await loadPortfolio(); return;
    }
    if (page === "plant") {
      if (!S.user) return void (location.hash = "#/auth");
      showView("view-plant"); renderNav(); await loadPlant(arg); return;
    }
    showView("view-sandbox"); renderNav(); await initSandbox();
  } catch (e) { bootErr(e); }
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function renderNav() {
  const n = $("nav");
  const here = (location.hash || "#/sandbox").split("/")[1] || "sandbox";
  n.innerHTML = "";
  const link = (href, label, key) => {
    const a = el("a", key === here ? "on" : "", label);
    a.href = href; n.appendChild(a);
  };
  link("#/sandbox", "Sandbox", "sandbox");
  if (S.user) {
    link("#/portfolio", "Portfolio", "portfolio");
    n.appendChild(el("span", "who", esc(S.user.org_name)));
    const out = el("button", "", "Sign out");
    out.onclick = async () => {
      await POST("/api/auth/logout", {});
      S.user = null; go("#/sandbox");
    };
    n.appendChild(out);
  } else {
    link("#/auth", "Sign in", "auth");
  }
}

/* =======================================================================
   AUTH
   ======================================================================= */
function initAuth() {
  let mode = "login";
  const form = $("auth-form"), err = $("auth-err");

  $("auth-tabs").onclick = (e) => {
    const b = e.target.closest(".tab"); if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll("#auth-tabs .tab").forEach(x => x.classList.toggle("on", x === b));
    form.querySelector(".reg-only").hidden = mode !== "register";
    $("auth-submit").textContent = mode === "login" ? "Sign in" : "Create account";
    err.hidden = true;
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fd = Object.fromEntries(new FormData(form));
    $("auth-submit").disabled = true;
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: fd.email, password: fd.password }
        : { email: fd.email, password: fd.password, name: fd.name,
            org_name: fd.org_name || fd.name, org_kind: fd.org_kind };
      const r = await POST(path, body);
      S.user = { user_id: r.user_id, email: r.email, name: r.name,
                 org_id: r.org_id, org_name: r.org_name, org_kind: r.org_kind };
      go("#/portfolio");
    } catch (ex) {
      err.hidden = false; err.textContent = ex.message || String(ex);
    } finally { $("auth-submit").disabled = false; }
  };
}

/* =======================================================================
   SANDBOX
   ======================================================================= */
let sandboxReady = false;

async function initSandbox() {
  if (!sandboxReady) {
    if (!S.sectors.length) S.sectors = (await GET("/api/sectors")).sectors;
    const box = $("sectors"); box.innerHTML = "";
    S.sectors.forEach((s, i) => {
      const c = el("button", "chip" + (i === 0 ? " on" : ""), esc(s.label));
      c.title = (s.clusters || []).join(" · ");
      c.onclick = () => {
        document.querySelectorAll("#sectors .chip").forEach(x => x.classList.remove("on"));
        c.classList.add("on"); S.sector = s.key; runSandbox();
      };
      box.appendChild(c);
    });
    S.sector = S.sectors[0].key;
    $("run").onclick = runSandbox;
    sandboxReady = true;
  }
  if (S.result && S.resultFrom === "sandbox") { showResults(true); render(S.result); }
  else boot("Pick an industry above, or press Run assessment.");
}

async function runSandbox() {
  boot("Assessing…"); showResults(false); $("run").disabled = true;
  try {
    const sec = await GET(`/api/sector/${S.sector}`);
    const p = { ...sec.demo_profile, sector: S.sector };
    p.tariff_inr_per_kwh = parseFloat($("tariff").value) || 8;
    p.discount_rate = (parseFloat($("rate").value) || 12) / 100;
    p.eu_export_share_pct = parseFloat($("expshare").value) || 0;
    S.result = await POST("/api/assess", p);
    S.resultFrom = "sandbox";
    $("plantname").textContent = `${S.result.profile.name} · ${S.result.profile.state}`;
    boot(null); showResults(true); render(S.result);
  } catch (e) { bootErr(e); } finally { $("run").disabled = false; }
}

/* =======================================================================
   PORTFOLIO
   ======================================================================= */
async function loadPortfolio() {
  boot("Loading portfolio…");
  const [pf, corpus] = await Promise.all([GET("/api/portfolio"), GET("/api/corpus")]);
  boot(null);

  const KIND = { plant: "Plant", consultant: "Consultancy", corporate: "Corporate supplier programme" };
  $("folio-title").textContent = S.user.org_name;
  $("folio-sub").textContent =
    `${KIND[S.user.org_kind] || ""} · ${pf.plants_assessed} of ${pf.plants_total} plants assessed`;

  const k = $("folio-kpis"); k.innerHTML = "";
  const kpi = (cls, key, val, note) => {
    const n = el("div", "kpi " + cls);
    n.appendChild(el("div", "k", key));
    n.appendChild(el("div", "v", val));
    n.appendChild(el("div", "n", note));
    k.appendChild(n);
  };
  const R = pf.realisation;
  kpi("hero", "Portfolio footprint", `${nf(pf.total_footprint_tco2e)} <small>tCO₂e</small>`,
    `across ${pf.plants_assessed} assessed plants · ${pf.scope3_share_pct}% Scope 3`);
  kpi("money", "Identified, pays for itself", inr(pf.cash_positive_benefit_inr) + " <small>/yr</small>",
    `${t(pf.cash_positive_abatement_tco2e)} · ${pf.cash_positive_abatement_pct}% of footprint`);
  kpi("", "Implemented", `${R.actions_done}<small> / ${R.actions_total}</small>`,
    `${t(R.realised_tco2e)} realised of ${t(R.identified_tco2e)} identified`);
  kpi("", "Realisation rate",
    R.realisation_rate === null ? "—" : `${nf(R.realisation_rate * 100, 1)}<small>%</small>`,
    R.realisation_rate === null
      ? "no interventions completed yet"
      : `measured, not assumed${R.abatement_accuracy !== null
          ? ` · estimates ran ${nf(R.abatement_accuracy * 100, 0)}% accurate` : ""}`);

  /* plants */
  const box = $("folio-plants");
  if (!pf.plants.length) {
    box.innerHTML = `<div class="empty">No plants yet.<br>
      <span class="tiny">Add one to start tracking its footprint and what you actually implement.</span></div>`;
  } else {
    const rows = pf.plants.map(p => `
      <tr class="clickable" data-id="${esc(p.id)}">
        <td><a href="#/plant/${esc(p.id)}">${esc(p.name)}</a>
            <div class="tiny muted">${esc(sectorLabel(p.sector))}${p.state ? " · " + esc(p.state) : ""}</div></td>
        <td class="r">${p.total_tco2e === null ? "—" : nf(p.total_tco2e)}</td>
        <td class="r">${p.cp_benefit_inr === null ? "—" : inr(p.cp_benefit_inr)}</td>
        <td class="r">${p.actions_done || 0} done · ${p.actions_active || 0} active</td>
        <td class="tiny muted">${p.last_assessed_at ? when(p.last_assessed_at) : "not assessed"}</td>
      </tr>`).join("");
    box.innerHTML = `<table class="plist"><thead><tr>
        <th>Plant</th><th class="r">tCO₂e/yr</th><th class="r">Cash-positive ₹/yr</th>
        <th class="r">Actions</th><th>Last assessed</th></tr></thead><tbody>${rows}</tbody></table>`;
    box.querySelectorAll("tr.clickable").forEach(tr => {
      tr.onclick = () => { location.hash = `#/plant/${tr.dataset.id}`; };
    });
  }

  /* corpus / flywheel */
  const c = $("corpus");
  const LABEL = { literature: "literature prior", blended: "blending in real data", measured: "mostly measured" };
  c.innerHTML =
    `<p class="tiny muted" style="margin-top:0">${esc(corpus.explainer)}</p>` +
    corpus.by_sector.filter(s => s.plants > 0).map(s => `
      <div class="corpus-row">
        <span class="nm">${esc(s.label)}</span>
        <span class="tiny muted">${s.plants} plant${s.plants === 1 ? "" : "s"}</span>
        <span class="bar"><i style="width:${Math.round(s.benchmark_weight * 100)}%"></i></span>
        <span class="tiny muted" style="width:150px">${nf(s.benchmark_weight * 100, 0)}% · ${LABEL[s.status]}</span>
      </div>`).join("") ||
    `<div class="empty tiny">No plants assessed yet — every sector is still on its literature prior.</div>`;

  $("add-plant").onclick = addPlantModal;
}

const sectorLabel = (key) => (S.sectors.find(s => s.key === key) || {}).label || key;

async function addPlantModal() {
  if (!S.sectors.length) S.sectors = (await GET("/api/sectors")).sectors;
  const opts = S.sectors.map(s => `<option value="${esc(s.key)}">${esc(s.label)}</option>`).join("");
  modal("Add a plant", `
    <label>Plant name<input id="m-name" placeholder="e.g. Tirupur dyeing unit"></label>
    <label>Sector<select id="m-sector">${opts}</select></label>
    <label>State<input id="m-state" placeholder="e.g. Tamil Nadu"></label>
    <p class="tiny muted">You will enter activity data when you run its first assessment.</p>`,
    async () => {
      const name = $("m-name").value.trim();
      if (!name) throw new Error("Plant name is required.");
      const p = await POST("/api/plants", {
        name, sector: $("m-sector").value, state: $("m-state").value.trim() || null });
      go(`#/plant/${p.id}`);
    });
}

/* =======================================================================
   PLANT
   ======================================================================= */
async function loadPlant(id) {
  boot("Loading plant…");
  const d = await GET(`/api/plants/${id}`);
  if (!S.plant || S.plant.id !== d.plant.id) S.actionOrder = null;
  S.plant = d.plant; S.assessments = d.assessments; S.actions = d.actions;
  boot(null);

  $("plant-name").textContent = d.plant.name;
  $("plant-meta").textContent =
    `${sectorLabel(d.plant.sector)}${d.plant.state ? " · " + d.plant.state : ""} · ` +
    `${d.assessments.length} assessment${d.assessments.length === 1 ? "" : "s"}`;

  $("plant-assess").onclick = () => assessModal(d.plant);

  const rep = $("plant-report");
  if (d.assessments.length) {
    rep.hidden = false;
    rep.href = `/api/assessments/${d.assessments[0].id}/report`;
  } else rep.hidden = true;

  $("plant-tabs").onclick = (e) => {
    const b = e.target.closest(".tab"); if (!b) return;
    S.tab = b.dataset.tab;
    document.querySelectorAll("#plant-tabs .tab").forEach(x => x.classList.toggle("on", x === b));
    paintPlantTab();
  };
  document.querySelectorAll("#plant-tabs .tab").forEach(x =>
    x.classList.toggle("on", x.dataset.tab === S.tab));

  if (d.assessments.length) {
    S.result = await GET(`/api/assessments/${d.assessments[0].id}`);
    S.resultFrom = "plant";
  } else S.result = null;

  paintPlantTab();
}

function paintPlantTab() {
  $("tab-actions").hidden = S.tab !== "actions";
  $("tab-history").hidden = S.tab !== "history";
  showResults(S.tab === "assessment" && !!S.result);

  if (S.tab === "assessment") {
    if (S.result) { boot(null); render(S.result); }
    else boot("No assessment yet. Press “Run new assessment” to create the first one.");
  } else boot(null);

  if (S.tab === "actions") renderActions();
  if (S.tab === "history") renderHistory();
}

async function assessModal(plant) {
  const sec = await GET(`/api/sector/${plant.sector}`);
  const d = sec.demo_profile || {};
  const num = (id, label, v, hint) =>
    `<label>${label}<input id="${id}" type="number" value="${v ?? 0}">
     ${hint ? `<span class="tiny muted">${hint}</span>` : ""}</label>`;
  modal(`Assess ${esc(plant.name)}`, `
    <p class="tiny muted" style="margin-top:0">Pre-filled with a representative
      ${esc(sec.label)} plant. Replace with your own figures.</p>
    ${num("a-out", "Annual output (tonnes)", d.annual_output_t)}
    ${num("a-rev", "Annual revenue (₹ crore)", d.annual_revenue_cr)}
    ${num("a-elec", "Electricity (kWh/yr)", d.electricity_kwh, "from your utility bill")}
    ${num("a-exp", "EU export share (%)", 25, "drives the CBAM exposure panel")}
    <label>Label for this assessment<input id="a-label" placeholder="e.g. FY25 baseline"></label>
    <p class="tiny muted">Fuels, materials, waste and freight are taken from the sector template
      for this prototype; the full intake form is the next build step.</p>`,
    async () => {
      const profile = {
        ...d, sector: plant.sector,
        annual_output_t: +$("a-out").value || 0,
        annual_revenue_cr: +$("a-rev").value || 0,
        electricity_kwh: +$("a-elec").value || 0,
        eu_export_share_pct: +$("a-exp").value || 0,
      };
      await POST(`/api/plants/${plant.id}/assess`,
        { profile, label: $("a-label").value.trim() || null });
      await loadPlant(plant.id);
    });
}

/* ---------- action tracker ---------- */
const STATUSES = ["recommended", "planned", "in_progress", "done", "rejected"];
const ST_LABEL = { recommended: "Recommended", planned: "Planned",
  in_progress: "In progress", done: "Done", rejected: "Rejected" };

function renderActions() {
  const box = $("tab-actions");
  // Hold the row order steady for the session. The server sorts by status, but
  // re-sorting the instant someone changes a dropdown makes rows jump out from
  // under the cursor - which is exactly when the user is least expecting it.
  if (S.actions && S.actions.length) {
    if (!S.actionOrder) S.actionOrder = S.actions.map(a => a.intervention_id);
    const pos = new Map(S.actionOrder.map((id, i) => [id, i]));
    S.actions.sort((a, b) => (pos.has(a.intervention_id) ? pos.get(a.intervention_id) : 1e9)
                           - (pos.has(b.intervention_id) ? pos.get(b.intervention_id) : 1e9));
  }
  if (!S.actions || !S.actions.length) {
    box.innerHTML = `<div class="panel"><div class="empty">
      No actions yet — run an assessment and every recommendation lands here to track.</div></div>`;
    return;
  }

  const done = S.actions.filter(a => a.status === "done");
  const identified = S.actions.reduce((s, a) => s + (a.est_abatement_tco2e || 0), 0);
  const realised = done.reduce((s, a) =>
    s + (a.act_abatement_tco2e ?? a.est_abatement_tco2e ?? 0), 0);
  const committed = S.actions.filter(a => ["planned", "in_progress", "done"].includes(a.status))
    .reduce((s, a) => s + (a.est_abatement_tco2e || 0), 0);

  const rows = S.actions.map(a => `
    <tr class="st-${esc(a.status)}" data-iid="${esc(a.intervention_id)}">
      <td><b>${esc(a.name)}</b>
        <div class="tiny muted">${esc(a.category || "")}${a.notes ? " · " + esc(a.notes) : ""}</div></td>
      <td class="r">${nf(a.est_abatement_tco2e || 0)}</td>
      <td class="r">${inr(a.est_capex_inr)}</td>
      <td class="r">${inr(a.est_annual_benefit_inr)}</td>
      <td class="r">${a.act_abatement_tco2e === null || a.act_abatement_tco2e === undefined
        ? '<span class="muted">—</span>' : nf(a.act_abatement_tco2e)}</td>
      <td>
        <select data-iid="${esc(a.intervention_id)}">
          ${STATUSES.map(s => `<option value="${s}"${s === a.status ? " selected" : ""}>${ST_LABEL[s]}</option>`).join("")}
        </select>
      </td>
    </tr>`).join("");

  box.innerHTML = `
    <div class="hint">
      <b>${nf(realised)} tCO₂e realised</b> of ${nf(identified)} identified
      (${nf(committed)} committed). This ratio is the realisation rate — the one number the
      impact model has to assume until real plants report it.
    </div>
    <div class="panel">
      <table class="track"><thead><tr>
        <th>Intervention</th><th class="r">Est. tCO₂e</th><th class="r">Est. capex</th>
        <th class="r">Est. ₹/yr</th><th class="r">Actual tCO₂e</th><th>Status</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div>`;

  box.querySelectorAll("select").forEach(sel => {
    sel.onchange = async () => {
      const iid = sel.dataset.iid, status = sel.value;
      if (status === "done") return void completionModal(iid, sel);
      try {
        await PATCH(`/api/plants/${S.plant.id}/actions/${iid}`, { status });
        await refreshActions();
      } catch (e) { alert(e.message); }
    };
  });
}

function completionModal(iid, sel) {
  const a = S.actions.find(x => x.intervention_id === iid);
  modal(`Completed: ${esc(a.name)}`, `
    <p class="tiny muted" style="margin-top:0">
      What actually happened? Leave blank to use our estimate. Recording actuals is what turns
      the realisation rate from an assumption into a measurement.</p>
    <label>Actual abatement (tCO₂e/yr)
      <input id="c-ab" type="number" placeholder="estimated ${nf(a.est_abatement_tco2e || 0)}"></label>
    <label>Actual capex (₹)
      <input id="c-cx" type="number" placeholder="estimated ${Math.round(a.est_capex_inr || 0)}"></label>
    <label>Actual annual benefit (₹)
      <input id="c-bn" type="number" placeholder="estimated ${Math.round(a.est_annual_benefit_inr || 0)}"></label>
    <label>Notes<textarea id="c-nt" rows="2" placeholder="vendor, model, anything worth remembering">${esc(a.notes || "")}</textarea></label>`,
    async () => {
      const body = { status: "done" };
      const ab = $("c-ab").value, cx = $("c-cx").value, bn = $("c-bn").value, nt = $("c-nt").value.trim();
      if (ab !== "") body.act_abatement_tco2e = +ab;
      if (cx !== "") body.act_capex_inr = +cx;
      if (bn !== "") body.act_annual_benefit_inr = +bn;
      if (nt) body.notes = nt;
      await PATCH(`/api/plants/${S.plant.id}/actions/${iid}`, body);
      await refreshActions();
    },
    () => { if (sel) sel.value = a.status; });   // cancelled: put the dropdown back
}

async function refreshActions() {
  const d = await GET(`/api/plants/${S.plant.id}`);
  S.actions = d.actions;
  renderActions();
}

function renderHistory() {
  const box = $("tab-history");
  if (!S.assessments || !S.assessments.length) {
    box.innerHTML = `<div class="panel"><div class="empty">No assessments yet.</div></div>`;
    return;
  }
  const rows = S.assessments.map((a, i) => {
    const prev = S.assessments[i + 1];
    const delta = prev ? a.total_tco2e - prev.total_tco2e : null;
    return `<tr class="clickable" data-id="${esc(a.id)}">
      <td>${when(a.created_at)}<div class="tiny muted">${esc(a.label || "")}</div></td>
      <td class="r">${nf(a.total_tco2e)}</td>
      <td class="r">${delta === null ? "—" :
        `<span class="${delta <= 0 ? "pos" : "neg"}">${delta > 0 ? "+" : ""}${nf(delta)}</span>`}</td>
      <td class="r">${nf(a.scope12_per_t || 0, 2)}</td>
      <td class="r">${inr(a.cp_benefit_inr)}</td>
      <td><a href="/api/assessments/${esc(a.id)}/report" target="_blank" class="tiny">Report ↓</a></td>
    </tr>`;
  }).join("");
  box.innerHTML = `<div class="panel"><table class="plist"><thead><tr>
      <th>Assessed</th><th class="r">tCO₂e/yr</th><th class="r">Δ vs previous</th>
      <th class="r">S1+2 per tonne</th><th class="r">Cash-positive ₹/yr</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  box.querySelectorAll("tr.clickable").forEach(tr => {
    tr.onclick = async (e) => {
      if (e.target.tagName === "A") return;
      S.result = await GET(`/api/assessments/${tr.dataset.id}`);
      S.tab = "assessment";
      document.querySelectorAll("#plant-tabs .tab").forEach(x =>
        x.classList.toggle("on", x.dataset.tab === "assessment"));
      paintPlantTab();
    };
  });
}

/* ---------- modal ---------- */
function modal(title, bodyHtml, onOk, onCancel) {
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = bodyHtml;
  $("modal").hidden = false;
  const close = () => { $("modal").hidden = true; };
  $("modal-cancel").onclick = () => { close(); if (onCancel) onCancel(); };
  $("modal-ok").onclick = async () => {
    $("modal-ok").disabled = true;
    try { await onOk(); close(); }
    catch (e) { alert(e.message || e); }
    finally { $("modal-ok").disabled = false; }
  };
}

/* =======================================================================
   RESULT RENDERERS  (shared by sandbox and plant view)
   ======================================================================= */
function render(d) {
  renderKPIs(d); $("statement").textContent = d.headline.statement;
  renderSankey(d.sankey);
  renderLeaks(d.leaks);
  renderMACC(d.recommendations.macc_curve);
  renderRecs(d.recommendations, d.footprint.total_tco2e);
  renderRefusals(d.recommendations);
  renderCompliance(d.compliance);
  renderMethodology(d);
}

function renderKPIs(d) {
  const h = d.headline, f = d.footprint, cp = d.recommendations.portfolio.cash_positive_only;
  const box = $("kpis"); box.innerHTML = "";
  const kpi = (cls, k, v, note) => {
    const n = el("div", "kpi " + cls);
    n.appendChild(el("div", "k", k));
    n.appendChild(el("div", "v", v));
    n.appendChild(el("div", "n", note));
    box.appendChild(n);
  };
  kpi("hero", "Annual footprint", `${nf(f.total_tco2e)} <small>tCO₂e</small>`,
    `range ${nf(f.total_range.low)}–${nf(f.total_range.high)} · ±${f.uncertainty_pct}%`);
  kpi("", "Largest leak point",
    `${h.top_leak_share_pct}<small>%</small>`,
    `${esc(h.top_leak || "—")} · <span class="pill p-${h.top_leak_severity}">${h.top_leak_severity || ""}</span>`);
  kpi("money", "Pays for itself", inr(cp.net_annual_benefit_inr) + " <small>/yr</small>",
    `${cp.count} interventions · ${inr(cp.capex_inr)} capex · ${pay(cp.blended_payback_months)} payback`);
  kpi("", "Abatement available", `${cp.abatement_pct}<small>%</small>`,
    `${t(cp.abatement_tco2e)} at no net cost · ${d.recommendations.total_abatement_pct}% in total`);
}

function renderSankey(sk) {
  const svg = $("sankey"); svg.innerHTML = "";
  const W = 940, PAD = 14, GAP = 9, NODEW = 15;

  const outv = {}, inv = {};
  sk.links.forEach(l => {
    outv[l.source] = (outv[l.source] || 0) + l.value;
    inv[l.target] = (inv[l.target] || 0) + l.value;
  });
  const val = i => sk.nodes[i].kind === "stream" ? (outv[i] || 0) : (inv[i] || 0);

  const scopeOf = i => (sk.links.find(l => l.source === i) || {}).scope || 3;
  let streams = sk.nodes.map((n, i) => ({ ...n, i })).filter(n => n.kind === "stream");
  // Group by scope first, then by size within the scope. Sorting purely by size
  // makes every large Scope 3 stream cross the whole diagram to reach its band.
  streams.sort((a, b) => scopeOf(a.i) - scopeOf(b.i) || val(b.i) - val(a.i));
  const MAXS = 8;
  let tail = [];
  if (streams.length > MAXS) {
    const bySize = [...streams].sort((a, b) => val(b.i) - val(a.i));
    const keep = new Set(bySize.slice(0, MAXS - 1).map(x => x.i));
    tail = streams.filter(x => !keep.has(x.i));
    streams = streams.filter(x => keep.has(x.i));
  }

  const scopes = sk.nodes.map((n, i) => ({ ...n, i })).filter(n => n.kind === "scope")
    .sort((a, b) => a.name.localeCompare(b.name));
  const totalIdx = sk.nodes.findIndex(n => n.kind === "total");
  const grand = val(totalIdx) || 1;

  const rows = streams.length + (tail.length ? 1 : 0);
  const H = Math.max(300, rows * 42 + PAD * 2);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("height", H);

  const usable = H - PAD * 2 - GAP * Math.max(0, rows - 1);
  const scale = usable / grand;
  const SC = { 1: "var(--s1)", 2: "var(--s2)", 3: "var(--s3)" };
  const X0 = 250, X1 = 560, X2 = 800;

  let y = PAD; const spos = {};
  const drawn = streams.map(s => ({ ...s, v: val(s.i) }));
  if (tail.length) drawn.push({ name: `${tail.length} smaller sources`, kind: "stream", i: -1,
    v: tail.reduce((a, b) => a + val(b.i), 0), tail });
  drawn.forEach(s => {
    const h = Math.max(3, s.v * scale);
    spos[s.i] = { y, h, v: s.v };
    svg.appendChild(svgEl("rect", { x: X0, y, width: NODEW, height: h, rx: 2, fill: "#8fa89d" }));
    const lbl = svgEl("text", { x: X0 - 9, y: y + h / 2 + 4, "text-anchor": "end",
      "font-size": 12, fill: "var(--ink)" });
    lbl.textContent = s.name.length > 40 ? s.name.slice(0, 39) + "…" : s.name;
    svg.appendChild(lbl);
    const v = svgEl("text", { x: X0 - 9, y: y + h / 2 + 17, "text-anchor": "end",
      "font-size": 10.5, fill: "var(--muted)" });
    v.textContent = `${nf(s.v)} t · ${(100 * s.v / grand).toFixed(1)}%`;
    if (h > 26) svg.appendChild(v);
    y += h + GAP;
  });

  const scopeTot = {};
  drawn.forEach(s => {
    const members = s.tail ? s.tail.map(x => x.i) : [s.i];
    sk.links.filter(l => members.includes(l.source)).forEach(l => {
      scopeTot[l.target] = (scopeTot[l.target] || 0) + l.value;
    });
  });
  y = PAD; const ppos = {};
  scopes.forEach(s => {
    const v = scopeTot[s.i] || 0; if (v <= 0) return;
    const h = Math.max(3, v * scale);
    ppos[s.i] = { y, h, v, cursor: y };
    const scope = (sk.links.find(l => l.target === s.i) || {}).scope || 3;
    svg.appendChild(svgEl("rect", { x: X1, y, width: NODEW, height: h, rx: 2, fill: SC[scope] }));
    const lbl = svgEl("text", { x: X1 + NODEW + 8, y: y + h / 2 + 4, "font-size": 11.5, fill: "var(--ink)" });
    lbl.textContent = s.name;
    svg.appendChild(lbl);
    y += h + GAP;
  });

  const th = grand * scale, ty = PAD;
  svg.appendChild(svgEl("rect", { x: X2, y: ty, width: NODEW, height: th, rx: 2, fill: "var(--ink)" }));
  const tl = svgEl("text", { x: X2 + NODEW + 8, y: ty + th / 2, "font-size": 12.5,
    fill: "var(--ink)", "font-weight": 650 });
  tl.textContent = `${nf(grand)} tCO₂e`;
  svg.appendChild(tl);

  const ribbon = (x1, y1, h1, x2, y2, h2, fill, op) => {
    const mx = (x1 + x2) / 2;
    const p = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2} L${x2},${y2 + h2} C${mx},${y2 + h2} ${mx},${y1 + h1} ${x1},${y1 + h1} Z`;
    svg.appendChild(svgEl("path", { d: p, fill, opacity: op }));
  };

  drawn.forEach(s => {
    const sp = spos[s.i]; let cursor = sp.y;
    const members = s.tail ? s.tail.map(x => x.i) : [s.i];
    sk.links.filter(l => members.includes(l.source)).forEach(l => {
      const p = ppos[l.target]; if (!p) return;
      const h = l.value * scale;
      ribbon(X0 + NODEW, cursor, h, X1, p.cursor, h, SC[l.scope] || "#8fa89d", .32);
      cursor += h; p.cursor += h;
    });
  });
  let tc = ty;
  scopes.forEach(s => {
    const p = ppos[s.i]; if (!p) return;
    const scope = (sk.links.find(l => l.target === s.i) || {}).scope || 3;
    ribbon(X1 + NODEW, p.y, p.h, X2, tc, p.h, SC[scope], .32);
    tc += p.h;
  });
}

function renderMACC(curve) {
  const svg = $("macc"); svg.innerHTML = "";
  if (!curve.length) return;
  const W = 940, H = 420, L = 74, R = 18, T = 18, B = 92;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);

  const xMax = curve[curve.length - 1].x_start + curve[curve.length - 1].width;
  // Clamp the axis to the band where the abatement actually lives. A single
  // narrow bar at -28,000 would otherwise compress every other intervention
  // into an unreadable sliver - technically correct and practically useless.
  const hs = curve.map(c => c.height).sort((a, b) => a - b);
  const q = f => hs[Math.min(hs.length - 1, Math.max(0, Math.floor(f * (hs.length - 1))))];
  const spread = Math.max(Math.abs(q(0.08)), Math.abs(q(0.92)), 1);
  const CAP = Math.min(15000, spread * 1.9);
  const rawHi = Math.max(...hs, 0), rawLo = Math.min(...hs, 0);
  const hi = Math.min(rawHi, CAP), lo = Math.max(rawLo, -CAP);
  const padY = (hi - lo) * 0.10 || 1;
  const yMin = lo - padY, yMax = hi + padY;
  const clipped = curve.filter(c => c.height > hi || c.height < lo).length;

  const px = v => L + (v / xMax) * (W - L - R);
  const pyRaw = v => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const py = v => Math.max(T, Math.min(H - B, pyRaw(v)));
  const y0 = py(0);

  const step = niceStep((yMax - yMin) / 6);
  for (let g = Math.ceil(yMin / step) * step; g <= yMax; g += step) {
    const yy = py(g);
    svg.appendChild(svgEl("line", { x1: L, y1: yy, x2: W - R, y2: yy,
      stroke: g === 0 ? "#16211c" : "#eceeec", "stroke-width": g === 0 ? 1.4 : 1 }));
    const tx = svgEl("text", { x: L - 8, y: yy + 3.5, "text-anchor": "end",
      "font-size": 10.5, fill: "var(--muted)" });
    tx.textContent = Math.abs(g) >= 1000 ? `${nf(g / 1000, 0)}k` : nf(g);
    svg.appendChild(tx);
  }

  curve.forEach(c => {
    const x = px(c.x_start), w = Math.max(1.2, px(c.x_start + c.width) - x);
    const top = c.height >= 0 ? py(c.height) : y0;
    const h = Math.max(1.5, Math.abs(py(c.height) - y0));
    const fill = c.cash_positive ? "#1c6b4b" : "#c8974a";
    const r = svgEl("rect", { x, y: top, width: Math.max(0.8, w - 0.8), height: h,
      fill, opacity: .88 });
    // A bar beyond the clamped axis is drawn to the edge, so mark it as cut
    // rather than letting it read as if that were its true value.
    const off = c.height > hi || c.height < lo;
    if (off) {
      r.setAttribute("stroke", "#16211c");
      r.setAttribute("stroke-width", "1.2");
      r.setAttribute("stroke-dasharray", "3 2");
    }
    const ti = svgEl("title");
    ti.textContent = `${c.name}\n${nf(c.width)} tCO₂e/yr at ₹${nf(c.height)}/tCO₂e` +
      (off ? "  — off scale, bar is clipped" : "") +
      (c.standalone && Math.abs(c.standalone - c.width) > 1
        ? `\nstandalone ${nf(c.standalone)} t, de-rated to ${nf(c.width)} t in portfolio` : "");
    r.appendChild(ti); svg.appendChild(r);

    if (w > 52) {
      const g = svgEl("text", { x: x + w / 2, y: H - B + 12,
        "font-size": 10, fill: "var(--muted)",
        transform: `rotate(38 ${x + w / 2} ${H - B + 12})` });
      g.textContent = c.name.length > 24 ? c.name.slice(0, 23) + "…" : c.name;
      svg.appendChild(g);
    }
  });

  svg.appendChild(svgEl("line", { x1: L, y1: T, x2: L, y2: H - B, stroke: "#d6dbd7" }));
  const ax = svgEl("text", { x: (L + W - R) / 2, y: H - 8, "text-anchor": "middle",
    "font-size": 11.5, fill: "var(--muted)" });
  ax.textContent = `Cumulative abatement — ${nf(xMax)} tCO₂e a year available`;
  svg.appendChild(ax);
  const ay = svgEl("text", { x: 15, y: (T + H - B) / 2, "font-size": 11.5, fill: "var(--muted)",
    "text-anchor": "middle", transform: `rotate(-90 15 ${(T + H - B) / 2})` });
  ay.textContent = "₹ per tCO₂e abated";
  svg.appendChild(ay);

  const noteY = y0 < T + 26 ? y0 + 15 : y0 - 7;
  const note = svgEl("text", { x: L + 8, y: noteY, "font-size": 10.5, fill: "#1c6b4b",
    "font-weight": 600 });
  note.textContent = "below this line the intervention pays for itself";
  svg.appendChild(note);
  if (clipped) {
    const cn = svgEl("text", { x: W - R, y: T + 11, "text-anchor": "end",
      "font-size": 10, fill: "var(--muted)" });
    cn.textContent = `${clipped} bar${clipped > 1 ? "s" : ""} clipped at ±₹${nf(CAP / 1000)}k — hover for the true value`;
    svg.appendChild(cn);
  }
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(raw) || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function renderLeaks(L) {
  const src = L.benchmark_source === "blended"
    ? ` · benchmarked against the <b>live corpus</b>` : ` · benchmarked against literature priors`;
  $("leaksub").innerHTML =
    `${L.leak_count} found · ${L.critical_count} critical · closing every gap to sector median is worth ${t(L.total_gap_to_median_tco2e)}/yr${src}`;
  const box = $("leaks"); box.innerHTML = "";
  const RULE = { benchmark_breach: "above sector p75", material_concentration: "large and above median",
    structural_hotspot: "structural hotspot" };

  L.leaks.forEach(k => {
    const n = el("div", "leak " + k.severity);
    const top = el("div", "top");
    top.appendChild(el("b", null, esc(k.label)));
    top.appendChild(el("span", `pill p-${k.severity}`, k.severity));
    top.appendChild(el("span", "tiny muted",
      `${RULE[k.rule] || k.rule} · ${k.share_pct}% of footprint · ${t(k.tco2e)}`));
    n.appendChild(top);
    n.appendChild(el("div", "find", esc(k.finding)));

    if (k.p75 != null && k.actual != null) {
      const max = Math.max(k.actual, k.p75) * 1.15;
      const b = el("div", "bench");
      [["p50", k.p50], ["p75", k.p75]].forEach(([nm, v]) => {
        const i = el("i"); i.style.left = `${(v / max) * 100}%`; b.appendChild(i);
        const s = el("span", null, nm); s.style.left = `${(v / max) * 100}%`; b.appendChild(s);
      });
      const you = el("div", "you"); you.style.left = `${(k.actual / max) * 100}%`;
      you.style.position = "absolute"; b.appendChild(you);
      const ys = el("span", null, `you ${nf(k.actual, k.actual < 100 ? 1 : 0)} ${k.metric_unit || ""}`);
      ys.style.left = `${(k.actual / max) * 100}%`; ys.style.color = "var(--bad)";
      ys.style.fontWeight = 600;
      b.appendChild(ys);
      n.appendChild(b);
    }
    box.appendChild(n);
  });

  const prov = L.benchmark_provenance || {};
  const blended = Object.entries(prov).filter(([, v]) => v.source === "blended");
  $("benchcaveat").innerHTML = esc(L.benchmark_caveat) + (blended.length
    ? `<br><br><b>Live corpus in use.</b> ` + blended.map(([k, v]) =>
        `${esc(k)}: ${v.n} plants, weight ${v.weight}`).join(" · ")
    : "");
}

const CAT = { energy: "Energy", material: "Material", process: "Process",
  waste: "Waste", logistics: "Logistics" };

function renderRecs(R) {
  const tb = $("recs"); tb.innerHTML = "";
  R.recommendations.forEach(x => {
    const tr = el("tr", "rec");
    tr.innerHTML = `
      <td><b>${esc(x.name)}</b>${x.substitution_capped ? ' <span class="pill p-high">capped</span>' : ""}
          <div class="tiny muted">${esc(x.target_stream_label)} · ${x.confidence} confidence · difficulty ${x.difficulty}/5</div></td>
      <td class="tiny">${CAT[x.category] || x.category}</td>
      <td class="r">${nf(x.portfolio_abatement_tco2e)}${x.derating_pct > 1 ? `<div class="tiny muted">alone ${nf(x.abatement_tco2e)}</div>` : ""}</td>
      <td class="r ${x.cash_positive ? "pos" : ""}">${nf(x.lcoa_inr_per_tco2e)}</td>
      <td class="r">${inr(x.capex_inr)}</td>
      <td class="r ${x.net_annual_benefit_inr >= 0 ? "pos" : "neg"}">${inr(x.net_annual_benefit_inr)}</td>
      <td class="r">${pay(x.payback_months)}</td>`;
    const det = el("tr", "det"); det.hidden = true;
    det.innerHTML = `<td colspan="7">${detail(x)}</td>`;
    tr.onclick = () => { det.hidden = !det.hidden; };
    tb.appendChild(tr); tb.appendChild(det);
  });
}

function detail(x) {
  const cav = (x.caveats || []).map(c => `<li>${esc(c)}</li>`).join("");
  return `<div class="det-grid">
    <div><h4>What it is</h4>${esc(x.description)}
         <div style="margin-top:8px"><b>Physically:</b> ${esc(x.physical_note)}</div></div>
    <div><h4>Why it is on the list</h4>${esc(x.why)}
         <div class="tiny muted" style="margin-top:8px">Evidence: ${esc(x.evidence)}</div></div>
    <div><h4>The working</h4>
      <div class="mono tiny">
        target stream ${nf(x.target_stream_tco2e)} t<br>
        abatement ${nf(x.abatement_tco2e)} t (range ${nf(x.abatement_range.low)}–${nf(x.abatement_range.high)})<br>
        ${x.derating_pct > 1 ? `de-rated −${x.derating_pct}% → ${nf(x.portfolio_abatement_tco2e)} t<br>` : ""}
        capex ${inr(x.capex_inr)} over ${x.lifetime_yrs} yr<br>
        gross saving ${inr(x.gross_annual_saving_inr)}/yr<br>
        opex delta ${inr(x.annual_opex_delta_inr)}/yr<br>
        <b>LCOA ₹${nf(x.lcoa_inr_per_tco2e)}/tCO₂e</b> · NPV ${inr(x.npv_inr)}<br>
        savings model: ${esc(x.savings_model)}
      </div></div>
    ${cav || x.restriction_note ? `<div><h4>Constraints</h4>
       ${x.restriction_note ? `<div style="color:var(--warn);margin-bottom:6px">${esc(x.restriction_note)}</div>` : ""}
       <ul>${cav}</ul></div>` : ""}
  </div>`;
}

function renderRefusals(R) {
  const box = $("refusals"); box.innerHTML = "";
  const blocked = R.blocked || [];
  const restricted = R.recommendations.filter(r => r.restriction_note);
  if (!blocked.length && !restricted.length) return;

  const card = el("div", "panel");
  card.appendChild(el("div", "sec-h",
    `<h2>Considered and rejected</h2><span class="sub">Interventions the engine evaluated and then ruled out or capped. A recommender that never says no cannot be trusted when it says yes.</span>`));
  blocked.forEach(b => card.appendChild(el("div", "blocked",
    `<b>✕ ${esc(b.name)}</b><p>${esc(b.reason)}</p>`)));
  restricted.forEach(r => card.appendChild(el("div", "blocked restricted",
    `<b>⚠ ${esc(r.name)} — capped</b><p>${esc(r.restriction_note)}</p>`)));
  box.appendChild(card);
}

function renderCompliance(C) {
  const c = C.cbam;
  $("cbam").innerHTML = c.applicable ? `
    <div class="kpi" style="border:0;padding:0">
      <div class="k">Indicative annual exposure</div>
      <div class="v">${inr(c.indicative_annual_cost_inr)}</div>
      <div class="n">${t(c.embedded_emissions_exported_tco2e)} embedded in EU-bound output at ${c.eu_export_share_pct}% export share</div>
    </div>
    <div class="tiny muted" style="margin-top:12px"><b>Basis.</b> ${esc(c.basis)}</div>
    <div class="caveat">${esc(c.caveat)}</div>`
    : `<p class="muted">CBAM does not currently cover this sector's product lines. ${esc(c.caveat)}</p>`;

  const b = C.brsr;
  $("brsr").innerHTML =
    `<p class="tiny muted">${esc(b.why)}</p>` +
    b.readiness.map(r => {
      const cls = r.status === "ready" ? "p-good" : r.status === "partial" ? "p-high" : "p-moderate";
      return `<div class="checkitem"><span>${esc(r.item)}
        ${r.note ? `<div class="tiny muted">${esc(r.note)}</div>` : ""}</span>
        <span style="white-space:nowrap"><span class="pill ${cls}">${esc(r.status)}</span>
        ${r.value_tco2e != null ? ` <span class="mono tiny">${nf(r.value_tco2e)} t</span>` : ""}</span></div>`;
    }).join("");
}

function renderMethodology(d) {
  const m = d.methodology, a = d.recommendations.assumptions;
  $("methodology").innerHTML = `
    <div class="det-grid">
      <div><h4>Standard</h4>${esc(m.standard)}<br><span class="tiny muted">${esc(m.gwp)}</span></div>
      <div><h4>Grid factor</h4>${esc(d.footprint.grid_source)}</div>
      <div><h4>Assumptions</h4><span class="mono tiny">
        tariff ₹${a.electricity_tariff_inr_per_kwh}/kWh · discount ${(a.discount_rate * 100).toFixed(0)}%</span></div>
      <div><h4>Biogenic carbon</h4>${nf(d.footprint.biogenic_co2_t)} t reported separately, excluded from Scope 1 per GHG Protocol</div>
    </div>
    <details class="meth" open><summary>Limitations we are not hiding</summary>
      <div class="body">
        <p><b>Emission factors.</b> ${esc(m.factor_note)}</p>
        <p><b>Verification status.</b> ${esc(m.verification_status)}</p>
        <p><b>Benchmarks.</b> ${esc(m.benchmark_note)}</p>
        <p><b>Leak rule.</b> ${esc(m.leak_rule)}</p>
        <p><b>Interaction.</b> ${esc(a.derating_note)}</p>
        <p><b>Capex.</b> ${esc(a.capex_note)}</p>
      </div>
    </details>`;
}

/* =======================================================================
   BOOT
   ======================================================================= */
(async function start() {
  initAuth();
  try {
    const [me, secs] = await Promise.all([GET("/api/auth/me"), GET("/api/sectors")]);
    S.user = me.authenticated ? me.user : null;
    S.sectors = secs.sectors;
  } catch { S.user = null; }
  window.addEventListener("hashchange", route);
  route();
})();
