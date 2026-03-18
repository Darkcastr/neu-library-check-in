import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AdminVisitLog {
  id: string;
  user_id: string;
  reason: string;
  checked_in_at: string;
  checked_out_at: string | null;
  profile?: {
    full_name: string;
    role: string | null;
    college: string | null;
  };
}

export interface AdminStats {
  totalVisitsToday: number;
  currentlyIn: number;
  totalVisitsWeek: number;
  avgDurationMinutes: number;
}

export function useAdminData() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<AdminVisitLog[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalVisitsToday: 0, currentlyIn: 0, totalVisitsWeek: 0, avgDurationMinutes: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: new Date(),
  });
  const [filterMode, setFilterMode] = useState<'today' | 'week' | 'custom'>('today');

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, dateRange]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch all visit logs in date range
    const { data: visitData } = await supabase
      .from('visit_logs')
      .select('*')
      .gte('checked_in_at', dateRange.from.toISOString())
      .lte('checked_in_at', dateRange.to.toISOString())
      .order('checked_in_at', { ascending: false });

    // Fetch all profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id, full_name, role, college');

    const profileMap = new Map(
      (profileData ?? []).map(p => [p.user_id, p])
    );

    const enrichedLogs: AdminVisitLog[] = (visitData ?? []).map(log => ({
      ...log,
      profile: profileMap.get(log.user_id) ?? undefined,
    }));

    setLogs(enrichedLogs);

    // Currently checked in (all time, no date filter)
    const { data: activeData } = await supabase
      .from('visit_logs')
      .select('id')
      .is('checked_out_at', null);

    const currentlyIn = activeData?.length ?? 0;

    // Compute stats
    const today = startOfDay(new Date());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayLogs = enrichedLogs.filter(l => new Date(l.checked_in_at) >= today);
    const weekLogs = enrichedLogs.filter(l => new Date(l.checked_in_at) >= weekAgo);

    const completedLogs = enrichedLogs.filter(l => l.checked_out_at);
    const totalDuration = completedLogs.reduce((sum, l) => {
      return sum + (new Date(l.checked_out_at!).getTime() - new Date(l.checked_in_at).getTime());
    }, 0);
    const avgDuration = completedLogs.length > 0 ? totalDuration / completedLogs.length / 60000 : 0;

    setStats({
      totalVisitsToday: todayLogs.length,
      currentlyIn,
      totalVisitsWeek: weekLogs.length,
      avgDurationMinutes: Math.round(avgDuration),
    });

    setLoading(false);
  };

  const applyFilter = (mode: 'today' | 'week' | 'custom', from?: Date, to?: Date) => {
    setFilterMode(mode);
    if (mode === 'today') {
      setDateRange({ from: startOfDay(new Date()), to: new Date() });
    } else if (mode === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      setDateRange({ from: startOfDay(weekAgo), to: new Date() });
    } else if (from && to) {
      setDateRange({ from: startOfDay(from), to: endOfDay(to) });
    }
  };

  return { isAdmin, logs, stats, loading, filterMode, dateRange, applyFilter, refetch: fetchData };
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
