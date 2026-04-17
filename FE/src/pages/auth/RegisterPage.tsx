import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ValidationRules, checkPasswordStrength } from '@/utils/validation';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordStrengthInfo {
  score: number;
  message: string;
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthInfo | null>(null);

  // Monitor password strength
  useEffect(() => {
    if (formData.password) {
      const strength = checkPasswordStrength(formData.password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.password]);

  const handleFieldChange = (field: keyof RegisterFormData, value: string) => {
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

    // Validate username
    if (!formData.username) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < ValidationRules.username.minLength) {
      newErrors.username = `Username must be at least ${ValidationRules.username.minLength} characters`;
    } else if (formData.username.length > ValidationRules.username.maxLength) {
      newErrors.username = `Username cannot exceed ${ValidationRules.username.maxLength} characters`;
    } else if (!ValidationRules.username.pattern.test(formData.username)) {
      newErrors.username = ValidationRules.username.message;
    }

    // Validate email
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!ValidationRules.email.pattern.test(formData.email)) {
      newErrors.email = ValidationRules.email.message;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < ValidationRules.password.minLength) {
      newErrors.password = `Password must be at least ${ValidationRules.password.minLength} characters`;
    } else if (!ValidationRules.password.pattern.test(formData.password)) {
      newErrors.password = ValidationRules.password.message;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordStrengthColor = (strength: PasswordStrengthInfo | null) => {
    if (!strength) return 'bg-gray-300';
    
    switch (strength.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'fair':
        return 'bg-orange-500';
      case 'good':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      case 'very-strong':
        return 'bg-green-600';
      default:
        return 'bg-gray-300';
    }
  };

  const getPasswordStrengthTextColor = (strength: PasswordStrengthInfo | null) => {
    if (!strength) return 'text-gray-600';
    
    switch (strength.strength) {
      case 'weak':
        return 'text-red-600';
      case 'fair':
        return 'text-orange-600';
      case 'good':
        return 'text-yellow-600';
      case 'strong':
        return 'text-green-600';
      case 'very-strong':
        return 'text-green-700';
      default:
        return 'text-gray-600';
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await register(
        formData.username,
        formData.email,
        formData.password
      );

      // If register succeeds (no error thrown), redirect to login or dashboard
      // Typically you'd want to redirect to login or auto-login
      navigate('/login', { replace: true });
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Failed to register. Please try again.'
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
            <p className="text-gray-600 text-sm mt-2">Join Tiny LMS</p>
          </div>

          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm font-medium">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="e.g., john_doe"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.username ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">{errors.username}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                3-20 characters: letters, numbers, underscores, hyphens
              </p>
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
                placeholder="your@email.com"
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.password ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Strength:</span>
                    <span
                      className={`text-xs font-semibold ${getPasswordStrengthTextColor(
                        passwordStrength
                      )}`}
                    >
                      {passwordStrength?.strength.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor(
                        passwordStrength
                      )}`}
                      style={{
                        width: `${((passwordStrength?.score || 0) + 1) * 25}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#1890ff] focus:border-transparent transition ${
                  errors.confirmPassword ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1890ff] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};