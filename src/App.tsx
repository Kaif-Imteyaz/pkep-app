import React, { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ReflectionBoard } from './components/ReflectionBoard';
import { ResourceHub } from './components/ResourceHub';
import { Home } from './components/Home';
import { WhatsAppSettings } from './components/WhatsAppSettings';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Listen for view change events from the Home component
    const handleViewChange = (event: CustomEvent) => {
      setCurrentView(event.detail);
    };

    window.addEventListener('viewChange', handleViewChange as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('viewChange', handleViewChange as EventListener);
    };
  }, []);

  if (!session) {
    return <Auth />;
  }

  return (
    <Layout onViewChange={setCurrentView}>
      {currentView === 'home' && <Home />}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'reflection' && <ReflectionBoard />}
      {currentView === 'resources' && <ResourceHub />}
      {currentView === 'whatsapp' && <WhatsAppSettings />}
    </Layout>
  );
}