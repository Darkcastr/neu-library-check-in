import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, type AppRole } from '@/hooks/useProfile';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, Users, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const transition = { type: "spring" as const, duration: 0.4, bounce: 0 };

const roles: { value: AppRole; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'student', label: 'Student', description: 'Access study halls and book loans.', icon: <GraduationCap className="h-6 w-6" /> },
  { value: 'teacher', label: 'Teacher', description: 'Faculty access and research materials.', icon: <Briefcase className="h-6 w-6" /> },
  { value: 'staff', label: 'Staff', description: 'Administrative and operational access.', icon: <Users className="h-6 w-6" /> },
  { value: 'visitor', label: 'Visitor', description: 'General library access for visitors.', icon: <UserCheck className="h-6 w-6" /> },
];

const colleges = [
  'College of Engineering',
  'College of Arts and Sciences',
  'College of Architecture',
  'College of Business Administration',
  'College of Computer Studies',
  'College of Education',
  'College of Tourism and Hospitality Management',
  'College of Dentistry',
  'College of Law',
];

export default function RoleSetup() {
  const { user } = useAuth();
  const { updateProfile } = useProfile(user?.id);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [selectedCollege, setSelectedCollege] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selectedRole) return;
    if (selectedRole === 'student' && !selectedCollege) {
      toast.error('Please select your college.');
      return;
    }
    setSubmitting(true);
    const { error } = await updateProfile({
      role: selectedRole,
      college: selectedRole === 'student' ? selectedCollege : null,
    }) ?? {};
    if (error) {
      toast.error('Failed to save. Please try again.');
    } else {
      navigate('/');
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="w-full max-w-lg"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Tell us about yourself
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select your role to personalize your experience.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {roles.map((role) => (
            <motion.button
              key={role.value}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.value)}
              className={`p-5 rounded-2xl text-left transition-all cursor-pointer ${
                selectedRole === role.value
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                  : 'bg-card text-foreground ring-1 ring-black/5'
              }`}
              style={{ boxShadow: selectedRole === role.value ? undefined : 'var(--shadow-card)' }}
            >
              <div className="mb-2">{role.icon}</div>
              <h3 className="text-base font-semibold tracking-tight">{role.label}</h3>
              <p className={`text-xs mt-1 ${selectedRole === role.value ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {role.description}
              </p>
            </motion.button>
          ))}
        </div>

        {selectedRole === 'student' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={transition}
            className="mt-4"
          >
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Select your College
            </label>
            <select
              value={selectedCollege}
              onChange={e => setSelectedCollege(e.target.value)}
              className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose a college...</option>
              {colleges.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </motion.div>
        )}

        <Button
          size="lg"
          className="w-full mt-6"
          disabled={!selectedRole || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
        </Button>
      </motion.div>
    </div>
  );
}
