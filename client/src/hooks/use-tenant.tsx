import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tenant } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "./use-auth";

type TenantContextType = {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  isLoading: boolean;
  setCurrentTenant: (tenantId: number | null) => void;
  error: Error | null;
};

export const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Fetch all available tenants for the current user
  const {
    data: tenants = [],
    error,
    isLoading,
  } = useQuery<Tenant[], Error>({
    queryKey: ["/api/tenants"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Set current tenant mutation
  const setCurrentTenantMutation = useMutation({
    mutationFn: async (tenantId: number | null) => {
      if (!user) throw new Error("User not authenticated");
      const res = await apiRequest("PUT", `/api/users/${user.id}/current-tenant`, { tenantId });
      return await res.json();
    },
    onSuccess: () => {
      if (currentTenant) {
        toast({
          title: "Tenant Changed",
          description: `You are now viewing data for ${currentTenant.name}`,
        });
      } else {
        toast({
          title: "Tenant Cleared",
          description: "You are now viewing data for all tenants",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle setting the current tenant
  const handleSetCurrentTenant = (tenantId: number | null) => {
    const selected = tenantId ? tenants.find(t => t.id === tenantId) || null : null;
    setCurrentTenant(selected);
    setCurrentTenantMutation.mutate(tenantId);
  };

  // Set initial current tenant based on user's currentTenantId
  useEffect(() => {
    if (user && tenants.length > 0 && !currentTenant) {
      if (user.currentTenantId) {
        const userCurrentTenant = tenants.find(t => t.id === user.currentTenantId);
        if (userCurrentTenant) {
          setCurrentTenant(userCurrentTenant);
        } else {
          // Fallback to first tenant if user's current tenant not found
          setCurrentTenant(tenants[0]);
        }
      } else {
        // No current tenant set, use first available
        setCurrentTenant(tenants[0]);
      }
    }
  }, [user, tenants, currentTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenants,
        currentTenant,
        isLoading,
        setCurrentTenant: handleSetCurrentTenant,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}