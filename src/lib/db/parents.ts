import { createAdminClient } from '@/lib/supabase/admin'
import type { Parent } from '@/types'

type CreateParentInput = { client_name: string } & Partial<Omit<Parent,
  'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'deletion_reason' | 'client_name'
>>

type UpdateParentInput = Partial<Omit<Parent, 'id' | 'created_at' | 'updated_at'>>

export function listParents(opts: {
  search?: string
  limit?: number
  offset?: number
  archived?: boolean
} = {}) {
  const { search = '', limit = 50, offset = 0, archived = false } = opts
  const db = createAdminClient()
  let q = db
    .from('parents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  q = archived ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null)
  if (search) q = q.ilike('client_name', `%${search}%`)
  return q
}

export function getParent(id: string) {
  return createAdminClient().from('parents').select('*').eq('id', id).single()
}

export function createParent(input: CreateParentInput) {
  return createAdminClient().from('parents').insert([input]).select().single()
}

export function updateParent(id: string, input: UpdateParentInput) {
  return createAdminClient().from('parents').update(input).eq('id', id).select().single()
}

export function archiveParent(id: string, reason?: string) {
  return createAdminClient()
    .from('parents')
    .update({ deleted_at: new Date().toISOString(), deletion_reason: reason ?? null })
    .eq('id', id)
    .select('client_name')
    .single()
}

export function restoreParent(id: string) {
  return createAdminClient()
    .from('parents')
    .update({ deleted_at: null, deletion_reason: null })
    .eq('id', id)
    .select()
    .single()
}
