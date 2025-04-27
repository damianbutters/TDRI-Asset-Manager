import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { TenantSelector } from "@/components/tenant-selector";

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", name: "Dashboard", icon: "tachometer-alt" },
    { path: "/road-assets", name: "Road Assets", icon: "road" },
    { path: "/asset-inventory", name: "Asset Inventory", icon: "clipboard-list" },
    { path: "/maintenance", name: "Maintenance", icon: "tools" },
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

      {/* Tenant selection control - positioned in the fixed part of the sidebar */}
      <div className="fixed bottom-20 left-0 w-64 z-10">
        <TenantSelector />
      </div>
      
      <div className="absolute bottom-0 w-64 border-t border-gray-200">
        <div className="flex items-center p-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <span className="text-gray-500">JR</span>
          </div>
          <div>
            <p className="text-sm font-medium">John Rodriguez</p>
            <p className="text-xs text-neutral-textSecondary">Road Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
