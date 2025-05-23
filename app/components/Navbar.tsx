'use client';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm h-16 flex items-center px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-800">Finance Manager</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <span className="text-xl">🔔</span>
        </button>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <span className="text-xl">👤</span>
        </button>
      </div>
    </nav>
  );
} 