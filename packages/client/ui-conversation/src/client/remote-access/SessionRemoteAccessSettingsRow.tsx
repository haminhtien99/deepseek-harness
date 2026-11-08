import { useState, type ReactNode } from 'react'
import { Button, IconShareOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { NS } from '../locales.ts'
import { SessionRemoteAccessDialog } from './SessionRemoteAccessDialog.tsx'
import css from './SessionRemoteAccessSettingsRow.module.css'

export type SessionRemoteAccessSettingsRowProps =
  PropsRuntime<'settings.general.item'> & PropsLocale<typeof NS>

export function SessionRemoteAccessSettingsRow({ t }: SessionRemoteAccessSettingsRowProps): ReactNode {
  const [open, setOpen] = useState(false)

  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.title}>{t('remoteAccess.dialog.title')}</div>
        <div className={css.desc}>{t('remoteAccess.settings.desc')}</div>
      </div>
      <Button
        variant="outline"
        className={css.actionButton}
        onClick={() => {
          setOpen(true)
        }}
      >
        <IconShareOutlineRegular size={14} />
        <span>{t('remoteAccess.action')}</span>
      </Button>
      {open && (
        <SessionRemoteAccessDialog
          onClose={() => {
            setOpen(false)
          }}
          t={t}
        />
      )}
    </div>
  )
}
