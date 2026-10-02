import type { AuditEntryOut, EventOut } from '../../api/contracts';
import { Panel, Resource, Rows, useResource } from '../../components/platform/shared';
import { Note } from '../../components/ui/common';
export default function Audit({id}: {id:string}) {
  const audit=useResource<AuditEntryOut[]>('/factories/'+id+'/audit?limit=200'),events=useResource<EventOut[]>('/factories/'+id+'/events?limit=200');
  return <><Panel title="Organization audit trail"><Resource query={audit}>{rows=><Rows rows={rows} columns={['created_at','actor_label','action','object_type','reason','old_value','new_value']} caption="Audit entries"/>}</Resource><Note>The service returns this factory’s organization audit trail. Entries are read only and include the actor, changes and available reasons.</Note></Panel><Panel title="Factory events"><Resource query={events}>{rows=><Rows rows={rows} columns={['occurred_at','event_type','status','correlation_id']} caption="Events"/>}</Resource></Panel></>;
}
