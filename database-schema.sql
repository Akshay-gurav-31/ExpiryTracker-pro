-- Expiry Date Tracker Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expiry Items Table
CREATE TABLE IF NOT EXISTS expiry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    expiry_date DATE NOT NULL,
    image_url TEXT,
    notes TEXT,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expiry_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Expiry Items Policies
CREATE POLICY "Users can view their own items"
    ON expiry_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
    ON expiry_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
    ON expiry_items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
    ON expiry_items FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expiry_items_updated_at
    BEFORE UPDATE ON expiry_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage Buckets Setup
-- Note: Run these commands in Supabase SQL Editor to create buckets and policies

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('items', 'items', true),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'items' bucket

-- Allow users to upload items to their own folder
CREATE POLICY "Users can upload their own items"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'items' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to update their own items
CREATE POLICY "Users can update their own items"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'items' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own items
CREATE POLICY "Users can delete their own items"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'items' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public read access to items
CREATE POLICY "Items are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'items');

-- Storage Policies for 'avatars' bucket

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expiry_items_user_id ON expiry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_expiry_items_expiry_date ON expiry_items(expiry_date);
CREATE INDEX IF NOT EXISTS idx_expiry_items_created_at ON expiry_items(created_at);
