import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '@/utils/apiClient';

interface FormData {
  username: string;
  email: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  organizationName?: string;
  organizationSlug?: string;
}

export const RegisterOrgAdminPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    organizationName: '',
    organizationSlug: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-derive slug from org name
      if (field === 'organizationName') {
        updated.organizationSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 50);
      }
      return updated;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field as keyof FormErrors]; return e; });
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password || formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!formData.organizationName.trim()) newErrors.organizationName = 'Organization name is required';
    if (!formData.organizationSlug.trim()) newErrors.organizationSlug = 'Slug is required';
    if (!/^[a-z0-9-]+$/.test(formData.organizationSlug)) newErrors.organizationSlug = 'Slug: lowercase, numbers, hyphens only';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post<{
        userId: string; orgId: string; orgName: string; orgSlug: string;
      }>('/auth/register/orgadmin', {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        organizationName: formData.organizationName.trim(),
        organizationSlug: formData.organizationSlug.trim(),
      });

      if (res.success && res.data) {
        navigate('/login?registered=orgadmin', { replace: true });
      } else {
        setSubmitError(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <Link to="/" className="text-2xl font-black text-[#001a4d]">Lumina.</Link>
        </div>

        <h2 className="text-3xl font-black text-[#1f2937] mb-2">Create OrgAdmin Account</h2>
        <p className="text-sm text-[#6b7280] mb-8">
          Register as an Organization Administrator to manage your institution on Lumina.
        </p>

        {submitError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3" data-testid="register-orgadmin-error">
            <p className="text-sm font-medium text-red-700">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-orgadmin-form">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">Username</label>
            <input
              type="text"
              data-testid="register-orgadmin-username"
              value={formData.username}
              onChange={(e) => handleFieldChange('username', e.target.value)}
              placeholder="orgadmin_username"
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.username ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'}`}
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">Email</label>
            <input
              type="email"
              data-testid="register-orgadmin-email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="admin@institution.edu"
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.email ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">Password</label>
            <input
              type="password"
              data-testid="register-orgadmin-password"
              value={formData.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.password ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'}`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          <hr className="my-4 border-[#e5e7eb]" />
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Organization Details</p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">Organization Name</label>
            <input
              type="text"
              data-testid="register-orgadmin-org-name"
              value={formData.organizationName}
              onChange={(e) => handleFieldChange('organizationName', e.target.value)}
              placeholder="HCM University of Technology"
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition ${errors.organizationName ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'}`}
            />
            {errors.organizationName && <p className="mt-1 text-xs text-red-500">{errors.organizationName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
              Organization Slug <span className="font-normal normal-case tracking-normal">(URL-safe identifier, auto-derived)</span>
            </label>
            <input
              type="text"
              data-testid="register-orgadmin-org-slug"
              value={formData.organizationSlug}
              onChange={(e) => handleFieldChange('organizationSlug', e.target.value)}
              placeholder="HCM-university-of-technology"
              className={`w-full rounded-lg border px-4 py-3 text-sm font-mono outline-none transition ${errors.organizationSlug ? 'border-red-400' : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'}`}
            />
            {errors.organizationSlug && <p className="mt-1 text-xs text-red-500">{errors.organizationSlug}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid="register-orgadmin-submit"
            className={`mt-6 w-full rounded-full px-6 py-3 text-base font-bold text-white transition ${isLoading ? 'cursor-not-allowed bg-gray-400' : 'bg-[#0066ff] shadow-lg hover:bg-[#0052cc]'}`}
          >
            {isLoading ? 'Creating Account...' : 'Create OrgAdmin Account →'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#6b7280]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0066ff] hover:underline">Sign In</Link>
          {' '}·{' '}
          <Link to="/register" className="font-semibold text-[#0066ff] hover:underline">Student Registration</Link>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
          <strong>Note:</strong> You'll receive an Organization ID after registration. Use it when logging in to get org context.
        </div>
      </div>
    </div>
  );
};
