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
  RiMenuUnfoldLine
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

  // Admin and Vendor both have access to dashboard, products, and orders
  const sharedLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: RiDashboardLine },
    { name: 'Products', href: '/dashboard/products', icon: RiShoppingBag3Line },
    { name: 'Orders', href: '/dashboard/orders', icon: RiFileList3Line },
  ];

  // Admin-specific links
  const adminLinks = [
    { name: 'Vendors', href: '/dashboard/vendors', icon: RiStore2Line },
    { name: 'Customers', href: '/dashboard/customers', icon: RiUser3Line },
    { name: 'Categories', href: '/dashboard/categories', icon: RiBarChartBoxLine },
    { name: 'Settings', href: '/dashboard/settings', icon: RiSettings4Line },
  ];

  // Vendor-specific links
  const vendorLinks = [
    { name: 'Store Profile', href: '/dashboard/store', icon: RiStore2Line },
    { name: 'Analytics', href: '/dashboard/analytics', icon: RiBarChartBoxLine },
    { name: 'Settings', href: '/dashboard/settings', icon: RiSettings4Line },
  ];

  const links = [
    ...sharedLinks,
    ...(userRole === 'admin' ? adminLinks : []),
    ...(userRole === 'vendor' ? vendorLinks : [])
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
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-lg transition duration-300 lg:static lg:inset-0 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-5">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2 font-bold text-xl text-blue-600"
            >
              <RiStore2Line className="h-6 w-6" />
              <span>Elanta</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
            >
              {sidebarOpen ? <RiMenuFoldLine className="h-6 w-6" /> : <RiMenuUnfoldLine className="h-6 w-6" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {links.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <link.icon className="mr-3 h-5 w-5" />
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Logout button */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => logout()}
              className="flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
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