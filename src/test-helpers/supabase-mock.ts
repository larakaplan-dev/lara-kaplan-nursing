import { vi } from 'vitest'

type MockResult = {
  data: unknown
  error: { message: string; code?: string } | null
  count?: number | null
}

/**
 * Creates a chainable Supabase query-builder mock.
 * The chain is thenable so `await supabase.from(...).select(...)` works,
 * and `.single()` also resolves to the same result.
 */
export function makeChain(result: MockResult) {
  const resolved = {
    data: result.data,
    error: result.error,
    count: result.count ?? null,
  }

  const chain: Record<string, unknown> = {
    // Makes `await chain` work
    then: (
      resolve: (v: typeof resolved) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(resolved).then(resolve, reject),
    single: vi.fn().mockResolvedValue(resolved),
  }

  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'is', 'not', 'ilike', 'or', 'in',
    'order', 'range', 'limit', 'filter', 'match',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }

  return chain
}

/**
 * Returns a mock Supabase admin client whose every `.from()` call uses the given chain.
 * Optionally accepts a separate rpcResult for `.rpc()` calls.
 */
export function makeClient(result: MockResult, rpcResult?: MockResult) {
  const chain = makeChain(result)
  const rpcChain = makeChain(rpcResult ?? result)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn().mockReturnValue(rpcChain),
    _chain: chain,
    _rpcChain: rpcChain,
  } as any
}
