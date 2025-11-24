// Supabase Configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://czzmxuruiziuqtrhaqrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6em14dXJ1aXppdXF0cmhhcXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzM2NzYsImV4cCI6MjA3OTU0OTY3Nn0.LpqMascZS1IKX2RqlpWspwcf5w3RoS5VrMePzqOd0AA';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
