import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AppRole = 'student' | 'teacher' | 'staff' | 'visitor';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: AppRole | null;
  college: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Pick<Profile, 'role' | 'college' | 'full_name'>>) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    if (!error) await fetchProfile();
    return { error };
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
