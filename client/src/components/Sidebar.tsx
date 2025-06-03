import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { TenantSelector } from "@/components/tenant-selector";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  const navItems = [
    { path: "/", name: "Dashboard", icon: "tachometer-alt" },
    { path: "/road-assets", name: "Road Assets", icon: "road" },
    { path: "/asset-inventory", name: "Asset Inventory", icon: "clipboard-list" },
    { path: "/maintenance", name: "Maintenance", icon: "tools" },
    { path: "/moisture-hotspots", name: "Moisture Hotspots", icon: "water" },
    { path: "/policies", name: "Policies", icon: "file-alt" },
    { path: "/deterioration-models", name: "Deterioration Models", icon: "chart-line" },
    { path: "/budget-planning", name: "Budget Planning", icon: "money-bill-wave" },
    { path: "/map-view", name: "Map View", icon: "map-marked-alt" },
    { path: "/import-export", name: "Import/Export", icon: "file-import" },
    { path: "/audit-logs", name: "Audit Logs", icon: "history" },
    { path: "/user-management", name: "User Management", icon: "users-cog" },
  ];

  const closeMobileMenu = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <aside 
      className={cn(
        "w-64 bg-white shadow-md h-full",
        "md:block transition-all duration-300 ease-in-out z-50",
        mobileMenuOpen 
          ? "fixed inset-0 w-64" 
          : "hidden md:block"
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-primary">Road Asset Manager</h1>
      </div>
      <nav className="mt-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link 
                href={item.path}
                onClick={closeMobileMenu}
                className={cn(
                  "flex items-center px-4 py-3",
                  location === item.path 
                    ? "text-primary bg-blue-50 border-l-4 border-primary" 
                    : "text-neutral-textSecondary hover:bg-blue-50 hover:text-primary"
                )}
              >
                <i className={`fas fa-${item.icon} w-6`} aria-hidden="true"></i>
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Tenant selection control - positioned above user section */}
      <div className="absolute bottom-32 left-0 w-64 p-4 border-t border-gray-200">
        <TenantSelector />
      </div>
      
      <div className="absolute bottom-0 w-64 border-t border-gray-200">
        <div className="p-4 space-y-3">
          {/* User Information */}
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.username || 'Guest User'}
              </p>
              <p className="text-xs text-neutral-textSecondary">
                Road Manager
              </p>
            </div>
          </div>
          
          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
}
