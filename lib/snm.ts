/**
 * Shared helpers for the Sales & Marketing (SNM) module.
 *
 * The ERP database uses the canonical schema documented in the project report
 * (ms_*, tr_*, an_* tables). Records use human-readable VARCHAR primary keys
 * (e.g. SO-202606-001) that have NO database default, so the client generates
 * the next id before inserting.
 *
 * Cross-module integration points (read + write) — no schema changes are made:
 *  - Inventory : real-time stock from tr_stock_balance, DO source warehouse
 *  - Finance   : receivables transmitted into `piutang` on invoice issue
 *  - Production : pre-order SO raises a tr_production_request
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, 'public', any>

/** Single-transaction value that forces manager approval (UC-SLS-06). */
export const SINGLE_TXN_LIMIT = 500_000_000

/** Default finished-goods warehouse used as the source for Delivery Orders. */
export const FG_WAREHOUSE = 'WH-003' // Gudang FG Cikupa

export const PAYMENT_TERMS = ['COD', 'NET_7', 'NET_14', 'NET_30', 'NET_45'] as const
export const CUSTOMER_CATEGORIES = ['MODERN_TRADE', 'GENERAL_TRADE', 'AGEN_DISTRIBUTOR'] as const

export const CATEGORY_LABEL: Record<string, string> = {
  MODERN_TRADE: 'Modern Trade',
  GENERAL_TRADE: 'General Trade',
  AGEN_DISTRIBUTOR: 'Agen Distributor',
}
export const CATEGORY_COLORS: Record<string, string> = {
  MODERN_TRADE: 'bg-blue-50 text-blue-700',
  GENERAL_TRADE: 'bg-amber-50 text-amber-700',
  AGEN_DISTRIBUTOR: 'bg-purple-50 text-purple-700',
}

export const SO_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  WAITING_APPROVAL: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED_CREDIT: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}
export const SO_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  WAITING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED_CREDIT: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-400',
}
export const DO_BADGE: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  RETURNED: 'bg-red-100 text-red-700',
  VOID: 'bg-slate-100 text-slate-400',
}
export const PAYMENT_BADGE: Record<string, string> = {
  UNPAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
}

// ── formatting ────────────────────────────────────────────────────────────
export const rupiah = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID')

export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fmtDateShort = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'

export const currentPeriode = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Days for a payment term, e.g. NET_30 → 30, COD → 0. */
export function termDays(term: string | null | undefined): number {
  if (!term || term === 'COD') return 0
  const n = parseInt(term.replace('NET_', ''), 10)
  return isNaN(n) ? 0 : n
}

// ── id generation ───────────────────────────────────────────────────────────
const ym = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Next period-scoped document id, e.g. SO-202606-001 / DO-... / INV-... */
export async function genDocId(supabase: DB, table: string, idCol: string, prefix: string): Promise<string> {
  const period = ym()
  const { data } = await supabase
    .from(table)
    .select(idCol)
    .like(idCol, `${prefix}-${period}-%`)
    .order(idCol, { ascending: false })
    .limit(1)
  let next = 1
  const last = (data?.[0] as Record<string, string> | undefined)?.[idCol]
  if (last) {
    const n = parseInt(last.slice(-3), 10)
    if (!isNaN(n)) next = n + 1
  }
  return `${prefix}-${period}-${String(next).padStart(3, '0')}`
}

/** Next global customer id, e.g. CUST-021. */
export async function genCustId(supabase: DB): Promise<string> {
  const { data } = await supabase
    .from('ms_customer')
    .select('cust_id')
    .like('cust_id', 'CUST-%')
    .order('cust_id', { ascending: false })
    .limit(1)
  let next = 1
  const last = (data?.[0] as { cust_id: string } | undefined)?.cust_id
  if (last) {
    const n = parseInt(last.slice(5), 10)
    if (!isNaN(n)) next = n + 1
  }
  return `CUST-${String(next).padStart(3, '0')}`
}

/** Human invoice number INV/MYR/YYMM/NNN derived from inv_id INV-YYYYMM-NNN. */
export function invoiceNumberFromId(invId: string): string {
  // INV-202606-002 -> INV/MYR/2606/002
  const m = invId.match(/INV-(\d{4})(\d{2})-(\d{3})/)
  if (!m) return invId
  return `INV/MYR/${m[1].slice(2)}${m[2]}/${m[3]}`
}

// ── notifications (cross-module, client-side) ────────────────────────────────
export interface NotifInput {
  title: string
  message?: string
  type?: 'APPROVAL' | 'INFORMATION' | 'WARNING'
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  recipientRole: string
  sourceModule?: string
  sourceRefId?: string
  sourceRefType?: string
  actionUrl?: string
  createdBy?: number | null
}

/** Push a notification. Fails silently so UX flows are never blocked by it. */
export async function notify(supabase: DB, n: NotifInput): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      title: n.title,
      message: n.message ?? null,
      type: n.type ?? 'INFORMATION',
      priority: n.priority ?? 'MEDIUM',
      recipient_role: n.recipientRole,
      source_module: n.sourceModule ?? 'SNM',
      source_ref_id: n.sourceRefId ?? null,
      source_ref_type: n.sourceRefType ?? null,
      action_url: n.actionUrl ?? null,
      created_by: n.createdBy ?? null,
    })
  } catch {
    /* notifications table issues must never break the workflow */
  }
}

// ── credit ────────────────────────────────────────────────────────────────
/**
 * Outstanding receivable per customer = Σ grand_total of sales invoices whose
 * payment_status ≠ PAID (UC-SLS-06 / UC-SLS-02). Returns a {cust_id: amount} map.
 */
export async function loadOutstandingByCustomer(supabase: DB): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('tr_sales_invoice')
    .select('cust_id, grand_total, payment_status')
    .neq('payment_status', 'PAID')
  const map: Record<string, number> = {}
  ;(data as { cust_id: string; grand_total: number }[] | null)?.forEach((r) => {
    map[r.cust_id] = (map[r.cust_id] ?? 0) + (Number(r.grand_total) || 0)
  })
  return map
}
