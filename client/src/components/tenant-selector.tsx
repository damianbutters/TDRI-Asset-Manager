import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTenant } from "@/hooks/use-tenant";
import { Skeleton } from "@/components/ui/skeleton";

export function TenantSelector() {
  const { tenants = [], currentTenant, setCurrentTenant, isLoading, error } = useTenant();

  if (isLoading) {
    return (
      <div className="px-4 py-3 border-t border-gray-200">
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-neutral-muted mb-1.5">Current Tenant</p>
        <div className="text-sm text-red-500 italic">
          Error loading tenants
        </div>
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-neutral-muted mb-1.5">Current Tenant</p>
        <div className="text-sm text-neutral-muted italic">No tenants available</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-gray-200">
      <p className="text-xs text-neutral-muted mb-1.5">Current Tenant</p>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {currentTenant ? currentTenant.name : "Select tenant..."}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 z-50" align="start" side="top">
          <Command>
            <CommandInput placeholder="Search tenant..." className="h-9" />
            <CommandEmpty>No tenant found.</CommandEmpty>
            <CommandGroup>
              {tenants.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  onSelect={() => setCurrentTenant(tenant.id)}
                  className="cursor-pointer"
                >
                  {tenant.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentTenant?.id === tenant.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}