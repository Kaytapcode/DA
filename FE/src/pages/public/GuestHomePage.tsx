import { useNavigate } from 'react-router-dom';

export default function GuestHomePage() {
  const navigate = useNavigate();
  const currentLanguage = localStorage.getItem('language') || 'vi';

  const content = {
    vi: {
      tagline: 'NEXT-GEN COGNITIVE ENGINE',
      headline: 'Tương Lai của Học Tập là',
      headlineHighlight: 'Lượng Tử',
      description: 'Bước vào Phòng Thí Nghiệm Vô Tân. Trải nghiệm một LMS thích ứng theo thời gian thực, tận dụng xử lý thần kinh để sưu tầm sự phát triển trí tuệ của bạn.',
      startJourney: 'Bắt Đầu Hành Trình',
      viewCurriculum: 'Xem Chương Trình',
      designedFor: 'Được Thiết Kế Cho Độ Chính Xác',
      designedDesc: 'Vượt qua các mô-đun tiêu chuẩn. Chúng tôi cung cấp sự phát triển kiến trúc thần kinh.',
      adaptivePaths: 'Đường Dẫn Thích Ứng',
      adaptiveDesc: 'Các chương trình học năng động thích ứng dựa trên tải nhận thức và số liệu về hiệu suất theo thời gian thực của bạn.',
      realtimeAnalytics: 'Phân Tích Theo Thời Gian Thực',
      realtimeDesc: 'Theo dõi vi giây của sự tham gia. Xem sức mạnh tâm lý được trực quan hóa trong bảng điều khiển đặc biệt của chúng tôi.',
      collaborativeLab: 'Phòng Thí Nghiệm Hợp Tác',
      collaborativeDesc: 'Một môi trường ảo nơi các nhà nghiên cứu và sinh viên hợp tác trong các phiên sinh động cao.',
      echoes: 'Tiếng Vang từ',
      echoesHighlight: 'Phòng Thí Nghiệm Vô Tân',
      ready: 'Sẵn Sàng Bắt Đầu?',
      readyDesc: 'Đảm bảo quyền truy cập của bạn vào mô hình học tập tiếp theo. Phòng Thí Nghiệm Vô Tân đang chờ đợi.',
      initiateOnboarding: 'Khởi Tạo Onboarding',
      requestDemo: 'Yêu Cầu Demo',
      login: 'Đăng Nhập',
      joinNow: 'Tham Gia Ngay',
      copyright: '© 2026 LUMINA INTERFACE. BUILT FOR THE ETHEREAL LABORATORY',
    },
    en: {
      tagline: 'NEXT-GEN COGNITIVE ENGINE',
      headline: 'The Future of Learning is',
      headlineHighlight: 'Quantum',
      description: 'Step into the Ethereal Laboratory. Experience an LMS that adapts in real-time, leveraging neural processing to curate your intellectual evolution.',
      startJourney: 'Start Journey',
      viewCurriculum: 'View Curriculum',
      designedFor: 'Designed for Precision',
      designedDesc: 'Beyond standard modules. We offer neural architectural growth.',
      adaptivePaths: 'Adaptive Paths',
      adaptiveDesc: 'Dynamic curricula that reshape themselves based on your cognitive load and real-time performance metrics.',
      realtimeAnalytics: 'Real-time Analytics',
      realtimeDesc: 'Millisecond-level tracking of engagement. See your synaptic strength visualized in our hyperfluid dashboard.',
      collaborativeLab: 'Collaborative Lab',
      collaborativeDesc: 'A virtual environment where researchers and students converge in high-density synchronous laboratory sessions.',
      echoes: 'Echoes from the',
      echoesHighlight: 'Ethereal Laboratory',
      ready: 'Ready to begin?',
      readyDesc: 'Secure your entry into the next paradigm of human learning. The Ethereal Laboratory is waiting.',
      initiateOnboarding: 'Initiate Onboarding',
      requestDemo: 'Request Demo',
      login: 'Login',
      joinNow: 'Join Now',
      copyright: '© 2024 LUMINA INTERFACE. BUILT FOR THE ETHEREAL LABORATORY',
    },
  };

  const t = content[currentLanguage as keyof typeof content] || content.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-slate-900/30 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Lumina
            </div>
            <div className="hidden md:flex gap-6 text-sm text-gray-300">
              <button className="hover:text-white transition-colors">Curriculum</button>
              <button className="hover:text-white transition-colors">Laboratory</button>
              <button className="hover:text-white transition-colors">Research</button>
              <button className="hover:text-white transition-colors">About</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {t.login}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {t.joinNow}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl top-1/4 -left-48 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl bottom-1/4 -right-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-xs tracking-widest text-purple-400 font-semibold">▲ {t.tagline}</p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                {t.headline}{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {t.headlineHighlight}
                </span>
              </h1>
            </div>

            <p className="text-lg text-gray-300 leading-relaxed max-w-lg">
              {t.description}
            </p>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {t.startJourney}
              </button>
              <button className="px-8 py-3 border border-gray-400 text-gray-300 hover:text-white font-medium rounded-lg transition-colors">
                {t.viewCurriculum}
              </button>
            </div>
          </div>

          {/* Right Visualization - Neural Network Sphere */}
          <div className="relative h-96 md:h-full min-h-96 flex items-center justify-center">
            <div className="relative w-full h-full max-w-md mx-auto">
              {/* Outer glowing circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full blur-2xl opacity-20"></div>

              {/* Main sphere with neural pattern */}
              <div className="absolute inset-0 rounded-full border-2 border-purple-400/30 backdrop-blur-sm bg-gradient-to-br from-purple-400/10 to-blue-400/10 flex items-center justify-center">
                {/* Inner neural network pattern */}
                <svg className="w-full h-full" viewBox="0 0 400 400" style={{ filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.5))' }}>
                  {/* Draw neural connections */}
                  <defs>
                    <radialGradient id="sphereGradient" cx="40%" cy="40%">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.3" />
                    </radialGradient>
                  </defs>

                  {/* Background sphere */}
                  <circle cx="200" cy="200" r="180" fill="url(#sphereGradient)" />

                  {/* Neural nodes */}
                  {[...Array(12)].map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2;
                    const x = 200 + Math.cos(angle) * 140;
                    const y = 200 + Math.sin(angle) * 140;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="6"
                        fill="#60a5fa"
                        opacity="0.8"
                        className="animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    );
                  })}

                  {/* Connection lines */}
                  {[...Array(12)].map((_, i) => {
                    const angle1 = (i / 12) * Math.PI * 2;
                    const x1 = 200 + Math.cos(angle1) * 140;
                    const y1 = 200 + Math.sin(angle1) * 140;
                    const angle2 = ((i + 3) / 12) * Math.PI * 2;
                    const x2 = 200 + Math.cos(angle2) * 140;
                    const y2 = 200 + Math.sin(angle2) * 140;
                    return (
                      <line
                        key={`line-${i}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#7c3aed"
                        strokeWidth="1"
                        opacity="0.4"
                      />
                    );
                  })}

                  {/* Central core */}
                  <circle cx="200" cy="200" r="20" fill="#60a5fa" opacity="0.6" />
                  <circle cx="200" cy="200" r="12" fill="#93c5fd" />
                </svg>

                {/* Percentage badge */}
                <div className="absolute top-8 right-8 bg-slate-800/80 backdrop-blur border border-purple-400/30 px-4 py-2 rounded-lg text-sm font-semibold">
                  <span className="text-blue-400">98.4%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">{t.designedFor}</h2>
            <p className="text-gray-400 text-lg">{t.designedDesc}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative p-8 rounded-xl border border-purple-400/20 hover:border-purple-400/50 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300">
              <div className="text-3xl mb-4">
                <span className="inline-block w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  ↗
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.adaptivePaths}</h3>
              <p className="text-gray-400">{t.adaptiveDesc}</p>
              <div className="mt-4 pt-4 border-t border-purple-400/10">
                <a href="#" className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-2">
                  Explore Neural Logic →
                </a>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative p-8 rounded-xl border border-purple-400/20 hover:border-purple-400/50 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300">
              <div className="text-3xl mb-4">
                <span className="inline-block w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  📊
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.realtimeAnalytics}</h3>
              <p className="text-gray-400">{t.realtimeDesc}</p>
              <div className="mt-4 h-12 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg flex items-end justify-around px-2 py-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-gradient-to-t from-blue-400 to-purple-400 rounded-full"
                    style={{ height: `${20 + i * 15}%` }}
                  ></div>
                ))}
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative p-8 rounded-xl border border-purple-400/20 hover:border-purple-400/50 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300">
              <div className="text-3xl mb-4">
                <span className="inline-block w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  👥
                </span>
              </div>
              <h3 className="text-xl font-bold mb-3">{t.collaborativeLab}</h3>
              <p className="text-gray-400">{t.collaborativeDesc}</p>
              <div className="mt-4 pt-4 border-t border-purple-400/10 flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border border-slate-800 flex items-center justify-center text-white text-xs font-bold"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-bold">
              {t.echoes}{' '}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t.echoesHighlight}
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Testimonial Content */}
            <div className="space-y-6">
              <blockquote className="text-xl md:text-2xl italic text-gray-200 leading-relaxed">
                "The precision of the Lumina interface is unlike anything we've seen in the education sector. It feels less like a platform and more like a cognitive extension."
              </blockquote>

              <div className="flex items-center gap-4 pt-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xl font-bold">
                  ET
                </div>
                <div>
                  <p className="font-bold text-white">Dr. Elena Thorne</p>
                  <p className="text-sm text-gray-400">DIRECTOR OF NEURAL RESEARCH, AXION</p>
                </div>
              </div>
            </div>

            {/* Testimonial Images Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg overflow-hidden h-48 bg-gradient-to-br from-emerald-500 to-teal-600"></div>
              <div className="rounded-lg overflow-hidden h-48 bg-gradient-to-br from-cyan-500 to-blue-600"></div>
              <div className="rounded-lg overflow-hidden h-48 bg-gradient-to-br from-purple-500 to-indigo-600"></div>
              <div className="rounded-lg overflow-hidden h-48 bg-gradient-to-br from-slate-600 to-gray-700"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-12 text-center space-y-6 backdrop-blur-sm border border-blue-400/30">
            <h2 className="text-4xl md:text-5xl font-bold">{t.ready}</h2>
            <p className="text-lg text-blue-100">{t.readyDesc}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors"
              >
                {t.initiateOnboarding}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
              >
                {t.requestDemo}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-400/20 py-8 px-4 sm:px-6 lg:px-8 text-center text-gray-400 text-sm">
        <p>{t.copyright}</p>
      </footer>
    </div>
  );
}
