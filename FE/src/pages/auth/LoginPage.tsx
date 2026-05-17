import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

interface LoginFormData {
  identifier: string;
  password: string;
}

interface FormErrors {
  identifier?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthContext();

  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFieldChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
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
      await login(formData.identifier.trim(), formData.password, undefined);

      // Navigate to user home
      navigate('/user/home', { replace: true });
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Failed to login. Please check your credentials and try again.'
      );
    }
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
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition ${
                      errors.password
                        ? 'border-red-400'
                        : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
                    }`}
                  />
                  <div className="absolute right-4 top-3 text-[#d1d5db]">
                    <span className="material-symbols-outlined text-lg">lock</span>
                  </div>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
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

            {/* OAuth / Alternative Login */}
            <div className="mt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e5e7eb]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-[#9ca3af] uppercase tracking-widest font-semibold text-xs">Or Access With</span>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">tag</span>
                  SSO
                </button>
                {/* <button
                  type="button"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">fingerprint</span>
                  Passkey
                </button> */}
              </div>
            </div>

            {/* Create Account Link */}
            <div className="mt-8 text-center">
              <p className="text-sm text-[#6b7280]">
                New to the Laboratory?{' '}
                <Link to="/register" className="font-semibold text-[#0066ff] hover:underline">
                  Create
                </Link>
              </p>
            </div>
          </div>

          {/* Footer - System Status */}
          <div className="flex items-center gap-2 mt-8">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-[#6b7280]">SYSTEM STATUS</span>
            <span className="text-xs text-[#9ca3af]">All neural networks fully operational at 99.9% uptime.</span>
          </div>
        </section>
      </div>
    </div>
  );
};
