import { useEffect } from "react";
import { Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: React.ComponentType;
}) {
  const [_, setLocation] = useLocation();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/auth/user", { signal });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Not authenticated");
        }
        throw new Error("Failed to fetch user");
      }
      return await res.json();
    },
    retry: 1,
  });

  useEffect(() => {
    if (error && !isLoading) {
      // Redirect to login if not authenticated
      setLocation("/auth");
    }
  }, [error, isLoading, setLocation]);

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : user ? (
        <Component />
      ) : null}
    </Route>
  );
}