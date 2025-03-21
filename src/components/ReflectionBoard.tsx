import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Note = {
  id: string;
  type: 'rose' | 'thorn' | 'bud';
  content: string;
  created_at: string;
  user_id: string;
};

function NoteSection({ 
  title,
  description, 
  type,
  color, 
  notes,
  active,
  onSelect,
  onDelete,
  currentUser
}: { 
  title: string;
  description: string;
  type: string;
  color: string;
  notes: Note[];
  active: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
  currentUser: string | null;
}) {
  return (
    <div 
      className={`bg-white p-6 rounded-xl shadow-sm transition-all duration-200 cursor-pointer border-2 ${
        active ? `border-[${color}]` : 'border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-4">
        {notes.map((note) => (
          <div 
            key={note.id} 
            className="p-4 rounded-lg bg-gray-50 group hover:bg-gray-100 transition-colors duration-200"
          >
            <p className="text-gray-800">{note.content}</p>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
              {currentUser === note.user_id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No notes yet</p>
        )}
      </div>
    </div>
  );
}

export function ReflectionBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [activeType, setActiveType] = useState<'rose' | 'thorn' | 'bud'>('rose');
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user?.id || null);
  };

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      setNotes(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !currentUser) return;

    const { data, error } = await supabase
      .from('notes')
      .insert([
        {
          type: activeType,
          content: newNote.trim(),
          user_id: currentUser
        },
      ])
      .select();

    if (error) {
      console.error('Error adding note:', error);
      return;
    }

    if (data) {
      setNotes([...notes, data[0]]);
      setNewNote('');
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .match({ id });

    if (error) {
      console.error('Error deleting note:', error);
      return;
    }

    setNotes(notes.filter(note => note.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reflection Board</h1>
        <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
          Share your experiences and insights with fellow officers. Together we grow stronger.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NoteSection
          title="🌹 Roses"
          description="Success Stories"
          type="rose"
          color="#4ade80"
          notes={notes.filter(n => n.type === 'rose')}
          active={activeType === 'rose'}
          onSelect={() => setActiveType('rose')}
          onDelete={deleteNote}
          currentUser={currentUser}
        />
        <NoteSection
          title="🌵 Thorns"
          description="Challenges"
          type="thorn"
          color="#f87171"
          notes={notes.filter(n => n.type === 'thorn')}
          active={activeType === 'thorn'}
          onSelect={() => setActiveType('thorn')}
          onDelete={deleteNote}
          currentUser={currentUser}
        />
        <NoteSection
          title="🌱 Buds"
          description="Opportunities"
          type="bud"
          color="#facc15"
          notes={notes.filter(n => n.type === 'bud')}
          active={activeType === 'bud'}
          onSelect={() => setActiveType('bud')}
          onDelete={deleteNote}
          currentUser={currentUser}
        />
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Select a category to add your reflection..."
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={3}
          />
          <button
            onClick={addNote}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 flex items-center h-fit"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}