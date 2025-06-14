'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RiMenuLine, 
  RiNotification3Line, 
  RiUserLine
} from 'react-icons/ri';

export default function Navbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setShowProfileMenu(false);
    router.push('/login-signup');
  };

  return (
    <>
      <nav className={`h-16 flex items-center px-4 md:px-6 bg-white/60 backdrop-blur-xl border-b border-blue-100 transition-all duration-300 ${isMobile ? 'fixed top-0 left-0 w-full z-40' : ''}`}>
        {isMobile ? (
          <>
            <button
              className="mr-2 p-2 md:hidden"
              aria-label="Open sidebar"
            >
              <RiMenuLine size={28} />
            </button>
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent drop-shadow-lg select-none">
                Brmh Fintech
              </h1>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent drop-shadow-lg select-none">
              Brmh Fintech
            </h1>
          </div>
        )}
        <div className="flex items-center space-x-2 md:space-x-4">
          <button className="p-2 rounded-full hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-colors duration-200 relative group shadow-sm">
            <RiNotification3Line className="text-xl text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-md border-2 border-white"></span>
          </button>
          <div className="relative">
            <button
              className="p-2 rounded-full hover:bg-blue-100 focus:ring-2 focus:ring-blue-400 transition-colors duration-200 group shadow-sm"
              onClick={() => setShowProfileMenu((v) => !v)}
            >
              <RiUserLine className="text-xl text-gray-600 group-hover:text-blue-600 transition-colors duration-200" />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-50">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-red-600 font-semibold rounded"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {isMobile && <div className="h-16 w-full" />}
    </>
  );
} 