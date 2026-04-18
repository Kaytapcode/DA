import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ValidationRules } from '@/utils/validation';

interface LoginFormData {
  email: string;
  password: string;
  orgSlug: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  orgSlug?: string;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    orgSlug: '',
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

    // Validate email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!ValidationRules.email.pattern.test(formData.email)) {
      newErrors.email = ValidationRules.email.message;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Validate org slug
    if (!formData.orgSlug) {
      newErrors.orgSlug = 'Organization slug is required';
    } else if (!/^[a-z0-9-]*$/.test(formData.orgSlug)) {
      newErrors.orgSlug = 'Slug can only contain lowercase letters, numbers, and hyphens';
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
      // Convert email to username for auth (based on API contract)
      // In production, you might want to allow both email and username
      const username = formData.email.split('@')[0]; // Use email prefix as username
      
      await login(username, formData.password, formData.orgSlug);

      // If login succeeds (no error thrown), redirect to dashboard
      navigate(`/org/${formData.orgSlug}/dashboard`, { replace: true });
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Failed to login. Please check your credentials and try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Sign In</h2>
            <p className="text-gray-600 text-sm mt-2">Welcome back to Tiny LMS</p>
          </div>

          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm font-medium">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Organization Slug */}
            <div>
              <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <input
                id="orgSlug"
                name="orgSlug"
                type="text"
                placeholder="e.g., vnu-university"
                value={formData.orgSlug}
                onChange={(e) => handleFieldChange('orgSlug', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.orgSlug ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.orgSlug && (
                <p className="text-red-500 text-xs mt-1">{errors.orgSlug}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.email ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1890ff] hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.password ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 px-4 rounded-md font-semibold text-white transition ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#1890ff] hover:bg-blue-600'
              }`}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#1890ff] font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
