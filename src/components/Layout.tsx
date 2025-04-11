import React, { useState } from 'react';
import { Menu, LogOut, Home, BookOpen, ClipboardList, X, LayoutDashboard, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Layout({ children, onViewChange }: { children: React.ReactNode; onViewChange: (view: string) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error('Sign out failed:', err);
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Service Metrics', icon: LayoutDashboard },
    { id: 'reflection', label: 'Reflection Board', icon: ClipboardList },
    { id: 'resources', label: 'Resource Hub', icon: BookOpen },
    { id: 'whatsapp', label: 'WhatsApp Settings', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Peer Knowledge Exchange Platform
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Department of Governance Reforms, Govt. of Punjab x Indian School of Business Initiative
            </p>
          </div>
          
          <nav className="flex items-center justify-between mt-4">
            <div className="hidden sm:flex items-center space-x-6">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onViewChange(id)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleSignOut}
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </button>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>

          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 pb-4">
              <div className="flex flex-col space-y-4">
                {navItems.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      onViewChange(id);
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 inline mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">About</h3>
              <p className="mt-2 text-sm text-gray-600">
                A collaborative initiative to enhance public service delivery through peer learning and knowledge exchange.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>Department of Governance Reforms</p>
                <p>Plot No. D-241, Industrial Area,</p>
                <p>Phase-8B, Sector - 74,</p>
                <p>Mohali - 160062</p>
                <a 
                  href="https://dgrpg.punjab.gov.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                >
                  dgrpg.punjab.gov.in
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Support</h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>Helpline: 0172-2970911</p>
                <p>Email: support@pkep.punjab.gov.in</p>
                <p className="mt-2">For technical assistance and feedback, please contact our support team.</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm text-center text-gray-500">
              © {new Date().getFullYear()} Department of Governance Reforms. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}