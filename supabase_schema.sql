-- =======================================================================
-- منصة الدستور التعليمية (El-Dostour Educational Platform)
-- كلية الحقوق - جامعة مدينة السادات (Sadat City University)
-- Database & Storage Schema for Supabase PostgreSQL
-- =======================================================================

-- 1. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subjects_year ON public.subjects(year);

-- 2. Create Materials Table (PDFs, Summaries, Direct Videos)
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'video')),
    file_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    file_size BIGINT DEFAULT 0,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    is_cram BOOLEAN DEFAULT false NOT NULL,
    read_time_minutes INTEGER DEFAULT 10,
    views_count INTEGER DEFAULT 0,
    category TEXT DEFAULT 'lecture',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_materials_year ON public.materials(year);
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON public.materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_cram ON public.materials(is_cram);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON public.materials(created_at DESC);

-- 3. Create Urgent News Table
CREATE TABLE IF NOT EXISTS public.urgent_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    image_storage_path TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure image columns exist if table was already created
ALTER TABLE public.urgent_news ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.urgent_news ADD COLUMN IF NOT EXISTS image_storage_path TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_urgent_news_active ON public.urgent_news(is_active);

-- 4. Create Settings Table (for Countdown, etc.)
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.settings (key, value)
VALUES (
    'exam_countdown',
    jsonb_build_object(
        'active', false,
        'title', 'امتحانات نهاية الفصل الدراسي - كلية الحقوق جامعة مدينة السادات',
        'target_date', '2026-12-25T09:00:00'
    )
)
ON CONFLICT (key) DO NOTHING;

-- 5. Create Site Settings (for CMS & Occasion Themes)
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.site_settings (key, value)
VALUES (
    'general',
    jsonb_build_object(
        'college_name', 'كلية الحقوق - جامعة مدينة السادات',
        'platform_name', 'منصة الدستور التعليمية',
        'hero_title', 'منصة الدستور التعليمية',
        'hero_subtitle', 'البوابة الأكاديمية المتكاملة لطلاب كلية الحقوق - جامعة مدينة السادات',
        'leadership_text', 'إشراف وتأسيس: مازن شكري • رحمة علاء • وليد محرم',
        'active_occasion_theme', 'default',
        'whatsapp_number', '201000000000',
        'whatsapp_message', 'مرحباً، أود الاستفسار عن محاضرات منصة الدستور - حقوق السادات',
        'whatsapp_enabled', true,
        'social_facebook', 'https://facebook.com',
        'social_telegram', 'https://t.me',
        'social_youtube', 'https://youtube.com',
        'social_tiktok', 'https://tiktok.com',
        'social_whatsapp_group', 'https://chat.whatsapp.com',
        'cram_mode_enabled', false
    )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
    'character_widget',
    jsonb_build_object(
        'enabled', true,
        'selected_character', 'student-girl-sign',
        'custom_character_url', '',
        'peek_side', 'right',
        'peek_interval_seconds', 25,
        'messages', jsonb_build_array(
            jsonb_build_object('id', '1', 'text', 'ذاكرت اللي عليك يالا؟ 👀', 'is_active', true),
            jsonb_build_object('id', '2', 'text', 'يا ترى الحب وسنينه ولا القانون ومواده؟ 😂', 'is_active', true),
            jsonb_build_object('id', '3', 'text', 'الامتحانات على الأبواب.. شد حيلك يا بطل! ⚖️', 'is_active', true),
            jsonb_build_object('id', '4', 'text', 'القانون لا يحمي المغفلين.. افتح كتابك وذاكر! 📜', 'is_active', true),
            jsonb_build_object('id', '5', 'text', 'كلية الحقوق مش سهلة بس أنت قدها 💪', 'is_active', true)
        )
    )
)
ON CONFLICT (key) DO NOTHING;

