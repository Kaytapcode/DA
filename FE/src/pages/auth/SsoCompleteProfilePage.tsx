import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/utils/apiClient';

// Spec §1: "SSO Registration (First-time Login): If the email from the SSO provider
//           does not exist in the Lumina database, the system will redirect the user to a
//           Role Selection Intermediary Page. The user must explicitly choose to become a
//           User or an OrgAdmin (with mandatory Organization details)."

type RoleChoice = 'User' | 'OrgAdmin';

interface OrgFields {
  orgName: string;
  orgSlug: string;
}

export const SsoCompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ssoToken = searchParams.get('sso_token') ?? '';

  const [role, setRole] = useState<RoleChoice>('User');
  const [orgFields, setOrgFields] = useState<OrgFields>({ orgName: '', orgSlug: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const deriveSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const handleOrgNameChange = (name: string) => {
    setOrgFields({ orgName: name, orgSlug: deriveSlug(name) });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (role === 'OrgAdmin') {
      if (!orgFields.orgName.trim()) errs.orgName = 'Organization name is required';
      if (!orgFields.orgSlug.trim()) errs.orgSlug = 'Organization slug is required';
      else if (!/^[a-z0-9-]+$/.test(orgFields.orgSlug))
        errs.orgSlug = 'Slug may only contain lowercase letters, digits, and hyphens';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const body =
        role === 'OrgAdmin'
          ? { ssoToken, role: 'OrgAdmin', orgName: orgFields.orgName.trim(), orgSlug: orgFields.orgSlug.trim() }
          : { ssoToken, role: 'User' };

      const res = await apiClient.post<{ accessToken: string; orgId?: string }>(
        '/auth/sso/complete-profile',
        body
      );

      if (!res.success) {
        setSubmitError(res.message || 'Failed to complete profile. Please try again.');
        return;
      }

      if (role === 'OrgAdmin' && res.data?.orgId) {
        navigate(`/login?orgId=${res.data.orgId}`, { replace: true });
      } else {
        navigate('/user/home', { replace: true });
      }
    } catch (err) {
      setSubmitError(
        typeof err === 'string'
          ? err
          : (err as any)?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left branding */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#001a4d] via-[#0d2b7a] to-[#051535] p-12 text-white lg:flex lg:flex-col lg:justify-center">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#0066ff]/20 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-96 w-96 rounded-full bg-[#0099ff]/10 blur-3xl" />
          <div className="relative mt-8">
            <h1 className="text-5xl font-black leading-tight text-white">
              One Last Step.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#b3d9ff]">
              Choose how you want to use Lumina. Your role determines what you can create and manage.
            </p>
          </div>
        </section>

        {/* Right form */}
        <section className="flex flex-col justify-center p-8 sm:p-12">
          <div className="mb-8">
            <div className="text-2xl font-black text-[#001a4d] mb-6">Lumina.</div>
            <h2
              className="text-4xl font-black text-[#1f2937]"
              data-testid="sso-complete-heading"
            >
              Complete your profile.
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              This is your first time signing in with SSO. Choose a role to get started.
            </p>
          </div>

          {submitError && (
            <div
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              data-testid="sso-complete-error"
            >
              <p className="text-sm font-medium text-red-700">{submitError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="sso-complete-form">
            {/* Role selector */}
            <div data-testid="sso-role-selector">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-3">
                Select Your Role
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                    role === 'User'
                      ? 'border-[#0066ff] bg-[#0066ff]/5'
                      : 'border-[#e5e7eb] hover:border-[#0066ff]/40'
                  }`}
                  data-testid="sso-role-user"
                >
                  <input
                    type="radio"
                    name="role"
                    value="User"
                    checked={role === 'User'}
                    onChange={() => setRole('User')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#0066ff] text-xl">person</span>
                    <span className="font-bold text-[#1f2937] text-sm">User</span>
                  </div>
                  <p className="text-xs text-[#6b7280]">Personal learning account</p>
                </label>

                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                    role === 'OrgAdmin'
                      ? 'border-[#0066ff] bg-[#0066ff]/5'
                      : 'border-[#e5e7eb] hover:border-[#0066ff]/40'
                  }`}
                  data-testid="sso-role-orgadmin"
                >
                  <input
                    type="radio"
                    name="role"
                    value="OrgAdmin"
                    checked={role === 'OrgAdmin'}
                    onChange={() => setRole('OrgAdmin')}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[#0066ff] text-xl">apartment</span>
                    <span className="font-bold text-[#1f2937] text-sm">OrgAdmin</span>
                  </div>
                  <p className="text-xs text-[#6b7280]">Manage an organization</p>
                </label>
              </div>
            </div>

            {/* OrgAdmin extra fields */}
            {role === 'OrgAdmin' && (
              <div className="space-y-4" data-testid="sso-org-fields">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="My University"
                    data-testid="sso-org-name"
                    value={orgFields.orgName}
                    onChange={(e) => handleOrgNameChange(e.target.value)}
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition ${
                      fieldErrors.orgName
                        ? 'border-red-400'
                        : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
                    }`}
                  />
                  {fieldErrors.orgName && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.orgName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-[#6b7280] mb-2">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    placeholder="my-university"
                    data-testid="sso-org-slug"
                    value={orgFields.orgSlug}
                    onChange={(e) =>
                      setOrgFields((p) => ({ ...p, orgSlug: e.target.value.toLowerCase() }))
                    }
                    className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition ${
                      fieldErrors.orgSlug
                        ? 'border-red-400'
                        : 'border-[#e5e7eb] focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]'
                    }`}
                  />
                  {fieldErrors.orgSlug && (
                    <p className="mt-1 text-xs text-red-500">{fieldErrors.orgSlug}</p>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              data-testid="sso-complete-submit"
              className={`w-full rounded-full px-6 py-3 text-base font-bold text-white transition ${
                isLoading
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-[#0066ff] shadow-lg hover:bg-[#0052cc]'
              }`}
            >
              {isLoading ? 'Setting up…' : 'Continue to Lumina →'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
