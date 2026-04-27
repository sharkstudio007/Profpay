import React, { useState, useEffect } from 'react';
import {
  Plus, Minus, Trash2, Users, DollarSign, CheckCircle2, Circle, Calculator, X,
  ChevronRight, ChevronDown, ChevronUp, LayoutDashboard, Settings, AlertCircle,
  TrendingUp, Wallet, CalendarDays, Clock, Search, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import {
  useGroups, useGroupStudents, useStudentAttendance,
  useStudentPayments, useUserSettings
} from './lib/hooks';
import { SplashScreen } from './components/SplashScreen';

type Student = {
  id: string;
  name: string;
  attendance: Array<{ id: string; date: string }>;
  payments: Array<{ id: string; date: string; amount: number; sessionsCount: number }>;
};

type Group = {
  id: string;
  name: string;
  students: Student[];
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showSplash, setShowSplash] = useState(true);

  // UI State
  const [newGroupName, setNewGroupName] = useState('');
  const [newStudentNames, setNewStudentNames] = useState<Record<string, string>>({});
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'search'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Data hooks
  const { groups: groupsData, addGroup: addGroupSupabase, deleteGroup: deleteGroupSupabase } = useGroups(user?.id);
  const { settings, updateSettings } = useUserSettings(user?.id);

  const pricePerBlock = settings?.price_per_block || 80;

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Build groups with students
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const buildGroups = async () => {
      if (!groupsData.length) {
        setGroups([]);
        return;
      }

      const groupsWithStudents = await Promise.all(
        groupsData.map(async (group) => {
          const { data: students } = await supabase
            .from('students')
            .select('*')
            .eq('group_id', group.id);

          const studentsWithData = await Promise.all(
            (students || []).map(async (student) => {
              const { data: attendance } = await supabase
                .from('attendance_records')
                .select('id, date')
                .eq('student_id', student.id);

              const { data: payments } = await supabase
                .from('payment_records')
                .select('id, date, amount, sessions_count')
                .eq('student_id', student.id);

              return {
                id: student.id,
                name: student.name,
                attendance: attendance || [],
                payments: (payments || []).map(p => ({
                  id: p.id,
                  date: p.date,
                  amount: p.amount,
                  sessionsCount: p.sessions_count
                }))
              };
            })
          );

          return {
            id: group.id,
            name: group.name,
            students: studentsWithData
          };
        })
      );

      setGroups(groupsWithStudents);
    };

    buildGroups();
  }, [groupsData]);

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroupSupabase(newGroupName.trim());
    setNewGroupName('');
  };

  const addStudent = async (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    const studentName = newStudentNames[groupId];
    if (!studentName?.trim()) return;

    const { data, error } = await supabase
      .from('students')
      .insert([{ name: studentName.trim(), group_id: groupId }])
      .select();

    if (!error) {
      setGroups(
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                students: [
                  ...g.students,
                  {
                    id: data[0].id,
                    name: data[0].name,
                    attendance: [],
                    payments: []
                  }
                ]
              }
            : g
        )
      );
    }
    setNewStudentNames({ ...newStudentNames, [groupId]: '' });
  };

  const deleteStudent = async (groupId: string, studentId: string) => {
    await supabase.from('students').delete().eq('id', studentId);
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? { ...g, students: g.students.filter((s) => s.id !== studentId) }
          : g
      )
    );
  };

  const addAttendance = async (groupId: string, studentId: string) => {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{ student_id: studentId, date: new Date().toISOString() }])
      .select();

    if (!error) {
      setGroups(
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                students: g.students.map((s) =>
                  s.id === studentId
                    ? { ...s, attendance: [...s.attendance, { id: data[0].id, date: data[0].date }] }
                    : s
                )
              }
            : g
        )
      );
    }
  };

  const removeAttendance = async (groupId: string, studentId: string) => {
    setGroups(
      groups.map((g) => {
        if (g.id === groupId) {
          return {
            ...g,
            students: g.students.map((s) => {
              if (s.id === studentId && s.attendance.length > 0) {
                const attendanceToDelete = s.attendance[s.attendance.length - 1];
                supabase.from('attendance_records').delete().eq('id', attendanceToDelete.id);
                const newAttendance = [...s.attendance];
                newAttendance.pop();
                return { ...s, attendance: newAttendance };
              }
              return s;
            })
          };
        }
        return g;
      })
    );
  };

  const addBlockPayment = async (groupId: string, studentId: string) => {
    const { data, error } = await supabase
      .from('payment_records')
      .insert([{
        student_id: studentId,
        amount: pricePerBlock,
        sessions_count: 4,
        date: new Date().toISOString()
      }])
      .select();

    if (!error) {
      setGroups(
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                students: g.students.map((s) =>
                  s.id === studentId
                    ? {
                        ...s,
                        payments: [
                          ...s.payments,
                          {
                            id: data[0].id,
                            date: data[0].date,
                            amount: data[0].amount,
                            sessionsCount: data[0].sessions_count
                          }
                        ]
                      }
                    : s
                )
              }
            : g
        )
      );
    }
  };

  const executeDeleteGroup = async () => {
    if (groupToDelete) {
      await deleteGroupSupabase(groupToDelete);
      setGroupToDelete(null);
    }
  };

  const downloadCSV = () => {
    const headers = ['Élève', 'Groupe', 'Présences', 'Séances Payées', 'Solde Séances', 'Total Payé (DT)'];
    const rows = groups.flatMap(group =>
      group.students.map(student => {
        const paidCount = student.payments.reduce((acc, p) => acc + p.sessionsCount, 0);
        const balance = paidCount - student.attendance.length;
        const totalPaid = student.payments.length * pricePerBlock;

        return [
          student.name,
          group.name,
          student.attendance.length.toString(),
          paidCount.toString(),
          (balance >= 0 ? `+${balance}` : balance).toString(),
          totalPaid.toString()
        ];
      })
    );

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profpay_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStudentCard = (student: Student, groupId: string, groupName?: string) => {
    const attendedCount = student.attendance.length;
    const paidCount = student.payments.reduce((acc, p) => acc + p.sessionsCount, 0);
    const sessionsOwed = Math.max(0, attendedCount - paidCount);
    const isOverdue = sessionsOwed > 0;
    const remainingPaid = Math.max(0, paidCount - attendedCount);

    // Calculate unpaid presences (attendance not covered by payments)
    const attendanceSinceLastPayment = Math.max(0, attendedCount - paidCount);

    const totalPresences = attendedCount;
    const paymentBlocksCount = student.payments.length;

    return (
      <motion.div
        layout
        key={student.id}
        className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-all group relative overflow-hidden shadow-lg shadow-black/40"
      >
        <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl -mr-12 -mt-12 opacity-20 transition-opacity ${isOverdue ? 'bg-red-500' : 'bg-emerald-500'}`} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-base leading-tight">{student.name}</p>
                <button
                  onClick={() => deleteStudent(groupId, student.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                >
                  <X size={14} />
                </button>
              </div>

              {groupName && (
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">{groupName}</p>
              )}

              {student.attendance.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-1 font-medium">
                  <Clock size={10} />
                  <span>Dernière: {new Date(student.attendance[student.attendance.length - 1].date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end shrink-0">
              {isOverdue ? (
                <span className="text-[9px] font-black text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-red-400/20">
                  -{sessionsOwed} séances
                </span>
              ) : (
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-400/20">
                  +{remainingPaid} payées
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 py-2 border-y border-white/5 mb-3 overflow-x-auto">
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Total Présences</span>
              <span className="text-xs font-bold text-white">{totalPresences}</span>
            </div>
            <div className="w-px h-4 bg-white/5 flex-shrink-0" />
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Présence</span>
              <span className="text-xs font-bold text-emerald-400">{attendanceSinceLastPayment}</span>
            </div>
            <div className="w-px h-4 bg-white/5 flex-shrink-0" />
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Séances Payées</span>
              <span className="text-xs font-bold text-white">{paidCount}</span>
            </div>
            <div className="w-px h-4 bg-white/5 flex-shrink-0" />
            <div className="flex flex-col flex-shrink-0">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Mois Payés</span>
              <span className="text-xs font-bold text-white">{paymentBlocksCount}</span>
            </div>
          </div>

          {isOverdue && sessionsOwed >= 4 && (
            <div className="mb-3 p-2 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center gap-2">
              <AlertCircle size={12} className="text-red-500 shrink-0" />
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-tight">
                Doit payer {Math.floor(sessionsOwed / 4)} mois ({Math.floor(sessionsOwed / 4) * pricePerBlock} DT)
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 flex bg-white/5 border border-white/10 rounded-xl overflow-hidden h-9">
              <button
                onClick={() => removeAttendance(groupId, student.id)}
                className="w-10 flex items-center justify-center hover:bg-white/10 text-slate-500 hover:text-white transition-all border-r border-white/10"
              >
                <Minus size={14} />
              </button>
              <button
                onClick={() => addAttendance(groupId, student.id)}
                className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 text-white transition-all"
              >
                <Plus size={14} /> Séance
              </button>
            </div>
            <button
              onClick={() => addBlockPayment(groupId, student.id)}
              className="flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white text-black h-9 rounded-xl hover:bg-slate-200 transition-all shadow-lg shadow-white/5"
            >
              <Wallet size={14} /> Payer 4
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderStudentRow = (student: Student, groupId: string) => {
    const attendedCount = student.attendance.length;
    const paidCount = student.payments.reduce((acc, p) => acc + p.sessionsCount, 0);
    const sessionsOwed = Math.max(0, attendedCount - paidCount);
    const isOverdue = sessionsOwed > 0;
    const remainingPaid = Math.max(0, paidCount - attendedCount);

    return (
      <div key={student.id} className="flex items-center justify-between p-4 hover:bg-white/[0.04] rounded-2xl transition-all border border-transparent hover:border-white/5 group">
        <div className="flex items-center gap-4">
          <div className={`w-2.5 h-2.5 rounded-full ${isOverdue ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} />
          <div>
            <p className="font-bold text-slate-200">{student.name}</p>
            <p className="text-[10px] text-slate-500 font-medium">
              {student.attendance.length} présences • {paidCount} payées
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right mr-2">
            {isOverdue ? (
              <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                -{sessionsOwed} séances
              </span>
            ) : (
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                +{remainingPaid} payées
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => addAttendance(groupId, student.id)}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => addBlockPayment(groupId, student.id)}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <Wallet size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Calculations
  const totalStudents = groups.reduce((acc, g) => acc + g.students.length, 0);
  const collectedRevenue = groups.reduce((acc, g) => {
    return acc + g.students.reduce((sAcc, s) => sAcc + s.payments.reduce((pAcc, p) => pAcc + p.amount, 0), 0);
  }, 0);
  const totalOwed = groups.reduce((acc, g) => {
    return acc + g.students.reduce((sAcc, s) => {
      const attendedCount = s.attendance.length;
      const paidCount = s.payments.reduce((pAcc, p) => pAcc + p.sessionsCount, 0);
      const sessionsOwed = Math.max(0, attendedCount - paidCount);
      return sAcc + (sessionsOwed * (pricePerBlock / 4));
    }, 0);
  }, 0);

  const totalSessions = groups.reduce((acc, g) => {
    return acc + g.students.reduce((sAcc, s) => sAcc + s.attendance.length, 0);
  }, 0);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-sans selection:bg-white selection:text-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm"
        >
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.2)] mb-4">
              <Calculator size={32} />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tighter text-white">ProfPay</h1>
            <p className="text-slate-500 text-sm mt-2">Gestion simplifiée pour professeurs</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>

            <div className="relative z-10">
              <div className="mb-6 flex gap-2">
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setAuthError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    !isSignUp
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Se Connecter
                </button>
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setAuthError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    isSignUp
                      ? 'bg-white text-black shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Créer un Compte
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError('');

                  const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
                  const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

                  if (isSignUp) {
                    const { error } = await supabase.auth.signUp({
                      email,
                      password,
                      options: {
                        emailRedirectTo: window.location.origin
                      }
                    });
                    if (error) {
                      setAuthError(error.message);
                    } else {
                      setAuthError('Compte créé! Vérifiez votre email pour confirmer. Ensuite, connectez-vous.');
                      setTimeout(() => setIsSignUp(false), 3000);
                    }
                  } else {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) {
                      setAuthError(error.message);
                    }
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="professeur@ecole.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 ml-1">Mot de passe</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-slate-700"
                  />
                  {isSignUp && (
                    <p className="text-[9px] text-slate-500">Minimum 6 caractères</p>
                  )}
                </div>

                {authError && (
                  <div className={`p-3 rounded-xl text-sm text-center ${
                    authError.includes('Compte créé')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isSignUp ? 'Créer un Compte' : 'Se Connecter'} <ChevronRight size={18} />
                </button>
              </form>

              {!isSignUp && (
                <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <p className="text-[10px] text-slate-400 text-center font-medium">
                    Pas de compte? <button onClick={() => setIsSignUp(true)} className="text-white font-bold hover:underline">Créez-en un</button>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 text-center relative z-10">
              <p className="text-[10px] font-medium text-slate-700 uppercase tracking-[0.2em]">
                Created by <span className="text-slate-500">Mohamed Redissi</span>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen neon-white-bg font-sans text-white flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-[#0A0A0A] border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col gap-8 sticky top-0 z-20 lg:h-screen">
        <div className="flex items-center justify-between lg:justify-start gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              <Calculator size={22} />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-white">ProfPay</span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
          >
            <LayoutDashboard size={18} />
            Tableau de bord
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'groups' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
          >
            <Users size={18} />
            Mes Groupes
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'search' ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
          >
            <Search size={18} />
            Recherche
          </button>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-slate-500 hover:bg-white/5 hover:text-slate-300"
          >
            <Download size={18} />
            Exporter CSV
          </button>
        </nav>

        <div className="mt-auto hidden lg:flex flex-col gap-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Compte</span>
            </div>
            <p className="text-xs text-slate-300 break-all font-medium">{user?.email}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-slate-500 mb-3">
              <Settings size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Configuration</span>
            </div>
            <label className="text-xs font-medium text-slate-400 block mb-2">Prix / 4 séances</label>
            <div className="relative">
              <input
                type="number"
                value={pricePerBlock}
                onChange={(e) => updateSettings(Number(e.target.value) || 0)}
                className="w-full pl-3 pr-8 py-2 bg-black/40 border border-white/10 rounded-lg text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">DT</span>
            </div>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-slate-500 hover:bg-red-500/10 hover:text-red-400 group"
          >
            <Settings className="group-hover:rotate-90 transition-transform" size={18} />
            Déconnexion
          </button>

          <div className="mt-4 px-4 py-3 border-t border-white/5">
            <p className="text-[10px] font-medium text-slate-600 uppercase tracking-[0.2em] text-center">
              Created by <span className="text-slate-400">Mohamed Redissi</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-10"
            >
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-display font-bold text-white mb-2">Bonjour, Professeur 👋</h2>
                  <p className="text-slate-400">Voici un aperçu de votre activité de tutorat ce mois-ci.</p>
                </div>
              </header>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-sm flex flex-col justify-between group hover:border-white/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Élèves</p>
                    <h3 className="text-4xl font-display font-bold text-white">{totalStudents}</h3>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-sm flex flex-col justify-between group hover:border-emerald-500/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Total Collecté</p>
                    <h3 className="text-4xl font-display font-bold text-white">{collectedRevenue} <span className="text-lg font-medium text-slate-600">DT</span></h3>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-sm flex flex-col justify-between group hover:border-orange-500/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Montant Dû</p>
                    <h3 className="text-4xl font-display font-bold text-white">{totalOwed} <span className="text-lg font-medium text-slate-600">DT</span></h3>
                  </div>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 shadow-sm flex flex-col justify-between group hover:border-blue-500/20 transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <CalendarDays size={24} />
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Séances Totales</p>
                    <h3 className="text-4xl font-display font-bold text-white">{totalSessions}</h3>
                  </div>
                </div>
              </div>

              {/* Recent Activity / Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 rounded-[2rem] border border-white/10 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h4 className="font-display font-bold text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-white/60" />
                      Résumé des Groupes
                    </h4>
                    <button onClick={() => setActiveTab('groups')} className="text-white text-xs font-bold uppercase tracking-widest hover:text-slate-300 transition-colors">Voir tout</button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {groups.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                        <p>Aucun groupe créé pour le moment.</p>
                      </div>
                    ) : (
                      groups.slice(0, 4).map(group => {
                        const unpaidCount = group.students.filter(s => s.attendance.length > s.payments.reduce((acc, p) => acc + p.sessionsCount, 0)).length;
                        return (
                          <button
                            key={group.id}
                            onClick={() => {
                              setActiveTab('groups');
                              setExpandedGroups({ ...expandedGroups, [group.id]: true });
                            }}
                            className="w-full text-left p-6 flex items-center justify-between hover:bg-white/5 transition-colors group/item"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 group-hover/item:text-white transition-colors">
                                <Users size={18} />
                              </div>
                              <div>
                                <p className="font-semibold text-white">{group.name}</p>
                                <p className="text-xs text-slate-500">{group.students.length} élèves</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              {unpaidCount > 0 && (
                                <span className="text-[10px] font-bold bg-orange-500/10 text-orange-400 px-2 py-1 rounded-full uppercase tracking-wider border border-orange-500/20">
                                  {unpaidCount} impayés
                                </span>
                              )}
                              <ChevronRight size={16} className="text-slate-600 transition-transform group-hover/item:translate-x-1" />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="bg-white text-black rounded-[2rem] p-8 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-black/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <h4 className="text-2xl font-display font-bold mb-4 leading-tight">Prêt à commencer une nouvelle séance ?</h4>
                    <p className="text-slate-600 text-sm mb-8">Ajoutez un nouveau groupe pour commencer à suivre les présences et les paiements.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="relative z-10 bg-black text-white w-full py-4 rounded-2xl font-bold text-sm shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Nouveau Groupe
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10"
                    title="Retour au tableau de bord"
                  >
                    <ChevronRight size={18} className="rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-3xl font-display font-bold text-white mb-2">Mes Groupes</h2>
                    <p className="text-slate-400">Gérez vos élèves et suivez leurs paiements par séance.</p>
                  </div>
                </div>
                <form onSubmit={addGroup} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nom du groupe..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent shadow-sm w-full sm:w-64"
                  />
                  <button
                    type="submit"
                    disabled={!newGroupName.trim()}
                    className="bg-white text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 disabled:opacity-50 transition-all shadow-md flex items-center gap-2 flex-shrink-0"
                  >
                    <Plus size={18} /> Créer
                  </button>
                </form>
              </header>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <AnimatePresence>
                  {groups.map((group) => (
                    <motion.div
                      layout
                      key={group.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/5 rounded-[2.5rem] border border-white/10 shadow-sm overflow-hidden flex flex-col"
                    >
                      <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-display font-bold text-white">{group.name}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                              <Users size={14} /> {group.students.length} Élèves
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedGroups({ ...expandedGroups, [group.id]: !expandedGroups[group.id] })}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5"
                          >
                            {expandedGroups[group.id] ? (
                              <><ChevronUp size={14} /> Réduire</>
                            ) : (
                              <><ChevronDown size={14} /> Voir tous</>
                            )}
                          </button>
                          <button
                            onClick={() => setGroupToDelete(group.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-white/5"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="p-8 flex-1 flex flex-col">
                        <div className="space-y-2 mb-8 flex-1">
                          {group.students.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                              <p className="text-slate-600 text-sm italic">Aucun élève dans ce groupe.</p>
                            </div>
                          ) : (
                            expandedGroups[group.id] ? (
                              <div className="space-y-6">
                                {group.students.map((student) => renderStudentCard(student, group.id))}
                              </div>
                            ) : (
                              <div className="divide-y divide-white/5">
                                {group.students.map((student) => renderStudentRow(student, group.id))}
                              </div>
                            )
                          )}
                        </div>

                        <form onSubmit={(e) => addStudent(group.id, e)} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nom de l'élève..."
                            value={newStudentNames[group.id] || ''}
                            onChange={(e) => setNewStudentNames({ ...newStudentNames, [group.id]: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all"
                          />
                          <button
                            type="submit"
                            disabled={!newStudentNames[group.id]?.trim()}
                            className="bg-white text-black px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-200 disabled:opacity-50 transition-all"
                          >
                            Ajouter
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <header className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/10 flex-shrink-0"
                  title="Retour au tableau de bord"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div>
                  <h2 className="text-3xl font-display font-bold text-white mb-2">Rechercher un élève</h2>
                  <p className="text-slate-400">Trouvez rapidement un élève parmi tous vos groupes.</p>
                </div>
              </header>

              <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={24} />
                <input
                  type="text"
                  placeholder="Rechercher par nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] pl-16 pr-8 py-6 text-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all shadow-2xl"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {groups.flatMap(group =>
                  group.students
                    .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(student => ({ ...student, groupName: group.name, groupId: group.id }))
                ).length === 0 ? (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-slate-500 text-lg italic">Aucun élève trouvé pour "{searchQuery}"</p>
                  </div>
                ) : (
                  groups.flatMap(group =>
                    group.students
                      .filter(student => student.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(student => renderStudentCard(student, group.id, group.name))
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {groupToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGroupToDelete(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden relative z-10"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-display font-bold text-white">Supprimer le Groupe</h3>
                  <button
                    onClick={() => setGroupToDelete(null)}
                    className="text-slate-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5"
                  >
                    <X size={24} />
                  </button>
                </div>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer ce groupe ? Tous les élèves et leurs enregistrements de paiement seront définitivement supprimés.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGroupToDelete(null)}
                    className="flex-1 px-6 py-4 text-sm font-bold text-slate-400 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={executeDeleteGroup}
                    className="flex-1 px-6 py-4 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-500/20"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
