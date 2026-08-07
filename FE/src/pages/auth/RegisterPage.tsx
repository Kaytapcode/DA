import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { ValidationRules, checkPasswordStrength } from '@/utils/validation';
import apiClient from '@/utils/apiClient';

type RoleChoice = 'User' | 'OrgAdmin';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  orgName: string;
  orgSlug: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  orgName?: string;
  orgSlug?: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading: authLoading } = useAuthContext();

  const [role, setRole] = useState<RoleChoice>('User');
  const [formData, setFormData] = useState<FormData>({
    username: '', email: '', password: '', confirmPassword: '',
    orgName: '', orgSlug: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{ score: number; strength: string; message: string } | null>(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLoading = authLoading || isSubmitting;

  useEffect(() => {
    if (formData.password) setPasswordStrength(checkPasswordStrength(formData.password));
    else setPasswordStrength(null);
  }, [formData.password]);

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'orgName') {
        next.orgSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
      }
      return next;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field as keyof FormErrors]; return e; });
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!formData.username) e.username = 'Username is required';
    else if (formData.username.length < ValidationRules.username.minLength)
      e.username = `Username must be at least ${ValidationRules.username.minLength} characters`;
    else if (!ValidationRules.username.pattern.test(formData.username))
      e.username = ValidationRules.username.message;

    if (!formData.email) e.email = 'Email is required';
    else if (!ValidationRules.email.pattern.test(formData.email))
      e.email = ValidationRules.email.message;

    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < ValidationRules.password.minLength)
      e.password = `Password must be at least ${ValidationRules.password.minLength} characters`;
    else if (!ValidationRules.password.pattern.test(formData.password))
      e.password = ValidationRules.password.message;
    else if (/\s/.test(formData.password))
      e.password = 'Password cannot contain spaces';

    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = 'Passwords do not match';

    if (role === 'OrgAdmin') {
      if (!formData.orgName.trim()) e.orgName = 'Organization name is required';
      if (!formData.orgSlug.trim()) e.orgSlug = 'Slug is required';
      else if (!/^[a-z0-9-]+$/.test(formData.orgSlug))
        e.orgSlug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (role === 'User') {
        await register(formData.username, formData.email, formData.password);
        navigate('/login', { replace: true });
      } else {
        const res = await apiClient.post<{ orgId: string }>('/auth/register/orgadmin', {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          organizationName: formData.orgName.trim(),
          organizationSlug: formData.orgSlug.trim(),
        });
        if (res.success && res.data?.orgId) {
          navigate('/login?registered=orgadmin', { replace: true });
        } else {
          setSubmitError(res.message || 'Registration failed. Please try again.');
        }
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (field: keyof FormErrors) =>
    `w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
    }`;

  const strengthColors: Record<string, string> = {
    weak: 'bg-red-500', fair: 'bg-orange-400', good: 'bg-yellow-400',
    strong: 'bg-green-500', 'very-strong': 'bg-green-600',
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        /* Hide browser-native reveal/clear buttons for the confirm-password input only */
        input[data-testid="register-confirm-password"]::-ms-reveal,
        input[data-testid="register-confirm-password"]::-ms-clear {
          display: none !important;
        }
        input[data-testid="register-confirm-password"]::-webkit-textfield-decoration-container,
        input[data-testid="register-confirm-password"]::-webkit-password-reveal-button,
        input[data-testid="register-confirm-password"]::-webkit-clear-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
      `}</style>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left — Branding */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#001a4d] via-[#0d2b7a] to-[#051535] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#0066ff]/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-[#0099ff]/10 blur-3xl" />
          <div className="relative mt-8">
            <h1 className="text-5xl font-black leading-tight text-white">
              Join Lumina.<br />Start Learning.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#b3d9ff]">
              Create your account to access our proprietary curriculum and laboratory research environment.
            </p>
          </div>
        </section>

        {/* Right — Form */}
        <section className="flex flex-col justify-between p-8 sm:p-12 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-black text-[#001a4d]">Lumina.</div>
            <Link to="/login" className="text-sm font-medium text-[#6b7280] hover:text-[#001a4d]">
              Sign In
            </Link>
          </div>

          <div className="flex flex-col justify-center py-8">
            <h2 className="text-4xl font-black text-[#1f2937]" data-testid="register-heading">Create Account</h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Select your account type to get started.
            </p>

            {/* Error */}
            {submitError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3" data-testid="register-error">
                <p className="text-sm font-medium text-red-700">{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" data-testid="register-form">

              {/* ── Role Selector ─────────────────────────────────── */}
              <div data-testid="register-role-selector">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
                  Account Type
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                      role === 'User' ? 'border-[#0066ff] bg-[#f0f7ff]' : 'border-[#e5e7eb] hover:border-[#c7d2fe]'
                    }`}
                    data-testid="register-role-user"
                  >
                    <input
                      type="radio"
                      name="role"
                      value="User"
                      checked={role === 'User'}
                      onChange={() => setRole('User')}
                      className="sr-only"
                    />
                    <span className={`material-symbols-outlined text-xl ${role === 'User' ? 'text-[#0066ff]' : 'text-[#9ca3af]'}`}>
                      school
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1f2937]">User</p>
                      <p className="text-xs text-[#6b7280]">Student / Learner</p>
                    </div>
                  </label>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                      role === 'OrgAdmin' ? 'border-[#0066ff] bg-[#f0f7ff]' : 'border-[#e5e7eb] hover:border-[#c7d2fe]'
                    }`}
                    data-testid="register-role-orgadmin"
                  >
                    <input
                      type="radio"
                      name="role"
                      value="OrgAdmin"
                      checked={role === 'OrgAdmin'}
                      onChange={() => setRole('OrgAdmin')}
                      className="sr-only"
                    />
                    <span className={`material-symbols-outlined text-xl ${role === 'OrgAdmin' ? 'text-[#0066ff]' : 'text-[#9ca3af]'}`}>
                      corporate_fare
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[#1f2937]">OrgAdmin</p>
                      <p className="text-xs text-[#6b7280]">Organization Admin</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── Personal Info ──────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                  Username
                </label>
                <input
                  type="text"
                  data-testid="register-username"
                  placeholder="e.g., john_doe"
                  value={formData.username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  className={inputCls('username')}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500" data-testid="register-error-username">{errors.username}</p>}
                {/* <p className="mt-1 text-xs text-[#9ca3af]">3–20 characters: letters, numbers, underscores, hyphens</p> */}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  data-testid="register-email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={inputCls('email')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500" data-testid="register-error-email">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  data-testid="register-password"
                  placeholder="Min 8 chars with upper/lower/digit/special"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={inputCls('password')}
                />
                <p className="mt-1 text-xs text-[#6b7280]" data-testid="password-requirements">
                  At least 8 characters, including uppercase, lowercase, a number, and a special character.
                </p>
                {formData.password && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#9ca3af]">Strength:</span>
                      <span className="text-xs font-semibold text-[#374151]" data-testid="register-password-strength">
                        {passwordStrength.strength.toUpperCase()}
                      </span>
                    </div>
                    <div className="w-full bg-[#f3f4f6] rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${strengthColors[passwordStrength.strength] ?? 'bg-gray-300'}`}
                        style={{ width: `${Math.min(100, Math.round((passwordStrength.score / 4) * 100))}%` }}/>
                    </div>
                  </div>
                )}
                {errors.password && <p className="mt-1 text-xs text-red-500" data-testid="register-error-password">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    data-testid="register-confirm-password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    className={inputCls('confirmPassword') + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-3 text-[#9ca3af] hover:text-[#6b7280] transition"
                    data-testid="register-confirm-password-toggle"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showConfirmPassword ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-500" data-testid="register-error-confirm-password">{errors.confirmPassword}</p>}
              </div>

              {/* ── OrgAdmin-only fields ───────────────────────────── */}
              {role === 'OrgAdmin' && (
                <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 space-y-4" data-testid="register-org-fields">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
                    Organization Details
                  </p>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      data-testid="register-org-name"
                      placeholder="HCM University of Technology"
                      value={formData.orgName}
                      onChange={(e) => handleFieldChange('orgName', e.target.value)}
                      className={inputCls('orgName')}
                    />
                    {errors.orgName && <p className="mt-1 text-xs text-red-500" data-testid="register-error-org-name">{errors.orgName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                      Organization Slug <span className="font-normal normal-case tracking-normal text-[#9ca3af]">(auto-derived, editable)</span>
                    </label>
                    <input
                      type="text"
                      data-testid="register-org-slug"
                      placeholder="HCM-university-of-technology"
                      value={formData.orgSlug}
                      onChange={(e) => handleFieldChange('orgSlug', e.target.value)}
                      className={inputCls('orgSlug') + ' font-mono text-xs'}
                    />
                    {errors.orgSlug && <p className="mt-1 text-xs text-red-500" data-testid="register-error-org-slug">{errors.orgSlug}</p>}
                    <p className="mt-1 text-xs text-[#9ca3af]">Lowercase letters, numbers, hyphens only — used in URLs</p>
                  </div>
                </div>
              )}

              {/* ── Submit ─────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={isLoading}
                data-testid="register-submit"
                className={`mt-4 w-full rounded-full px-6 py-3 text-base font-bold text-white transition ${
                  isLoading ? 'cursor-not-allowed bg-gray-400' : 'bg-[#0066ff] shadow-lg hover:bg-[#0052cc]'
                }`}
              >
                {isLoading
                  ? 'Creating Account...'
                  : role === 'OrgAdmin' ? 'Create OrgAdmin Account →' : 'Create Account →'}
              </button>
            </form>

            {/* SSO section hidden — OAuth credentials not yet configured */}

            <div className="mt-6 text-center text-sm text-[#6b7280]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#0066ff] hover:underline">Sign In</Link>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-[#6b7280]">SYSTEM STATUS</span>
            <span className="text-xs text-[#9ca3af]">All systems operational.</span>
          </div>
        </section>
      </div>
    </div>
  );
};
