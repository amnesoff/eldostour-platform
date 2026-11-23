export type AcademicYearId = 1 | 2 | 3 | 4;

export type GenderTheme = 'blue' | 'burgundy';
export type StudentGender = 'male' | 'female';
export type StudyType = 'انتظام' | 'انتساب';
export type OccasionTheme = 'default' | 'ramadan' | 'new_year' | 'exams' | 'valentine';

export interface Student {
  id: string;
  student_code: string;
  full_name: string;
  email?: string;
  password_hash?: string;
  gender: StudentGender;
  academic_year: AcademicYearId;
  study_type?: StudyType;
  avatar_url?: string;
  phone?: string;
  is_guest?: boolean;
  is_approved?: boolean;
  is_verified?: boolean;
  is_banned?: boolean;
  must_change_password?: boolean;
  device_fingerprint?: string;
  last_device_info?: string;
  activity_score?: number;
  last_active_at?: string;
  terms_accepted_at?: string;
  contract_version?: string;
  created_at: string;
}

export interface RegisterStudentData {
  full_name: string;
  email: string;
  password: string;
  gender: StudentGender;
  academic_year: AcademicYearId;
  study_type?: StudyType;
  avatar_url?: string;
  phone?: string;
  is_approved?: boolean;
  is_verified?: boolean;
  is_banned?: boolean;
  must_change_password?: boolean;
  device_fingerprint?: string;
  last_device_info?: string;
  activity_score?: number;
  last_active_at?: string;
  terms_accepted_at?: string;
  contract_version?: string;
}

export interface GuestStudentData {
  full_name: string;
  phone: string;
  academic_year?: AcademicYearId;
  gender?: StudentGender;
  study_type?: StudyType;
}

export interface AdminSecuritySettings {
  id: string;
  admin_username: string;
  password_hash: string;
  pin_hash: string;
  vault_enabled: boolean;
  vault_numeric_hash?: string;
  vault_complex_hash?: string;
  session_version: number;
  manual_approval_enabled: boolean;
  super_admin_slug?: string;
  super_admin_key?: string;
  staff_portal_slug?: string;
  staff_portal_key?: string;
  whatsapp_approval_number?: string;
  staff_visible_tabs?: Record<string, boolean>;
  recovery_code_hashes?: string[];
  registration_paused?: boolean;
  platform_lockdown?: boolean;
  updated_at?: string;
}

