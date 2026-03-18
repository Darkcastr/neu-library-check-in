import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VisitLog {
  id: string;
  user_id: string;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
}

export function useVisitLogs(userId: string | undefined) {
  const [logs, setLogs] = useState<VisitLog[]>([]);
  const [activeLog, setActiveLog] = useState<VisitLog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('visit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false })
      .limit(20);
    
    const logs = data ?? [];
    setLogs(logs);
    setActiveLog(logs.find(l => !l.checked_out_at) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const checkIn = async (reason: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('visit_logs')
      .insert({ user_id: userId, reason });
    if (!error) await fetchLogs();
    return { error };
  };

  const checkOut = async () => {
    if (!activeLog) return;
    const { error } = await supabase
      .from('visit_logs')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', activeLog.id);
    if (!error) await fetchLogs();
    return { error };
  };

  return { logs, activeLog, loading, checkIn, checkOut, refetch: fetchLogs };
}
