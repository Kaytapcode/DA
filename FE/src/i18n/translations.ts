// Language translations for EN-VI
// Usage: import { t } from '@/i18n/translations'
//        t('key', language) or just t('key') for current lang

export type LanguageCode = 'en' | 'vi'

export const languages = {
  en: 'English',
  vi: 'Tiếng Việt',
}

export const translations = {
  // Common
  'common.home': { en: 'Home', vi: 'Trang Chủ' },
  'common.welcome': { en: 'Welcome back!', vi: 'Chào mừng quay lại!' },
  'common.dashboard': { en: 'Dashboard', vi: 'Bảng Điều Khiển' },
  'common.courses': { en: 'Courses', vi: 'Khóa Học' },
  'common.organizations': { en: 'Organizations', vi: 'Tổ Chức' },
  'common.settings': { en: 'Settings', vi: 'Cài Đặt' },
  'common.profile': { en: 'Profile', vi: 'Hồ Sơ' },
  'common.logout': { en: 'Logout', vi: 'Đăng Xuất' },
  'common.login': { en: 'Login', vi: 'Đăng Nhập' },
  'common.register': { en: 'Register', vi: 'Đăng Ký' },
  'common.search': { en: 'Search', vi: 'Tìm Kiếm' },
  'common.notifications': { en: 'Notifications', vi: 'Thông Báo' },
  'common.history': { en: 'History', vi: 'Lịch Sử' },
  'common.members': { en: 'Members', vi: 'Thành Viên' },
  'common.help': { en: 'Help Center', vi: 'Trung Tâm Trợ Giúp' },
  'common.continue': { en: 'Continue', vi: 'Tiếp Tục' },
  'common.progress': { en: 'Progress', vi: 'Tiến Độ' },
  'common.complete': { en: 'complete', vi: 'hoàn thành' },
  'common.language': { en: 'Language', vi: 'Ngôn Ngữ' },
  'common.noNotifications': { en: 'No new notifications', vi: 'Không có thông báo mới' },

  // Auth
  'auth.email': { en: 'Email', vi: 'Email' },
  'auth.password': { en: 'Password', vi: 'Mật Khẩu' },
  'auth.confirmPassword': { en: 'Confirm Password', vi: 'Xác Nhận Mật Khẩu' },
  'auth.rememberMe': { en: 'Remember me', vi: 'Ghi Nhớ Tôi' },
  'auth.forgotPassword': { en: 'Forgot password?', vi: 'Quên mật khẩu?' },
  'auth.signIn': { en: 'Sign in', vi: 'Đăng Nhập' },
  'auth.signUp': { en: 'Sign up', vi: 'Đăng Ký' },
  'auth.twoFactor': { en: '2-Factor Authentication', vi: 'Xác Thực 2 Lớp' },
  'auth.enterOtp': { en: 'Enter OTP', vi: 'Nhập Mã OTP' },
  'auth.resendCode': { en: 'Resend Code', vi: 'Gửi Lại Mã' },
  'auth.role': { en: 'Role', vi: 'Vai Trò' },
  'auth.admin': { en: 'Administrator', vi: 'Quản Trị Viên' },
  'auth.instructor': { en: 'Instructor', vi: 'Giảng Viên' },
  'auth.student': { en: 'Student', vi: 'Học Viên' },

  // User Pages
  'user.courses': { en: 'My Courses', vi: 'Khóa Học Của Tôi' },
  'user.settings': { en: 'Settings', vi: 'Cài Đặt' },
  'user.learning': { en: 'Learning History', vi: 'Lịch Sử Học Tập' },
  'user.inbox': { en: 'Messages', vi: 'Tin Nhắn' },
  'user.library': { en: 'Content Library', vi: 'Thư Viện Nội Dung' },
  'user.collections': { en: 'Collections', vi: 'Bộ Sưu Tập' },
  'user.search': { en: 'Search', vi: 'Tìm Kiếm' },
  'user.browse': { en: 'Browse Public', vi: 'Khám Phá' },
  'user.browseCourses': { en: 'Browse Courses', vi: 'Khám phá khoá học' },
  'user.quiz': { en: 'Quizzes', vi: 'Bài Kiểm Tra' },
  'user.lesson': { en: 'Video Lessons', vi: 'Bài Học Video' },
  'user.flashcards': { en: 'Flashcards', vi: 'Thẻ Ghi Nhớ' },
  'user.documents': { en: 'Documents', vi: 'Tài Liệu' },
  'user.learningJourney': { en: "Here's what's happening in your learning journey", vi: 'Đây là những gì đang xảy ra trong hành trình học tập của bạn' },
  'user.inProgress': { en: 'In Progress', vi: 'Đang Thực Hiện' },
  'user.upcomingEvents': { en: 'Upcoming Events', vi: 'Sự Kiện Sắp Tới' },
  'user.course': { en: 'Course', vi: 'Khóa Học' },
  'user.event': { en: 'Event', vi: 'Sự Kiện' },

  // Admin Pages
  'admin.courseManagement': { en: 'Course Management', vi: 'Quản Lý Khóa Học' },
  'admin.memberManagement': { en: 'Member Management', vi: 'Quản Lý Thành Viên' },
  'admin.reports': { en: 'Reports', vi: 'Báo Cáo' },
  'admin.courseEditor': { en: 'Course Editor', vi: 'Chỉnh Sửa Khóa Học' },
  'admin.curriculum': { en: 'Curriculum', vi: 'Chương Trình Học' },
  'admin.roles': { en: 'Member Roles', vi: 'Vai Trò Thành Viên' },

  // System Admin
  'sysadmin.overview': { en: 'System Overview', vi: 'Tổng Quan Hệ Thống' },
  'sysadmin.users': { en: 'User Management', vi: 'Quản Lý Người Dùng' },
  'sysadmin.organizations': { en: 'Organizations', vi: 'Tổ Chức' },
  'sysadmin.courses': { en: 'Global Courses', vi: 'Khóa Học Toàn Cục' },
  'sysadmin.logs': { en: 'System Logs', vi: 'Nhật Ký Hệ Thống' },
  'sysadmin.aiKeys': { en: 'AI API Keys', vi: 'Khóa API AI' },
  'sysadmin.settings': { en: 'Platform Settings', vi: 'Cài Đặt Nền Tảng' },

  // Common UI
  'ui.edit': { en: 'Edit', vi: 'Chỉnh Sửa' },
  'ui.delete': { en: 'Delete', vi: 'Xóa' },
  'ui.save': { en: 'Save', vi: 'Lưu' },
  'ui.cancel': { en: 'Cancel', vi: 'Hủy' },
  'ui.submit': { en: 'Submit', vi: 'Gửi' },
  'ui.loading': { en: 'Loading...', vi: 'Đang Tải...' },
  'ui.error': { en: 'Error', vi: 'Lỗi' },
  'ui.success': { en: 'Success', vi: 'Thành Công' },
  'ui.warning': { en: 'Warning', vi: 'Cảnh Báo' },
  'ui.info': { en: 'Information', vi: 'Thông Tin' },
  'ui.viewAll': { en: 'View All', vi: 'Xem Tất Cả' },
  'ui.changes': { en: 'Changes', vi: 'Các thay đổi' },

  // Notifications
  'notify.success': { en: 'Success!', vi: 'Thành Công!' },
  'notify.error': { en: 'Error!', vi: 'Lỗi!' },
  'notify.warning': { en: 'Warning!', vi: 'Cảnh Báo!' },
  'notify.info': { en: 'Information', vi: 'Thông Tin' },
}

// Get current language from localStorage or default to 'en'
export const getCurrentLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem('language')
  return (stored as LanguageCode) || 'en'
}

// Set language in localStorage
export const setLanguage = (lang: LanguageCode) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('language', lang)
  }
}

// Translation function
export const t = (key: string, language?: LanguageCode): string => {
  const lang = language || getCurrentLanguage()
  const record = translations[key as keyof typeof translations]
  
  if (!record) {
    console.warn(`Translation key not found: ${key}`)
    return key
  }
  
  return record[lang] || record.en || key
}

// Type-safe translation key
export type TranslationKey = keyof typeof translations

