import { useState } from 'react'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Button } from '@components/ui/Button'
import { useForm } from '@hooks/useForm'

interface ResetPasswordFormValues {
  password: string
  confirmPassword: string
}

/**
 * Reset Password Page Component
 */
export const ResetPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const { values, handleChange, handleSubmit: handleFormSubmit } = useForm<ResetPasswordFormValues>(
    { password: '', confirmPassword: '' },
    async (values) => {
      console.log('Reset password:', values)
      setIsSubmitted(true)
      // TODO: Call reset password API
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    await handleFormSubmit(e)
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
            <p className="text-on-surface-variant">Your password has been successfully reset.</p>
          </div>
          <Button className="w-full">Back to Login</Button>
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
            <MaterialIcon icon="lock_reset" className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Reset Password</span>
          </div>
          <h1 className="font-headline text-4xl font-bold text-on-surface mb-3">Create New Password</h1>
          <p className="text-on-surface-variant">Enter your new password below</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">New Password</label>
              <div className="relative">
                <MaterialIcon icon="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={values.password}
                  onChange={handleChange}
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
              <p className="text-xs text-on-surface-variant">At least 8 characters with uppercase, lowercase, and numbers</p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-on-surface">Confirm Password</label>
              <div className="relative">
                <MaterialIcon icon="lock_check" className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant" />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={values.confirmPassword}
                  onChange={handleChange}
                  className="w-full h-14 pl-12 pr-4 bg-surface rounded-xl border-none ring-1 ring-inset ring-outline-variant focus:ring-2 focus:ring-inset focus:ring-primary text-on-surface placeholder:text-outline transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full h-14 bg-primary-container text-on-primary-container font-bold text-lg rounded-xl mt-6">
              Reset Password
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center pt-6">
            <a href="#" className="text-primary font-medium hover:underline">
              Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
