'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, RegisterStudentData } from '@/types';
import { supabase } from '@/lib/supabase';
import { hashPassword, generateStudentCode } from '@/lib/authUtils';

interface StudentAuthContextType {
  student: Student | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterStudentData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  continueAsGuest: () => void;
  updateStudentLocally: (updated: Student) => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync session with legacy storage keys for watermarks & ID cards
  const syncStorage = useCallback((s: Student | null) => {
    if (s) {
      localStorage.setItem('eldostour_student_session', JSON.stringify(s));
      localStorage.setItem('eldostour_student_name', s.full_name);
      localStorage.setItem('eldostour_student_id_num', s.student_code);
      localStorage.setItem('eldostour_student_year', String(s.academic_year));
      localStorage.setItem('eldostour_gender', s.gender === 'female' ? 'burgundy' : 'blue');
      localStorage.removeItem('eldostour_is_guest');
    } else {
      localStorage.removeItem('eldostour_student_session');
    }
  }, []);

  // Check stored session on mount
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem('eldostour_student_session');
      const isGuestStored = localStorage.getItem('eldostour_is_guest');

      if (storedSession) {
        const parsed = JSON.parse(storedSession) as Student;
        setStudent(parsed);
        setIsGuest(false);
        syncStorage(parsed);
      } else if (isGuestStored === 'true') {
        setIsGuest(true);
      } else {
        // Default to guest mode for seamless initial exploration
        setIsGuest(true);
      }
    } catch {
      setIsGuest(true);
    } finally {
      setIsLoading(false);
    }
  }, [syncStorage]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const continueAsGuest = () => {
    setIsGuest(true);
    setStudent(null);
    localStorage.setItem('eldostour_is_guest', 'true');
    localStorage.removeItem('eldostour_student_session');
    closeAuthModal();
  };

  // Login handler
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
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
        created_at: data.created_at,
      };

      setStudent(loggedStudent);
      setIsGuest(false);
      syncStorage(loggedStudent);
      closeAuthModal();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
  };

  // Register handler
  const register = async (
    regData: RegisterStudentData
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = regData.email.trim().toLowerCase();
    const cleanName = regData.full_name.trim();

    if (!cleanName || !cleanEmail || !regData.password) {
      return { success: false, error: 'يرجى استكمال جميع البيانات المطلوبة' };
    }

    try {
      // 1. Check if email already registered
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('email', cleanEmail)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'البريد الإلكتروني مسجل مسبقاً بالفعل، يمكنك تسجيل الدخول مباشرة',
        };
      }

      // 2. Generate unique student code and hash
      const studentCode = generateStudentCode();
      const pHash = await hashPassword(regData.password);

      // 3. Insert into Supabase
      const { data: created, error: insErr } = await supabase
        .from('students')
        .insert({
          student_code: studentCode,
          full_name: cleanName,
          email: cleanEmail,
          password_hash: pHash,
          gender: regData.gender,
          academic_year: regData.academic_year,
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
        created_at: created.created_at,
      };

      setStudent(newStudent);
      setIsGuest(false);
      syncStorage(newStudent);
      closeAuthModal();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'حدث خطأ أثناء التسجيل' };
    }
  };

  const logout = () => {
    setStudent(null);
    setIsGuest(true);
    syncStorage(null);
    localStorage.setItem('eldostour_is_guest', 'true');
  };

  const updateStudentLocally = (updated: Student) => {
    setStudent(updated);
    syncStorage(updated);
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
        login,
        register,
        logout,
        continueAsGuest,
        updateStudentLocally,
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
