import { Dispatch, SetStateAction, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  RiMenuLine,
  RiNotification3Line,
  RiUser3Line,
  RiSettings4Line,
  RiLogoutBoxLine
} from 'react-icons/ri';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  user: User | null;
}

export default function Header({ sidebarOpen, setSidebarOpen, user }: HeaderProps) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left section with menu button */}
        <div className="flex items-center lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <RiMenuLine className="h-6 w-6" />
          </button>
        </div>

        {/* Right section with notifications and profile */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="relative rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Notifications"
          >
            <RiNotification3Line className="h-6 w-6" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {/* Profile dropdown */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center space-x-3 rounded-full p-1 hover:bg-gray-100 focus:outline-none">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <RiUser3Line className="h-full w-full p-1.5 text-gray-500" />
                )}
              </div>
              <span className="hidden text-sm font-medium text-gray-700 md:block">
                {user?.displayName || 'User'}
              </span>
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard/profile"
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <RiUser3Line className="mr-3 h-5 w-5 text-gray-500" />
                      Your Profile
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      href="/dashboard/settings"
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <RiSettings4Line className="mr-3 h-5 w-5 text-gray-500" />
                      Settings
                    </Link>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => logout()}
                      className={`${
                        active ? 'bg-gray-100' : ''
                      } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <RiLogoutBoxLine className="mr-3 h-5 w-5 text-gray-500" />
                      Logout
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
} 