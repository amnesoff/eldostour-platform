import { AcademicYearInfo, TeamMember, SiteSettings, SiteSection, GranularPermissions, SupervisorWhatsAppEntry } from '@/types';

export const PLATFORM_NAME = 'منصة الدستور التعليمية';
export const COLLEGE_NAME = 'العلوم القانونية والحقوقية';
export const INDEPENDENCE_DISCLAIMER = 'تنويه: المنصة مستقلة وغير تابعة للكلية';
export const PLATFORM_SUBTITLE = 'البوابة الأكاديمية المستقلة الشاملة لطلاب القانون والعلوم الحقوقية';

export const ACADEMIC_YEARS: AcademicYearInfo[] = [
  {
    id: 1,
    name: 'الفرقة الأولى',
    shortName: 'أولى حقوق',
    description: 'المدخل للعلوم القانونية، الشريعة الإسلامية، والمنظمات الدولية',
    color: 'from-blue-600 via-indigo-600 to-sky-700',
    badge: 'سنة أولى',
  },
  {
    id: 2,
    name: 'الفرقة الثانية',
    shortName: 'ثانية حقوق',
    description: 'مصادر الالتزام والقانون المدني، العقوبات، والدستوري المعمق',
    color: 'from-amber-600 via-yellow-600 to-amber-700',
    badge: 'سنة ثانية',
  },
  {
    id: 3,
    name: 'الفرقة الثالثة',
    shortName: 'ثالثة حقوق',
    description: 'قانون العمل والتأمينات، الإجراءات الجنائية، والشركات التجارية',
    color: 'from-emerald-600 via-teal-600 to-green-700',
    badge: 'سنة ثالثة',
  },
  {
    id: 4,
    name: 'الفرقة الرابعة',
    shortName: 'رابعة حقوق - التخرج',
    description: 'القانون الدولي الخاص، الإجراءات المدنية، والتحكيم التجاري',
    color: 'from-purple-600 via-violet-600 to-indigo-800',
    badge: 'سنة التخرج',
  },
];

export const TEAM_CREDITS: TeamMember[] = [
  {
    role: 'المؤسس',
    name: 'مازن شكري',
    description: 'المؤسس وصانع المنصة، تطوير الرؤية الأكاديمية والتقنية الشاملة',
    iconName: 'Crown',
  },
  {
    role: 'المشرف العام',
    name: 'رحمة علاء',
    description: 'المشرف العام وتنسيق المادة القانونية وإدارة المحتوى الأكاديمي',
    iconName: 'Award',
  },
  {
    role: 'مشرف إداري',
    name: 'وليد محرم',
    description: 'المشرف الإداري ومتابعة الشؤون الطلابية والتنظيمية',
    iconName: 'ShieldCheck',
  },
  {
    role: 'مشرف إداري',
    name: 'يوسف عمرو',
    description: 'المشرف الإداري ومتابعة الدعم الفني وتفعيل حسابات الطلاب',
    iconName: 'ShieldCheck',
  },
  {
    role: 'مشرف إداري',
    name: 'ندى زيد',
    description: 'المشرف الإداري ومتابعة الجودة الأكاديمية وتنسيق الفرق الدراسية',
    iconName: 'ShieldCheck',
  },
];

export const LEADERSHIP_BAR_TEXT = 'إشراف وتأسيس: مازن شكري • رحمة علاء • وليد محرم • يوسف عمرو • ندى زيد';

export const DEFAULT_SUPERVISOR_WHATSAPP_LIST: SupervisorWhatsAppEntry[] = [
  { name: 'مازن شكري', role: 'المؤسس', phone: '201122144007', enabled: true },
  { name: 'رحمة علاء', role: 'المشرف العام', phone: '', enabled: true },
  { name: 'وليد محرم', role: 'مشرف إداري', phone: '', enabled: true },
  { name: 'يوسف عمرو', role: 'مشرف إداري', phone: '', enabled: true },
  { name: 'ندى زيد', role: 'مشرف إداري', phone: '', enabled: true },
];