export interface SubAdminUser {
  id: string;
  username: string;
  password_hash: string;
  pin_hash: string;
  can_manage_students: boolean;
  can_manage_content: boolean;
  can_delete_content: boolean;
  can_access_student_vault: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSecurityLog {
  id: string;
  event_type: string;
  username?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface LegalStory {
  id: string;
  title: string;
  media_url: string;
  media_type?: 'image' | 'video';
  category?: string;
  caption?: string;
  is_active?: boolean;
  created_at: string;
}

export interface AdminSession {
  username: string;
  is_super_admin: boolean;
  session_version: number;
  permissions: {
    can_manage_students: boolean;
    can_manage_content: boolean;
    can_delete_content: boolean;
    can_access_student_vault: boolean;
  };
}

export interface GradeCover {
  year: AcademicYearId;
  cover_image_url: string;
  title?: string;
  updated_at?: string;
}

export type CharacterPresetId =
  | 'student-girl-sign'
  | 'student-boy-panic'
  | 'student-boy-running'
  | 'ramadan-mesaharaty'
  | 'snowman-peek'
  | 'santa-peek'
  | 'custom';

export interface CharacterMessage {
  id: string;
  text: string;
  is_active: boolean;
}

export interface CharacterWidgetSettings {
  enabled: boolean;
  selected_character: CharacterPresetId;
  custom_character_url?: string;
  peek_side: 'left' | 'right' | 'random';
  peek_interval_seconds: number;
  messages: CharacterMessage[];
}

export interface AcademicYearInfo {
  id: AcademicYearId;
  name: string;
  shortName: string;
  description: string;
  color: string;
  badge: string;
}

export interface Subject {
  id: string;
  name: string;
  year: AcademicYearId;
  created_at: string;
  materials_count?: number;
  color_code?: string;
}

export type MaterialType = 'pdf' | 'video';

export interface Material {
  id: string;
  title: string;
  description: string;
  file_type: MaterialType;
  file_url: string;
  storage_path: string;
  year: AcademicYearId;
  subject_id: string;
  cover_id?: string | null;
  file_size?: number;
  likes_count: number;
  is_cram?: boolean; // Night-before-exam mode flag
  read_time_minutes?: number; // Estimated study/read time
  views_count?: number;
  category?: 'lecture' | 'summary' | 'exam_review' | 'video';
  created_at: string;
  subjects?: {
    name: string;
  } | null;
}

export interface UrgentNewsItem {
  id: string;
  content: string;
  image_url?: string;
  image_storage_path?: string;
  is_active: boolean;
  created_at: string;
}

export interface ExamCountdownSettings {
  active: boolean;
  title: string;
  target_date: string;
}

export interface TeamMember {
  role: string;
  name: string;
  description: string;
  iconName: string;
}

// Site Settings for CMS & Occasion themes
export interface SiteSettings {
  college_name: string;
  platform_name: string;
  hero_title: string;
  hero_subtitle: string;
  leadership_text: string;
  active_occasion_theme: OccasionTheme;
  whatsapp_number: string;
  whatsapp_message: string;
  whatsapp_enabled: boolean;
  social_facebook: string;
  social_telegram: string;
  social_youtube: string;
  social_tiktok: string;
  social_whatsapp_group: string;
  cram_mode_enabled?: boolean;
  character_widget?: CharacterWidgetSettings;
  grade_covers?: Record<AcademicYearId, string>;
}

// Homepage Section Ordering & Visibility CMS
export interface SiteSection {
  id: string;
  section_key: string;
  title: string;
  is_visible: boolean;
  order_index: number;
}

// Quiz System Types
export type QuestionType = 'mcq' | 'true_false';

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  options: string[]; // 4 options for mcq, 2 for true_false
  correct_answer: string;
  explanation?: string;
  order_index: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  year: AcademicYearId;
  subject_id: string;
  cover_id?: string | null;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  subjects?: {
    name: string;
  } | null;
  questions?: QuizQuestion[];
  question_count?: number;
}

// Subject Cover & YouTube-Style Preview Model
export interface SubjectCover {
  id: string;
  subject_name: string;
  year: AcademicYearId;
  subject_id?: string | null;
  cover_image_url: string;
  cover_image_storage_path?: string;
  preview_video_url?: string;
  preview_video_storage_path?: string;
  professor_name?: string;
  description?: string;
  order_index?: number;
  created_at: string;
  materials_count?: number;
  videos_count?: number;
  quizzes_count?: number;
  subjects?: {
    name: string;
  } | null;
}

export interface QuizSubmission {
  id: string;
  quiz_id: string;
  student_name: string;
  student_phone?: string;
  year: AcademicYearId;
  score: number;
  total_score: number;
  percentage: number;
  created_at: string;
  quizzes?: {
    title: string;
  } | null;
}

// Student Request / Feedback Box
export interface StudentRequest {
  id: string;
  student_name: string;
  year: AcademicYearId;
  subject_name: string;
  request_text: string;
  contact_info?: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

// Video Chapters / Timestamps (Feature #10)
export interface VideoChapter {
  id: string;
  timeSeconds: number;
  timeFormatted: string; // e.g. "05:30"
  title: string;
}

// Lecture Bundles / Folders with Custom Cover Thumbnail (Part 1.2 & Features #1, #2, #3, #9, #10, #14)
export interface LectureBundle {
  id: string;
  title: string;
  professor_name: string;
  lecture_date: string;
  year: AcademicYearId;
  subject_id: string;
  thumbnail_url?: string;
  thumbnail_storage_path?: string;
  video_url?: string;
  video_storage_path?: string;
  video_chapters?: VideoChapter[];
  lecture_pdf_url?: string;
  lecture_pdf_storage_path?: string;
  summary_pdf_url?: string;
  summary_pdf_storage_path?: string;
  questions_pdf_url?: string;
  questions_pdf_storage_path?: string;
  related_quiz_id?: string;
  difficulty?: 'easy' | 'medium' | 'hard'; // سهلة / متوسطة / دسمة
  views_count?: number;
  downloads_count?: number;
  created_at: string;
  subjects?: {
    name: string;
  } | null;
  average_rating?: number;
  ratings_count?: number;
}

// Lecture Rating (5-star ratings)
export interface LectureRating {
  id: string;
  bundle_id: string;
  rating: number; // 1-5
  student_name?: string;
  created_at: string;
}

// French Legal Term from Database (Part 1.5 & Features #5, #7)
export interface FrenchTermRecord {
  id: string;
  french: string;
  arabic: string;
  year: AcademicYearId;
  audio_url?: string;
  audio_storage_path?: string;
  pronunciation_hint?: string;
  category?: string;
  example?: string;
  created_at: string;
}

// Certificate Data for Admin Generation (Part 1.1)
export interface CertificateData {
  studentName: string;
  studentPhone?: string;
  year: AcademicYearId;
  quizTitle: string;
  subjectName?: string;
  score: number;
  totalScore: number;
  percentage: number;
  issueDate: string;
}
