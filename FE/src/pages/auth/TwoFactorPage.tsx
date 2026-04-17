import React, { useState } from 'react'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Button } from '@components/ui/Button'

/**
 * 2FA OTP Verification Page Component
 */
export const TwoFactorPage: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(120)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  const isComplete = otp.every(digit => digit !== '')
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MaterialIcon icon="verified_user" className="text-4xl text-primary" />
          </div>
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-3">Verify Your Identity</h1>
          <p className="text-on-surface-variant">Enter the 6-digit code from your authenticator app</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface-container rounded-2xl p-8 border border-outline-variant">
          {/* OTP Input */}
          <div className="flex gap-3 justify-center mb-8">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-14 h-14 bg-surface rounded-xl border-2 border-outline-variant focus:border-primary focus:outline-none text-center text-2xl font-bold text-on-surface transition-colors"
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center mb-8">
            {timeLeft > 0 ? (
              <p className="text-sm text-on-surface-variant">
                Code expires in{' '}
                <span className="font-bold text-on-surface">
                  {minutes}:{seconds.toString().padStart(2, '0')}
                </span>
              </p>
            ) : (
              <p className="text-sm text-error">Code has expired. Request a new one.</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="button"
            disabled={!isComplete}
            className={`w-full h-14 font-bold text-lg rounded-xl ${
              isComplete
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            Verify & Continue
          </Button>

          {/* Footer */}
          <div className="text-center pt-6">
            <p className="text-sm text-on-surface-variant mb-3">Didn't receive the code?</p>
            <button type="button" className="text-primary font-medium hover:underline text-sm">
              Request new code
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
