import React, { useEffect, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Badge } from '@components/ui/Badge'
import { t } from '@/i18n/translations'
import { useForm } from '@hooks/useForm'
import { useAuthContext } from '@/contexts/AuthContext'

interface ProfileFormData {
  fullName: string
  userName: string
  email: string
  bio: string
  institution: string
  degree: string
}

type TabType = 'personal' | 'security' | 'wallet' | 'notifications'

/**
 * User Profile Settings Page with tabs
 * Demonstrates full pattern for i18n, forms, and tabs
 */
export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [isSaved, setIsSaved] = useState(false)
  const { user } = useAuthContext()

  const { values, handleChange, handleSubmit, setValues } = useForm<ProfileFormData>(
    {
      fullName: '',
      userName: '',
      email: '',
      bio: '',
      institution: '',
      degree: '',
    },
    async (data) => {
      console.log('Saving profile:', data)
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 2000)
    }
  )

  useEffect(() => {
    if (!user) return
    setValues((prev) => ({
      ...prev,
      userName: user.username ?? '',
      email: user.email ?? '',
    }))
  }, [user, setValues])

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Details', icon: 'person' },
    { id: 'security', label: 'Password', icon: 'lock' },
  ]

  const achievements = [
    { icon: 'star', title: 'First Course Completed', date: '3 weeks ago', color: 'text-yellow-500' },
    { icon: 'verified', title: 'Data Ethics Certification', date: '2 days ago', color: 'text-blue-500' },
    { icon: 'trophy', title: 'Top 1% Learner', date: '1 week ago', color: 'text-orange-500' },
  ]

  const learningStats = [
    { label: 'Study Streak', value: '23 days' },
    { label: 'Total Hours', value: '340 hrs' },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title={t('common.profile')} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Save Notification */}
          {isSaved && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <MaterialIcon icon="check_circle" className="text-green-600" />
              <span className="text-green-700">{t('ui.success')}! {t('ui.changes')} saved.</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mb-8 border-b border-outline-variant overflow-x-auto">
            <div className="flex gap-10 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 pb-4 font-medium transition-all whitespace-nowrap
                    ${
                      activeTab === tab.id
                        ? 'text-primary border-b-2 border-primary -mb-[18px]'
                        : 'text-on-surface-variant hover:text-primary'
                    }
                  `}
                >
                  <MaterialIcon icon={tab.icon} className="text-lg" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content - 2/3 width */}
            <div className="lg:col-span-12">
              {/* Personal Details Tab */}
              {activeTab === 'personal' && (
                <Card className="p-10 glass-card space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Profile Picture & Basic Info */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="relative group shrink-0">
                        <img
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3b7h7MU8sg26t0mcgt2ZcpVsoiUfYCcJ0s7VbatFAUf7oF_O1B_Gw-L9K9j9ATAXI5gcGrUcVG8jXBbmDRjCCmIwQ0ZGk_-gb_Xj9Dlo6qh17tNPkiOPaf-Z11NkgMiuFiXT59AbUEPEOSd1HRwmeaGByKCwQ2Zc_ZmoHtL_Jmz_CpydPui2WN2XWNjA-dq8THz058CUGDaalDz0Tu4MyzhcmBVEllVcM6Gz7lv8tKjWiILwElM1ZoUBnMwIA_vB1alYHzBgFWcK5"
                          alt="Profile"
                          className="w-32 h-32 rounded-xl object-cover shadow-xl"
                        />
                        <button
                          type="button"
                          className="absolute -bottom-2 -right-2 bg-primary-container text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                        >
                          <MaterialIcon icon="edit" className="text-sm" />
                        </button>
                      </div>

                      {/* Form Fields */}
                      <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input
                            label="Full Name"
                            name="fullName"
                            value={values.fullName}
                            onChange={handleChange}
                          />
                          <Input
                            label="Username"
                            name="userName"
                            value={values.userName}
                            readOnly
                          />

                        </div>

                      <Input
                            label="Email Address"
                            type="email"
                            name="email"
                            value={values.email}
                            onChange={handleChange}
                          />
                        <Input
                          label="Bio"
                          name="bio"
                          value={values.bio}
                          onChange={handleChange}
                          placeholder="Tell us about yourself"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" type="submit" size="md">
                        {t('ui.save')} Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <Card className="p-10 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <Input label="Current Password" type="password" />
                      <Input label="New Password" type="password" />
                      <Input label="Confirm Password" type="password" />
                      <Button variant="primary" size="md">
                        Update Password
                      </Button>
                    </div>
                  </div>
                  <div className="border-t border-outline-variant pt-6">
                    <h3 className="text-lg font-bold mb-4">Two-Factor Authentication</h3>
                    <Badge variant="success" size="md">
                      ✓ Enabled
                    </Badge>
                    <p className="text-sm text-on-surface-variant mt-2">
                      Your account is protected with 2FA
                    </p>
                  </div>
                </Card>
              )}
            </div>
            </div>
          </div>
      </div>
    </MainLayout>
  )
}

