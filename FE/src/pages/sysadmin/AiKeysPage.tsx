import React, { useCallback, useEffect, useState } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { SysAdminNavbar } from '@components/layout/sysadmin/SysAdminNavbar'
import { SysAdminSidebar } from '@components/layout/sysadmin/SysAdminSidebar'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
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

interface NewKeyForm {
  provider: 'OpenRouter' | 'OpenAI' | 'Anthropic'
  label: string
  apiKey: string
  isActive: boolean
}

export const AiKeysPage: React.FC = () => {
  const isVi = getCurrentLanguage() === 'vi'
  const [keys, setKeys] = useState<AiKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null)

  const [newKey, setNewKey] = useState<NewKeyForm>({ provider: 'OpenRouter', label: '', apiKey: '', isActive: true })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  const handleSaveKey = async () => {
    setSaveError(null)
    if (!newKey.apiKey.trim()) {
      setSaveError(isVi ? 'API key la bat buoc.' : 'API key is required')
      return
    }
    setIsSaving(true)
    try {
      const res = await apiClient.post('/sysadmin/ai-keys', {
        provider: newKey.provider,
        label: newKey.label.trim() || null,
        apiKey: newKey.apiKey.trim(),
        isActive: newKey.isActive,
      })
      if (res.success) {
        setNewKey({ provider: 'OpenRouter', label: '', apiKey: '', isActive: true })
        await refresh()
      } else {
        setSaveError(res.message || 'Failed to save key')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save key')
    } finally {
      setIsSaving(false)
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

          {/* Add new key form */}
          <Card className="p-6">
            <h3 className="font-bold text-on-surface mb-4">{isVi ? 'Them khoa moi' : 'Add new key'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isVi ? 'Nha cung cap' : 'Provider'}
                </label>
                <select
                  className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
                  value={newKey.provider}
                  onChange={(e) => setNewKey({ ...newKey, provider: e.target.value as NewKeyForm['provider'] })}
                >
                  <option value="OpenRouter">OpenRouter</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isVi ? 'Nhan (tuy chon)' : 'Label (optional)'}
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface"
                  placeholder={isVi ? 'Nhan nhan dang...' : 'e.g. production-key'}
                  value={newKey.label}
                  onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {isVi ? 'Khoa API' : 'API Key'}
                </label>
                <input
                  type="password"
                  className="w-full rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface font-mono"
                  placeholder="sk-..."
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ai-key-active"
                  checked={newKey.isActive}
                  onChange={(e) => setNewKey({ ...newKey, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-outline text-primary"
                />
                <label htmlFor="ai-key-active" className="text-sm text-on-surface cursor-pointer">
                  {isVi ? 'Dat lam hoat dong' : 'Set as active'}
                </label>
              </div>
            </div>
            {saveError && (
              <p className="mt-2 text-sm text-error">{saveError}</p>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void handleSaveKey()}
                disabled={isSaving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? (isVi ? 'Dang luu...' : 'Saving...') : (isVi ? 'Luu khoa' : 'Save key')}
              </button>
            </div>
          </Card>

          {/* Current config info */}
          <Card className="p-6 border border-primary/20 bg-primary/5" data-testid="ai-config-info">
            <div className="flex items-start gap-4">
              <MaterialIcon icon="info" className="text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-on-surface mb-1">
                  {isVi ? 'Cau hinh AI hien tai' : 'Current AI Configuration'}
                </h3>
                <p className="text-sm text-on-surface-variant mb-3">
                  {isVi
                    ? 'He thong dang su dung model stepfun/step-3.5-flash qua OpenRouter. Khoa API duoc cau hinh trong bien moi truong he thong. Chinh sua khoa yeu cau truy cap server.'
                    : 'The system uses the stepfun/step-3.5-flash model via OpenRouter. The API key is configured via server environment variables. Editing the key requires server access.'}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container font-mono text-on-surface">
                    <MaterialIcon icon="smart_toy" size="xs" className="text-primary" />
                    stepfun/step-3.5-flash
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container font-mono text-on-surface">
                    <MaterialIcon icon="cloud" size="xs" className="text-primary" />
                    OpenRouter
                  </span>
                </div>
              </div>
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