export const DEFAULT_GRANULAR_PERMISSIONS: GranularPermissions = {
  materials: { view: true, add: true, edit: true, delete: false, bundles: true },
  quizzes: { view: true, create: true, edit: true, delete: false, results: true },
  stories: { view: true, add: true, edit: true, delete: false },
  students: { view: false, approve: false, edit_password: false, delete_ban: false },
  news_cms: { view: false, publish_news: false, switch_themes: false, edit_french_countdown: false, edit_whatsapp: false },
  requests_reports: { view: true, resolve_reports: true, respond_requests: true },
  security_backups: { view: false, manage_security: false, download_backup: false },
};

export const FOUNDER_FULL_PERMISSIONS: GranularPermissions = {
  materials: { view: true, add: true, edit: true, delete: true, bundles: true },
  quizzes: { view: true, create: true, edit: true, delete: true, results: true },
  stories: { view: true, add: true, edit: true, delete: true },
  students: { view: true, approve: true, edit_password: true, delete_ban: true },
  news_cms: { view: true, publish_news: true, switch_themes: true, edit_french_countdown: true, edit_whatsapp: true },
  requests_reports: { view: true, resolve_reports: true, respond_requests: true },
  security_backups: { view: true, manage_security: true, download_backup: true },
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  college_name: 'منصة مستقلة للعلوم القانونية',
  platform_name: 'منصة الدستور التعليمية',
  hero_title: 'منصة الدستور التعليمية',
  hero_subtitle: 'البوابة الأكاديمية المستقلة للعلوم القانونية ومحاضرات الحقوق',
  leadership_text: LEADERSHIP_BAR_TEXT,
  active_occasion_theme: 'default',
  whatsapp_number: '201122144007',
  whatsapp_message: 'مرحباً، أود الاستفسار عن محاضرات وخدمات منصة الدستور التعليمية',
  whatsapp_enabled: true,
  social_facebook: 'https://facebook.com',
  social_telegram: 'https://t.me',
  social_youtube: 'https://youtube.com',
  social_tiktok: 'https://tiktok.com',
  social_whatsapp_group: 'https://chat.whatsapp.com',
  cram_mode_enabled: false,
  grade_covers: {
    1: '',
    2: '',
    3: '',
    4: '',
  },
};

export const CHARACTER_PRESETS = [
  {
    id: 'student-girl-sign',
    name: 'طالبة القانون باللافتة البيضاء',
    badge: 'الأكثر شعبية 🎓',
    image: '/themes/student-girl-sign.png',
    description: 'طالبة متفوقة ترفع لوحة بيضاء تعرض نصائح المذاكرة والعبارات التحفيزية.',
  },
  {
    id: 'student-boy-panic',
    name: 'طالب المذاكرة المذعور',
    badge: 'طوارئ الامتحانات 😱',
    image: '/themes/student-boy-panic.png',
    description: 'طالب في حالة ذعر مضحكة يذكر الطلاب باقتراب الامتحانات وضرورة بدء المذاكرة.',
  },
  {
    id: 'student-boy-running',
    name: 'طالب الحقوق الهارب بالمذكرات',
    badge: 'جري المذكرات 🏃‍♂️',
    image: '/themes/student-boy-running.png',
    description: 'طالب يجري بسرعة وتتطاير منه أوراق المحاضرات مع نصائح سريعة.',
  },
  {
    id: 'ramadan-mesaharaty',
    name: 'المسحراتي الرمضاني الأصيل',
    badge: 'رمضان كريم 🌙',
    image: '/themes/ramadan-mesaharaty.png',
    description: 'المسحراتي بالطبلة والأزياء التراثية يوقظ الطلاب للمذاكرة والسحور.',
  },
  {
    id: 'snowman-peek',
    name: 'رجل الجليد الباسم',
    badge: 'رأس السنة ⛄',
    image: '/themes/snowman-peek.png',
    description: 'رجل جليد لطيف يطل من حافة الشاشة مع عبارات بهجة وتفاؤل.',
  },
  {
    id: 'santa-peek',
    name: 'بابا نويل الملوح',
    badge: 'أعياد وتفاؤل 🎅',
    image: '/themes/santa-peek.png',
    description: 'بابا نويل يطل ملوحاً بيديه ومحملاً بعبارات تشجيع وهدايا التفوق.',
  },
] as const;

