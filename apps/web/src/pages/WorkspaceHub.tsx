import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ActivityRecordOut, AssetOut, AssessmentDetail, AssessmentSummary, FactorySummary, ProfileOut, SiteOut } from '../api/contracts';
import { useSession } from '../hooks/useSession';
import { useWorkspace } from '../hooks/useWorkspace';
import { service } from '../api/platform';
import { adaptAssessment } from '../api/adapter';
import { assessmentSchema } from '../types/domain';
import { PageHeading, Note } from '../components/ui/common';
import { Access, ActionButton, Panel, RecordForm, Resource, Rows, Value, useResource, useSave, type Fields } from '../components/platform/shared';
import Intake from './workspace/Intake';
import Scenarios from './workspace/Scenarios';
import Evidence from './workspace/Evidence';
import Tracker from './workspace/Tracker';
import Cases from './workspace/Cases';
import Audit from './workspace/Audit';
export const dataStates=['DECLARED','ESTIMATED','MISSING','STALE'];
const activityFields:Fields={stream_kind:{options:['electricity','fuel','material','waste','freight']},factor_key:{help:'Choose the exact factor key from Methodology → Factors. Electricity may use the state grid default.'},label:{},quantity:{},unit:{},period_start:{},period_end:{},data_state:{options:dataStates},unit_cost_inr:{},notes:{type:'textarea'}};
const assetFields:Fields={asset_type:{options:['motor','boiler','furnace','compressor','chiller','other']},name:{},manufacturer:{},model:{},rated_power_kw:{},rated_capacity:{},capacity_unit:{},efficiency_pct:{},year_installed:{},energy_type:{options:['electricity','fuel']},fuel_factor_key:{},operating_hours_per_year:{},load_factor:{help:'Fraction between 0 and 1. Rated power alone is not measured consumption.'},maintenance_status:{},data_state:{options:dataStates}};
const profileFields:Fields={label:{},period_start:{},period_end:{},annual_output_t:{},output_unit:{},annual_revenue_cr:{},employees:{},operating_days:{},shifts_per_day:{},export_share_pct:{},eu_export_share_pct:{},tariff_inr_per_kwh:{},discount_rate:{},is_draft:{},notes:{type:'textarea'}};
function Factories() {
  const query=useResource<FactorySummary[]>('/factories?limit=200'), sectors=useResource<{sectors:{key:string;label:string}[]}>('/sectors',true),save=useSave(),{can}=useSession(),navigate=useNavigate();
  return <><Panel title="Factories & comparison"><Resource query={query}>{rows=><Rows rows={rows} columns={['name','sector','state','total_tco2e','scope3_tco2e','critical_leak_count','cash_positive_benefit_inr','open_action_count','data_quality_score']} onOpen={row=>navigate('/workspace/'+row.id)} caption="Factories"/>}</Resource><Note>Metrics come from each factory’s latest baseline. Compare reporting periods and output scale before drawing conclusions. Up to 200 accessible factories are shown.</Note></Panel>{can('factory:write')&&<Panel title="Add a factory"><RecordForm schema="FactoryCreate" fields={{name:{},sector:{options:sectors.data?.sectors.map(s=>({value:s.key,label:s.label}))||[]},state:{},district:{},cluster:{},latitude:{},longitude:{}}} submit="Create factory" onSubmit={async body=>{const row=await save<FactorySummary>('/factories',body);navigate('/workspace/'+row.id);}}/></Panel>}</>;
}
function Factory({id}: {id:string}) {
  const [tab,setTab]=useState('Profile'),factory=useResource<FactorySummary>('/factories/'+id),{can}=useSession();
  return <Resource query={factory}>{f=><><Panel title={f.name}><p>{f.sector} · {f.state||'Location not supplied'}</p><div className="platform-toolbar"><Link className="text-button" to="/workspace">← All factories</Link><Link className="text-button" to={'/marketplace?factory='+id}>Find providers & materials ↗</Link></div></Panel><nav className="platform-tabs" aria-label="Factory sections">{['Profile','Activity','Assets','Sites','Intake','Assessments','Scenarios','Evidence','Tracker','Cases','Audit'].map(t=><button className={tab===t?'active':''} aria-pressed={tab===t} key={t} onClick={()=>setTab(t)}>{t}</button>)}</nav><div key={id+tab}>{tab==='Profile'?<Profile id={id} write={can('factory:write')}/>:tab==='Activity'?<Activity id={id} write={can('factory:write')}/>:tab==='Assets'?<Assets id={id} write={can('factory:write')}/>:tab==='Sites'?<Sites id={id} write={can('factory:write')}/>:tab==='Intake'?<Intake id={id}/>:tab==='Assessments'?<Assessments id={id}/>:tab==='Scenarios'?<Scenarios id={id}/>:tab==='Evidence'?<Evidence id={id}/>:tab==='Tracker'?<Tracker id={id}/>:tab==='Cases'?<Cases id={id}/>:<Audit id={id}/>}</div></>}</Resource>;
}
function Profile({id,write}: {id:string;write:boolean}) {
  const query=useResource<ProfileOut>('/factories/'+id+'/profile'),save=useSave();
  return <Panel title="Reporting period"><Resource query={query}>{p=><><Value value={{period:p.label,field_states:p.field_states,is_draft:p.is_draft}}/>{write?<RecordForm key={p.updated_at} schema="ProfileUpsert" fields={profileFields} initial={p} submit="Save reporting draft" onSubmit={body=>save('/factories/'+id+'/profile',{...Object.fromEntries(Object.keys(profileFields).map(k=>[k,p[k as keyof ProfileOut]])),site_id:p.site_id,field_states:p.field_states,...body},'PUT')}/>:<Value value={p}/>}</>}</Resource></Panel>;
}
function Activity({id,write}: {id:string;write:boolean}) {
  const query=useResource<ActivityRecordOut[]>('/factories/'+id+'/activity'),save=useSave(),[edit,setEdit]=useState<ActivityRecordOut|null>(null);
  const factors=useResource<{groups:Record<string,{key:string;label:string;unit:string}[]>}>('/reference',true);
  const fields={...activityFields,factor_key:{options:Object.values(factors.data?.groups||{}).flat().map(f=>({value:f.key,label:f.label+' · '+f.key+' · '+f.unit}))}};
  return <><Panel title="Activity records"><Resource query={query}>{rows=><Rows rows={rows} columns={['label','stream_kind','factor_key','quantity','unit','data_state','confirmed_at']} onOpen={setEdit} caption="Activity records"/>}</Resource></Panel>{write&&<Panel title={edit?'Edit activity':'Add activity'}><RecordForm key={edit?.id||'new'} schema="ActivityRecordIn" fields={fields} initial={edit||{data_state:'DECLARED'}} submit={edit?'Save activity':'Add activity'} onSubmit={async body=>{await save('/factories/'+id+'/activity'+(edit?'/'+edit.id:''),body,edit?'PATCH':'POST');setEdit(null);}}/>{edit&&<button className="text-button" onClick={()=>setEdit(null)}>Cancel edit</button>}<Note>Verified and document-confirmed states come from the evidence review flow. Enter quantities in the selected factor’s denominator unit.</Note></Panel>}</>;
}
function Assets({id,write}: {id:string;write:boolean}) {
  const query=useResource<AssetOut[]>('/factories/'+id+'/assets'),save=useSave(),[edit,setEdit]=useState<AssetOut|null>(null);
  return <><Panel title="Equipment & estimates"><Resource query={query}>{rows=><Rows rows={rows} columns={['name','asset_type','rated_power_kw','estimated_annual_kwh','estimated_annual_tco2e','estimate_basis','confidence']} onOpen={setEdit} caption="Equipment"/>}</Resource></Panel>{write&&<Panel title={edit?'Edit equipment':'Add equipment'}><RecordForm key={edit?.id||'new'} schema="AssetIn" fields={assetFields} initial={edit||{data_state:'DECLARED'}} submit="Save equipment" onSubmit={async body=>{await save('/factories/'+id+'/assets'+(edit?'/'+edit.id:''),body,edit?'PATCH':'POST');setEdit(null);}}/>{edit&&<button className="text-button" onClick={()=>setEdit(null)}>Cancel edit</button>}</Panel>}</>;
}
function Sites({id,write}: {id:string;write:boolean}) {
  const query=useResource<SiteOut[]>('/factories/'+id+'/sites'),save=useSave();
  return <><Panel title="Sites"><Resource query={query}>{rows=><Rows rows={rows} columns={['name','address','state','district','is_primary']} caption="Sites"/>}</Resource></Panel>{write&&<Panel title="Add site"><RecordForm schema="SiteCreate" fields={{name:{},address:{},state:{},district:{},latitude:{},longitude:{},is_primary:{}}} submit="Add site" onSubmit={body=>save('/factories/'+id+'/sites',body)}/></Panel>}</>;
}
function Assessments({id}: {id:string}) {
  const query=useResource<AssessmentSummary[]>('/factories/'+id+'/assessments?limit=100'),save=useSave(),w=useWorkspace(),navigate=useNavigate(),{can}=useSession(),[selected,setSelected]=useState('');
  const open=async(assessmentId:string)=>{const detail=await service<AssessmentDetail>('/assessments/'+assessmentId);w.loadAssessment(assessmentSchema.parse(adaptAssessment(detail.result,detail.engine_profile,detail.id)),id);navigate('/overview');};
  return <><Panel title="Saved assessments"><Resource query={query}>{rows=><Rows rows={rows} columns={['label','created_at','is_baseline','total_tco2e','data_quality_score']} onOpen={row=>setSelected(row.id)} caption="Assessment history"/>}</Resource>{selected&&<ActionButton onClick={()=>open(selected)}>Open selected assessment in dashboard</ActionButton>}</Panel>{can('assessment:run')&&<Panel title="Run a baseline"><RecordForm schema="RunAssessmentRequest" fields={{label:{}}} submit="Run and save assessment" onSubmit={async body=>{const detail=await save<AssessmentDetail>('/factories/'+id+'/assessments',body);w.loadAssessment(assessmentSchema.parse(adaptAssessment(detail.result,detail.engine_profile,detail.id)),id);navigate('/overview');}}/><Note>The service uses the saved reporting profile and activity records. Each run preserves its input snapshot and engine version.</Note></Panel>}</>;
}
export default function WorkspaceHub() {
  const {factoryId}=useParams(),{can}=useSession();
  return <div className="page-reveal platform-page"><PageHeading eyebrow="WORKSPACE / FACTORIES" title="From insight to action." description="Saved baselines, supporting evidence and work in progress."/><Access>{can('factory:read')?(factoryId?<Factory key={factoryId} id={factoryId}/>:<Factories/>):<Panel title="Provider workspace"><p>Your account manages services and invited quote requests.</p><Link className="button" to="/marketplace">Open provider workspace</Link></Panel>}</Access></div>;
}
