import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as lucide from 'lucide-react';
import { SafetyReport } from './SafetyReport';

export function NewSafetyReport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              <lucide.ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">New Safety Report</h1>
          </div>
        </div>

        {/* Report Form */}
        <SafetyReport mode="create" />
      </div>
    </div>
  );
}