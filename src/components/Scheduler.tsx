import React from 'react';
import { Calendar as CalendarIcon, Clock, Users } from 'lucide-react';

export function Scheduler() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Meeting Scheduler</h2>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-indigo-600 mr-2" />
            <span className="font-medium">Upcoming Meetings</span>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Schedule New
          </button>
        </div>

        <div className="space-y-4">
          <MeetingCard
            title="Team Sync"
            time="10:00 AM - 11:00 AM"
            attendees={4}
          />
          <MeetingCard
            title="Project Review"
            time="2:00 PM - 3:30 PM"
            attendees={6}
          />
          <MeetingCard
            title="Knowledge Sharing"
            time="4:00 PM - 5:00 PM"
            attendees={8}
          />
        </div>
      </div>
    </div>
  );
}

function MeetingCard({ 
  title, 
  time, 
  attendees 
}: { 
  title: string; 
  time: string; 
  attendees: number;
}) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
      <div className="flex items-center text-sm text-gray-500">
        <Clock className="h-4 w-4 mr-1" />
        <span className="mr-4">{time}</span>
        <Users className="h-4 w-4 mr-1" />
        <span>{attendees} attendees</span>
      </div>
    </div>
  );
}