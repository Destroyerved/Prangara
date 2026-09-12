import { z } from 'zod';
import { actionSchema, type PlantProfile } from '../types/domain';

// Presentation mapping only. All domain figures and portfolio totals are supplied
// by backend/engine at main aca0e14. Missing metadata stays missing.
const object = (v:unknown) => z.record(z.string(),z.unknown()).parse(v);
const list = (v:unknown) => z.array(z.record(z.string(),z.unknown())).parse(v);
const strings = (v:unknown) => z.array(z.string()).parse(v ?? []);
const num = (v:unknown) => z.number().finite().parse(v);
const str = (v:unknown) => z.string().parse(v);
const optional = (v:unknown) => v ?? null;
export function adaptPlant(raw:unknown, sector?:string, assumptions:Record<string,unknown> = {}) {
  const p=object(raw);
  return {...p,sector:sector||p.sector,tariff:p.tariff_inr_per_kwh??p.tariff??assumptions.electricity_tariff_inr_per_kwh,
    discount_rate:p.discount_rate??assumptions.discount_rate,eu_export_share_pct:p.eu_export_share_pct??0};
}
export function toEngineProfile(p:PlantProfile) {const {tariff,...rest}=p;return {...rest,tariff_inr_per_kwh:tariff};}
export function adaptSector(raw:unknown) {
  const s=object(raw);if(s.name) return raw;
  const p=object(s.demo_profile);
  return {key:s.key,name:s.label,cluster:strings(s.clusters).join(' · '),state:p.state,demo_profile:{...p,sector:s.key},
    benchmarks:Object.entries(object(s.benchmarks)).map(([key,value])=>({...object(value),name:key,unit:key})),regulatory_flags:s.regulatory_flags};
}
export function adaptSectors(raw:unknown) {
  if(Array.isArray(raw)) return raw;
  return list(object(raw).sectors).map(s=>({key:s.key,name:s.label,cluster:strings(s.clusters).join(' · '),state:'',demo_profile:{name:s.demo_name}}));
}
export function adaptReference(raw:unknown) {
  if(Array.isArray(raw))return raw;
  const r=object(raw);
  return Object.entries(object(r.groups)).flatMap(([group,value])=>list(value).map(f=>({key:f.key,name:f.label,group:({electricity:'Electricity',fuels:'Fuel',materials:'Material',transport:'Freight',waste:'Waste'} as Record<string,string>)[group]||group,scope:String(f.scope),value:f.value,low:f.low,high:f.high,unit:f.unit,source:f.source,vintage:null,state:null})));
}
export function adaptAssessment(raw:unknown,input?:unknown,id?:string) {
  const r=object(raw);if(r.origin&&r.plant)return raw;
  if(!input)throw new Error('The engine input snapshot is required to display this assessment.');
  const fp=object(r.footprint),recs=object(r.recommendations),leaks=object(r.leaks),sankey=object(r.sankey),compliance=object(r.compliance),cbam=object(compliance.cbam),brsr=object(compliance.brsr),method=object(r.methodology),assumptions=object(recs.assumptions);
  const streams=list(fp.streams).map(s=>({id:str(s.key),name:str(s.label),scope:String(s.scope),category:str(s.key).startsWith('material_')?'materials':str(s.key).startsWith('waste_')?'waste':s.key==='freight'?'freight':'energy',quantity:optional(s.activity_qty),unit:s.activity_unit,factor_keys:strings(s.factor_keys),factor_key:strings(s.factor_keys).length===1?strings(s.factor_keys)[0]:null,emissions:s.range,share_pct:s.share_pct,working:s.source,detail:s.detail}));
  const items=list(recs.recommendations).map(a=>actionSchema.parse({id:a.id,name:a.name,category:a.category,target:a.target_stream,status:a.cash_positive===true?'cash_positive':'net_cost',quick_win:false,cap_pct:optional(a.substitution_cap_pct),restriction:optional(a.restriction_note),capex:a.capex_inr,net_benefit:a.net_annual_benefit_inr,gross_saving:optional(a.gross_annual_saving_inr),opex_delta:optional(a.annual_opex_delta_inr),payback_years:optional(a.payback_yrs),npv:optional(a.npv_inr),lcoa:a.lcoa_inr_per_tco2e,standalone_t:a.abatement_tco2e,abatement_t:a.portfolio_abatement_tco2e,abatement_range:a.abatement_range,difficulty:a.difficulty,disruption_days:optional(a.disruption_days),confidence:a.confidence,savings_model:a.savings_model,lifetime_years:optional(a.lifetime_yrs),physical_statement:a.physical_note,evidence:a.evidence,caveats:a.caveats}));
  const curve=list(recs.macc_curve).map(c=>({id:str(c.id),abatement_t:num(c.width),lcoa:num(c.height)}));
  const portfolios=Object.fromEntries(Object.entries(object(recs.portfolio)).map(([mode,value])=>{const p=object(value);const selected=mode==='all'?curve:mode==='cash_positive_only'?curve.filter(c=>items.find(a=>a.id===c.id)?.status==='cash_positive'):[];return [mode,{ids:selected.map(c=>c.id),count:optional(p.count),abatement_t:optional(p.abatement_tco2e),share_pct:optional(p.abatement_pct),capex:optional(p.capex_inr),net_benefit:optional(p.net_annual_benefit_inr),payback_years:optional(p.blended_payback_yrs),npv:optional(p.npv_inr),curve:selected}];}));
  const links=list(sankey.links),nodes=list(sankey.nodes);
  const cctsRaw=compliance.ccts?object(compliance.ccts):null;
  const ccts=cctsRaw?{applicable:Boolean(cctsRaw.applicable),status:String(cctsRaw.status??'voluntary_eligible'),designated_consumer_status:String(cctsRaw.designated_consumer_status??'Voluntary Carbon Credit Eligible'),plant_thermal_gj:optional(cctsRaw.plant_thermal_gj),designated_consumer_threshold_gj:optional(cctsRaw.designated_consumer_threshold_gj),is_designated_consumer:Boolean(cctsRaw.is_designated_consumer),voluntary_ccc_potential_tco2e:optional(cctsRaw.voluntary_ccc_potential_tco2e),mechanism:String(cctsRaw.mechanism??'BEE Carbon Credit Trading Scheme'),notes:strings(cctsRaw.notes)}:undefined;
  return {id:id||'engine-'+str(object(r.profile).sector),plant:adaptPlant(input,undefined,assumptions),origin:{kind:'engine',note:r.is_demo?'Engine demonstration; not a measured factory assessment.':'Calculated by the configured PRANGARA engine.',reference:id||'Unpersisted sandbox assessment'},
    metadata:{versions:r.versions??{},data_quality:r.data_quality??null,benchmark_source:leaks.benchmark_source,benchmark_provenance:leaks.benchmark_provenance,benchmark_caveat:leaks.benchmark_caveat,is_demo:r.is_demo===true,quick_win_membership_available:false},
    footprint:{total:fp.total_range,uncertainty_pct:optional(fp.uncertainty_pct),scopes:['1','2','3'].map(scope=>({scope,total:fp['scope'+scope+'_tco2e'],share_pct:object(fp.scope_split_pct)['scope'+scope]})),streams,gate_to_gate:optional(object(fp.intensities).scope12_tco2e_per_t),cradle_to_gate:optional(object(fp.intensities).total_tco2e_per_t),biogenic_t:optional(fp.biogenic_co2_t)},
    sankey:{nodes:nodes.map((n,i)=>({id:String(i),name:n.name,scope:n.kind==='total'?'total':String(links.find(l=>l.source===i||l.target===i)?.scope),stream_id:streams.find(s=>s.name===n.name)?.id??null})),links:links.map(l=>({source:String(l.source),target:String(l.target),value:l.value,scope:String(l.scope)}))},
    leaks:{peer_percentile:leaks.peer_position?optional(object(leaks.peer_position).percentile):null,findings:list(leaks.leaks).map(l=>({id:String(l.stream_key)+'-'+l.rule,stream_id:l.stream_key,name:l.label,rule:l.rule,severity:l.severity,share_pct:l.share_pct,actual:optional(l.actual),unit:l.metric_unit,p25:optional(l.p25),p50:optional(l.p50),p75:optional(l.p75),percentile:optional(l.percentile),recoverable_t:optional(l.gap_to_median_tco2e),reason:l.finding}))},
    recommendations:{items,blocked:list(recs.blocked).map(b=>({id:b.id,name:b.name,restriction:b.reason,cap_pct:null})),portfolios},
    compliance:{cbam:{applicability:cbam.applicability?String(cbam.applicability):(cbam.applicable?'Potentially applicable — screening only':'Not indicated by sector screening'),status:cbam.status?String(cbam.status):undefined,exposure_t:optional(cbam.embedded_emissions_exported_tco2e),net_surrender_t:optional(cbam.net_surrender_tco2e),eu_benchmark:optional(cbam.eu_benchmark_tco2e_per_t),indicative_cost:cbam.applicable?optional(cbam.indicative_annual_cost_inr):null,reference_price:optional(cbam.reference_price_inr_per_tco2e),export_share_pct:optional(cbam.eu_export_share_pct),included:['Scope 1 direct process emissions','Scope 2 electricity (subject to goods CN code)'],excluded:['Precursor emissions and upstream raw material extraction (supplier declarations needed)'],assumptions:[str(cbam.basis??''),str(cbam.caveat??'')].filter(Boolean)},ccts,brsr:list(brsr.readiness).map(b=>({name:str(b.item),status:b.status==='ready'?'Ready':b.status==='partial'?'Partial':b.status==='no data'?'Missing':'External action required',detail:str(b.note||brsr.why||'')}))},
    methodology:{standard:method.standard,gwp:method.gwp,boundary:'Scope 1, Scope 2 and collected Scope 3 categories',limitations:[method.factor_note,method.benchmark_note,assumptions.derating_note,assumptions.capex_note].filter(x=>typeof x==='string'),assumptions:[str(method.verification_status)]}};
}
