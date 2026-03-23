import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminData } from '@/hooks/useAdminData';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Clock, TrendingUp, CalendarDays, Loader2, ArrowLeft, Filter, X, Download, BarChart3 } from 'lucide-react';
import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import AdminRoleManager from '@/components/AdminRoleManager';

const transition = { type: "spring" as const, duration: 0.4, bounce: 0 };

export default function AdminDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, logs, stats, loading, filterMode, dateRange, applyFilter, filters, setFilters, availableReasons, availableColleges } = useAdminData();
  const navigate = useNavigate();
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const chartData = useMemo(() => {
    if (!logs.length) return [];
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    return days.map(day => {
      const dayStart = startOfDay(day);
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayLogs = logs.filter(l => {
        const d = new Date(l.checked_in_at);
        return d >= dayStart && d < nextDay;
      });
      return {
        date: format(day, 'MMM d'),
        student: dayLogs.filter(l => l.profile?.role === 'student').length,
        teacher: dayLogs.filter(l => l.profile?.role === 'teacher').length,
        staff: dayLogs.filter(l => l.profile?.role === 'staff').length,
        visitor: dayLogs.filter(l => l.profile?.role === 'visitor' || !l.profile?.role).length,
      };
    });
  }, [logs, dateRange]);

  const chartConfig = {
    student: { label: 'Students', color: 'hsl(var(--primary))' },
    teacher: { label: 'Teachers', color: 'hsl(25 95% 53%)' },
    staff: { label: 'Staff', color: 'hsl(142 71% 45%)' },
    visitor: { label: 'Visitors', color: 'hsl(262 83% 58%)' },
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const activeVisitors = logs.filter(l => !l.checked_out_at);

  const exportCSV = () => {
    const headers = ['Name', 'Role', 'College', 'Reason', 'Checked In', 'Checked Out', 'Status'];
    const rows = logs.map(log => [
      log.profile?.full_name || 'Unknown',
      log.profile?.role || '',
      log.profile?.college || '',
      log.reason,
      format(new Date(log.checked_in_at), 'yyyy-MM-dd HH:mm:ss'),
      log.checked_out_at ? format(new Date(log.checked_out_at), 'yyyy-MM-dd HH:mm:ss') : '',
      log.checked_out_at ? 'Completed' : 'Active',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setCalendarRange(range);
    if (range?.from && range?.to) {
      applyFilter('custom', range.from, range.to);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">NEU Library Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Visitor Statistics</h1>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Currently In', value: stats.currentlyIn, icon: <Users className="h-5 w-5" />, accent: true },
            { label: "Today's Visits", value: stats.totalVisitsToday, icon: <CalendarDays className="h-5 w-5" /> },
            { label: 'This Week', value: stats.totalVisitsWeek, icon: <TrendingUp className="h-5 w-5" /> },
            { label: 'Avg Duration', value: `${stats.avgDurationMinutes}m`, icon: <Clock className="h-5 w-5" /> },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: i * 0.05 }}
              className={cn(
                "rounded-2xl p-5",
                stat.accent ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              )}
              style={{ boxShadow: stat.accent ? undefined : 'var(--shadow-card)' }}
            >
              <div className={cn("mb-2", stat.accent ? "text-primary-foreground/70" : "text-muted-foreground")}>{stat.icon}</div>
              <p className={cn("text-2xl font-semibold tabular-nums", stat.accent ? "" : "")}>{stat.value}</p>
              <p className={cn("text-xs mt-0.5", stat.accent ? "text-primary-foreground/70" : "text-muted-foreground")}>{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            variant={filterMode === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyFilter('today')}
          >
            Today
          </Button>
          <Button
            variant={filterMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => applyFilter('week')}
          >
            This Week
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={filterMode === 'custom' ? 'default' : 'outline'}
                size="sm"
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                {filterMode === 'custom' && calendarRange?.from && calendarRange?.to
                  ? `${format(calendarRange.from, 'MMM d')} – ${format(calendarRange.to, 'MMM d')}`
                  : 'Custom Range'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={calendarRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Additional Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filter by:</span>
          </div>

          <Select
            value={filters.reason || '_all'}
            onValueChange={(v) => setFilters(f => ({ ...f, reason: v === '_all' ? '' : v }))}
          >
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Reasons</SelectItem>
              {availableReasons.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.college || '_all'}
            onValueChange={(v) => setFilters(f => ({ ...f, college: v === '_all' ? '' : v }))}
          >
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="All Colleges" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Colleges</SelectItem>
              {availableColleges.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="employee-filter"
              checked={filters.employeeOnly}
              onCheckedChange={(v) => setFilters(f => ({ ...f, employeeOnly: v }))}
            />
            <Label htmlFor="employee-filter" className="text-xs text-muted-foreground cursor-pointer">
              Employees only
            </Label>
          </div>

          {(filters.reason || filters.college || filters.employeeOnly) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => setFilters({ reason: '', college: '', employeeOnly: false })}
            >
              <X className="h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        {/* Daily Visits Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Daily Visit Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="student" stackId="a" fill="var(--color-student)" />
                    <Bar dataKey="teacher" stackId="a" fill="var(--color-teacher)" />
                    <Bar dataKey="staff" stackId="a" fill="var(--color-staff)" />
                    <Bar dataKey="visitor" stackId="a" fill="var(--color-visitor)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Currently Checked In */}
        {activeVisitors.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent-success animate-pulse" />
              Currently In Library ({activeVisitors.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeVisitors.map(log => (
                <div
                  key={log.id}
                  className="rounded-2xl bg-card p-4"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{log.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{log.profile?.role || '—'}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'hsl(var(--accent-success) / 0.1)', color: 'hsl(var(--accent-success))' }}>
                      Active
                    </span>
                  </div>
                  {log.profile?.college && (
                    <p className="text-xs text-muted-foreground mb-1">{log.profile.college}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    <span>{log.reason}</span>
                    <span className="tabular-nums">{format(new Date(log.checked_in_at), 'hh:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Visits Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Visit Log ({logs.length} visits)
            </h2>
            {logs.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No visits in the selected date range.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="rounded-xl bg-card px-4 py-3 flex items-center justify-between"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{log.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.reason} · {format(new Date(log.checked_in_at), 'MMM d, hh:mm a')}
                        {log.checked_out_at && ` → ${format(new Date(log.checked_out_at), 'hh:mm a')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground capitalize">{log.profile?.role || '—'}</span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      log.checked_out_at ? "bg-muted text-muted-foreground" : ""
                    )} style={!log.checked_out_at ? { backgroundColor: 'hsl(var(--accent-success) / 0.1)', color: 'hsl(var(--accent-success))' } : {}}>
                      {log.checked_out_at ? 'Completed' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Admin Role Management */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <AdminRoleManager />
        </motion.div>
      </main>
    </div>
  );
}
