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
import { apiClient } from '@/utils/apiClient'

interface ProfileFormData {
  fullName: string
  email: string
  bio: string
  institution: string
  degree: string
}

interface UserInfoResponse {
  id: string
  username: string
  email: string
  role: string
  isSystemAdmin: boolean
  fullName?: string | null
  bio?: string | null
  institution?: string | null
  degree?: string | null
}

type TabType = 'personal' | 'security' | 'wallet' | 'notifications'

/**
 * User Profile Settings Page with tabs
 * Demonstrates full pattern for i18n, forms, and tabs
 */
export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [isSaved, setIsSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const { user, isAuthenticated } = useAuthContext()

  const { values, handleChange, handleSubmit, setValues } = useForm<ProfileFormData>(
    {
      fullName: '',
      email: '',
      bio: '',
      institution: '',
      degree: '',
    },
    async (data) => {
      setProfileSaving(true)
      setProfileError(null)
      try {
        const response = await apiClient.put<UserInfoResponse>('/auth/me', {
          fullName: data.fullName,
          email: data.email,
          bio: data.bio,
          institution: data.institution,
          degree: data.degree,
        })

        if (!response.success) {
          throw new Error(response.message || 'Failed to save profile.')
        }

        if (response.data) {
          setValues(prev => ({
            ...prev,
            fullName: response.data.fullName || response.data.username || '',
            email: response.data.email || '',
            bio: response.data.bio || '',
            institution: response.data.institution || '',
            degree: response.data.degree || '',
          }))
        }

        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save profile.'
        setProfileError(message)
      } finally {
        setProfileSaving(false)
      }
    }
  )

  useEffect(() => {
    if (user) {
      setValues(prev => ({
        ...prev,
        fullName: user.username || '',
        email: user.email || '',
      }))
    }
  }, [user, setValues])

  useEffect(() => {
    if (!isAuthenticated) return
    let isActive = true

    const loadProfile = async () => {
      setProfileLoading(true)
      setProfileError(null)
      try {
        const response = await apiClient.get<UserInfoResponse>('/auth/me')
        if (!isActive) return
        if (response.success && response.data) {
          const { username, email, fullName, bio, institution, degree } = response.data
          setValues(prev => ({
            ...prev,
            fullName: fullName || username || '',
            email: email || '',
            bio: bio || '',
            institution: institution || '',
            degree: degree || '',
          }))
        } else {
          setProfileError(response.message || 'Failed to load profile.')
        }
      } catch (err: unknown) {
        if (!isActive) return
        const message = err instanceof Error ? err.message : 'Failed to load profile.'
        setProfileError(message)
      } finally {
        if (isActive) setProfileLoading(false)
      }
    }

    loadProfile()
    return () => {
      isActive = false
    }
  }, [isAuthenticated, setValues])

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Details', icon: 'person' },
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'wallet', label: 'Academic Wallet', icon: 'account_balance_wallet' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  ]

  const achievements: Array<{ icon: string; title: string; date: string; color: string }> = []

  const learningStats: Array<{ label: string; value: string }> = []

  const recentActivity: Array<{ action: string; time: string }> = []

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
          {profileLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
              <MaterialIcon icon="hourglass_empty" className="text-blue-600" />
              <span className="text-blue-700">Loading profile...</span>
            </div>
          )}
          {profileError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <MaterialIcon icon="error" className="text-red-600" />
              <span className="text-red-700">{profileError}</span>
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
            <div className="lg:col-span-8">
              {/* Personal Details Tab */}
              {activeTab === 'personal' && (
                <Card className="p-10 glass-card space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Profile Picture & Basic Info */}
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="relative group shrink-0">
                        <div className="w-32 h-32 rounded-xl bg-primary/10 flex items-center justify-center shadow-xl">
                          <MaterialIcon icon="person" className="text-5xl text-primary" />
                        </div>
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
                            label="Email Address"
                            type="email"
                            name="email"
                            value={values.email}
                            onChange={handleChange}
                          />
                        </div>
                        <Input
                          label="Bio"
                          name="bio"
                          value={values.bio}
                          onChange={handleChange}
                          placeholder="Tell us about yourself"
                        />
                      </div>
                    </div>

                    {/* Academic Info */}
                    <div className="pt-8 border-t border-outline-variant">
                      <h3 className="text-xl font-bold mb-6">Academic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Input
                            label="Institution"
                            name="institution"
                            value={values.institution}
                            onChange={handleChange}
                            placeholder="Your institution"
                          />
                        </div>
                        <div>
                          <Input
                            label="Degree"
                            name="degree"
                            value={values.degree}
                            onChange={handleChange}
                            placeholder="Your degree"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Graduation Date
                          </label>
                          <p className="text-xl font-semibold text-on-surface">Not set</p>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" type="submit" size="md" loading={profileSaving}>
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
                    <Badge variant="warning" size="md">Not configured</Badge>
                    <p className="text-sm text-on-surface-variant mt-2">
                      Two-factor authentication is not enabled yet.
                    </p>
                  </div>
                </Card>
              )}

              {/* Wallet Tab */}
              {activeTab === 'wallet' && (
                <Card className="p-10 space-y-6">
                  <p className="text-on-surface-variant">
                    Your academic credentials and certifications are stored here
                  </p>
                  {achievements.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No achievements yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {achievements.map((achievement, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-4 bg-surface-container-low rounded-lg"
                        >
                          <div className={`text-2xl ${achievement.color}`}>
                            <MaterialIcon icon={achievement.icon} fill />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-on-surface">{achievement.title}</p>
                            <p className="text-xs text-on-surface-variant">{achievement.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card className="p-10 space-y-4">
                  <div className="space-y-4">
                    {[
                      { label: 'Email Notifications', enabled: true },
                      { label: 'Course Updates', enabled: true },
                      { label: 'Achievement Badges', enabled: false },
                      { label: 'Weekly Digest', enabled: true },
                    ].map((notif, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                        <label className="font-medium text-on-surface cursor-pointer">
                          {notif.label}
                        </label>
                        <div className="relative inline-flex w-12 h-7 bg-slate-300 rounded-full transition-colors" >
                          <input
                            type="checkbox"
                            defaultChecked={notif.enabled}
                            className="w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all ${
                            notif.enabled ? 'bg-primary translate-x-5' : 'bg-white'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar - 1/3 width */}
            <div className="lg:col-span-4 space-y-6">
              {/* Learning Stats */}
              <Card className="p-6">
                <h3 className="font-headline text-lg font-bold mb-6">Learning Vitality</h3>
                {learningStats.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No learning stats yet.</p>
                ) : (
                  <div className="space-y-6">
                    {learningStats.map((stat, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-on-surface-variant">{stat.label}</span>
                          <span className="font-bold text-primary">{stat.value}</span>
                        </div>
                        <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-tertiary"
                            style={{ width: `${30 + idx * 15}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="font-headline text-lg font-bold mb-4">Recent Activity</h3>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">No recent activity yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-on-surface">{activity.action}</p>
                          <p className="text-xs text-on-surface-variant">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

