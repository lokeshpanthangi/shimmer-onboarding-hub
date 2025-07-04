
import React, { useState } from 'react';
import HRPortal from '../components/HRPortal';
import EmployeePortal from '../components/EmployeePortal';
import { Users, MessageCircle } from 'lucide-react';

const Index = () => {
  const [activeInterface, setActiveInterface] = useState<'hr' | 'employee'>('hr');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in">
            HR Onboarding Assistant
          </h1>
          <p className="text-white/80 text-lg animate-fade-in">
            Streamline your HR processes with AI-powered assistance
          </p>
        </div>

        {/* Interface Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-full p-2 border border-white/20 animate-scale-in">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveInterface('hr')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                  activeInterface === 'hr'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="font-medium">HR Portal</span>
              </button>
              <button
                onClick={() => setActiveInterface('employee')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-full transition-all duration-300 ${
                  activeInterface === 'employee'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="font-medium">Employee Portal</span>
              </button>
            </div>
          </div>
        </div>

        {/* Interface Content */}
        <div className="max-w-6xl mx-auto">
          {activeInterface === 'hr' ? <HRPortal /> : <EmployeePortal />}
        </div>
      </div>
    </div>
  );
};

export default Index;
