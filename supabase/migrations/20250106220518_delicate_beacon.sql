/*
  # Create notes table for reflection board

  1. New Tables
    - `notes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `type` (text, enum of rose/thorn/bud)
      - `content` (text)
      - `created_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `notes` table
    - Add policies for authenticated users to:
      - Read all notes
      - Create their own notes
      - Update their own notes
      - Delete their own notes
*/

CREATE TYPE note_type AS ENUM ('rose', 'thorn', 'bud');

CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type note_type NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Allow users to read all notes
CREATE POLICY "Anyone can read notes"
  ON notes
  FOR SELECT
  USING (true);

-- Allow authenticated users to create their own notes
CREATE POLICY "Users can create their own notes"
  ON notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own notes
CREATE POLICY "Users can update their own notes"
  ON notes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own notes
CREATE POLICY "Users can delete their own notes"
  ON notes
  FOR DELETE
  USING (auth.uid() = user_id);