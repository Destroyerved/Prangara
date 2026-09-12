import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { WorkspaceProvider } from "../hooks/useWorkspace";
import Shell from "../components/shell/Shell";
import AssessmentGate from "../components/ui/AssessmentGate";
import { Skeleton, Empty } from "../components/ui/common";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
const Overview = lazy(() => import("../pages/Overview"));
const PlantData = lazy(() => import("../pages/PlantData"));
const Footprint = lazy(() => import("../pages/Footprint"));
const LeakPoints = lazy(() => import("../pages/LeakPoints"));
const CircularActions = lazy(() => import("../pages/CircularActions"));
const AbatementPortfolio = lazy(() => import("../pages/AbatementPortfolio"));
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
          <WorkspaceProvider>
            <Routes>
              <Route element={<Shell />}>
                <Route index element={<Navigate to="/overview" replace />} />
                {[
                  ["overview", Overview],
                  ["assessment", PlantData],
                  ["footprint", Footprint],
                  ["leaks", LeakPoints],
                  ["actions", CircularActions],
                  ["portfolio", AbatementPortfolio],
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
          </WorkspaceProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
