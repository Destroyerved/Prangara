import { lazy, Suspense, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { WorkspaceProvider } from "../hooks/useWorkspace";
import Shell from "../components/shell/Shell";
import AssessmentGate from "../components/ui/AssessmentGate";
import { Skeleton, Empty } from "../components/ui/common";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { SessionProvider, useSession } from "../hooks/useSession";
import "../styles/platform.css";
const Account = lazy(() => import("../pages/Account"));
const WorkspaceHub = lazy(() => import("../pages/WorkspaceHub"));
const Marketplace = lazy(() => import("../pages/Marketplace"));
const Notifications = lazy(() => import("../pages/Notifications"));
const Landing = lazy(() => import("../pages/Landing"));
const SignIn = lazy(() => import("../pages/SignIn"));
const SignUp = lazy(() => import("../pages/SignUp"));
function ConnectedWorkspace({children}:{children:ReactNode}) {
  const {identity}=useSession();
  return <WorkspaceProvider key={(identity?.user.id||"public")+":"+(identity?.active_organization_id||"")}>{children}</WorkspaceProvider>;
}
const Overview = lazy(() => import("../pages/Overview"));
const PlantData = lazy(() => import("../pages/PlantData"));
const Footprint = lazy(() => import("../pages/Footprint"));
const LeakPoints = lazy(() => import("../pages/LeakPoints"));
const Scenarios = lazy(() => import("../pages/Scenarios"));
const CircularActions = lazy(() => import("../pages/CircularActions"));
const AbatementPortfolio = lazy(() => import("../pages/AbatementPortfolio"));
const Logistics = lazy(() => import("../pages/Logistics"));
const CircularNetwork = lazy(() => import("../pages/CircularNetwork"));
const Compliance = lazy(() => import("../pages/Compliance"));
const Methodology = lazy(() => import("../pages/Methodology"));
const GlassDemo = lazy(() => import("../components/ui/demo"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <SessionProvider><ConnectedWorkspace>
            <Routes>
              {/* Standalone Public Routes */}
              <Route path="/" element={<Suspense fallback={<Skeleton />}><Landing /></Suspense>} />
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/signin" element={<Suspense fallback={<Skeleton />}><SignIn /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<Skeleton />}><SignUp /></Suspense>} />

              {/* Authenticated App Routes with Shell */}
              <Route element={<Shell />}>
                <Route path="overview" element={<Suspense fallback={<Skeleton />}><AssessmentGate><Overview /></AssessmentGate></Suspense>} />
                <Route path="account" element={<Suspense fallback={<Skeleton/>}><Account/></Suspense>}/>
                <Route path="workspace" element={<Suspense fallback={<Skeleton/>}><WorkspaceHub/></Suspense>}/>
                <Route path="workspace/:factoryId" element={<Suspense fallback={<Skeleton/>}><WorkspaceHub/></Suspense>}/>
                <Route path="marketplace" element={<Suspense fallback={<Skeleton/>}><Marketplace/></Suspense>}/>
                <Route path="notifications" element={<Suspense fallback={<Skeleton/>}><Notifications/></Suspense>}/>
                {[
                  ["overview", Overview],
                  ["assessment", PlantData],
                  ["footprint", Footprint],
                  ["leaks", LeakPoints],
                  ["scenarios", Scenarios],
                  ["actions", CircularActions],
                  ["portfolio", AbatementPortfolio],
                  ["logistics", Logistics],
                  ["circular-network", CircularNetwork],
                  ["compliance", Compliance],
                  ["methodology", Methodology],
                ].map(([path, Page]) => {
                  const Component = Page as typeof Overview;
                  return (
                    <Route
                      key={path as string}
                      path={path as string}
                      element={
                        <Suspense fallback={<Skeleton />}>
                          <AssessmentGate>
                            <Component />
                          </AssessmentGate>
                        </Suspense>
                      }
                    />
                  );
                })}
                <Route
                  path="glass-demo"
                  element={
                    <Suspense fallback={<Skeleton />}>
                      <GlassDemo />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Empty
                      title="This module was not found"
                      description="Use the navigation to return to your workspace."
                    />
                  }
                />
              </Route>
            </Routes>
          </ConnectedWorkspace></SessionProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
