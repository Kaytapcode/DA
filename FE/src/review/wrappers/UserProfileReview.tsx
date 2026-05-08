import React, { useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { Button } from '@components/ui/Button'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { Badge } from '@components/ui/Badge'
import { MOCK_PROFILE } from '@/review/reviewData'

type TabType = 'personal' | 'security' | 'wallet' | 'notifications'

export const UserProfileReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const [isSaved, setIsSaved] = useState(false)
  const [values, setValues] = useState(MOCK_PROFILE)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Details', icon: 'person' },
    { id: 'security', label: 'Security', icon: 'lock' },
    { id: 'wallet', label: 'Academic Wallet', icon: 'account_balance_wallet' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  ]

  return (
    <MainLayout
      navbar={<UserNavbar title="Profile" />}
      sidebar={<UserSidebar />}
    >
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {isSaved && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <MaterialIcon icon="check_circle" className="text-green-600" />
              <span className="text-green-700">Changes saved.</span>
            </div>
          )}

          <div className="mb-8 border-b border-outline-variant overflow-x-auto">
            <div className="flex gap-10 pb-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 pb-4 font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary -mb-[18px]'
                      : 'text-on-surface-variant hover:text-primary'}
                  `}
                >
                  <MaterialIcon icon={tab.icon} className="text-lg" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {activeTab === 'personal' && (
                <Card className="p-10 glass-card space-y-8">
                  <form onSubmit={handleSave} className="space-y-8">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      <div className="relative group shrink-0">
                        <div className="w-32 h-32 rounded-xl bg-primary/10 flex items-center justify-center shadow-xl">
                          <MaterialIcon icon="person" className="text-5xl text-primary" />
                        </div>
                      </div>

                      <div className="flex-1 w-full space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Input label="Full Name" name="fullName" value={values.fullName} onChange={handleChange} />
                          <Input label="Email Address" type="email" name="email" value={values.email} onChange={handleChange} />
                        </div>
                        <Input label="Bio" name="bio" value={values.bio} onChange={handleChange} placeholder="Tell us about yourself" />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-outline-variant">
                      <h3 className="text-xl font-bold mb-6">Academic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input label="Institution" name="institution" value={values.institution} onChange={handleChange} />
                        <Input label="Degree" name="degree" value={values.degree} onChange={handleChange} />
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                            Graduation Date
                          </label>
                          <p className="text-xl font-semibold text-on-surface">2027</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button variant="primary" type="submit" size="md">Save Changes</Button>
                    </div>
                  </form>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="p-10 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <Input label="Current Password" type="password" />
                      <Input label="New Password" type="password" />
                      <Input label="Confirm Password" type="password" />
                      <Button variant="primary" size="md">Update Password</Button>
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

              {activeTab === 'wallet' && (
                <Card className="p-10 space-y-6">
                  <p className="text-on-surface-variant">
                    Your academic credentials and certifications are stored here.
                  </p>
                  <p className="text-sm text-on-surface-variant">No achievements yet.</p>
                </Card>
              )}

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
                        <label className="font-medium text-on-surface cursor-pointer">{notif.label}</label>
                        <div className="relative inline-flex w-12 h-7 bg-slate-300 rounded-full transition-colors">
                          <input type="checkbox" defaultChecked={notif.enabled} className="w-full h-full opacity-0 cursor-pointer" />
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full transition-all ${notif.enabled ? 'bg-primary translate-x-5' : 'bg-white'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6">
                <h3 className="font-headline text-lg font-bold mb-6">Learning Vitality</h3>
                <div className="space-y-6">
                  {[
                    { label: 'Courses completed', value: '4' },
                    { label: 'Avg. score', value: '88%' },
                    { label: 'Streak', value: '12 days' },
                  ].map((stat, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-on-surface-variant">{stat.label}</span>
                        <span className="font-bold text-primary">{stat.value}</span>
                      </div>
                      <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-tertiary" style={{ width: `${30 + idx * 20}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-headline text-lg font-bold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { action: 'Completed "Wave Packet Dispersion"', time: '2 hours ago' },
                    { action: 'Scored 94% on Quiz 3', time: 'Yesterday' },
                    { action: 'Started "Operators & Observables"', time: '3 days ago' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-on-surface">{activity.action}</p>
                        <p className="text-xs text-on-surface-variant">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
