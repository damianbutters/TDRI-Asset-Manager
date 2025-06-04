import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route, useLocation } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import RoadAssets from "@/pages/RoadAssets";
import Maintenance from "@/pages/Maintenance";
import Policies from "@/pages/Policies";
import DeteriorationModels from "@/pages/DeteriorationModels";
import BudgetPlanning from "@/pages/BudgetPlanning";
import MapView from "@/pages/MapView";
import AuditLogs from "@/pages/AuditLogs";
import ImportExport from "@/pages/ImportExport";
import NotFound from "@/pages/not-found";
import AssetInventory from "@/pages/AssetInventory";
import UserManagement from "@/pages/UserManagement";
import MoistureHotspots from "@/pages/MoistureHotspots";
import AuthPage from "@/pages/AuthPage";
import { useState, useEffect } from "react";
import { TenantProvider } from "@/hooks/use-tenant";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const isAuthPage = location === "/auth";

  // Redirect to auth page if user is not authenticated and not already on auth page
  useEffect(() => {
    if (!isLoading && !user && !isAuthPage) {
      setLocation("/auth");
    }
  }, [user, isLoading, isAuthPage, setLocation]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!user && !isAuthPage) {
    return null; // Will redirect via useEffect
  }

  return (
    <TenantProvider>
      {isAuthPage ? (
        <Route path="/auth" component={AuthPage} />
      ) : (
        <div className="flex h-screen overflow-hidden bg-neutral-bg text-neutral-text">
          {/* Sidebar */}
          <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

          {/* Mobile header */}
          <div className="md:hidden w-full bg-white shadow-md fixed top-0 z-40">
            <div className="flex items-center justify-between p-4">
              <h1 className="text-xl font-semibold text-primary">TDRIPlanner</h1>
              <button 
                className="text-neutral-text focus:outline-none"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main content area */}
          <main className="flex-1 overflow-y-auto pt-0 md:pt-0 pb-16 md:pb-0 mt-16 md:mt-0">
            <Toaster />
            <Switch>
              <ProtectedRoute path="/" component={Dashboard} />
              <ProtectedRoute path="/road-assets" component={RoadAssets} />
              <ProtectedRoute path="/maintenance" component={Maintenance} />
              <ProtectedRoute path="/policies" component={Policies} />
              <ProtectedRoute path="/deterioration-models" component={DeteriorationModels} />
              <ProtectedRoute path="/budget-planning" component={BudgetPlanning} />
              <ProtectedRoute path="/map-view" component={MapView} />
              <ProtectedRoute path="/moisture-hotspots" component={MoistureHotspots} />
              <ProtectedRoute path="/import-export" component={ImportExport} />
              <ProtectedRoute path="/audit-logs" component={AuditLogs} />
              <ProtectedRoute path="/asset-inventory" component={AssetInventory} />
              <ProtectedRoute path="/user-management" component={UserManagement} />
              <Route path="/auth" component={AuthPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      )}
    </TenantProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;