export const DEFAULT_CHARACTER_WIDGET_SETTINGS = {
  enabled: true,
  selected_character: 'student-girl-sign' as const,
  custom_character_url: '',
  peek_side: 'right' as const,
  peek_interval_seconds: 25,
  messages: [
    { id: '1', text: 'ذاكرت اللي عليك يالا؟ 👀', is_active: true },
    { id: '2', text: 'يا ترى الحب وسنينه ولا القانون ومواده؟ 😂', is_active: true },
    { id: '3', text: 'الامتحانات على الأبواب.. شد حيلك يا بطل! ⚖️', is_active: true },
    { id: '4', text: 'القانون لا يحمي المغفلين.. افتح كتابك وذاكر! 📜', is_active: true },
    { id: '5', text: 'دراسة القانون مش سهلة بس أنت قدها 💪', is_active: true },
    { id: '6', text: 'الدكتور بيجيب من بين السطور.. ركّز! 🔍', is_active: true },
    { id: '7', text: 'فنجان قهوة وكتاب مدني، وخلي الباقي على الله ☕', is_active: true },
  ],
};

export const DEFAULT_SECTIONS: SiteSection[] = [
  { id: '1', section_key: 'urgent_news', title: 'شريط الأخبار العاجلة', is_visible: true, order_index: 1 },
  { id: '2', section_key: 'hero_banner', title: 'الواجهة الرئيسية والبحث', is_visible: true, order_index: 2 },
  { id: '3', section_key: 'exam_countdown', title: 'عداد الامتحانات التنازلي', is_visible: true, order_index: 3 },
  { id: '4', section_key: 'grades_grid', title: 'أقسام الفرق الدراسية الأربعة', is_visible: true, order_index: 4 },
  { id: '5', section_key: 'daily_tools', title: 'الأدوات الذكية (القاموس، الحاسبة، لوحة الشرف)', is_visible: true, order_index: 5 },
  { id: '6', section_key: 'legal_maxims', title: 'القاعدة القانونية والتحدي السريع', is_visible: true, order_index: 6 },
];

export const NEW_BADGE_HOURS = 72; // 3 days

export interface ScheduleSubjectDefinition {
  year: 1 | 2 | 3 | 4;
  name: string;
  lecturers: string[];
}

