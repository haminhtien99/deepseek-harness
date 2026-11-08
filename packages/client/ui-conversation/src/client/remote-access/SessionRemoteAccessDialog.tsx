import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  IconCheckOutlineRegular,
  IconCloseOutlineRegular,
  IconCopyOutlineRegular,
  IconWarningTriangleOutlineRegular,
  Input,
  Modal,
  writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from '../locales.ts'
import css from './SessionRemoteAccessDialog.module.css'

export interface SessionRemoteAccessDialogProps extends PropsLocale<typeof NS> {
  readonly onClose: () => void
}

interface RemoteAccessInfo {
  readonly lanIps?: readonly string[]
  readonly port?: number
  readonly bindHost?: string
  readonly isLoopback?: boolean
  readonly token?: string
  readonly protocol?: string
  readonly user?: string
}

export function SessionRemoteAccessDialog({
  onClose,
  t,
}: SessionRemoteAccessDialogProps): ReactNode {
  const [info, setInfo] = useState<RemoteAccessInfo | undefined>()
  const [selectedIp, setSelectedIp] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/remote-access-info')
      .then(async (res) => {
        if (!res.ok) return undefined
        return (await res.json()) as RemoteAccessInfo
      })
      .then((data) => {
        if (cancelled || data === undefined) return
        setInfo(data)
        const ips = data.lanIps ?? []
        const bound = data.bindHost
        if (bound !== undefined && !data.isLoopback) {
          setSelectedIp(bound)
        } else if (ips.length > 0) {
          setSelectedIp(ips[0] ?? '127.0.0.1')
        } else if (typeof window !== 'undefined') {
          setSelectedIp(window.location.hostname)
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          setSelectedIp(window.location.hostname)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const effectivePort = info?.port ?? 3080
  const token = info?.token ?? ''
  const user = info?.user ?? 'user'
  const hostForSsh = selectedIp !== '' && selectedIp !== '127.0.0.1' ? selectedIp : (info?.lanIps?.[0] ?? 'HOST_IP')

  const sshCommand = useMemo(() => {
    return `ssh -N -L ${String(effectivePort)}:127.0.0.1:${String(effectivePort)} ${user}@${hostForSsh}`
  }, [effectivePort, user, hostForSsh])

  const sshLocalUrl = useMemo(() => {
    const tokenPart = token !== '' ? `?token=${encodeURIComponent(token)}` : ''
    return `http://127.0.0.1:${String(effectivePort)}/${tokenPart}`
  }, [effectivePort, token])

  const copy = async (text: string, key: string): Promise<void> => {
    const ok = await writeClipboard(text)
    if (ok) {
      setCopiedKey(key)
      setTimeout(() => {
        setCopiedKey(current => (current === key ? null : current))
      }, 2000)
    }
  }

  const lanIps = info?.lanIps ?? []

  return (
    <Modal
      open
      headless
      onClose={onClose}
      title={t('remoteAccess.dialog.title')}
      className={css.modal as string}
    >
      <div className={css.panel}>
        <header className={css.panelHeader}>
          <h2 className={css.panelTitle}>{t('remoteAccess.dialog.title')}</h2>
          <button
            type="button"
            className={css.iconClose}
            aria-label={t('remoteAccess.dialog.close')}
            onClick={onClose}
          >
            <IconCloseOutlineRegular size={14} />
          </button>
        </header>

        <div className={css.body}>
          {/* Security warning banner */}
          <div className={css.warningBanner} role="alert">
            <span className={css.warningIcon}>
              <IconWarningTriangleOutlineRegular size={16} />
            </span>
            <div className={css.warningContent}>
              <div className={css.warningTitle}>{t('remoteAccess.dialog.warning.title')}</div>
              <div className={css.warningDesc}>{t('remoteAccess.dialog.warning.desc')}</div>
            </div>
          </div>

          {/* Host IP selection for SSH command */}
          {lanIps.length > 1 && (
            <div className={css.stepBlock}>
              <span className={css.stepTitle}>{t('remoteAccess.dialog.selectIp')}</span>
              <div className={css.ipSelectRow}>
                {lanIps.map(ip => (
                  <button
                    key={ip}
                    type="button"
                    className={`${css.ipChip as string} ${selectedIp === ip ? (css.ipChipSelected as string) : ''}`}
                    onClick={() => { setSelectedIp(ip) }}
                  >
                    {ip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: SSH Port Forwarding */}
          <div className={css.stepBlock}>
            <span className={css.stepTitle}>{t('remoteAccess.dialog.ssh.step1')}</span>
            <div className={css.inputRow}>
              <Input
                className={css.codeField as string}
                value={sshCommand}
                readOnly
                aria-label={t('remoteAccess.dialog.ssh.step1')}
                onFocus={(e) => { e.target.select() }}
              />
              <Button
                variant={copiedKey === 'sshCmd' ? 'primary' : 'outline'}
                onClick={() => { void copy(sshCommand, 'sshCmd') }}
              >
                {copiedKey === 'sshCmd' ? <IconCheckOutlineRegular size={14} /> : <IconCopyOutlineRegular size={14} />}
                <span>{t(copiedKey === 'sshCmd' ? 'remoteAccess.dialog.copied' : 'remoteAccess.dialog.copy')}</span>
              </Button>
            </div>
          </div>

          {/* Step 2: Open local URL */}
          <div className={css.stepBlock}>
            <span className={css.stepTitle}>{t('remoteAccess.dialog.ssh.step2')}</span>
            <div className={css.inputRow}>
              <Input
                className={css.codeField as string}
                value={sshLocalUrl}
                readOnly
                aria-label={t('remoteAccess.dialog.ssh.step2')}
                onFocus={(e) => { e.target.select() }}
              />
              <Button
                variant={copiedKey === 'sshUrl' ? 'primary' : 'outline'}
                onClick={() => { void copy(sshLocalUrl, 'sshUrl') }}
              >
                {copiedKey === 'sshUrl' ? <IconCheckOutlineRegular size={14} /> : <IconCopyOutlineRegular size={14} />}
                <span>{t(copiedKey === 'sshUrl' ? 'remoteAccess.dialog.copied' : 'remoteAccess.dialog.copy')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
