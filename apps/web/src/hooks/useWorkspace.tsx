import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, dataMode } from "../api/client";
import type { Assessment, DrawerRecord, PlantProfile } from "../types/domain";
function useWorkspaceState() {
  const [sectorKey, setSectorKey] = useState("textile_dyeing");
  const [custom, setCustom] = useState<Assessment | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PlantProfile>>({});
  const [drawer, setDrawer] = useState<DrawerRecord | null>(null);
  const [toast, setToast] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const sectors = useQuery({
    queryKey: ["sectors"],
    queryFn: ({ signal }) => api.sectors(signal),
  });
  const reference = useQuery({
    queryKey: ["reference"],
    queryFn: ({ signal }) => api.reference(signal),
  });
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.health(signal),
    retry: 1,
  });
  const demo = useQuery({
    queryKey: ["demo", sectorKey],
    queryFn: ({ signal }) => api.demo(sectorKey, signal),
    placeholderData: (prev) => prev,
  });
  const sector = useQuery({
    queryKey: ["sector", sectorKey],
    queryFn: ({ signal }) => api.sector(sectorKey, signal),
    placeholderData: (prev) => prev,
  });
  const assessment = custom || demo.data;
  const assess = useMutation({
    mutationFn: (p: PlantProfile) => api.assess(p),
    onSuccess: (data) => {
      setSectorKey(data.plant.sector);
      setCustom(data);
      setDrawer(null);
      setToast("Assessment complete. Your results are ready.");
    },
  });
  const selectPlant = (key: string) => {
    setSectorKey(key);
    setCustom(null);
    setDrawer(null);
    assess.reset();
  };
  return {
    assessment,
    inputDraft: assessment ? drafts[assessment.id] : undefined,
    setInputDraft: (profile: PlantProfile) => {
      if (assessment)
        setDrafts((previous) => ({ ...previous, [assessment.id]: profile }));
    },
    sectors,
    sector,
    reference,
    health,
    demo,
    assess,
    sectorKey,
    selectPlant,
    drawer,
    setDrawer,
    toast,
    setToast,
    commandOpen,
    setCommandOpen,
    dataMode,
  };
}
type Context = ReturnType<typeof useWorkspaceState>;
const WorkspaceContext = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  return (
    <WorkspaceContext.Provider value={useWorkspaceState()}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const state = useContext(WorkspaceContext);
  if (!state) throw new Error("WorkspaceProvider is required");
  return state;
}