export const SCHEDULE_SUBJECTS: ScheduleSubjectDefinition[] = [
  // Grade 1
  { year: 1, name: 'القانون الدولي العام', lecturers: ['أ.د/ عبد الهادي عشري', 'د/ نانسي عبد الواحد علام'] },
  { year: 1, name: 'المدخل لدراسة القانون', lecturers: ['د/ عاطف عبد الحميد ندا', 'د/ محمد فتحي محمود'] },
  { year: 1, name: 'تاريخ النظم القانونية', lecturers: ['أ.د/ ايمان السيد عرفه', 'د/ سامح سعيد عبد المقصود'] },
  { year: 1, name: 'النظم السياسية', lecturers: ['د/ ام كلثوم عادل', 'د/ عبد الحميد حمدان حجازي'] },
  { year: 1, name: 'مصطلحات قانونية باللغة الانجليزية', lecturers: ['أ.م.د/ إبراهيم محمد عبداللا', 'د/ لمياء فتحي عبد الجليل'] },
  { year: 1, name: 'قضايا مجتمعية', lecturers: ['أ.م.د/ رضا عبد الجواد', 'أ.م.د/ اشرف السعيد مهنا'] },

  // Grade 2
  { year: 2, name: 'الاقتصاد السياسي - الاقتصاد الدولي والنقود والبنوك', lecturers: ['أ.د/ خالد سعد زغلول', 'د/ عبد الهادي رمزي'] },
  { year: 2, name: 'الشريعة الإسلامية قانون الاسرة', lecturers: ['د/ حسنين سالم زيدان', 'د/ يحي عبده'] },
  { year: 2, name: 'القانون المدني مصادر الالتزام', lecturers: ['أ.م.د/ بكر السعيد أبو طالب', 'د/ لمياء فتحي عبد الجليل'] },
  { year: 2, name: 'مصطلحات قانونية بلغة فرنسية', lecturers: ['أ.د/ سحر عبد الستار امام', 'أ.د/ حسام الدين محمد'] },
  { year: 2, name: 'القانون الجنائي- القسم العام', lecturers: ['أ.م.د/ رزق سعد علي', 'د/ رجب نادي سالم'] },
  { year: 2, name: 'الاحوال الشخصية لغير المسلمين', lecturers: ['د/ هديل طه غلوش'] },

  // Grade 3
  { year: 3, name: 'القانون الجنائي القسم الخاص', lecturers: ['د/ مدحت محمد الوكيل', 'د/ رجب نادي'] },
  { year: 3, name: 'الشريعة الإسلامية (المواريث - الوصايا)', lecturers: ['د/ يحي عبده', 'د/ ريم عبد اللطيف'] },
  { year: 3, name: 'قانون المرافعات ( التنظيم القضائي والاختصاص )', lecturers: ['أ.م.د/ هاني يحي محمد', 'د/ حيدر توفيق الدخيلي'] },
  { year: 3, name: 'القانون المدني (العقود المسماة)', lecturers: ['د/ حسن حواش حسن', 'د/ سعيدة عبد الستار'] },
  { year: 3, name: 'القانون التجاري العمليات التجارية - التاجر', lecturers: ['د/ حسن السيد زهره'] },
  { year: 3, name: 'القانون المالي', lecturers: ['أ.د/ خالد سعد زغلول'] },
  { year: 3, name: 'القانون الدولي الخاص مركز الأجانب والمواطن', lecturers: ['أ.م.د/ احمد أبو المجد'] },
  { year: 3, name: 'القانون الدولي الخاص ( الجنسية )', lecturers: ['أ.د/ رجائي حسين الشتيوي'] },

  // Grade 4
  { year: 4, name: 'مبادئ التنفيذ الجبري', lecturers: ['أ.د/ سحر عبد الستار امام', 'د/ محمد كمال بسيوني'] },
  { year: 4, name: 'القانون التجاري ( العقود التجارية والافلاس )', lecturers: ['أ.م.د/ رضا محمد عبد الجواد'] },
  { year: 4, name: 'القانون الدولي الخاص الاختصاص القضائي الدولي', lecturers: ['أ.م.د/ احمد أبو المجد'] },
  { year: 4, name: 'العقود الإدارية', lecturers: ['أ.م.د/ اشرف السعيد مهنا', 'د/ احمد حسين عبد الجواد'] },
  { year: 4, name: 'القانون الدولي الخاص الاختصاص القانوني الدولي', lecturers: ['أ.د/ رجائي حسين الشتيوي'] },
  { year: 4, name: 'قانون الإجراءات الجنائية 1', lecturers: ['أ.د/ حسام الدين محمد'] },
  { year: 4, name: 'التشريع الضريبي والإجراءات الضريبية', lecturers: ['د/ عبد الهادي رمزي'] },
  { year: 4, name: 'القانون البحري والجوي', lecturers: ['د/ إبراهيم سلامة شوشة'] },
];

// 30 Golden Features: Daily Legal Maxims (قواعد قانونية لاتينية وفرنسية وعربية)
export interface LegalMaxim {
  id: number;
  arabic: string;
  original: string;
  origin: 'Latin' | 'French' | 'Islamic';
  explanation: string;
}

export const LEGAL_MAXIMS: LegalMaxim[] = [
  {
    id: 1,
    arabic: 'العدل أساس الملك وغاية كل قانون',
    original: 'Justitia est fundamentum regni',
    origin: 'Latin',
    explanation: 'تعتبر العدالة هي الركيزة الجوهرية لاستقرار المجتمع وسيادة الدولة وحماية الحقوق.',
  },
  {
    id: 2,
    arabic: 'الأصل في الإنسان البراءة والشك يفسر لمصلحة المتهم',
    original: 'In dubio pro reo',
    origin: 'Latin',
    explanation: 'قرينة البراءة مبدأ دستوري أصيل لا يجوز إدانة شخص بدونه، وأي شك ينصرف لمصلحة المتهم.',
  },
  {
    id: 3,
    arabic: 'العقد شريعة المتعاقدين',
    original: 'Pacta sunt servanda',
    origin: 'Latin',
    explanation: 'الاتفاق المبرم بين أطرافه يقوم مقام القانون بينهم، ولا يجوز نقضه أو تعديله إلا باتفاقهم.',
  },
  {
    id: 4,
    arabic: 'لا جريمة ولا عقوبة إلا بنص قانوني',
    original: 'Nullum crimen, nulla poena sine lege',
    origin: 'Latin',
    explanation: 'مبدأ شرعية الجرائم والعقوبات، حماية لحرية الأفراد من تحكم السلطات العقابية.',
  },
  {
    id: 5,
    arabic: 'الجهل بالقانون لا يعتبر عذراً',
    original: 'Nemo censetur ignorare legem',
    origin: 'Latin',
    explanation: 'بمجرد نشر القانون في الجريدة الرسمية يفترض علم الكافة به ولا يقبل الدفع بالجهل به.',
  },
];

