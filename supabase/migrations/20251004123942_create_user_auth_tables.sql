-- Add timestamps to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Add updated_at to rooms table
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Add created_at to chats table
ALTER TABLE public.chats 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL;

-- Add ON DELETE CASCADE to foreign keys
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS fk_admin;
ALTER TABLE public.rooms ADD CONSTRAINT fk_admin 
    FOREIGN KEY(admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS fk_room;
ALTER TABLE public.chats ADD CONSTRAINT fk_room 
    FOREIGN KEY(room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS fk_user;
ALTER TABLE public.chats ADD CONSTRAINT fk_user 
    FOREIGN KEY(user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON public.rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_admin ON public.rooms(admin_id);
CREATE INDEX IF NOT EXISTS idx_chats_room_id ON public.chats(room_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_room_created ON public.chats(room_id, created_at DESC);

-- Add trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at 
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();