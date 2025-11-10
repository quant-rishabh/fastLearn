'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-4">
          🧪 Test Page
        </h1>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <p className="text-gray-300 mb-4">
            This is a simple test page to check if basic pages load without issues.
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>✅ Page loaded successfully</p>
            <p>✅ No API calls made</p>
            <p>✅ No external dependencies</p>
            <p>✅ Pure HTML/CSS/React</p>
          </div>
          <div className="mt-6">
            <a
              href="/workout/weight-demo-simple"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-block"
            >
              Go to Weight Demo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}