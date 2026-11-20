export type AcademicYearId = 1 | 2 | 3 | 4;

export type GenderTheme = 'blue' | 'burgundy';
export type OccasionTheme = 'default' | 'ramadan' | 'new_year' | 'exams' | 'valentine';

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
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  subjects?: {
    name: string;
  } | null;
  questions?: QuizQuestion[];
  question_count?: number;
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
