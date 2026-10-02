import { useState, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Check,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { plantSchema, type PlantProfile } from "../types/domain";
import { FlowButton } from "../components/ui/flow-button";
import { PageHeading, Note, DetailRows, Badge, Skeleton } from "../components/ui/common";
import { number, downloadJson } from "../lib/format";
import { parsePlantDraft, MAX_DRAFT_BYTES } from "../lib/plantDraft";
import { EvidenceStatus } from "../components/ui/EvidenceStatus";
import { IntakeSuite } from "../components/intake/IntakeSuite";
const steps = [
  "Identity",
  "Scale",
  "Energy",
  "Materials",
  "Waste",
  "Freight",
  "Economics",
  "Evidence",
];
const states = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
type Family = "fuels" | "materials" | "waste" | "freight";
function AssessmentForm() {
  const w = useWorkspace(),
    navigate = useNavigate();
  const profile = w.inputDraft ?? w.assessment!.plant;
  const setProfile = w.setInputDraft;
  const [draftError, setDraftError] = useState("");
  const [readingDraft, setReadingDraft] = useState(false);
  const [importedDraft, setImportedDraft] = useState<PlantProfile | null>(null);
  const [showIntakeSuite, setShowIntakeSuite] = useState(false);
  const saveDraft = () => {
    try {
      const draft = parsePlantDraft(JSON.stringify(profile));
      downloadJson(draft, "prangara-plant-profile-draft.json");
      setDraftError("");
      w.setToast(
        "Draft download started. Keep the file to resume after closing this session.",
      );
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Unable to save this draft.",
      );
    }
  };
  const readDraft = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReadingDraft(true);
    setDraftError("");
    setImportedDraft(null);
    try {
      if (file.size > MAX_DRAFT_BYTES)
        throw new Error("Choose a PRANGARA input draft smaller than 1 MB.");
      setImportedDraft(parsePlantDraft(await file.text()));
    } catch (error) {
      setDraftError(
        error instanceof Error ? error.message : "Unable to read this draft.",
      );
    } finally {
      setReadingDraft(false);
    }
  };
  const [step, setStep] = useState(0),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [validated, setValidated] = useState(false);
  const update = <K extends keyof PlantProfile>(
    key: K,
    value: PlantProfile[K],
  ) => {
    setProfile({ ...profile, [key]: value });
    setValidated(false);
    w.assess.reset();
  };
  const input = (
    key:
      | "annual_output_t"
      | "annual_revenue_cr"
      | "employees"
      | "electricity_kwh"
      | "tariff"
      | "discount_rate"
      | "eu_export_share_pct",
    title: string,
    unit: string,
    help?: string,
  ) => (
    <label className="form-field" key={key}>
      <span>{title}</span>
      <div className="unit-input">
        <input
          required
          type="number"
          step={key === "employees" ? "1" : "any"}
          min={key === "annual_output_t" ? 0.001 : 0}
          max={
            key === "eu_export_share_pct" || key === "discount_rate"
              ? 100
              : undefined
          }
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? key + "-error" : undefined}
          value={
            key === "discount_rate"
              ? Number((profile[key] * 100).toFixed(4))
              : profile[key]
          }
          onChange={(e) =>
            update(
              key,
              Number(e.target.value) / (key === "discount_rate" ? 100 : 1),
            )
          }
        />
        <span>{unit}</span>
      </div>
      {help && <small>{help}</small>}
      {errors[key] && (
        <b className="field-error" id={key + "-error"}>
          {errors[key]}
        </b>
      )}
    </label>
  );
  const family = (key: Family, group: string) => {
    const options = (w.reference.data || []).filter((f) => f.group === group),
      entries = Object.entries(profile[key]),
      available = options.filter((f) => !(f.key in profile[key]));
    return (
      <div className="stream-fields">
        {entries.map(([id, value]) => {
          const f = options.find((f) => f.key === id);
          const unit =
            f?.unit.split("/").slice(1).join("/").trim() ||
            (key === "freight" ? "t·km" : "t");
          return (
            <div className="stream-field-row" key={id}>
              <label>
                <span>{f?.name || id}</span>
                <div className="unit-input">
                  <input
                    aria-label={f?.name || id}
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={value}
                    onChange={(e) =>
                      update(key, {
                        ...profile[key],
                        [id]: Number(e.target.value),
                      })
                    }
                  />
                  <span>{unit} / yr</span>
                </div>
              </label>
              <button
                className="icon-button"
                type="button"
                aria-label={"Remove " + (f?.name || id)}
                onClick={() => {
                  const next = { ...profile[key] };
                  delete next[id];
                  update(key, next);
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        <div className="add-stream">
          <Plus size={16} />
          <select
            aria-label={"Add " + key + " stream"}
            value=""
            onChange={(e) => {
              if (e.target.value)
                update(key, { ...profile[key], [e.target.value]: 0 });
            }}
          >
            <option value="">
              {available.length
                ? "Add a " + group.toLowerCase() + " stream…"
                : "All available streams added"}
            </option>
            {available.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <p className="form-help">
          Only streams present in the reference catalogue are offered.
          Quantities are annual and use each factor’s native unit.
        </p>
      </div>
    );
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }
    const result = plantSchema.safeParse(profile);
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        next[i.path.join(".")] = i.message;
      });
      setErrors(next);
      const field = String(result.error.issues[0]?.path[0]);
      const sectionFields = [
        ["name", "sector", "state"],
        ["annual_output_t", "annual_revenue_cr", "employees"],
        ["electricity_kwh", "fuels"],
        ["materials"],
        ["waste"],
        ["freight"],
        ["tariff", "discount_rate", "eu_export_share_pct"],
      ];
      const errorSection = sectionFields.findIndex((fields) =>
        fields.includes(field),
      );
      if (errorSection >= 0) setStep(errorSection);
      setValidated(false);
      return;
    }
    setErrors({});
    setValidated(true);
    try {
      await w.assess.mutateAsync(result.data);
      navigate("/overview");
    } catch {
      /* The error is displayed below. */
    }
  };
  const streamCount =
    Object.values(profile.fuels).filter((v) => v > 0).length +
    Object.values(profile.materials).filter((v) => v > 0).length +
    Object.values(profile.waste).filter((v) => v > 0).length +
    Object.values(profile.freight).filter((v) => v > 0).length +
    (profile.electricity_kwh > 0 ? 1 : 0);
  return (
    <div className="page-reveal">
      <PageHeading
        eyebrow="ASSESS / PLANT DATA"
        title="Start with what you already know."
        description="Use your utility bills, purchase records and annual production data."
        action={
          <Badge>
            {w.dataMode === "demo" ? "Demo input draft" : "Input draft"}
          </Badge>
        }
      />
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.25)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Sparkles size={20} className="positive" />
          <div>
            <div style={{ fontSize: "var(--text-body)", fontWeight: "var(--weight-semibold)" }}>
              Need rapid data entry? Use Conversational AI, Bill OCR, or Equipment Scanning.
            </div>
            <div style={{ fontSize: "var(--text-body-sm)", color: "var(--muted)" }}>
              Extract plant metrics automatically from plain English prompts or utility bills.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="button positive"
          onClick={() => setShowIntakeSuite(!showIntakeSuite)}
          style={{ padding: "0.45rem 1rem", fontSize: "var(--text-body-sm)", whiteSpace: "nowrap" }}
        >
          {showIntakeSuite ? "Hide Intake Suite ▲" : "Launch AI Intake & Scanners ✨"}
        </button>
      </div>
      {showIntakeSuite && <IntakeSuite onClose={() => setShowIntakeSuite(false)} />}
      <div className="intake-layout">
        <div>
          <div className="step-navigation" aria-label="Assessment sections">
            {steps.map((title, i) => (
              <button
                key={title}
                className={step === i ? "selected" : ""}
                onClick={() => setStep(i)}
                aria-current={step === i ? "step" : undefined}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {title}
              </button>
            ))}
          </div>
          <form onSubmit={submit}>
            <div className="form-section-header">
              <span className="eyebrow">
                SECTION {String(step + 1).padStart(2, "0")} /{" "}
                {String(steps.length).padStart(2, "0")}
              </span>
              <h2>{steps[step]}</h2>
              <p>
                {
                  [
                    "Identify the facility and its industrial context.",
                    "Use the same annual period for output, revenue and headcount.",
                    "Separate purchased electricity from combustion fuels.",
                    "Record the materials purchased during the reporting year.",
                    "Record disposal or treatment streams in tonnes per year.",
                    "Freight activity is mass multiplied by distance.",
                    "Use your actual tariffs and financing assumptions.",
                    "Review the evidence available for this input draft.",
                  ][step]
                }
              </p>
            </div>
            <div className="form-grid">
              {step === 0 && (
                <>
                  <label className="form-field wide">
                    <span>Plant name</span>
                    <input
                      required
                      minLength={2}
                      value={profile.name}
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </label>
                  <label className="form-field">
                    <span>Industrial sector</span>
                    <select
                      value={profile.sector}
                      onChange={(e) => update("sector", e.target.value)}
                    >
                      {w.sectors.data?.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field">
                    <span>Indian state / territory</span>
                    <select
                      value={profile.state}
                      onChange={(e) => update("state", e.target.value)}
                    >
                      {states.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  {input("annual_output_t", "Annual production", "t / yr")}
                  {input("annual_revenue_cr", "Annual revenue", "₹ Cr / yr")}
                  {input("employees", "Employee count", "people")}
                </>
              )}
              {step === 2 && (
                <div className="wide">
                  {input(
                    "electricity_kwh",
                    "Purchased electricity",
                    "kWh / yr",
                    "The engine converts kWh to the factor’s MWh basis.",
                  )}
                  <h3 className="form-subheading">Combustion fuels</h3>
                  {family("fuels", "Fuel")}
                </div>
              )}
              {step === 3 && (
                <div className="wide">{family("materials", "Material")}</div>
              )}
              {step === 4 && (
                <div className="wide">{family("waste", "Waste")}</div>
              )}
              {step === 5 && (
                <div className="wide">{family("freight", "Freight")}</div>
              )}
              {step === 6 && (
                <>
                  {input("tariff", "Electricity tariff", "₹ / kWh")}
                  {input(
                    "discount_rate",
                    "Cost of capital",
                    "%",
                    "Stored as a fraction in the API request.",
                  )}
                  {input(
                    "eu_export_share_pct",
                    "EU export share",
                    "%",
                    "Coverage depends on the goods exported. An export share alone does not establish CBAM liability.",
                  )}
                </>
              )}
              {step === 7 && (
                <div className="wide">
                  <EvidenceStatus />
                  <Note>
                    Evidence upload and review are unavailable in this build.
                    Bills, invoices, certificates and transport records cannot
                    be attached yet. Saving a draft does not verify its fields.
                  </Note>
                </div>
              )}
            </div>
            {Object.keys(errors).length > 0 && (
              <div className="form-validation" role="alert">
                <strong>Review your inputs</strong>
                {Object.entries(errors).map(([k, v]) => (
                  <p key={k}>
                    {k}: {v}
                  </p>
                ))}
              </div>
            )}
            {validated && (
              <div className="validation-success" role="status">
                <Check size={19} />
                <div>
                  <strong>Inputs validated.</strong>
                  <p>
                    Input checks passed. Calculating real assessment across Scope 1, 2, and 3 using statutory emission factors.
                  </p>
                  <button
                    className="button"
                    type="button"
                    onClick={() =>
                      downloadJson(profile, "prangara-plant-profile.json")
                    }
                  >
                    <Download size={15} />
                    Export validated profile
                  </button>
                </div>
              </div>
            )}
            {w.assess.isError && (
              <div className="form-validation" role="alert">
                {w.assess.error.message}
              </div>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <FlowButton
                type="submit"
                disabled={w.assess.isPending}
                text={
                  w.assess.isPending
                    ? "Calculating assessment…"
                    : step === steps.length - 1
                      ? "Calculate & Run Assessment"
                      : "Continue"
                }
              />
            </div>
          </form>
        </div>
        <aside className="assessment-summary">
          <ClipboardList size={24} />
          <div className="eyebrow">ASSESSMENT CONTEXT</div>
          <h3>{profile.name || "Your plant"}</h3>
          <p>
            {w.sectors.data?.find((s) => s.key === profile.sector)?.name} ·{" "}
            {profile.state}
          </p>
          <DetailRows
            rows={[
              ["Annual output", number(profile.annual_output_t) + " t"],
              ["Activity streams entered", String(streamCount)],
              ["Sections", String(step + 1) + " of " + steps.length],
              ["Inventory scope", "1 + 2 + selected Scope 3"],
              [
                "Calculation source",
                w.dataMode === "demo"
                  ? "Fixed development demo"
                  : "Configured assessment engine",
              ],
            ]}
          />
          <button
            className="button full-width"
            onClick={() => {
              w.selectPlant("textile_dyeing");
              navigate("/overview");
            }}
          >
            Load demo assessment
            <ArrowRight size={15} />
          </button>
          <button className="text-button" onClick={saveDraft}>
            <Download size={14} />
            Save draft to file
          </button>
          <label className="form-field">
            <span>Restore draft from file</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={readDraft}
              disabled={readingDraft || w.assess.isPending}
            />
            <small>
              PRANGARA input JSON · up to 1 MB. Read locally; no upload.
            </small>
          </label>
          {readingDraft && <p role="status">Reading draft…</p>}
          {draftError && (
            <p className="field-error" role="alert">
              {draftError}
            </p>
          )}
          {importedDraft && (
            <div className="drawer-section">
              <h3>Review draft before restoring</h3>
              <DetailRows
                rows={[
                  ["Plant", importedDraft.name || "Unnamed draft"],
                  ["Sector", importedDraft.sector],
                  ["State", importedDraft.state],
                ]}
              />
              <p>
                Restoring replaces the input draft for this form. Your displayed
                assessment stays unchanged.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() => setImportedDraft(null)}
                >
                  Cancel restore
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setProfile(importedDraft);
                    setImportedDraft(null);
                    setValidated(false);
                    setErrors({});
                    setStep(0);
                    w.assess.reset();
                    w.setToast(
                      "Draft restored. Review inputs before assessment.",
                    );
                  }}
                >
                  Restore draft
                </button>
              </div>
            </div>
          )}
          <Note>
            Edits survive page navigation in this session. Save a draft file
            before reloading or closing. Drafts are not saved to a server; keep
            exported files private.
          </Note>
        </aside>
      </div>
    </div>
  );
}
export default function PlantData() {
  const w = useWorkspace();
  if (!w.assessment) return <Skeleton />;
  return <AssessmentForm key={w.assessment.id} />;
}