// French Legal Dictionary Terms (مع النطق الفرنسي)
export interface FrenchLegalTerm {
  french: string;
  arabic: string;
  pronunciationHint: string;
  category: string;
  example: string;
}

export const FRENCH_LEGAL_TERMS: FrenchLegalTerm[] = [
  {
    french: 'Droit constitutionnel',
    arabic: 'القانون الدستوري',
    pronunciationHint: 'دروا كونستيتوسيونيل',
    category: 'قانون عام',
    example: 'Le droit constitutionnel organise les pouvoirs publics.',
  },
  {
    french: 'Droit civil',
    arabic: 'القانون المدني',
    pronunciationHint: 'دروا سيفيل',
    category: 'قانون خاص',
    example: 'Le droit civil régit les rapports entre les personnes.',
  },
  {
    french: 'Contrat de vente',
    arabic: 'عقد البيع',
    pronunciationHint: 'كونترا دو فانت',
    category: 'عقود',
    example: 'Le contrat de vente transfère la propriété du bien.',
  },
  {
    french: 'Force majeure',
    arabic: 'القوة القاهرة',
    pronunciationHint: 'فورس ماجور',
    category: 'مسؤولية مدنية',
    example: 'La force majeure exonère le débiteur de sa responsabilité.',
  },
  {
    french: 'Jurisprudence',
    arabic: 'القضاء / السوابق القضائية',
    pronunciationHint: 'جوريسبرودونس',
    category: 'أصول قانون',
    example: 'La jurisprudence de la Cour de cassation unifie la loi.',
  },
  {
    french: 'Présomption d’innocence',
    arabic: 'قرينة البراءة',
    pronunciationHint: 'بريزومبسيون دينوسانس',
    category: 'إجراءات جنائية',
    example: 'Toute personne bénéficie de la présomption d’innocence.',
  },
  {
    french: 'Tribunal administratif',
    arabic: 'المحكمة الإدارية / مجلس الدولة',
    pronunciationHint: 'تريبونال أدمينيستراتيف',
    category: 'قضاء إداري',
    example: 'Le litige relève du tribunal administratif.',
  },
];

// Rapid-Fire Daily Legal Challenge (تحدي الصواب والخطأ)
export interface DailyChallengeQuestion {
  id: number;
  question: string;
  correctAnswer: boolean;
  explanation: string;
  articleRef: string;
}

export const DAILY_CHALLENGES: DailyChallengeQuestion[] = [
  {
    id: 1,
    question: 'يجوز في القانون الجنائي تطبيق نص التجريم بأثر رجعي إذا كان يشدد العقوبة على المتهم.',
    correctAnswer: false,
    explanation: 'خطأ: مبدأ عدم رجعية القوانين الجنائية يمنع تطبيق نصوص التجريم المشددة بأثر رجعي، بينما يطبق القانون الأصلح للمتهم فقط بأثر رجعي.',
    articleRef: 'المادة 5 من قانون العقوبات المصري',
  },
  {
    id: 2,
    question: 'يتحقق التضامن بين المدينين في القانون المدني المصري بناءً على الاتفاق أو نص القانون ولا يُفترض.',
    correctAnswer: true,
    explanation: 'صحيح: التضامن بين المدينين لا يُفترض في المسائل المدنية وإنما ينشأ عن اتفاق صريح أو نص في القانون.',
    articleRef: 'المادة 279 من القانون المدني المصري',
  },
  {
    id: 3,
    question: 'يعتبر الوعد بجائزة الموجه للكافة التزاماً بإرادة منفردة يلزم الواعد حتى لو تم العمل دون علم بالوعد.',
    correctAnswer: true,
    explanation: 'صحيح: من وجّه للجمهور وعداً بجائزة يعطاها عن عمل معين، التزم بإعطاء الجائزة لمن قام بالعمل ولو قام به دون علم بالوعد.',
    articleRef: 'المادة 162 من القانون المدني المصري',
  },
];
