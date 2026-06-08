import React, { useEffect, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { t } from '@/i18n/translations'
import { useAuthContext } from '@/contexts/AuthContext'
import { apiClient } from '@/utils/apiClient'

type TabType = 'personal' | 'security' | 'language'

const SUPPORTED_LANGUAGES: { code: 'vi' | 'ja' | 'en'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'ja', label: '日本語' },
]

export const UserProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const { user } = useAuthContext()

  // Personal details state
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  // Language state — initialize from localStorage for immediate display without async flash
  const [language, setLanguage] = useState<'vi' | 'ja' | 'en'>(() => {
    const stored = localStorage.getItem('language')
    return (stored === 'vi' || stored === 'ja' || stored === 'en') ? stored : 'en'
  })
  const [langMsg, setLangMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingLang, setSavingLang] = useState(false)

  useEffect(() => {
    if (!user) return
    setUsername(user.username ?? '')
    setEmail(user.email ?? '')
    // Sync language from server on mount — authoritative source
    apiClient.get('/auth/me').then(resp => {
      const lang = resp.data?.data?.language
      if (lang === 'vi' || lang === 'ja' || lang === 'en') {
        setLanguage(lang)
        localStorage.setItem('language', lang)
      }
    }).catch(() => {})
  }, [user])

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const payload: { username?: string; email?: string } = {}
      if (username && username !== user?.username) payload.username = username
      if (email && email !== user?.email) payload.email = email
      const resp = await apiClient.patch('/auth/me', payload)
      if (resp.success) {
        setProfileMsg({ type: 'success', text: 'Profile updated.' })
      } else {
        setProfileMsg({ type: 'error', text: resp.message ?? 'Update failed.' })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setProfileMsg({ type: 'error', text: msg ?? 'Update failed.' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New password and confirmation do not match.' })
      return
    }
    setSavingPw(true)
    try {
      const resp = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      })
      if (resp.success) {
        setPwMsg({ type: 'success', text: 'Password changed.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwMsg({ type: 'error', text: resp.message ?? 'Password change failed.' })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setPwMsg({ type: 'error', text: msg ?? 'Password change failed.' })
    } finally {
      setSavingPw(false)
    }
  }

  const handleLanguageSave = async (newLang: 'vi' | 'ja' | 'en') => {
    setLangMsg(null)
    setSavingLang(true)
    try {
      const resp = await apiClient.patch('/auth/me/language', { language: newLang })
      if (resp.success) {
        setLanguage(newLang)
        localStorage.setItem('language', newLang)
        setLangMsg({
          type: 'success',
          text: newLang === 'vi' ? 'Đã cập nhật ngôn ngữ. Đang tải lại...' : 'Language preference updated. Reloading...',
        })
        // Components read getCurrentLanguage() directly (no reactive context), so a reload is the
        // reliable way to re-render the whole app in the newly-selected language.
        setTimeout(() => window.location.reload(), 700)
      } else {
        setLangMsg({ type: 'error', text: resp.message ?? 'Update failed.' })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setLangMsg({ type: 'error', text: msg ?? 'Update failed.' })
    } finally {
      setSavingLang(false)
    }
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Details', icon: 'person' },
    { id: 'security', label: 'Password', icon: 'lock' },
    { id: 'language', label: 'Language', icon: 'translate' },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title={t('common.profile')} />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8" data-testid="user-profile-page">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="mb-8 border-b border-outline-variant overflow-x-auto" data-testid="profile-tabs">
            <div className="flex gap-10 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`profile-tab-${tab.id}`}
                  className={`flex items-center gap-2 pb-4 font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary -mb-[18px]'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  <MaterialIcon icon={tab.icon} className="text-lg" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Personal Details */}
          {activeTab === 'personal' && (
            <Card className="p-10 glass-card space-y-8">
              <form onSubmit={handleProfileSave} className="space-y-6" data-testid="profile-form">
                <Input
                  label="Username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="profile-username-input"
                />
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="profile-email-input"
                />
                {profileMsg && (
                  <div
                    data-testid={`profile-${profileMsg.type}`}
                    className={`p-3 rounded-md ${
                      profileMsg.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                )}
                <div className="flex justify-end pt-4">
                  <Button
                    variant="primary"
                    type="submit"
                    size="md"
                    disabled={savingProfile}
                    data-testid="profile-save-btn"
                  >
                    {savingProfile ? 'Saving…' : `${t('ui.save')} Changes`}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Security / Change Password */}
          {activeTab === 'security' && (
            <Card className="p-10 space-y-6">
              <h3 className="text-lg font-bold mb-4">Change Password</h3>
              <form onSubmit={handlePasswordSave} className="space-y-4" data-testid="change-password-form">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="change-password-current"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="change-password-new"
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  data-testid="change-password-confirm"
                />
                {pwMsg && (
                  <div
                    data-testid={`change-password-${pwMsg.type}`}
                    className={`p-3 rounded-md ${
                      pwMsg.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {pwMsg.text}
                  </div>
                )}
                <Button
                  variant="primary"
                  type="submit"
                  size="md"
                  disabled={savingPw}
                  data-testid="change-password-submit"
                >
                  {savingPw ? 'Saving…' : 'Update Password'}
                </Button>
              </form>
            </Card>
          )}

          {/* Language */}
          {activeTab === 'language' && (
            <Card className="p-10 space-y-6">
              <div data-testid="language-section">
              <h3 className="text-lg font-bold mb-4">Display Language</h3>
              <p className="text-sm text-on-surface-variant mb-4">
                Choose how Lumina is displayed. Your preference is saved to your account and applies on every device.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SUPPORTED_LANGUAGES.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => handleLanguageSave(opt.code)}
                    disabled={savingLang}
                    data-testid={`language-option-${opt.code}`}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      language === opt.code
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-outline-variant hover:border-primary/40'
                    }`}
                  >
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-on-surface-variant mt-1">{opt.code.toUpperCase()}</div>
                  </button>
                ))}
              </div>
              {langMsg && (
                <div
                  data-testid={`language-${langMsg.type}`}
                  className={`p-3 rounded-md ${
                    langMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {langMsg.text}
                </div>
              )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
