// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionRemoteAccessAction } from '../src/client/remote-access/SessionRemoteAccessAction.tsx'
import { SessionRemoteAccessDialog } from '../src/client/remote-access/SessionRemoteAccessDialog.tsx'
import type { SessionRemoteAccessActionProps } from '../src/client/remote-access/SessionRemoteAccessAction.tsx'
import { en } from '../src/client/locales.ts'

const t = (key: string) => (en as Record<string, string>)[key] ?? key

afterEach(() => {
  cleanup()
})

describe('SessionRemoteAccessAction and SessionRemoteAccessDialog', () => {
  it('renders trigger button and opens dialog upon click', () => {
    const props = {
      t: t as never,
    } as unknown as SessionRemoteAccessActionProps

    render(<SessionRemoteAccessAction {...props} />)

    const button = screen.getByRole('button', { name: en['remoteAccess.action'] })
    expect(button).toBeDefined()
    fireEvent.click(button)

    expect(screen.getByText(en['remoteAccess.dialog.title'])).toBeDefined()
    expect(screen.getByText(en['remoteAccess.dialog.warning.title'])).toBeDefined()
    expect(screen.getByText(en['remoteAccess.dialog.warning.desc'])).toBeDefined()
  })

  it('renders SSH tunnel configuration and steps in dialog', async () => {
    const onClose = vi.fn()

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lanIps: ['10.0.0.173', '100.66.38.107'],
        port: 3080,
        bindHost: '127.0.0.1',
        isLoopback: true,
        token: 'secret-token-12345',
        protocol: 'http:',
        user: 'alice',
      }),
    } as Response)

    render(
      <SessionRemoteAccessDialog
        onClose={onClose}
        t={t as never}
      />,
    )

    expect(screen.getByText(en['remoteAccess.dialog.title'])).toBeDefined()
    expect(screen.getByText(en['remoteAccess.dialog.warning.title'])).toBeDefined()

    // Verifies SSH step 1 command input
    await waitFor(() => {
      const sshCmdInput = screen.getByLabelText(en['remoteAccess.dialog.ssh.step1']) as HTMLInputElement
      expect(sshCmdInput.value).toContain('ssh -N -L 3080:127.0.0.1:3080 alice@10.0.0.173')
      const localUrlInput = screen.getByLabelText(en['remoteAccess.dialog.ssh.step2']) as HTMLInputElement
      expect(localUrlInput.value).toContain('http://127.0.0.1:3080/?token=secret-token-12345')
    })

    // IP switcher button changes host IP in SSH command
    const tailscaleChip = screen.getByRole('button', { name: '100.66.38.107' })
    fireEvent.click(tailscaleChip)
    const updatedSshCmdInput = screen.getByLabelText(en['remoteAccess.dialog.ssh.step1']) as HTMLInputElement
    expect(updatedSshCmdInput.value).toContain('ssh -N -L 3080:127.0.0.1:3080 alice@100.66.38.107')

    // Clicking close button calls onClose
    const closeBtn = screen.getByRole('button', { name: en['remoteAccess.dialog.close'] })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()

    fetchMock.mockRestore()
  })
})
