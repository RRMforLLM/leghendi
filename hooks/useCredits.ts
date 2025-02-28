import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useCredits() {
  const [credits, setCredits] = useState(0);

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('User Credit')
        .select('amount')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCredits(data.amount || 0);
      return data.amount || 0;
    } catch (error) {
      console.error('Error fetching credits:', error);
      return 0;
    }
  }, []);

  return {
    credits,
    setCredits,
    fetchCredits
  };
}
