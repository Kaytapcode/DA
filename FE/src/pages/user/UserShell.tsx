/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { UserNavbar } from '@components/layout/user/UserNavbar'
import { UserSidebar } from '@components/layout/user/UserSidebar'
import { getCurrentLanguage } from '@/i18n/translations'

export const useUserLanguage = () => getCurrentLanguage() === 'vi'

interface UserShellProps {
  titleEn: string
  titleVi: string
  subtitleEn: string
  subtitleVi: string
  children: React.ReactNode
}

export const UserShell: React.FC<UserShellProps> = ({ titleEn, titleVi, subtitleEn, subtitleVi, children }) => {
  const isVi = useUserLanguage()

  return (
    <MainLayout navbar={<UserNavbar title={isVi ? titleVi : titleEn} />} sidebar={<UserSidebar />}>
      <div className="p-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-on-surface font-headline">{isVi ? titleVi : titleEn}</h2>
            <p className="text-on-surface-variant">{isVi ? subtitleVi : subtitleEn}</p>
          </div>
          {children}
        </div>
      </div>
    </MainLayout>
  )
}
