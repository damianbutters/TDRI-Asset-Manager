import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tenant } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Fetch all available tenants for the current user
  const {
    data: tenants = [],
    error,
    isLoading,
  } = useQuery<Tenant[], Error>({
    queryKey: ["/api/tenants"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set current tenant mutation
  const setCurrentTenantMutation = useMutation({
    mutationFn: async (tenantId: number | null) => {
      // Assuming we have a user ID 1 for now - in a real app this would come from auth
      const userId = 1;
      const res = await apiRequest("PUT", `/api/users/${userId}/current-tenant`, { tenantId });
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

  // Set initial current tenant if available and not already set
  useEffect(() => {
    if (tenants.length > 0 && !currentTenant) {
      // Start with the first tenant by default
      setCurrentTenant(tenants[0]);
    }
  }, [tenants, currentTenant]);

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