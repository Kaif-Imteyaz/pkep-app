import React, { useEffect, useState } from 'react';
import { Calendar, Users, ArrowRight, FileText, BarChart, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { differenceInDays } from 'date-fns';

const BUDDY_PAIRS: Record<string, string> = {
  'test@punjab.gov.in': 'test2@punjab.gov.in',
  'test2@punjab.gov.in': 'test@punjab.gov.in',
  'test3@punjab.gov.in': 'test4@punjab.gov.in',
  'test4@punjab.gov.in': 'test3@punjab.gov.in'
};

const BUDDY_NAMES: Record<string, string> = {
  'test@punjab.gov.in': 'Amitabh Bachchan',
  'test2@punjab.gov.in': 'Dharmendra',
  'test3@punjab.gov.in': 'Rekha',
  'test4@punjab.gov.in': 'Sridevi'
};

export function Home() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [buddyName, setBuddyName] = useState<string | null>(null);
  const [meetingsCompleted] = useState(3);
  const [totalMeetings] = useState(5);
  const nextMeetingDate = new Date('2025-02-15T14:00:00');
  
  useEffect(() => {
    fetchBuddyInfo();
  }, []);

  const fetchBuddyInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return;

      setCurrentUser(BUDDY_NAMES[user.email]);
      
      const buddyEmail = BUDDY_PAIRS[user.email];
      if (buddyEmail) {
        setBuddyName(BUDDY_NAMES[buddyEmail]);
      }
    } catch (error) {
      console.error('Error fetching buddy info:', error);
    }
  };

  const handleNavigation = (view: string) => {
    const event = new CustomEvent('viewChange', { detail: view });
    window.dispatchEvent(event);
  };

  const daysUntilNextMeeting = differenceInDays(nextMeetingDate, new Date());

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold text-gray-900">Welcome back, {currentUser || 'Officer'}</h2>
        <p className="mt-2 text-gray-600">Your knowledge exchange journey continues today.</p>
        
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {meetingsCompleted} of {totalMeetings} meetings completed
            </span>
            <span className="text-sm font-medium text-indigo-600">
              {Math.round((meetingsCompleted / totalMeetings) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(meetingsCompleted / totalMeetings) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600">Keep up the momentum!</p>
        </div>
      </div>

      {/* Upcoming Meeting Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Peer Meeting</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center text-gray-600">
                <Calendar className="h-5 w-5 mr-3" />
                <span>February 15, 2025 at 2:00 PM IST</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="h-5 w-5 mr-3" />
                <span>Buddy: {buddyName || 'Loading...'}</span>
              </div>
              <div className="flex items-center text-indigo-600">
                <Clock className="h-5 w-5 mr-3" />
                <span className="font-medium">Next meeting in {daysUntilNextMeeting} days!</span>
              </div>
              <a 
                href="https://punjab.webex.com/meet/peer123"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700"
              >
                Join Webex Meeting <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Meetings</h3>
          <div className="space-y-4">
            <button 
              onClick={() => handleNavigation('reflection')} 
              className="w-full text-left block p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Reflection Notes</p>
                  <p className="text-sm text-gray-500">View your meeting reflections</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
          <div className="space-y-4">
            <button 
              onClick={() => handleNavigation('dashboard')} 
              className="w-full text-left block p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center">
                <BarChart className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Latest Performance Report</p>
                  <p className="text-sm text-gray-500">View your current metrics and progress</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}