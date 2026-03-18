import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useVisitLogs } from '@/hooks/useVisitLogs';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Clock, BookOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const transition = { type: "spring" as const, duration: 0.4, bounce: 0 };

const visitReasons = [
  'Study',
  'Research',
  'Book Return',
  'Book Borrow',
  'Meeting',
  'Other',
];

function ElapsedTime({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const start = new Date(since).getTime();
    const tick = () => {
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span className="font-semibold tabular-nums text-4xl text-foreground">{elapsed}</span>;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const { logs, activeLog, checkIn, checkOut } = useVisitLogs(user?.id);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCheckIn = async () => {
    if (!reason) {
      toast.error('Please select a reason for your visit.');
      return;
    }
    setSubmitting(true);
    const result = await checkIn(reason);
    if (result?.error) toast.error('Failed to check in.');
    else {
      toast.success('Checked in successfully!');
      setReason('');
    }
    setSubmitting(false);
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    const result = await checkOut();
    if (result?.error) toast.error('Failed to check out.');
    else toast.success('Checked out. See you next time!');
    setSubmitting(false);
  };

  const greeting = profile?.role === 'student'
    ? 'Welcome to NEU Library!'
    : `Welcome, ${profile?.full_name || 'User'}!`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm text-foreground">NEU Library</span>
          </div>
          <button onClick={signOut} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={transition}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{greeting}</h1>
          {profile?.role === 'student' && profile.college && (
            <p className="text-sm text-muted-foreground mt-0.5">{profile.college}</p>
          )}
        </motion.div>

        {/* Check-in / Active state */}
        <AnimatePresence mode="wait">
          {activeLog ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={transition}
              className="mt-6 rounded-2xl bg-card p-6 text-center"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-accent-success/10 px-3 py-1 mb-4">
                <span className="h-2 w-2 rounded-full bg-accent-success animate-pulse" />
                <span className="text-xs font-medium" style={{ color: 'hsl(var(--accent-success))' }}>Currently In</span>
              </div>

              <p className="text-sm text-muted-foreground mb-1">Time Elapsed</p>
              <ElapsedTime since={activeLog.checked_in_at} />

              <p className="text-xs text-muted-foreground mt-3">
                Checked in at {format(new Date(activeLog.checked_in_at), 'hh:mm a')} · {activeLog.reason}
              </p>

              <Button
                variant="check-out"
                size="lg"
                className="w-full mt-6"
                onClick={handleCheckOut}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Out'}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="check-in"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={transition}
              className="mt-6 rounded-2xl bg-card p-6"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Reason for Visit
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Please select your reason for visiting today.</option>
                {visitReasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              <Button
                size="lg"
                className="w-full mt-4"
                onClick={handleCheckIn}
                disabled={submitting || !reason}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check In'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visit History */}
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Visits</h2>
            <div className="space-y-2">
              {logs.slice(0, 10).map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm"
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{log.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.checked_in_at), 'MMM d, yyyy · hh:mm a')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    log.checked_out_at
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-accent-success/10 text-accent-success'
                  }`} style={!log.checked_out_at ? { color: 'hsl(var(--accent-success))' } : {}}>
                    {log.checked_out_at ? 'Completed' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
