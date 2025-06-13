-- Create a simple users table for storing authenticated users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    google_id VARCHAR(255) UNIQUE,
    provider VARCHAR(50) DEFAULT 'google',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create table for tracking user tasks/comments
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'github', 'slack', 'jira'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    element_info TEXT, -- Information about the DOM element
    dom_path TEXT, -- DOM path of the element
    page_url TEXT, -- URL where comment was made
    external_id TEXT, -- ID from external platform (issue number, message ts, etc.)
    external_url TEXT, -- URL to the external platform item
    metadata JSONB DEFAULT '{}', -- Additional metadata (screenshots, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tasks_id UUID REFERENCES tasks(id) ON DELETE CASCADE, -- Changed from task_id to tasks_id
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    content_type TEXT DEFAULT 'image/png',
    upload_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_platform ON tasks(platform);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_screenshots_tasks_id ON screenshots(tasks_id); -- Changed from task_id to tasks_id
CREATE INDEX IF NOT EXISTS idx_screenshots_user_id ON screenshots(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_screenshots_updated_at ON screenshots;

-- Create triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_screenshots_updated_at 
    BEFORE UPDATE ON screenshots 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own screenshots" ON screenshots;
DROP POLICY IF EXISTS "Users can insert own screenshots" ON screenshots;
DROP POLICY IF EXISTS "Users can update own screenshots" ON screenshots;
DROP POLICY IF EXISTS "Users can delete own screenshots" ON screenshots;

-- Create policies
CREATE POLICY "Allow all operations on users" ON users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tasks" ON tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own screenshots" ON screenshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots" ON screenshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own screenshots" ON screenshots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenshots" ON screenshots
    FOR DELETE USING (auth.uid() = user_id);

-- Alternative policy to allow access via task ownership (can be used instead of the above)
CREATE POLICY "Users can access screenshots via task ownership" ON screenshots
    FOR ALL USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = screenshots.tasks_id AND tasks.user_id = auth.uid())); -- Changed from task_id to tasks_id

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON users TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
GRANT ALL ON screenshots TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;