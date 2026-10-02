import type { NotificationOut } from '../api/contracts';
import { PageHeading } from '../components/ui/common';
import { Access, ActionButton, Panel, Resource, useResource, useSave } from '../components/platform/shared';
import { Link } from 'react-router-dom';
export default function Notifications() {
  const query=useResource<NotificationOut[]>('/notifications?limit=200'),save=useSave();
  return <div className="page-reveal platform-page"><PageHeading eyebrow="WORKSPACE / NOTIFICATIONS" title="Stay on top of the work." description="Updates from your organization’s workflows."/><Access><Panel title="Notifications"><ActionButton onClick={()=>save('/notifications/read-all')}>Mark all as read</ActionButton><Resource query={query}>{rows=><>{!rows.length&&<p>No notifications yet. Workflow updates appear here when processed by the service.</p>}{rows.map(n=><article className="platform-extracted" key={n.id}><h3>{n.title}</h3><p>{n.body}</p><p>{n.severity} · {new Date(n.created_at).toLocaleString()}</p>{n.factory_id&&<Link className="text-button" to={'/workspace/'+encodeURIComponent(n.factory_id)}>Open factory ↗</Link>}{!n.read_at&&<ActionButton onClick={()=>save('/notifications/'+n.id+'/read')}>Mark read</ActionButton>}</article>)}</>}</Resource></Panel></Access></div>;
}
