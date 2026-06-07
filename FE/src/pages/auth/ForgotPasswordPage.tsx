import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Button } from '@components/ui/Button'
import { apiClient } from '@/utils/apiClient'

interface ForgotPasswordResponse {
  resetLink?: string
  ResetLink?: string
}

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Populated only when the backend has no SMTP transport configured (dev/demo fallback).
  const [resetLink, setResetLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const res = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
      const link = res?.data?.resetLink ?? res?.data?.ResetLink ?? null
      setResetLink(link)
      setIsSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <MaterialIcon icon="mail_outline" className="text-4xl text-green-500" />
            </div>
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-3">Check Your Email</h1>
            <p className="text-on-surface-variant">
              If that email is registered, we've sent reset instructions to<br />
              <span className="font-medium text-on-surface" data-testid="forgot-password-email-sent">{email}</span>
            </p>
          </div>

          <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
            {resetLink && (
              <div
                className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4"
                data-testid="forgot-password-reset-link-box"
              >
                <p className="text-sm font-medium text-on-surface mb-2">
                  Email delivery isn't configured — use this reset link directly:
                </p>
                <Link
                  to={resetLink.replace(/^https?:\/\/[^/]+/, '')}
                  className="text-primary text-sm font-medium break-all hover:underline"
                  data-testid="forgot-password-reset-link"
                >
                  {resetLink}
                </Link>
              </div>
            )}
            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <MaterialIcon icon="check_circle" className="text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-on-surface">Check your email</p>
                  <p className="text-xs text-on-surface-variant">Look for our message in your inbox or spam folder</p>
                </div>
              </div>
              <div className="flex gap-3">
                <MaterialIcon icon="schedule" className="text-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-on-surface">Link expires in 30 minutes</p>
                  <p className="text-xs text-on-surface-variant">Make sure to reset your password soon</p>
                </div>
              </div>
            </div>

            <Link to="/login">
              <Button className="w-full mb-3" data-testid="forgot-password-back-to-login">Back to Login</Button>
            </Link>
            <p className="text-center text-sm text-on-surface-variant">
              Didn't receive an email?{' '}
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="text-primary font-medium hover:underline"
                data-testid="forgot-password-try-again"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6">
            <MaterialIcon icon="lock_open" className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Forgot Password?</span>
          </div>
          <h1 className="font-headline text-4xl font-bold text-on-surface mb-3">Password Recovery</h1>
          <p className="text-on-surface-variant">Enter your email to receive reset instructions</p>
        </div>

        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="forgot-password-form">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Email Address</label>
              <div className="relative">
                <MaterialIcon icon="mail_outline" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  data-testid="forgot-password-email"
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-error text-sm" data-testid="forgot-password-error">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              data-testid="forgot-password-submit"
              className="w-full h-14 bg-primary-container text-on-primary-container font-bold text-lg rounded-xl mt-6"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="text-center pt-6">
            <p className="text-sm text-on-surface-variant mb-2">Remember your password?</p>
            <Link to="/login" className="text-primary font-medium hover:underline" data-testid="forgot-password-login-link">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
