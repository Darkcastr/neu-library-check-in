import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ShieldOff, Loader2, UserCog } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  user_id: string;
  full_name: string;
  role: string | null;
  college: string | null;
  isAdmin: boolean;
}

export default function AdminRoleManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: adminRoles }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, role, college'),
      supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
    ]);

    const adminSet = new Set((adminRoles ?? []).map(r => r.user_id));

    setUsers(
      (profiles ?? []).map(p => ({
        ...p,
        isAdmin: adminSet.has(p.user_id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const grantAdmin = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    if (error) {
      toast.error('Failed to grant admin role');
    } else {
      toast.success('Admin role granted');
      await fetchUsers();
    }
    setActionLoading(null);
  };

  const revokeAdmin = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    if (error) {
      toast.error('Failed to revoke admin role');
    } else {
      toast.success('Admin role revoked');
      await fetchUsers();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const admins = users.filter(u => u.isAdmin);
  const nonAdmins = users.filter(u => !u.isAdmin);

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <UserCog className="h-4 w-4 text-muted-foreground" />
          Admin Role Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Admins */}
        {admins.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Admins</p>
            <div className="space-y-2">
              {admins.map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role || '—'}{user.college ? ` · ${user.college}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={actionLoading === user.user_id}
                    onClick={() => revokeAdmin(user.user_id)}
                  >
                    {actionLoading === user.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShieldOff className="h-3 w-3" />
                    )}
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Non-admin Users */}
        {nonAdmins.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Users</p>
            <div className="space-y-2">
              {nonAdmins.map(user => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-xl bg-card px-4 py-3 border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{user.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role || '—'}{user.college ? ` · ${user.college}` : ''}
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 text-xs"
                    disabled={actionLoading === user.user_id}
                    onClick={() => grantAdmin(user.user_id)}
                  >
                    {actionLoading === user.user_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Shield className="h-3 w-3" />
                    )}
                    Make Admin
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
        )}
      </CardContent>
    </Card>
  );
}
