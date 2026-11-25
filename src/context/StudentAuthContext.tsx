'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, RegisterStudentData, GuestStudentData } from '@/types';
import {
  studentLogin,
  studentRegister,
  studentGuestRegister,
  studentChangePassword,
  studentUpdateProfile,
  studentLogout,
  studentCheckSession,
  studentMarkWelcomeShown,
} from '@/lib/apiClient';
import { getDeviceFingerprint, getDeviceInfoString } from '@/lib/authUtils';
import { MandatoryPasswordChangeModal } from '@/components/auth/MandatoryPasswordChangeModal';

const SESSION_VERSION_KEY = 'eldostour_session_version';
const CURRENT_SESSION_VERSION = 'v2';

interface StudentAuthContextType {
  student: Student | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (defaultMode?: 'login' | 'register' | 'guest') => void;
  closeAuthModal: () => void;
  modalDefaultMode: 'login' | 'register' | 'guest';
  login: (phoneOrEmail: string, password: string) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean }>;
  register: (data: RegisterStudentData) => Promise<{ success: boolean; error?: string; pendingApproval?: boolean; student?: Student; whatsapp_target?: { name?: string; role?: string; phone?: string } }>;
  registerGuest: (data: GuestStudentData) => Promise<{ success: boolean; error?: string }>;
  enterGuestPreviewMode: () => void;
  markWelcomeShown: () => Promise<void>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
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

  // Sync session with local storage for watermarks, PDF stamping & ID cards (Version v2)
  const syncStorage = useCallback((s: Student | null, guestFlag = false) => {
    if (typeof window === 'undefined') return;

    if (s) {
      localStorage.setItem(SESSION_VERSION_KEY, CURRENT_SESSION_VERSION);
      if (!guestFlag) {
        localStorage.setItem('eldostour_student_session_v2', JSON.stringify(s));
        localStorage.removeItem('eldostour_is_guest');
        localStorage.removeItem('eldostour_guest_data_v2');
      } else {
        localStorage.setItem('eldostour_is_guest', 'true');
        localStorage.setItem('eldostour_guest_data_v2', JSON.stringify(s));
        localStorage.removeItem('eldostour_student_session_v2');
      }
      localStorage.setItem('eldostour_student_name', s.full_name);
      localStorage.setItem('eldostour_student_id_num', s.student_code);
      localStorage.setItem('eldostour_student_year', String(s.academic_year));
      localStorage.setItem('eldostour_gender', s.gender === 'female' ? 'burgundy' : 'blue');
      if (s.study_type) localStorage.setItem('eldostour_study_type', s.study_type);
      if (s.avatar_url) localStorage.setItem('eldostour_avatar_url', s.avatar_url);
      if (s.phone) localStorage.setItem('eldostour_phone', s.phone);
    } else {
      localStorage.removeItem('eldostour_student_session_v2');
      localStorage.removeItem('eldostour_guest_data_v2');
      localStorage.removeItem('eldostour_is_guest');
      localStorage.removeItem('eldostour_student_session');
      localStorage.removeItem('eldostour_guest_data');
    }
  }, []);

  // Initialize and enforce Session v2 migration on mount
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(SESSION_VERSION_KEY);

      // Invalidate all legacy v1 sessions
      if (storedVersion !== CURRENT_SESSION_VERSION) {
        localStorage.removeItem('eldostour_student_session');
        localStorage.removeItem('eldostour_guest_data');
        localStorage.removeItem('eldostour_is_guest');
        localStorage.removeItem('eldostour_student_profile');
        localStorage.removeItem('eldostour_admin_session');
        localStorage.setItem(SESSION_VERSION_KEY, CURRENT_SESSION_VERSION);
      }

      const storedSession = localStorage.getItem('eldostour_student_session_v2');
      const isGuestStored = localStorage.getItem('eldostour_is_guest');
      const storedGuestData = localStorage.getItem('eldostour_guest_data_v2');

      if (storedSession) {
        const parsed = JSON.parse(storedSession) as Student;
        setStudent(parsed);
        setIsGuest(false);
      } else if (isGuestStored === 'true' && storedGuestData) {
        const parsedGuest = JSON.parse(storedGuestData) as Student;
        setStudent(parsedGuest);
        setIsGuest(true);
      } else {
        // Check server session cookie
        studentCheckSession().then((res) => {
          if (res?.authenticated && res?.student) {
            setStudent(res.student);
            setIsGuest(Boolean(res.student.is_guest));
            syncStorage(res.student, Boolean(res.student.is_guest));
          } else {
            setIsGuest(false);
            setStudent(null);
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
              setIsAuthModalOpen(true);
              setModalDefaultMode('register');
            }
          }
        }).catch(() => {
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
            setIsAuthModalOpen(true);
          }
        });
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
    if (student || isGuest) {
      setIsAuthModalOpen(false);
    }
  };

  // Secure Server-Side Login (Supports Phone or Legacy Email)
  const login = async (
    phoneOrEmail: string,
    password: string
  ): Promise<{ success: boolean; error?: string; pendingApproval?: boolean }> => {
    try {
      const currentFingerprint = await getDeviceFingerprint();
      const currentDeviceInfo = getDeviceInfoString();

      const cleanInput = phoneOrEmail.trim().replace(/[\s-]/g, '');
      const isEgyptianPhone = /^01[0125]\d{8}$/.test(cleanInput);

      const res = await studentLogin({
        phone: isEgyptianPhone ? cleanInput : cleanInput,
        email: !isEgyptianPhone ? phoneOrEmail.trim().toLowerCase() : undefined,
        password,
        deviceFingerprint: currentFingerprint,
        deviceInfo: currentDeviceInfo,
      });

      if (!res.success) {
        return {
          success: false,
          pendingApproval: res.pendingApproval,
          error: res.error || 'فشل تسجيل الدخول',
        };
      }

      const loggedStudent: Student = res.student;
      setStudent(loggedStudent);
      setIsGuest(false);
      syncStorage(loggedStudent, false);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  // Zero-Database-Writes Instant Guest Preview Mode
  const enterGuestPreviewMode = () => {
    const guestUser: Student = {
      id: 'guest-preview',
      student_code: 'GUEST',
      full_name: 'زائر المنصة',
      gender: 'male',
      academic_year: 1,
      is_guest: true,
      created_at: new Date().toISOString(),
    };
    setStudent(guestUser);
    setIsGuest(true);
    syncStorage(guestUser, true);
    setIsAuthModalOpen(false);
  };

  // Mark Welcome Celebration Shown
  const markWelcomeShown = async () => {
    if (!student || student.is_guest) return;
    try {
      const updated = { ...student, welcome_shown: true };
      setStudent(updated);
      syncStorage(updated, false);
      await studentMarkWelcomeShown(student.id);
    } catch (err) {
      console.warn('Could not mark welcome shown:', err);
    }
  };

  // Secure Server-Side Registration
  const register = async (
    regData: RegisterStudentData
  ): Promise<{
    success: boolean;
    error?: string;
    pendingApproval?: boolean;
    student?: Student;
    whatsapp_target?: { name?: string; role?: string; phone?: string };
  }> => {
    try {
      const currentFingerprint = await getDeviceFingerprint();
      const currentDeviceInfo = getDeviceInfoString();

      const res = await studentRegister({
        ...regData,
        deviceFingerprint: currentFingerprint,
        deviceInfo: currentDeviceInfo,
      });

      if (!res.success) {
        return {
          success: false,
          pendingApproval: res.pendingApproval,
          error: res.error || 'فشل التسجيل',
        };
      }

      const newStudent: Student = res.student;

      if (res.pendingApproval) {
        return {
          success: true,
          pendingApproval: true,
          student: newStudent,
          whatsapp_target: res.whatsapp_target,
        };
      }

      setStudent(newStudent);
      setIsGuest(false);
      syncStorage(newStudent, false);
      setIsAuthModalOpen(false);

      return {
        success: true,
        pendingApproval: false,
        student: newStudent,
        whatsapp_target: res.whatsapp_target,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء التسجيل' };
    }
  };

  // Secure Server-Side Guest Registration
  const registerGuest = async (
    guestData: GuestStudentData
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await studentGuestRegister(guestData);
      if (!res.success) {
        return { success: false, error: res.error || 'فشل تسجيل بيانات الزائر' };
      }

      const guestStudent: Student = res.student;
      setStudent(guestStudent);
      setIsGuest(true);
      syncStorage(guestStudent, true);
      setIsAuthModalOpen(false);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء تسجيل بيانات الزائر' };
    }
  };

  // Mandatory Password Change handler
  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!student) return { success: false, error: 'لا يوجد طالب مسجل' };
    try {
      const res = await studentChangePassword(student.id, newPassword);
      if (res.success && res.student) {
        const updated = { ...student, ...res.student, must_change_password: false };
        setStudent(updated);
        syncStorage(updated, false);
        return { success: true };
      }
      return { success: false, error: res.error || 'فشل تغيير كلمة المرور' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ في الاتصال' };
    }
  };

  // Profile Update
  const updateStudentProfileHandler = async (
    updates: Partial<Student>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!student) return { success: false, error: 'لا يوجد طالب مسجل حالياً' };

    try {
      const res = await studentUpdateProfile(student.id, updates);
      if (res.success && res.student) {
        const updated = { ...student, ...res.student };
        setStudent(updated);
        syncStorage(updated, isGuest);
        return { success: true };
      }
      return { success: false, error: res.error || 'فشل التحديث' };
    } catch {
      const updated = { ...student, ...updates } as Student;
      setStudent(updated);
      syncStorage(updated, isGuest);
      return { success: true };
    }
  };

  const logout = async () => {
    try {
      await studentLogout();
    } catch {
      // Ignore
    }
    setStudent(null);
    setIsGuest(false);
    syncStorage(null);
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
        enterGuestPreviewMode,
        markWelcomeShown,
        logout,
        changePassword,
        updateStudentLocally,
        updateStudentProfile: updateStudentProfileHandler,
      }}
    >
      {children}
      {/* Platform-wide Mandatory Password Change Lockdown Modal */}
      <MandatoryPasswordChangeModal />
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
