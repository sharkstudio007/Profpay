import { useState, useCallback, useEffect } from 'react';
import { supabase, Group, Student, AttendanceRecord, PaymentRecord, UserSettings } from './supabase';

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchGroups = async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching groups:', error);
      else setGroups(data || []);
      setLoading(false);
    };

    fetchGroups();
  }, [userId]);

  const addGroup = useCallback(async (name: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('groups')
      .insert([{ name, user_id: userId }])
      .select();

    if (error) {
      console.error('Error adding group:', error);
      return null;
    }
    setGroups([...groups, ...(data || [])]);
    return data?.[0];
  }, [userId, groups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting group:', error);
      return false;
    }
    setGroups(groups.filter(g => g.id !== groupId));
    return true;
  }, [groups]);

  return { groups, loading, addGroup, deleteGroup };
}

export function useGroupStudents(groupId: string | undefined) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching students:', error);
      else setStudents(data || []);
      setLoading(false);
    };

    fetchStudents();
  }, [groupId]);

  const addStudent = useCallback(async (name: string) => {
    if (!groupId) return;
    const { data, error } = await supabase
      .from('students')
      .insert([{ name, group_id: groupId }])
      .select();

    if (error) {
      console.error('Error adding student:', error);
      return null;
    }
    setStudents([...students, ...(data || [])]);
    return data?.[0];
  }, [groupId, students]);

  const deleteStudent = useCallback(async (studentId: string) => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      console.error('Error deleting student:', error);
      return false;
    }
    setStudents(students.filter(s => s.id !== studentId));
    return true;
  }, [students]);

  return { students, loading, addStudent, deleteStudent };
}

export function useStudentAttendance(studentId: string | undefined) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchAttendance = async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) console.error('Error fetching attendance:', error);
      else setAttendance(data || []);
      setLoading(false);
    };

    fetchAttendance();
  }, [studentId]);

  const addAttendance = useCallback(async () => {
    if (!studentId) return;
    const { data, error } = await supabase
      .from('attendance_records')
      .insert([{ student_id: studentId, date: new Date().toISOString() }])
      .select();

    if (error) {
      console.error('Error adding attendance:', error);
      return null;
    }
    setAttendance([...(data || []), ...attendance]);
    return data?.[0];
  }, [studentId, attendance]);

  const removeAttendance = useCallback(async (attendanceId: string) => {
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', attendanceId);

    if (error) {
      console.error('Error removing attendance:', error);
      return false;
    }
    setAttendance(attendance.filter(a => a.id !== attendanceId));
    return true;
  }, [attendance]);

  return { attendance, loading, addAttendance, removeAttendance };
}

export function useStudentPayments(studentId: string | undefined) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) console.error('Error fetching payments:', error);
      else setPayments(data || []);
      setLoading(false);
    };

    fetchPayments();
  }, [studentId]);

  const addPayment = useCallback(async (amount: number, sessionsCount: number = 4) => {
    if (!studentId) return;
    const { data, error } = await supabase
      .from('payment_records')
      .insert([{
        student_id: studentId,
        amount,
        sessions_count: sessionsCount,
        date: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Error adding payment:', error);
      return null;
    }
    setPayments([...(data || []), ...payments]);
    return data?.[0];
  }, [studentId, payments]);

  const deletePayment = useCallback(async (paymentId: string) => {
    const { error } = await supabase
      .from('payment_records')
      .delete()
      .eq('id', paymentId);

    if (error) {
      console.error('Error deleting payment:', error);
      return false;
    }
    setPayments(payments.filter(p => p.id !== paymentId));
    return true;
  }, [payments]);

  return { payments, loading, addPayment, deletePayment };
}

export function useUserSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching settings:', error);
      } else if (data) {
        setSettings(data);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [userId]);

  const updateSettings = useCallback(async (pricePerBlock: number) => {
    if (!userId) return;

    if (!settings) {
      const { data, error } = await supabase
        .from('user_settings')
        .insert([{ user_id: userId, price_per_block: pricePerBlock }])
        .select()
        .single();

      if (error) {
        console.error('Error creating settings:', error);
        return null;
      }
      setSettings(data);
      return data;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .update({ price_per_block: pricePerBlock })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating settings:', error);
      return null;
    }
    setSettings(data);
    return data;
  }, [userId, settings]);

  return { settings, loading, updateSettings };
}
