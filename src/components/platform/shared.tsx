import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import schemas from '../../api/form-schemas.json';
import { service, send } from '../../api/platform';
import { useSession } from '../../hooks/useSession';
import { Empty, Skeleton } from '../ui/common';

export const label = (s:string) => s.replace(/_/g,' ').replace(/\b(inr|kwh|tco2e|npv|lcoa|rfq)\b/gi, x => ({inr:'₹',kwh:'kWh',tco2e:'tCO₂e',npv:'NPV',lcoa:'LCOA',rfq:'RFQ'}[x.toLowerCase()] || x)).replace(/^./,x=>x.toUpperCase());
export function Value({value}: {value:unknown}) {
  if (value == null || value === '') return <span className="muted">Not supplied</span>;
  if (typeof value === 'boolean') return <>{value ? 'Yes':'No'}</>;
  if (typeof value === 'number') return <>{value.toLocaleString('en-IN',{maximumFractionDigits:3})}</>;
  if (typeof value === 'string') return <>{value}</>;
  if (Array.isArray(value)) return value.length ? <ul>{value.map((v,i)=><li key={i}><Value value={v}/></li>)}</ul> : <span className="muted">None recorded</span>;
  return <dl className="platform-details">{Object.entries(value as object).map(([k,v])=><div key={k}><dt>{label(k)}</dt><dd><Value value={v}/></dd></div>)}</dl>;
}
export function ErrorNotice({error}: {error:unknown}) { return error ? <p className="platform-error" role="alert">{error instanceof Error ? error.message : 'Request failed. Please retry.'}</p> : null; }
export function Panel({title,children}: {title:string;children:ReactNode}) { return <section className="platform-panel"><h2>{title}</h2>{children}</section>; }
export function useResource<T>(path:string|null, publicRead=false) {
  const {session}=useSession();
  return useQuery({queryKey:[publicRead?'public':'private',publicRead?null:session?.tokens.access_token,publicRead?null:session?.organization,path], queryFn:({signal})=>service<T>(path!,{signal}),enabled:!!path&&(publicRead||!!session),retry:false,gcTime:publicRead?300000:0});
}
export function Resource<T>({query,children}: {query:ReturnType<typeof useResource<T>>;children:(data:T)=>ReactNode}) {
  if (query.isPending) return <Skeleton/>;
  if (query.error) return <><ErrorNotice error={query.error}/><button className="button" onClick={()=>query.refetch()}>Retry</button></>;
  return <>{children(query.data)}</>;
}
export function Access({children}: {children:ReactNode}) {
  const {session,me}=useSession();
  if (!session) return <Empty title="Your connected workspace" description="Sign in to manage your factories, evidence, providers and implementation work." action={<Link className="button" to="/account">Sign in or create an account</Link>}/>;
  if (me.isPending) return <Skeleton/>;
  if (me.error) return <><ErrorNotice error={me.error}/><Link className="button" to="/account">Account & session</Link></>;
  return <>{children}</>;
}
type FieldSchema = {type?:string;anyOf?:FieldSchema[];enum?:string[];default?:unknown;format?:string;minimum?:number;exclusiveMinimum?:number;maximum?:number;exclusiveMaximum?:number;minLength?:number;maxLength?:number;items?:FieldSchema};
export type Choice = string | {value:string;label:string};
export type Fields = Record<string,{label?:string;options?:Choice[];help?:string;type?:string;required?:boolean}>;
export function RecordForm({schema,title,fields,initial={},submit,onSubmit}: {schema:keyof typeof schemas;title?:string;fields:Fields;initial?:Record<string,unknown>;submit:string;onSubmit:(value:Record<string,unknown>)=>Promise<unknown>}) {
  const spec=schemas[schema] as {properties:Record<string,FieldSchema>;required?:string[]};
  const mutation=useMutation({mutationFn:onSubmit});
  const [revision,setRevision]=useState(0);
  return <form className="platform-form" onSubmit={async e=>{e.preventDefault();const fd=new FormData(e.currentTarget); const values:Record<string,unknown>={}; for (const key of Object.keys(fields)) {const original=spec.properties[key];const rule=original?.anyOf?.find(s=>s.type!=='null')||original; const v=fd.get(key); if (rule?.type==='boolean') values[key]=v==='on'; else if (v!==null&&v!=='') values[key]=rule?.type==='number'||rule?.type==='integer'?Number(v):rule?.type==='array'?String(v).split('\n').map(x=>x.trim()).filter(Boolean):v; } try {await mutation.mutateAsync(values);setRevision(x=>x+1);} catch { /* Mutation error is rendered. */ }}}>
    {title&&<h3>{title}</h3>}<div className="form-grid" key={revision}>{Object.entries(fields).map(([key,config])=>{ const original=spec.properties[key]; if (!original) throw new Error(`Unknown contract field ${schema}.${key}`); const rule=original.anyOf?.find(s=>s.type!=='null')||original;const value=initial[key]??original.default??'';const options=config.options||rule.enum;const required=config.required??spec.required?.includes(key); const type=config.type|| (rule.type==='boolean'?'checkbox':rule.type==='number'||rule.type==='integer'?'number':rule.format==='date'?'date':rule.format==='date-time'?'datetime-local':rule.format==='email'?'email':'text');return <label className="form-field" key={key}><span>{config.label||label(key)}{required?' *':''}</span>{options?<select name={key} required={required} defaultValue={String(value)}><option value="">Select…</option>{options.map(o=><option key={typeof o==='string'?o:o.value} value={typeof o==='string'?o:o.value}>{typeof o==='string'?label(o):o.label}</option>)}</select>:rule.type==='array'||type==='textarea'?<textarea name={key} required={required} defaultValue={Array.isArray(value)?value.join('\n'):String(value)} maxLength={rule.maxLength}/>:<input name={key} type={type} required={required} defaultValue={type==='checkbox'?undefined:String(value)} defaultChecked={type==='checkbox'?Boolean(value):undefined} min={rule.minimum??(rule.exclusiveMinimum!=null?rule.exclusiveMinimum+0.000001:undefined)} max={rule.maximum??(rule.exclusiveMaximum!=null?rule.exclusiveMaximum-0.000001:undefined)} step={rule.type==='integer'?1:'any'} minLength={rule.minLength} maxLength={rule.maxLength} autoComplete={key==='password'?'current-password':undefined}/>}<small>{config.help||(rule.type==='array'?'One entry per line.':'')}</small></label>;})}</div>
    <ErrorNotice error={mutation.error}/>{mutation.isSuccess&&<p role="status">Saved successfully.</p>}<button className="button" disabled={mutation.isPending}>{mutation.isPending?'Saving…':submit}</button>
  </form>;
}
export function useSave() {
  const client=useQueryClient();
  return async <T,>(path:string,body:unknown={},method='POST')=>{const result=await send<T>(path,body,method);await client.invalidateQueries({predicate:q=>q.queryKey[0]==='private'||q.queryKey[0]==='public'});return result;};
}
export function ActionButton({children,onClick,disabled=false}: {children:ReactNode;onClick:()=>Promise<unknown>;disabled?:boolean}) {
  const mutation=useMutation({mutationFn:onClick});
  return <span className="platform-action"><button className="button" disabled={disabled||mutation.isPending} onClick={()=>mutation.mutate()}>{mutation.isPending?'Working…':children}</button><ErrorNotice error={mutation.error}/>{mutation.isSuccess&&<span role="status">Done</span>}</span>;
}
export function Rows<T extends {id:string}>({rows,columns,onOpen,caption}: {rows:T[];columns:(keyof T)[];onOpen?:(row:T)=>void;caption:string}) {
  const [search,setSearch]=useState('');
  const filtered=rows.filter(row=>columns.some(k=>String(row[k]??'').toLowerCase().includes(search.toLowerCase())));
  return <><label className="platform-search">Search {caption}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter these records…"/></label><div className="table-scroll"><table className="platform-table"><caption>{caption} · {filtered.length} records</caption><thead><tr>{columns.map(k=><th key={String(k)} scope="col">{label(String(k))}</th>)}{onOpen&&<th scope="col">Details</th>}</tr></thead><tbody>{filtered.map(row=><tr key={row.id}>{columns.map(k=><td key={String(k)}><Value value={row[k]}/></td>)}{onOpen&&<td><button className="text-button" onClick={()=>onOpen(row)} aria-label={'Open '+String('name' in row?row.name:'title' in row?row.title:row.id)}>Open ↗</button></td>}</tr>)}</tbody></table>{!filtered.length&&<p className="platform-empty">No matching records. Newly saved records will appear here.</p>}</div></>;
}
