/** Remote access reads the Token provider's entry URL through a real Loader composition. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import Include from '@deepseek-ai/cordis-plugin-include'
import * as Connection from '@deepseek-ai/dsh-client-connection'
import * as Token from '@deepseek-ai/dsh-host-authentication-token'
import WebServer, { type WebEntryUrl } from '@deepseek-ai/dsh-host-webserver'
import { expect, it, onTestFinished } from 'vitest'
import * as WebApp from '../src/index.ts'

it('returns the provider token without startup publication and withdraws the route on unload', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-remote-access-'))
  const ctx = new Context()
  onTestFinished(async () => {
    try { await ctx.fiber.dispose() } finally { await rm(root, { recursive: true, force: true }) }
  })
  let record: Awaited<ReturnType<Context['credentials']['readRecord']>>
  const credentials: Pick<Context['credentials'], 'readRecord' | 'modifyRecord'> = {
    readRecord: () => Promise.resolve(record),
    async modifyRecord(_key, mutate) {
      record = await mutate(record)
      return record
    },
  }
  ctx.provide('credentials', credentials as Context['credentials'])
  const config = join(root, 'cordis.yml')
  await writeFile(config, [
    { name: 'cordis:webserver', config: { host: '127.0.0.1', port: 0 } },
    { name: 'cordis:connection' },
    { id: 'token', name: 'cordis:token' },
    { id: 'web-app', name: 'cordis:web-app', config: {
      printUrl: false, openBrowser: false, surfaceContext: false, publicUrl: 'https://public.example/ui/',
    } },
  ].map(row => `- ${JSON.stringify(row)}`).join('\n') + '\n')
  ctx.baseUrl = pathToFileURL(root).href + '/'
  await ctx.plugin(Loader)
  Object.assign(ctx.loader.builtins, {
    include: Include, webserver: WebServer, connection: Connection, token: Token, 'web-app': WebApp,
  })
  const include = await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(config).href } })
  await ctx.loader.resolve(include).fiber!.await()
  await ctx.loader.await()
  const webEntry = [...ctx.loader.entries()].find(entry => entry.options.id === 'web-app')
  const tokenEntry = [...ctx.loader.entries()].find(entry => entry.options.id === 'token')
  expect(webEntry).toBeDefined()
  expect(tokenEntry).toBeDefined()
  await webEntry!.fiber!.await()
  await tokenEntry!.fiber!.await()
  const entries: WebEntryUrl[] = []
  ctx.emit(ctx.webServer, 'webserver/entry-url', ctx.webApp.getAdvertisedUrl(), entries)
  expect(entries).toHaveLength(1)
  const login = new URL(entries[0]!.url)
  expect(login.origin + login.pathname).toBe('https://public.example/ui/')
  const token = login.searchParams.get('token')
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
  const endpoint = new URL('/api/remote-access-info', ctx.webServer.getOrigin())
  expect((await fetch(endpoint)).status).toBe(401)
  const exchange = await fetch(new URL(`/?token=${String(token)}`, endpoint), { redirect: 'manual' })
  expect(exchange.status).toBe(303)
  const cookie = exchange.headers.get('set-cookie')!.split(';', 1)[0]!
  const authenticated = await fetch(endpoint, { headers: { cookie } })
  expect(authenticated.status).toBe(200)
  expect(await authenticated.json()).toMatchObject({ token })
  const handler = ctx.connection.createSharedFetchHandler('/api')
  const request = () => new Request('http://127.0.0.1/api/remote-access-info')
  const response = await handler.fetch(request(), ctx.connection.browserPeer)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    token, bindHost: '127.0.0.1', isLoopback: true, protocol: 'http:', port: ctx.webServer.port,
  })
  await tokenEntry!.fiber!.dispose()
  const withoutProvider = await handler.fetch(request(), ctx.connection.browserPeer)
  expect(await withoutProvider.json()).toMatchObject({ token: '' })
  await webEntry!.fiber!.dispose()
  expect((await handler.fetch(request(), ctx.connection.browserPeer)).status).toBe(404)
})
