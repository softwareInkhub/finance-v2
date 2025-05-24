'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Banks', path: '/banks', icon: '🏦' },
    { name: 'Tags', path: '/tags', icon: '🏷️' },
  ];

  return (
    <div className={`bg-gray-800 text-white h-screen transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 flex justify-between items-center">
        {!isCollapsed && <h1 className="text-xl font-bold">Finance App</h1>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded hover:bg-gray-700"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="mt-8">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center p-4 hover:bg-gray-700 ${
              pathname === item.path ? 'bg-gray-700' : ''
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && <span className="ml-4">{item.name}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
} 