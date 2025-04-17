import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <Shield className="h-16 w-16 text-green-600 mb-8" />
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Home
      </Link>
    </div>
  );
}