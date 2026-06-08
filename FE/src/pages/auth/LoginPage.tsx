import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useOrgContext } from '@/contexts/OrgContext';
import { apiClient } from '@/utils/apiClient';

interface LoginFormData {
  identifier: string;
  password: string;
}

interface FormErrors {
  identifier?: string;
  password?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthContext();
  const { setOrg } = useOrgContext();

  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleFieldChange = (field: keyof FormErrors, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = 'Email or username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (/\s/.test(formData.password)) {
      newErrors.password = 'Password cannot contain spaces';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      const { user, orgId } = await login(
        formData.identifier.trim(),
        formData.password,
      );

      // For OrgAdmin, fetch full org info and store in OrgContext so the admin
      // dashboard has access to org name/slug without requiring the user to
      // manually enter an Org ID.
      if (user.role === 'OrgAdmin' && orgId) {
        try {
          const orgRes = await apiClient.get<{ id: string; name: string; slug: string }>(
            `/organizations/${orgId}`
          );
          if (orgRes.success && orgRes.data) {
            setOrg({ id: orgRes.data.id, slug: orgRes.data.slug, name: orgRes.data.name });
          }
        } catch { /* org fetch failure is non-fatal; OrgContext will be blank */ }
      }

      // Route by role
      const dest =
        user.role === 'SysAdmin'  ? '/sysadmin/dashboard' :
        user.role === 'OrgAdmin'  ? '/admin/dashboard' :
        '/user/home';
      navigate(dest, { replace: true });
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Failed to login. Please check your credentials and try again.'
      );
    }
  };

  const handleGoogleLogin = () => {
    // Google SSO requires a configured OAuth client id (FE) AND the BE /auth/google verifier.
    // When the client id isn't configured, show an honest message instead of a misleading
    // "chưa load xong" that loops forever.
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setSubmitError('Đăng nhập Google chưa được cấu hình. Vui lòng đăng nhập bằng tài khoản & mật khẩu.');
      return;
    }
    if (!window.google) {
      setSubmitError('Google Sign-In chưa load xong, thử lại sau giây lát.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          const res = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            accessTokenExpiresInSeconds: number;
            user: { id: string; username: string; email: string; role: string };
            orgId?: string;
            isNewUser: boolean;
          }>('/auth/google', { idToken: response.credential });

          if (!res.success || !res.data) throw new Error(res.message || 'Google login failed');

          const { refreshToken, user, isNewUser } = res.data;

          // Lưu token (dùng tokenStore từ useAuth nếu exposed, hoặc gọi login flow)
          // Cách đơn giản nhất: gọi endpoint rồi reload để bootstrap auth
          localStorage.setItem('lms_rt', refreshToken);
          // Sau khi set RT, doRefresh() trong useAuth bootstrap sẽ tự lấy AT mới

          if (isNewUser) {
            navigate('/sso/complete-profile');
          } else {
            const dest =
              user.role === 'SysAdmin' ? '/sysadmin/dashboard' :
              user.role === 'OrgAdmin' ? '/admin/dashboard' :
              '/user/home';
            navigate(dest, { replace: true });
          }
        } catch (err) {
          setSubmitError((err as any)?.message || 'Google login thất bại.');
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Container */}
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left Section - Branding */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#001a4d] via-[#0d2b7a] to-[#051535] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          {/* Decorative Blobs */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#0066ff]/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-[#0099ff]/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-80 w-80 rounded-full bg-[#00ccff]/5 blur-3xl" />

          {/* Badge */}
          {/* <div className="relative">
            <div className="inline-block rounded-full border border-[#0099ff]/40 bg-white/5 px-4 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#99ccff]">+ THE ETHEREAL LABORATORY</p>
            </div>
          </div> */}

          {/* Heading and Description */}
          <div className="relative mt-8">
            <h1 className="text-5xl font-black leading-tight text-white">
              Illuminate Your<br />Intellectual Path.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#b3d9ff]">
              Access our proprietary curriculum and laboratory research environment through the Lumina Interface.
            </p>
          </div>

          {/* Stats */}
          {/* <div className="relative space-y-4">
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-4xl font-black text-white">14k+</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#99ccff] mt-1">Research Papers</div>
              </div>
            </div>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-4xl font-black text-white">98.4%</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[#99ccff] mt-1">Success Rate</div>
              </div>
            </div>
          </div> */}
        </section>

        {/* Right Section - Login Form */}
        <section className="flex flex-col justify-between p-8 sm:p-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-black text-[#001a4d]">Lumina.</div>
            <Link to="#" className="text-sm font-medium text-[#6b7280] hover:text-[#001a4d]">
              Help Center
            </Link>
          </div>

          {/* Form Container */}
          <div className="flex flex-col justify-center">
            <div>
              <h2 className="text-4xl font-black text-[#1f2937]">Welcome back.</h2>
              <p className="mt-2 text-sm text-[#6b7280]">
                Please enter your credentials to access your laboratory workspace.
              </p>
            </div>

            {/* Error Alert */}
            {submitError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3" data-testid="login-error">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mt-8 space-y-4" data-testid="login-form">
              {/* Email or Username Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                  Email or Username
                </label>
                <div className="relative">
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="name@institution.edu or username"
                    data-testid="login-identifier"
                    value={formData.identifier}
                    onChange={(e) => handleFieldChange('identifier', e.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition ${
                      errors.identifier
                        ? 'border-red-400'
                        : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
                    }`}
                  />
                  <div className="absolute right-4 top-3 text-[#d1d5db]">
                    <span className="material-symbols-outlined text-lg">person</span>
                  </div>
                </div>
                {errors.identifier && <p className="mt-1 text-xs text-red-500">{errors.identifier}</p>}
              </div>

              {/* Password Field */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-[#0066ff] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    data-testid="login-password"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 pr-12 text-sm outline-none transition ${
                      errors.password
                        ? 'border-red-400'
                        : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3 text-[#d1d5db] hover:text-[#6b7280] transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="login-submit"
                className={`mt-6 w-full rounded-full px-6 py-3 text-base font-bold text-white transition ${
                  isLoading
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-[#0066ff] shadow-lg hover:bg-[#0052cc]'
                }`}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
                {!isLoading && <span className="ml-2">→</span>}
              </button>
            </form>

            {/* SSO Section */}
            <div className="mt-6">
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-[#e5e7eb]" />
                <span className="mx-4 text-xs font-semibold uppercase tracking-widest text-[#9ca3af]">Or Sign In With</span>
                <div className="flex-grow border-t border-[#e5e7eb]" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <button
                  type="button"
                  data-testid="login-sso-google"
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                {/* <button
                  type="button"
                  data-testid="login-sso-microsoft"
                  onClick={() => alert('Microsoft SSO — OAuth credentials not yet configured.')}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] transition"
                >
                  <svg className="h-4 w-4" viewBox="0 0 23 23" aria-hidden="true">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  Microsoft
                </button> */}
              </div>
            </div>

            {/* Create Account Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-[#6b7280]">
                New to the Lumina?{' '}
                <Link to="/register" className="font-semibold text-[#0066ff] hover:underline">
                  Create Account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer - System Status */}
          {/* <div className="flex items-center gap-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-[#6b7280]">SYSTEM STATUS</span>
            <span className="text-xs text-[#9ca3af]">All neural networks fully operational at 99.9% uptime.</span>
          </div> */}
        </section>
      </div>
    </div>
  );
};
