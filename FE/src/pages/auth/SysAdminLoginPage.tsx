import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

// Spec §1: "SysAdmin Login & Creation: logs in via a dedicated secure Admin portal.
//           Cannot bypass via public SSO."

interface FormErrors {
  username?: string;
  password?: string;
}

export const SysAdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthContext();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    else if (/\s/.test(password)) newErrors.password = 'Password cannot contain spaces';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      const authUser = await login(username.trim(), password);
      if (authUser?.role !== 'SysAdmin') {
        setSubmitError('Access restricted to System Administrators only.');
        return;
      }
      navigate('/sysadmin/dashboard', { replace: true });
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Login failed. Please check your credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Portal badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/40 border border-red-700/60 mb-4">
            <span className="material-symbols-outlined text-red-400 text-sm">shield</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-red-400">
              Restricted Admin Portal
            </span>
          </div>
          <h1 className="text-3xl font-black text-white" data-testid="sysadmin-login-heading">
            System Administrator
          </h1>
          <p className="mt-2 text-sm text-gray-400" data-testid="sysadmin-login-subtitle">
            This portal is restricted to SysAdmin accounts only.
          </p>
        </div>

        {/* Error banner */}
        {submitError && (
          <div
            className="mb-6 rounded-lg border border-red-700/60 bg-red-900/30 px-4 py-3"
            data-testid="sysadmin-login-error"
          >
            <p className="text-sm font-medium text-red-300">{submitError}</p>
          </div>
        )}

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 bg-gray-900 rounded-xl border border-gray-800 p-8"
          data-testid="sysadmin-login-form"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Username
            </label>
            <input
              id="sysadmin-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="SysAdmin username"
              data-testid="sysadmin-login-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors((p) => ({ ...p, username: undefined }));
              }}
              className={`w-full rounded-lg border bg-gray-800 px-4 py-3 text-sm text-white outline-none transition ${
                errors.username
                  ? 'border-red-500'
                  : 'border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-400" data-testid="sysadmin-login-error-username">
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="sysadmin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                data-testid="sysadmin-login-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                className={`w-full rounded-lg border bg-gray-800 px-4 py-3 pr-12 text-sm text-white outline-none transition ${
                  errors.password
                    ? 'border-red-500'
                    : 'border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3 text-gray-500 hover:text-gray-300 transition"
                title={showPassword ? 'Hide password' : 'Show password'}
                data-testid="sysadmin-login-password-toggle"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400" data-testid="sysadmin-login-error-password">
                {errors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            data-testid="sysadmin-login-submit"
            className={`mt-2 w-full rounded-lg px-6 py-3 text-base font-bold text-white transition ${
              isLoading
                ? 'cursor-not-allowed bg-gray-700'
                : 'bg-red-700 hover:bg-red-600 shadow-lg shadow-red-900/30'
            }`}
          >
            {isLoading ? 'Signing In...' : 'Access Admin Portal'}
          </button>

          <p className="text-center text-xs text-gray-600 mt-2">
            No SSO. No self-registration. Credentials must be provisioned by another SysAdmin.
          </p>
        </form>

        {/* Back to public login */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Not a SysAdmin?{' '}
          <a href="/login" className="text-gray-400 hover:text-white underline">
            Regular login →
          </a>
        </p>
      </div>
    </div>
  );
};
