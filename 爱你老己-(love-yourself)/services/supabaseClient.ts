import { createClient } from '@supabase/supabase-js';

// ⚠️ 已填入您的 Supabase 配置
const SUPABASE_URL = 'https://wjlnhqvukabelljszedp.supabase.co';
// ✅ 已更新为正确的 JWT Anon Key
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqbG5ocXZ1a2FiZWxsanN6ZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODEyNTksImV4cCI6MjA4NDc1NzI1OX0.w4IGhKFXedJkKsJ-OQlbPUccLacKTBssWngMyMzJhgo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to check connection
export const checkConnection = async () => {
    try {
        const { count, error } = await supabase.from('app_users').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Supabase connection failed:", e);
        return false;
    }
};