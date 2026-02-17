import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const PROFILE_KEY = 'cpm_profile_id';

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export function useProfile() {
  const [profileId, setProfileId] = useState<string | null>(() => localStorage.getItem(PROFILE_KEY));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          // Profile was deleted or invalid
          localStorage.removeItem(PROFILE_KEY);
          setProfileId(null);
          setProfile(null);
        } else {
          setProfile(data as Profile);
        }
        setLoading(false);
      });
  }, [profileId]);

  const createProfile = async (displayName: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ display_name: displayName })
      .select()
      .single();
    if (error) throw error;
    const p = data as Profile;
    localStorage.setItem(PROFILE_KEY, p.id);
    setProfileId(p.id);
    setProfile(p);
    return p;
  };

  const logout = () => {
    localStorage.removeItem(PROFILE_KEY);
    setProfileId(null);
    setProfile(null);
  };

  return { profileId, profile, loading, createProfile, logout };
}
