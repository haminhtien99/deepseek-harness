import { useState, type ReactNode } from 'react'
import { IconShareOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '../contract/slots.ts'
import type { NS } from '../locales.ts'
import { SessionRemoteAccessDialog } from './SessionRemoteAccessDialog.tsx'
import css from './SessionRemoteAccessAction.module.css'

export type SessionRemoteAccessActionProps =
  PropsRuntime<'conversation.session.header.utilities'> & PropsLocale<typeof NS>

export function SessionRemoteAccessAction({
  t,
}: SessionRemoteAccessActionProps): ReactNode {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={css.trigger}
        aria-label={t('remoteAccess.action')}
        onClick={() => {
          setOpen(true)
        }}
      >
        <IconShareOutlineRegular size={14} />
        <span>{t('remoteAccess.action')}</span>
      </button>
      {open && (
        <SessionRemoteAccessDialog
          onClose={() => {
            setOpen(false)
          }}
          t={t}
        />
      )}
    </>
  )
}
