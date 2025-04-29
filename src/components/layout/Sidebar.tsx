import { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiDashboardLine, 
  RiShoppingBag3Line, 
  RiUser3Line, 
  RiSettings4Line, 
  RiStore2Line, 
  RiFileList3Line, 
  RiBarChartBoxLine,
  RiLogoutBoxLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiArchiveLine,
  RiPriceTag3Line,
  RiMoneyDollarCircleLine,
  RiTruckLine,
  RiLineChartLine,
  RiStoreLine,
  RiCustomerServiceLine,
  RiGlobalLine
} from 'react-icons/ri';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  userRole?: User['role'];
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, userRole }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  // Common links for all admin users
  const commonLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: RiDashboardLine },
    { name: 'Products', href: '/dashboard/products', icon: RiShoppingBag3Line },
    { name: 'Orders', href: '/dashboard/orders', icon: RiFileList3Line },
    { name: 'Inventory', href: '/dashboard/inventory', icon: RiArchiveLine },
    { name: 'Shipping', href: '/dashboard/shipping', icon: RiTruckLine },
  ];

  // Admin-specific links
  const adminLinks = [
    { name: 'Customers', href: '/dashboard/customers', icon: RiUser3Line },
    { name: 'Categories', href: '/dashboard/categories', icon: RiBarChartBoxLine },
    { name: 'Promotions', href: '/dashboard/promotions', icon: RiPriceTag3Line },
    { name: 'Store Profile', href: '/dashboard/settings/store', icon: RiStore2Line },
    { name: 'Analytics', href: '/dashboard/analytics', icon: RiLineChartLine },
    { name: 'Support', href: '/dashboard/support', icon: RiCustomerServiceLine },
    { name: 'Settings', href: '/dashboard/settings', icon: RiSettings4Line },
    { name: 'Currencies', href: '/dashboard/settings/currencies', icon: RiMoneyDollarCircleLine },
  ];

  const links = [
    ...commonLinks,
    ...(userRole === 'admin' ? adminLinks : []),
  ];

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-sidebar border-r border-sidebar-border shadow-lg transition duration-300 lg:static lg:inset-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-5">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 font-bold text-xl text-sidebar-primary"
            >
              <RiGlobalLine className="h-6 w-6" />
              <span>Elanta</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
            >
              {sidebarOpen ? <RiMenuFoldLine className="h-6 w-6" /> : <RiMenuUnfoldLine className="h-6 w-6" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <link.icon className="mr-3 h-5 w-5" />
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Logout button */}
          <div className="border-t border-sidebar-border p-4">
            <button
              onClick={() => logout()}
              className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50"
            >
              <RiLogoutBoxLine className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 