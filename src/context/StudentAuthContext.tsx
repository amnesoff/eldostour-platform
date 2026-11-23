'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, RegisterStudentData, GuestStudentData } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  hashPassword,
  validateEgyptianPhone,
  validateStudentName,
  generateSequentialStudentCode,
  generateGuestCode,
} from '@/lib/authUtils';

interface StudentAuthContextType {
  student: Student | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (defaultMode?: 'login' | 'register' | 'guest') => void;
  closeAuthModal: () => void;
  modalDefaultMode: 'login' | 'register' | 'guest';
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean }>;
  register: (data: RegisterStudentData) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean }>;
  registerGuest: (data: GuestStudentData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateStudentLocally: (updated: Student) => void;
  updateStudentProfile: (updates: Partial<Student>) => Promise<{ success: boolean; error?: string }>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalDefaultMode, setModalDefaultMode] = useState<'login' | 'register' | 'guest'>('register');

  // Sync session with local storage for watermarks, PDF stamping & ID cards
  const syncStorage = useCallback((s: Student | null, guestFlag = false) => {
    if (s) {
      if (!guestFlag) {
        localStorage.setItem('eldostour_student_session', JSON.stringify(s));
        localStorage.removeItem('eldostour_is_guest');
        localStorage.removeItem('eldostour_guest_data');
      } else {
        localStorage.setItem('eldostour_is_guest', 'true');
        localStorage.setItem('eldostour_guest_data', JSON.stringify(s));
        localStorage.removeItem('eldostour_student_session');
      }
      localStorage.setItem('eldostour_student_name', s.full_name);
      localStorage.setItem('eldostour_student_id_num', s.student_code);
      localStorage.setItem('eldostour_student_year', String(s.academic_year));
      localStorage.setItem('eldostour_gender', s.gender === 'female' ? 'burgundy' : 'blue');
      if (s.study_type) localStorage.setItem('eldostour_study_type', s.study_type);
      if (s.avatar_url) localStorage.setItem('eldostour_avatar_url', s.avatar_url);
      if (s.phone) localStorage.setItem('eldostour_phone', s.phone);
    } else {
      localStorage.removeItem('eldostour_student_session');
      localStorage.removeItem('eldostour_guest_data');
      localStorage.removeItem('eldostour_is_guest');
    }
  }, []);

  // Check stored session on mount (TASK 2: Immediate Gate if no session)
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('eldostour_student_session');
      const isGuestStored = localStorage.getItem('eldostour_is_guest');
      const storedGuestData = localStorage.getItem('eldostour_guest_data');

      if (storedSession) {
        const parsed = JSON.parse(storedSession) as Student;
        setStudent(parsed);
        setIsGuest(false);
        syncStorage(parsed, false);
      } else if (isGuestStored === 'true' && storedGuestData) {
        const parsedGuest = JSON.parse(storedGuestData) as Student;
        setStudent(parsedGuest);
        setIsGuest(true);
        syncStorage(parsedGuest, true);
      } else {
        // No active session exists -> open mandatory gate immediately
        setIsGuest(false);
        setStudent(null);
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
          setIsAuthModalOpen(true);
          setModalDefaultMode('register');
        }
      }
    } catch {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
        setIsAuthModalOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [syncStorage]);

  const openAuthModal = (mode: 'login' | 'register' | 'guest' = 'register') => {
    setModalDefaultMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    // Only close if user has a session or registered guest
    if (student || isGuest) {
      setIsAuthModalOpen(false);
    }
  };

  // Login handler
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; pendingApproval?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' };
    }

    try {
      const pHash = await hashPassword(password);

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', cleanEmail)
        .eq('password_hash', pHash)
        .single();

      if (error || !data) {
        return {
          success: false,
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        };
      }

      const loggedStudent: Student = {
        id: data.id,
        student_code: data.student_code,
        full_name: data.full_name,
        email: data.email,
        gender: data.gender,
        academic_year: data.academic_year,
        study_type: data.study_type || 'انتظام',
        avatar_url: data.avatar_url || '',
        phone: data.phone || '',
        is_guest: data.is_guest || false,
        is_approved: data.is_approved !== false,
        created_at: data.created_at,
      };

      // Check if student is awaiting admin approval
      if (!loggedStudent.is_guest && loggedStudent.is_approved === false) {
        return {
          success: false,
          pendingApproval: true,
          error: 'حسابك قيد المراجعة والاعتماد من قبل إدارة منصة الدستور ⏳',
        };
      }

      setStudent(loggedStudent);
      setIsGuest(false);
      syncStorage(loggedStudent, false);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  // Register Official Student
  const register = async (
    regData: RegisterStudentData
  ): Promise<{ success: boolean; error?: string; pendingApproval?: boolean }> => {
    const cleanEmail = regData.email.trim().toLowerCase();
    const cleanName = regData.full_name.trim();

    const nameValidation = validateStudentName(cleanName);
    if (!nameValidation.isValid) {
      return { success: false, error: nameValidation.error };
    }

    if (!cleanEmail || !regData.password) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' };
    }

    if (regData.phone) {
      const phoneVal = validateEgyptianPhone(regData.phone);
      if (!phoneVal.isValid) {
        return { success: false, error: phoneVal.error };
      }
    }

    try {
      // 1. Check duplicate email
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: 'البريد الإلكتروني مسجل مسبقاً بالفعل، يمكنك تسجيل الدخول مباشرة',
        };
      }

      // 2. Check if manual approval is required
      const { data: secRow } = await supabase
        .from('admin_security')
        .select('manual_approval_enabled')
        .eq('id', 'primary')
        .maybeSingle();

      const isManualApprovalEnabled = secRow?.manual_approval_enabled === true;
      const isApproved = !isManualApprovalEnabled;

      // 3. Generate sequential student code (starting from 1001)
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const studentCode = generateSequentialStudentCode(1001 + (count || 0));
      const pHash = await hashPassword(regData.password);

      // 4. Insert into Supabase
      const { data: created, error: insErr } = await supabase
        .from('students')
        .insert({
          student_code: studentCode,
          full_name: cleanName,
          email: cleanEmail,
          password_hash: pHash,
          gender: regData.gender,
          academic_year: regData.academic_year,
          study_type: regData.study_type || 'انتظام',
          avatar_url: regData.avatar_url || '',
          phone: regData.phone || '',
          is_guest: false,
          is_approved: isApproved,
        })
        .select()
        .single();

      if (insErr || !created) {
        throw insErr || new Error('فشل تسجيل الحساب');
      }

      const newStudent: Student = {
        id: created.id,
        student_code: created.student_code,
        full_name: created.full_name,
        email: created.email,
        gender: created.gender,
        academic_year: created.academic_year,
        study_type: created.study_type || 'انتظام',
        avatar_url: created.avatar_url || '',
        phone: created.phone || '',
        is_guest: false,
        is_approved: created.is_approved !== false,
        created_at: created.created_at,
      };

      if (!isApproved) {
        // Pending manual approval -> don't grant full auto-access
        return { success: true, pendingApproval: true };
      }

      setStudent(newStudent);
      setIsGuest(false);
      syncStorage(newStudent, false);
      setIsAuthModalOpen(false);

      return { success: true, pendingApproval: false };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء التسجيل' };
    }
  };

  // Register Guest with Egyptian Phone & Full Name (TASK 2)
  const registerGuest = async (
    guestData: GuestStudentData
  ): Promise<{ success: boolean; error?: string }> => {
    const nameVal = validateStudentName(guestData.full_name);
    if (!nameVal.isValid) {
      return { success: false, error: nameVal.error };
    }

    const phoneVal = validateEgyptianPhone(guestData.phone);
    if (!phoneVal.isValid) {
      return { success: false, error: phoneVal.error };
    }

    const cleanPhone = guestData.phone.trim().replace(/[\s-]/g, '');
    const cleanName = guestData.full_name.trim();

    try {
      // Generate guest code like G-101
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_guest', true);

      const guestCode = generateGuestCode(101 + (count || 0));

      const { data: created, error: insErr } = await supabase
        .from('students')
        .insert({
          student_code: guestCode,
          full_name: cleanName,
          phone: cleanPhone,
          email: null,
          password_hash: null,
          gender: guestData.gender || 'male',
          academic_year: guestData.academic_year || 1,
          study_type: guestData.study_type || 'انتظام',
          is_guest: true,
        })
        .select()
        .single();

      if (insErr || !created) {
        throw insErr || new Error('فشل تسجيل بيانات الزائر');
      }

      const guestStudent: Student = {
        id: created.id,
        student_code: created.student_code,
        full_name: created.full_name,
        phone: created.phone,
        gender: created.gender,
        academic_year: created.academic_year,
        study_type: created.study_type || 'انتظام',
        avatar_url: '',
        is_guest: true,
        created_at: created.created_at,
      };

      setStudent(guestStudent);
      setIsGuest(true);
      syncStorage(guestStudent, true);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء حفظ بيانات الزائر' };
    }
  };

  // Update profile (e.g. photo upload, study system change)
  const updateStudentProfile = async (
    updates: Partial<Student>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!student) return { success: false, error: 'لا يوجد طالب مسجل حالياً' };

    try {
      const { data, error } = await supabase
        .from('students')
        .update({
          study_type: updates.study_type || student.study_type,
          avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : student.avatar_url,
          full_name: updates.full_name || student.full_name,
          academic_year: updates.academic_year || student.academic_year,
          gender: updates.gender || student.gender,
          phone: updates.phone !== undefined ? updates.phone : student.phone,
        })
        .eq('id', student.id)
        .select()
        .single();

      if (error) throw error;

      const updated = { ...student, ...data } as Student;
      setStudent(updated);
      syncStorage(updated, isGuest);
      return { success: true };
    } catch {
      // Fallback: update locally
      const updated = { ...student, ...updates } as Student;
      setStudent(updated);
      syncStorage(updated, isGuest);
      return { success: true };
    }
  };

  const logout = () => {
    setStudent(null);
    setIsGuest(false);
    syncStorage(null);
    // Re-open mandatory auth modal
    setIsAuthModalOpen(true);
    setModalDefaultMode('login');
  };

  const updateStudentLocally = (updated: Student) => {
    setStudent(updated);
    syncStorage(updated, isGuest);
  };

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        isGuest,
        isLoading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        modalDefaultMode,
        login,
        register,
        registerGuest,
        logout,
        updateStudentLocally,
        updateStudentProfile,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}
