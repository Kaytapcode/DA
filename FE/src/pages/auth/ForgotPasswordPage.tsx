import { useState } from 'react'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Button } from '@components/ui/Button'
import { useForm } from '@hooks/useForm'

interface ForgotPasswordFormValues {
  email: string
}

/**
 * Forgot Password Page Component
 */
export const ForgotPasswordPage: React.FC = () => {
  const [isSent, setIsSent] = useState(false)
  const { values, errors, handleChange, handleSubmit: handleFormSubmit } = useForm<ForgotPasswordFormValues>(
    { email: '' },
    async (values) => {
      console.log('Forgot password:', values)
      setIsSent(true)
      // TODO: Call forgot password API
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    await handleFormSubmit(e)
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
              We've sent password reset instructions to<br />
              <span className="font-medium text-on-surface">{values.email}</span>
            </p>
          </div>

          <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
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
                  <p className="text-sm font-medium text-on-surface">Link expires in 24 hours</p>
                  <p className="text-xs text-on-surface-variant">Make sure to reset your password soon</p>
                </div>
              </div>
            </div>

            <Button className="w-full mb-3">Back to Login</Button>
            <p className="text-center text-sm text-on-surface-variant">
              Didn't receive an email?{' '}
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="text-primary font-medium hover:underline"
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-6">
            <MaterialIcon icon="lock_open" className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Forgot Password?</span>
          </div>
          <h1 className="font-headline text-4xl font-bold text-on-surface mb-3">Password Recovery</h1>
          <p className="text-on-surface-variant">Enter your email to receive reset instructions</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Email Address</label>
              <div className="relative">
                <MaterialIcon icon="mail_outline" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={values.email}
                  onChange={handleChange}
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
              {errors.email && <p className="text-error text-sm">{errors.email}</p>}
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full h-14 bg-primary-container text-on-primary-container font-bold text-lg rounded-xl mt-6">
              Send Reset Link
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-on-surface-variant mb-2">Remember your password?</p>
            <a href="#" className="text-primary font-medium hover:underline">
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
