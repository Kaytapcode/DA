import { useNavigate } from 'react-router-dom';
import { APP_BRAND } from '@constants/navigation';

// Public landing page. Neutral LMS pitch — login/register CTAs and the four core features
// (Quiz / Document / Flashcard / Video) from the system spec.
export default function GuestHomePage() {
  const navigate = useNavigate();
  const lang = localStorage.getItem('language') || 'en';

  const content = {
    en: {
      tagline: 'AI-POWERED LEARNING',
      headlinePrefix: 'Learn smarter with',
      headlineHighlight: APP_BRAND.name,
      description:
        'A learning platform for quizzes, study documents, flashcards, and video lessons — organized into courses by your instructors and powered by AI-generated assessments.',
      startJourney: 'Get Started',
      viewCourses: 'Browse Courses',
      designedFor: 'Everything you need to study',
      designedDesc: 'Four core learning resources, organized into modules, scoped to your courses.',
      quizTitle: 'AI Quizzes',
      quizDesc: 'Generate multiple-choice quizzes from any PDF or text. Every question comes with an explanation.',
      docTitle: 'Documents',
      docDesc: 'Upload PDFs, images, and text files. Read them in the browser without leaving the LMS.',
      deckTitle: 'Flashcards',
      deckDesc: 'Build decks of front/back cards. Flip, shuffle, and hide cards you have already mastered.',
      videoTitle: 'Video Lessons',
      videoDesc: 'Paste a YouTube link to embed a video. Watch lessons directly inside the course.',
      ready: 'Ready to start?',
      readyDesc: 'Create an account or log in to access your courses and personal library.',
      login: 'Log In',
      joinNow: 'Sign Up',
      copyright: `© ${new Date().getFullYear()} ${APP_BRAND.name}`,
    },
    vi: {
      tagline: 'HỌC TẬP VỚI AI',
      headlinePrefix: 'Học tập hiệu quả hơn cùng',
      headlineHighlight: APP_BRAND.name,
      description:
        'Một nền tảng học tập gồm bài kiểm tra, tài liệu, thẻ ghi nhớ và video bài giảng — được tổ chức thành khóa học và hỗ trợ tạo bài kiểm tra bằng AI.',
      startJourney: 'Bắt đầu',
      viewCourses: 'Xem khóa học',
      designedFor: 'Mọi thứ bạn cần để học',
      designedDesc: 'Bốn loại tài nguyên cốt lõi, tổ chức theo mô-đun và phạm vi khóa học.',
      quizTitle: 'Quiz AI',
      quizDesc: 'Tạo câu hỏi trắc nghiệm từ tệp PDF hoặc văn bản. Mỗi câu hỏi đều có giải thích.',
      docTitle: 'Tài liệu',
      docDesc: 'Tải lên tệp PDF, hình ảnh và văn bản. Xem trực tiếp trong trình duyệt.',
      deckTitle: 'Thẻ ghi nhớ',
      deckDesc: 'Tạo bộ thẻ mặt trước/mặt sau. Lật, xáo trộn và ẩn các thẻ đã thuộc.',
      videoTitle: 'Video bài giảng',
      videoDesc: 'Dán liên kết YouTube để nhúng video. Xem ngay trong khóa học.',
      ready: 'Sẵn sàng bắt đầu?',
      readyDesc: 'Tạo tài khoản hoặc đăng nhập để truy cập khóa học và thư viện cá nhân.',
      login: 'Đăng nhập',
      joinNow: 'Đăng ký',
      copyright: `© ${new Date().getFullYear()} ${APP_BRAND.name}`,
    },
  };

  const t = content[lang as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600">{APP_BRAND.name}</div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              {t.login}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t.joinNow}
            </button>
          </div>
        </div>
      </nav>

      <section className="px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="text-xs tracking-widest text-blue-600 font-semibold">{t.tagline}</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {t.headlinePrefix}{' '}
            <span className="text-blue-600">{t.headlineHighlight}</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">{t.description}</p>
          <div className="flex gap-4 pt-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {t.startJourney}
            </button>
            
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.designedFor}</h2>
            <p className="text-slate-600 text-lg">{t.designedDesc}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: t.quizTitle, desc: t.quizDesc, icon: '?' },
              { title: t.docTitle, desc: t.docDesc, icon: '📄' },
              { title: t.deckTitle, desc: t.deckDesc, icon: '🗂' },
              { title: t.videoTitle, desc: t.videoDesc, icon: '▶' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-white transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-semibold mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">{t.ready}</h2>
          <p className="text-slate-600 text-lg">{t.readyDesc}</p>
          <div className="flex gap-4 pt-2 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              {t.joinNow}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors"
            >
              {t.login}
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-xs text-slate-500 tracking-wide">
          {t.copyright}
        </div>
      </footer>
    </div>
  );
}
