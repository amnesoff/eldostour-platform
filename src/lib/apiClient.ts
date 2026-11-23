'use client';

import { Student, RegisterStudentData, GuestStudentData, AdminSession } from '@/types';

/**
 * Client-Side API Helper for Al-Dustour Platform
 * All sensitive database mutations and reads route strictly through authenticated server endpoints.
 */

// -----------------------------------------------------------------
// ADMIN API CALLS (/api/admin/auth & /api/admin/db)
// -----------------------------------------------------------------

/**
 * Robust Admin Fetch Helper
 * Always attaches credentials: 'include' for cookies (v2 and current session)
 * and attaches sessionStorage headers (x-admin-session, authorization) if present.
 */
async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (typeof window !== 'undefined') {
    const sessionStr = sessionStorage.getItem('eldostour_admin_session');
    if (sessionStr) {
      headers.set('x-admin-session', encodeURIComponent(sessionStr));
    }
    const token = sessionStorage.getItem('eldostour_admin_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  return res.json();
}

export async function adminLoginCredentials(
  username: string,
  password: string,
  gateType: 'super_admin' | 'staff' = 'super_admin'
) {
  return adminFetch('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'credentials', username, password, gateType }),
  });
}

export async function adminVerifyPin(username: string, pin: string, isSuperAdmin: boolean) {
  return adminFetch('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'verify_pin', username, pin, is_super_admin: isSuperAdmin }),
  });
}

export async function adminRecoveryLogin(username: string, recoveryCode: string) {
  return adminFetch('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'recovery', username, recoveryCode }),
  });
}

export async function adminCheckSession() {
  return adminFetch('/api/admin/auth', { method: 'GET' });
}

export async function adminLogout() {
  return adminFetch('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'logout' }),
  });
}

export async function adminDbMutate(params: {
  table: string;
  mutation: 'insert' | 'update' | 'upsert' | 'delete';
  data?: any;
  id?: string | number;
  ids?: (string | number)[];
  filter?: Record<string, any>;
}) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'mutate', ...params }),
  });
}

export async function adminGetSecurityData() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'get_security_data' }),
  });
}

export async function adminUpdateSecuritySettings(settings: Record<string, any>) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_security_settings', ...settings }),
  });
}

export async function adminChangeSuperCredentials(newPassword?: string, newPin?: string) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'change_super_credentials', newPassword, newPin }),
  });
}

export async function adminUpdateVault(vaultSettings: {
  vault_enabled: boolean;
  vault_password?: string;
  numeric_password?: string;
  complex_password?: string;
}) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_vault', ...vaultSettings }),
  });
}

export async function adminUnlockVault(vaultPassword?: string, complexPassword?: string) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({
      action: 'unlock_vault',
      vaultPassword: vaultPassword || 'AlDostour@2006',
      numericPassword: vaultPassword,
      complexPassword,
    }),
  });
}

export async function adminGetFullBackup() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'get_full_backup' }),
  });
}

export async function adminGetBugReports() {
  return adminFetch('/api/reports', { method: 'GET' });
}

export async function adminUpdateBugReport(id: string, status: 'pending' | 'resolved') {
  return adminFetch('/api/reports', {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  });
}

export async function adminDeleteBugReport(id: string) {
  return adminFetch(`/api/reports?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminGenerateRecoveryCodes() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'generate_recovery_codes' }),
  });
}

export async function adminManageSubAdmin(subAction: 'create' | 'update' | 'delete', data: any) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'manage_sub_admin', subAction, ...data }),
  });
}

export async function adminPanicRevoke() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'panic_revoke' }),
  });
}

export async function adminResetAllStudentPasswords() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'reset_all_student_passwords' }),
  });
}

export async function adminGetStudents() {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'get_students' }),
  });
}

export async function adminUpdateStudent(studentId: string, updates: Record<string, any>) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_student', studentId, updates }),
  });
}

export async function adminBulkApproveStudents(studentIds: string[]) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'bulk_approve_students', studentIds }),
  });
}

export async function adminDeleteStudent(studentId: string) {
  return adminFetch('/api/admin/db', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_student', studentId }),
  });
}

// -----------------------------------------------------------------
// STUDENT API CALLS (/api/auth/student)
// -----------------------------------------------------------------

export async function studentLogin(data: {
  phone?: string;
  email?: string;
  password: string;
  deviceFingerprint?: string;
  deviceInfo?: string;
}) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', ...data }),
  });
  return res.json();
}

export async function studentMarkWelcomeShown(studentId: string) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mark_welcome_shown', student_id: studentId }),
  });
  return res.json();
}

export async function studentSubmitBugReport(payload: {
  reportType: 'quiz' | 'lecture' | 'other';
  targetTitle: string;
  targetId?: string;
  description: string;
  studentName?: string;
  studentPhone?: string;
}) {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function studentHeartbeatPresence(clientId: string, studentName?: string) {
  try {
    const res = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, studentName }),
    });
    return res.json();
  } catch {
    return { success: false, count: 1 };
  }
}

export async function studentGetPresence() {
  try {
    const res = await fetch('/api/presence', { method: 'GET' });
    return res.json();
  } catch {
    return { success: false, count: 1 };
  }
}

export async function studentRegister(data: RegisterStudentData & { deviceFingerprint?: string; deviceInfo?: string }) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', ...data }),
  });
  return res.json();
}

export async function studentGuestRegister(data: GuestStudentData) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'guest', ...data }),
  });
  return res.json();
}

export async function studentChangePassword(studentId: string, newPassword: string) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'change_password', student_id: studentId, new_password: newPassword }),
  });
  return res.json();
}

export async function studentUpdateProfile(studentId: string, updates: Partial<Student>) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_profile', student_id: studentId, ...updates }),
  });
  return res.json();
}

export async function studentDeleteAccount(studentId: string) {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_account', student_id: studentId }),
  });
  return res.json();
}

export async function studentCheckSession() {
  const res = await fetch('/api/auth/student', { method: 'GET' });
  return res.json();
}

export async function studentLogout() {
  const res = await fetch('/api/auth/student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
  return res.json();
}

export async function studentFetchPublicConfig() {
  const res = await fetch('/api/auth/student?type=config', {
    method: 'GET',
    credentials: 'include',
  });
  return res.json();
}

// -----------------------------------------------------------------
// QUIZ & STUDENT INTERACTIONS
// -----------------------------------------------------------------

export async function studentFetchQuiz(quizId: string) {
  const res = await fetch(`/api/student/quiz?quizId=${encodeURIComponent(quizId)}`, { method: 'GET' });
  return res.json();
}

export async function studentSubmitQuiz(payload: {
  quizId: string;
  answers: Record<string, string>;
  studentName: string;
  studentPhone?: string;
  year: number;
}) {
  const res = await fetch('/api/student/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function studentRateLecture(bundleId: string, rating: number, studentName: string) {
  const res = await fetch('/api/student/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rate_lecture', bundleId, rating, studentName }),
  });
  return res.json();
}

export async function studentSubmitRequest(payload: {
  studentName: string;
  year: number;
  subjectName: string;
  requestText: string;
  contactInfo?: string;
}) {
  const res = await fetch('/api/student/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'student_request', ...payload }),
  });
  return res.json();
}

export async function studentLikeMaterial(materialId: string) {
  const res = await fetch('/api/student/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'like_material', materialId }),
  });
  return res.json();
}

export async function studentIncrementDownload(bundleId: string) {
  const res = await fetch('/api/student/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bundle_download', bundleId }),
  });
  return res.json();
}
