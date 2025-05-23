export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Total Banks</h2>
          <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Total Accounts</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">0</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Total Statements</h2>
          <p className="text-3xl font-bold text-purple-600 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="text-gray-500 text-center py-8">
          No recent activity
        </div>
      </div>
    </div>
  );
} 