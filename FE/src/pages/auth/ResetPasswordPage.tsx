import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Button } from '@components/ui/Button'
import { apiClient } from '@/utils/apiClient'

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Reset token is missing. Please use the link from your email.')
      return
    }

    setIsLoading(true)
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword })
      setIsSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset token.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <MaterialIcon icon="check_circle" className="text-4xl text-green-500" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-3">Password Reset</h1>
            <p className="text-on-surface-variant" data-testid="reset-password-success-msg">
              Your password has been successfully reset.
            </p>
          </div>
          <Button
            className="w-full"
            data-testid="reset-password-back-to-login"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6">
            <MaterialIcon icon="lock_reset" className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Reset Password</span>
          </div>
          <h1 className="font-headline text-4xl font-bold text-on-surface mb-3">Create New Password</h1>
          <p className="text-on-surface-variant">Enter your new password below</p>
        </div>

        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="reset-password-form">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">New Password</label>
              <div className="relative">
                <MaterialIcon icon="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  data-testid="reset-password-new"
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
              <p className="text-xs text-on-surface-variant">At least 8 characters</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Confirm Password</label>
              <div className="relative">
                <MaterialIcon icon="lock_check" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  data-testid="reset-password-confirm"
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-error text-sm" data-testid="reset-password-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              data-testid="reset-password-submit"
              className="w-full h-14 bg-primary-container text-on-primary-container font-bold text-lg rounded-xl mt-6"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>

          <div className="text-center pt-6">
            <Link to="/login" className="text-primary font-medium hover:underline" data-testid="reset-password-login-link">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
