import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { service, sessionSnapshot, subscribeSession } from '../api/platform';
import type { MeResponse } from '../api/contracts';
function useState() {
  const session = useSyncExternalStore(subscribeSession, sessionSnapshot, () => null);
  const me = useQuery({queryKey:['private',session?.tokens.access_token,session?.organization,'me'], queryFn:({signal}) => service<MeResponse>('/auth/me',{signal}), enabled:!!session, retry:false, gcTime:0, staleTime:30000});
  return {session, me, identity:session ? me.data : undefined, can:(permission:string) => !!session && !!me.data?.permissions.includes(permission)};
}
const Context = createContext<ReturnType<typeof useState> | null>(null);
export function SessionProvider({children}: {children:ReactNode}) { return <Context.Provider value={useState()}>{children}</Context.Provider>; }
export function useSession() { const value=useContext(Context); if (!value) throw new Error('Session provider missing'); return value; }