-- 6. Create Site Sections (for Layout Ordering & Visibility)
CREATE TABLE IF NOT EXISTS public.site_sections (
    id TEXT PRIMARY KEY,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT true NOT NULL,
    order_index INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.site_sections (id, section_key, title, is_visible, order_index)
VALUES 
    ('1', 'urgent_news', 'شريط الأخبار العاجلة', true, 1),
    ('2', 'hero_banner', 'الواجهة الرئيسية والبحث', true, 2),
    ('3', 'exam_countdown', 'عداد الامتحانات التنازلي', true, 3),
    ('4', 'grades_grid', 'أقسام الفرق الدراسية الأربعة', true, 4),
    ('5', 'daily_tools', 'الأدوات الذكية (القاموس، الحاسبة، لوحة الشرف)', true, 5),
    ('6', 'legal_maxims', 'القاعدة القانونية والتحدي السريع', true, 6)
ON CONFLICT (id) DO NOTHING;

-- 7. Interactive Quiz Tables
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    duration_minutes INTEGER DEFAULT 15 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'true_false')),
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    order_index INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_phone TEXT,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    score INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_score ON public.quiz_submissions(percentage DESC);

-- 8. Student Requests & Feedback Box Table
CREATE TABLE IF NOT EXISTS public.student_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    subject_name TEXT NOT NULL,
    request_text TEXT NOT NULL,
    contact_info TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 9. Lecture Bundles / Folders Table (with 4-tab media & thumbnail)
CREATE TABLE IF NOT EXISTS public.lecture_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    professor_name TEXT DEFAULT '',
    lecture_date TEXT DEFAULT '',
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    thumbnail_url TEXT DEFAULT '',
    thumbnail_storage_path TEXT DEFAULT '',
    video_url TEXT DEFAULT '',
    video_storage_path TEXT DEFAULT '',
    video_chapters JSONB DEFAULT '[]'::jsonb,
    lecture_pdf_url TEXT DEFAULT '',
    lecture_pdf_storage_path TEXT DEFAULT '',
    summary_pdf_url TEXT DEFAULT '',
    summary_pdf_storage_path TEXT DEFAULT '',
    questions_pdf_url TEXT DEFAULT '',
    questions_pdf_storage_path TEXT DEFAULT '',
    related_quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
    difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    views_count INTEGER DEFAULT 0,
    downloads_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lecture_bundles_year ON public.lecture_bundles(year);
CREATE INDEX IF NOT EXISTS idx_lecture_bundles_subject ON public.lecture_bundles(subject_id);

-- 10. Lecture Ratings Table (5-star ratings)
CREATE TABLE IF NOT EXISTS public.lecture_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES public.lecture_bundles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    student_name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lecture_ratings_bundle ON public.lecture_ratings(bundle_id);

