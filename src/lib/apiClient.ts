'use client';

import { Student, RegisterStudentData, GuestStudentData, AdminSession } from '@/types';

/**
 * Client-Side API Helper for Al-Dustour Platform
 * All sensitive database mutations and reads route strictly through authenticated server endpoints.
 */

// -----------------------------------------------------------------
// ADMIN API CALLS (/api/admin/auth & /api/admin/db)
// -----------------------------------------------------------------

export async function adminLoginCredentials(
  username: string,
  password: string,
  gateType: 'super_admin' | 'staff' = 'super_admin'
) {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'credentials', username, password, gateType }),
  });
  return res.json();
}

export async function adminVerifyPin(username: string, pin: string, isSuperAdmin: boolean) {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify_pin', username, pin, is_super_admin: isSuperAdmin }),
  });
  return res.json();
}

export async function adminRecoveryLogin(username: string, recoveryCode: string) {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'recovery', username, recoveryCode }),
  });
  return res.json();
}

export async function adminCheckSession() {
  const res = await fetch('/api/admin/auth', { method: 'GET' });
  return res.json();
}

export async function adminLogout() {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
  return res.json();
}

export async function adminDbMutate(params: {
  table: string;
  mutation: 'insert' | 'update' | 'upsert' | 'delete';
  data?: any;
  id?: string | number;
  ids?: (string | number)[];
  filter?: Record<string, any>;
}) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'mutate', ...params }),
  });
  return res.json();
}

export async function adminGetSecurityData() {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_security_data' }),
  });
  return res.json();
}

export async function adminUpdateSecuritySettings(settings: Record<string, any>) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_security_settings', ...settings }),
  });
  return res.json();
}

export async function adminChangeSuperCredentials(newPassword?: string, newPin?: string) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'change_super_credentials', newPassword, newPin }),
  });
  return res.json();
}

export async function adminUpdateVault(vaultSettings: {
  vault_enabled: boolean;
  numeric_password?: string;
  complex_password?: string;
}) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_vault', ...vaultSettings }),
  });
  return res.json();
}

export async function adminUnlockVault(numericPassword?: string, complexPassword?: string) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unlock_vault', numericPassword, complexPassword }),
  });
  return res.json();
}

export async function adminGenerateRecoveryCodes() {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'generate_recovery_codes' }),
  });
  return res.json();
}

export async function adminManageSubAdmin(subAction: 'create' | 'update' | 'delete', data: any) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'manage_sub_admin', subAction, ...data }),
  });
  return res.json();
}

export async function adminPanicRevoke() {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'panic_revoke' }),
  });
  return res.json();
}

export async function adminResetAllStudentPasswords() {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reset_all_student_passwords' }),
  });
  return res.json();
}

export async function adminGetStudents() {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_students' }),
  });
  return res.json();
}

export async function adminUpdateStudent(studentId: string, updates: Record<string, any>) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update_student', studentId, updates }),
  });
  return res.json();
}

export async function adminBulkApproveStudents(studentIds: string[]) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'bulk_approve_students', studentIds }),
  });
  return res.json();
}

export async function adminDeleteStudent(studentId: string) {
  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete_student', studentId }),
  });
  return res.json();
}

// -----------------------------------------------------------------
// STUDENT API CALLS (/api/auth/student)
// -----------------------------------------------------------------

export async function studentLogin(data: {
  email: string;
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
  const res = await fetch('/api/auth/student?type=config', { method: 'GET' });
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
