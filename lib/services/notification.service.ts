/**
 * Notification Service — Cross-module utility
 * Call this from any API route to push a notification to a user or role.
 */

export interface CreateNotificationPayload {
  title: string
  message?: string
  type: 'APPROVAL' | 'INFORMATION' | 'WARNING'
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  recipientRole?: string
  recipientId?: number
  sourceModule: string
  sourceRefId?: string
  sourceRefType?: string
  actionUrl?: string
  createdBy?: number
  expiresAt?: string
}

export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const { createAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createAdminClient()

  const { error } = await supabase.from('notifications').insert({
    title:           payload.title,
    message:         payload.message ?? null,
    type:            payload.type,
    priority:        payload.priority ?? 'MEDIUM',
    recipient_role:  payload.recipientRole ?? null,
    recipient_id:    payload.recipientId ?? null,
    source_module:   payload.sourceModule,
    source_ref_id:   payload.sourceRefId ?? null,
    source_ref_type: payload.sourceRefType ?? null,
    action_url:      payload.actionUrl ?? null,
    created_by:      payload.createdBy ?? null,
    expires_at:      payload.expiresAt ?? null,
  })

  if (error) {
    console.error('[NotificationService] Failed to create notification:', error.message)
    throw new Error(`Failed to create notification: ${error.message}`)
  }
}

export async function createNotifications(payloads: CreateNotificationPayload[]): Promise<void> {
  await Promise.all(payloads.map(createNotification))
}