-- 10B. Subject Covers & YouTube-Style Previews (Two-Level Subject Hierarchy)
CREATE TABLE IF NOT EXISTS public.subject_covers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1 AND year <= 4),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    cover_image_url TEXT NOT NULL,
    cover_image_storage_path TEXT DEFAULT '',
    preview_video_url TEXT DEFAULT '',
    preview_video_storage_path TEXT DEFAULT '',
    professor_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    order_index INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS cover_id UUID REFERENCES public.subject_covers(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS cover_id UUID REFERENCES public.subject_covers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subject_covers_year ON public.subject_covers(year);
CREATE INDEX IF NOT EXISTS idx_materials_cover_id ON public.materials(cover_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_cover_id ON public.quizzes(cover_id);

-- 11. French Legal Dictionary Terms Table
CREATE TABLE IF NOT EXISTS public.french_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    french TEXT NOT NULL,
    arabic TEXT NOT NULL,
    year INTEGER DEFAULT 1 CHECK (year >= 1 AND year <= 4),
    audio_url TEXT DEFAULT '',
    audio_storage_path TEXT DEFAULT '',
    pronunciation_hint TEXT DEFAULT '',
    category TEXT DEFAULT 'قانون عام',
    example TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_french_terms_year ON public.french_terms(year);

-- 12. Safe Atomic Increment Function for Likes & Downloads
CREATE OR REPLACE FUNCTION public.increment_likes(material_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.materials
    SET likes_count = likes_count + 1
    WHERE id = material_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_bundle_downloads(bundle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.lecture_bundles
    SET downloads_count = downloads_count + 1
    WHERE id = bundle_id;
END;
$$;

-- 13. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.french_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_covers ENABLE ROW LEVEL SECURITY;

-- 14. Permissive Policies for Anon & Authenticated
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'subjects', 'materials', 'urgent_news', 'settings',
        'site_settings', 'site_sections', 'quizzes', 'quiz_questions',
        'quiz_submissions', 'student_requests', 'lecture_bundles',
        'lecture_ratings', 'french_terms', 'subject_covers'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public access on %I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public access on %I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- 15. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('lectures-pdfs', 'lectures-pdfs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('lectures-videos', 'lectures-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('french-audio', 'french-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('theme-assets', 'theme-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for theme-assets
DROP POLICY IF EXISTS "Public read theme-assets" ON storage.objects;
CREATE POLICY "Public read theme-assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'theme-assets');

DROP POLICY IF EXISTS "Public insert theme-assets" ON storage.objects;
CREATE POLICY "Public insert theme-assets" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'theme-assets');

DROP POLICY IF EXISTS "Public update theme-assets" ON storage.objects;
CREATE POLICY "Public update theme-assets" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'theme-assets');

DROP POLICY IF EXISTS "Public delete theme-assets" ON storage.objects;
CREATE POLICY "Public delete theme-assets" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'theme-assets');

-- Storage policies for thumbnails
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;
CREATE POLICY "Public read thumbnails" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Public insert thumbnails" ON storage.objects;
CREATE POLICY "Public insert thumbnails" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Public update thumbnails" ON storage.objects;
CREATE POLICY "Public update thumbnails" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'thumbnails');

DROP POLICY IF EXISTS "Public delete thumbnails" ON storage.objects;
CREATE POLICY "Public delete thumbnails" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'thumbnails');

-- Storage policies for french-audio
DROP POLICY IF EXISTS "Public read french-audio" ON storage.objects;
CREATE POLICY "Public read french-audio" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'french-audio');

DROP POLICY IF EXISTS "Public insert french-audio" ON storage.objects;
CREATE POLICY "Public insert french-audio" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'french-audio');

DROP POLICY IF EXISTS "Public update french-audio" ON storage.objects;
CREATE POLICY "Public update french-audio" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'french-audio');

DROP POLICY IF EXISTS "Public delete french-audio" ON storage.objects;
CREATE POLICY "Public delete french-audio" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'french-audio');

-- Storage policies for lectures-pdfs
DROP POLICY IF EXISTS "Public read lectures-pdfs" ON storage.objects;
CREATE POLICY "Public read lectures-pdfs" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lectures-pdfs');

DROP POLICY IF EXISTS "Public insert lectures-pdfs" ON storage.objects;
CREATE POLICY "Public insert lectures-pdfs" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'lectures-pdfs');

DROP POLICY IF EXISTS "Public update lectures-pdfs" ON storage.objects;
CREATE POLICY "Public update lectures-pdfs" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'lectures-pdfs');

DROP POLICY IF EXISTS "Public delete lectures-pdfs" ON storage.objects;
CREATE POLICY "Public delete lectures-pdfs" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'lectures-pdfs');

-- Storage policies for lectures-videos
DROP POLICY IF EXISTS "Public read lectures-videos" ON storage.objects;
CREATE POLICY "Public read lectures-videos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lectures-videos');

DROP POLICY IF EXISTS "Public insert lectures-videos" ON storage.objects;
CREATE POLICY "Public insert lectures-videos" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'lectures-videos');

DROP POLICY IF EXISTS "Public update lectures-videos" ON storage.objects;
CREATE POLICY "Public update lectures-videos" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'lectures-videos');

DROP POLICY IF EXISTS "Public delete lectures-videos" ON storage.objects;
CREATE POLICY "Public delete lectures-videos" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'lectures-videos');

-- 16. Enable Realtime Publications
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.urgent_news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lecture_bundles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lecture_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.french_terms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subject_covers;
