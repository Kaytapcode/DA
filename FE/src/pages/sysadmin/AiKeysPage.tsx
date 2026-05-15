import React, { useCallback, useEffect, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Badge } from '@components/ui/Badge'
import { MaterialIcon } from '@components/ui/MaterialIcon'
import { apiClient } from '@/utils/apiClient'
import { getCurrentLanguage } from '@/i18n/translations'

// Spec §1, SysAdmin: "Configure AI API Keys."
// Talks to BE/SysAdmin.Api/Controllers/AiKeysController.cs.

interface AiKey {
  id: string
  provider: 'OpenRouter' | 'OpenAI' | 'Anthropic' | string
  label: string | null
  keyLastFour: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

const PROVIDERS = ['OpenRouter', 'OpenAI', 'Anthropic'] as const

export const AiKeysPage: React.FC = () => {
  const isVi = getCurrentLanguage() === 'vi'
  const [keys, setKeys] = useState<AiKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [provider, setProvider] = useState<string>('OpenRouter')
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [pending, setPending] = useState(false)
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<AiKey[]>('/sysadmin/ai-keys')
      if (res.success && res.data) setKeys(res.data)
      else throw new Error(res.message || 'Failed to load keys')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load keys')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const handleCreate = async () => {
    if (!apiKey.trim()) {
      setError(isVi ? 'Vui long nhap khoa API' : 'API key is required')
      return
    }
    setPending(true)
    setError(null)
    try {
      const res = await apiClient.post<AiKey>('/sysadmin/ai-keys', {
        provider,
        label: label.trim() || null,
        apiKey: apiKey.trim(),
        isActive,
      })
      if (!res.success) throw new Error(res.message || 'Failed to add key')
      setLabel('')
      setApiKey('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key')
    } finally {
      setPending(false)
    }
  }

  const handleToggle = async (key: AiKey) => {
    setBusyKeyId(key.id)
    setError(null)
    try {
      const res = await apiClient.patch(`/sysadmin/ai-keys/${key.id}`, { isActive: !key.isActive })
      if (!res.success) throw new Error(res.message || 'Failed to update key')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key')
    } finally {
      setBusyKeyId(null)
    }
  }

  const handleDelete = async (key: AiKey) => {
    if (!confirm(isVi ? `Xoa khoa ${key.provider}?` : `Delete ${key.provider} key?`)) return
    setBusyKeyId(key.id)
    setError(null)
    try {
      const res = await apiClient.delete(`/sysadmin/ai-keys/${key.id}`)
      if (!res.success) throw new Error(res.message || 'Failed to delete key')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete key')
    } finally {
      setBusyKeyId(null)
    }
  }

  return (
    <MainLayout
      navbar={<SysAdminNavbar title={isVi ? 'Khoa API AI' : 'AI API Keys'} />}
      sidebar={<SysAdminSidebar />}
    >
      <div className="p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-on-surface font-headline mb-2">
              {isVi ? 'Khoa API AI' : 'AI API Keys'}
            </h2>
            <p className="text-on-surface-variant">
              {isVi
                ? 'Quan ly khoa nha cung cap AI cho he thong. Mot khoa hoat dong duy nhat tren mot nha cung cap.'
                : 'Manage provider keys used for AI features. One active key per provider at a time.'}
            </p>
          </div>

          {error && <Card className="p-4 border border-error/30"><p className="text-sm text-error">{error}</p></Card>}

          <Card className="p-6">
            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
              <MaterialIcon icon="vpn_key" />
              {isVi ? 'Them khoa moi' : 'Add new key'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={isVi ? 'Nha cung cap' : 'Provider'}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                options={PROVIDERS.map((p) => ({ value: p, label: p }))}
              />
              <Input
                label={isVi ? 'Nhan (tuy chon)' : 'Label (optional)'}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="primary"
              />
              <Input
                label={isVi ? 'Khoa API' : 'API Key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                type="password"
                className="md:col-span-2"
              />
              <label className="flex items-center gap-2 text-sm text-on-surface md:col-span-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {isVi ? 'Dat lam khoa hoat dong (vo hieu hoa khoa cu cung nha cung cap)' : 'Set as active (deactivates the previous active key for this provider)'}
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => void handleCreate()} disabled={pending}>
                {pending ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Luu khoa' : 'Save key')}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-on-surface">{isVi ? 'Khoa hien co' : 'Existing keys'}</h3>
              <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={isLoading}>
                <MaterialIcon icon="refresh" size="xs" className="mr-1" />
                {isVi ? 'Lam moi' : 'Refresh'}
              </Button>
            </div>

            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            )}
            {!isLoading && keys.length === 0 && (
              <p className="text-sm text-on-surface-variant text-center py-4">
                {isVi ? 'Chua co khoa nao.' : 'No keys yet.'}
              </p>
            )}
            {!isLoading && keys.length > 0 && (
              <div className="space-y-2">
                {keys.map((k) => (
                  <div key={k.id} className="p-3 rounded-lg bg-surface-container-low flex flex-wrap items-center gap-3">
                    <Badge variant={k.isActive ? 'success' : 'secondary'} size="sm">
                      {k.provider}
                    </Badge>
                    <span className="text-sm font-medium text-on-surface">
                      {k.label || (isVi ? '(khong nhan)' : '(unlabeled)')}
                    </span>
                    <span className="text-xs text-on-surface-variant">
                      ••••{k.keyLastFour ?? '????'}
                    </span>
                    <span className="text-xs text-on-surface-variant ml-auto">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleToggle(k)}
                      disabled={busyKeyId === k.id}
                    >
                      {k.isActive ? (isVi ? 'Tat' : 'Deactivate') : (isVi ? 'Bat' : 'Activate')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDelete(k)}
                      disabled={busyKeyId === k.id}
                    >
                      <MaterialIcon icon="delete" size="xs" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default AiKeysPage
