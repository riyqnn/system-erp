
'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
  useMemo,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ChatCircle,
  Megaphone,
  ChatTeardrop,
  X,
  PaperPlaneTilt,
  MagnifyingGlass,
  ArrowLeft,
  Plus,
  Spinner,
} from '@phosphor-icons/react'
import { type CurrentUser } from '@/hooks/useProfile'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserResult {
  user_id: number
  username: string
  full_name: string | null
  email: string | null
  role: string
}

interface ConversationItem {
  id: string
  type: 'DIRECT' | 'ANNOUNCEMENT'
  title: string | null
  updated_at: string
  otherUserName?: string
  otherUserRole?: string
}

interface Message {
  id: string
  sender_id: number | null
  content: string
  type: string
  created_at: string
  sender_name?: string | null
  sender_role?: string | null
}

type DrawerTab = 'DM' | 'ANNOUNCEMENTS'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSafeUTC(iso: string): Date {
  if (!iso.endsWith('Z') && !iso.match(/[+-]\d{2}:?\d{2}$/)) {
    return new Date(iso + 'Z')
  }
  return new Date(iso)
}

function timeAgo(iso: string): string {
  const diff = Date.now() - parseSafeUTC(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} mins`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hours`
  return `${Math.floor(h / 24)} days`
}

function getInitials(name: string | null, username: string): string {
  const src = name || username
  return src.slice(0, 2).toUpperCase()
}

function roleColor(role: string): string {
  const map: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-600',
    INVENTORY: 'bg-teal-100 text-teal-700',
    FINANCE: 'bg-amber-100 text-amber-700',
    PURCHASING: 'bg-purple-100 text-purple-700',
    PRODUCTION: 'bg-blue-100 text-blue-700',
    SALES: 'bg-green-100 text-green-700',
    SNM: 'bg-green-100 text-green-700',
  }
  return map[role.toUpperCase()] ?? 'bg-slate-100 text-slate-600'
}

// ─── UserAvatar ──────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 36 }: { user: UserResult | { full_name: string | null; username: string; role: string }; size?: number }) {
  const initials = getInitials(user.full_name, user.username)
  const colors = ['bg-violet-200 text-violet-700', 'bg-cyan-200 text-cyan-700', 'bg-emerald-200 text-emerald-700', 'bg-orange-200 text-orange-700', 'bg-pink-200 text-pink-700']
  const colorIdx = user.username.charCodeAt(0) % colors.length
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.32 }}
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colors[colorIdx]}`}
    >
      {initials}
    </div>
  )
}

// ─── ChatWindow ──────────────────────────────────────────────────────────────

function ChatWindow({
  conversationId,
  currentUserId,
  title,
  onBack,
  readonly,
  hideHeader,
}: {
  conversationId: string
  currentUserId: number
  title: string
  onBack: () => void
  readonly?: boolean
  hideHeader?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((d: { data?: Message[] }) => setMessages(d.data ?? []))
      .catch(() => { })
      .finally(() => setLoading(false))

    fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {})
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.sender_id === currentUserId) return
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId, supabase])

  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending) return
    setSending(true)
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      content,
      type: 'TEXT',
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setInput('')
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const json = await res.json() as { data: Message }
      setMessages((prev) => prev.map((m) => m.id === optimistic.id ? json.data : m))
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }, [input, sending, conversationId, currentUserId])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft weight="bold" className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
            <p className="text-[11px] text-slate-400">Direct Message</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Spinner className="w-6 h-6 text-slate-300 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-12">
            <ChatTeardrop weight="light" className="w-12 h-12 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-300 mt-1">Start a conversation now!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${isMine
                      ? 'bg-slate-800 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                >
                  {!isMine && (m.sender_name || m.sender_role) && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {m.sender_role && (
                         <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide ${roleColor(m.sender_role)}`}>
                           {m.sender_role}
                         </span>
                      )}
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        {m.sender_name}
                      </p>
                    </div>
                  )}
                  <p className="leading-relaxed break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-slate-400' : 'text-slate-400'}`}>
                    {parseSafeUTC(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
        {readonly ? (
          <div className="text-center py-2 text-xs text-slate-400 font-medium">
            Only Admins can send announcements.
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 resize-none text-sm border border-slate-200 rounded-2xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400/30 max-h-24 bg-slate-50 focus:bg-white transition-colors"
              style={{ minHeight: 40 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 bg-slate-800 text-white rounded-full hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0 shadow-sm"
            >
              {sending
                ? <Spinner className="w-4 h-4 animate-spin" />
                : <PaperPlaneTilt weight="fill" className="w-4 h-4" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MessagingDrawer ─────────────────────────────────────────────────────────

function MessagingDrawer({
  currentUser,
  onClose,
}: {
  currentUser: CurrentUser | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<DrawerTab>('DM')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [globalAnnId, setGlobalAnnId] = useState<string | null>(null)

  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [activeConvTitle, setActiveConvTitle] = useState('')
  const [search, setSearch] = useState('')
  const [userResults, setUserResults] = useState<UserResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [, startTransition] = useTransition()
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load conversations and global announcement ID
  useEffect(() => {
    fetch('/api/conversations?type=DIRECT')
      .then((r) => r.json())
      .then((d: { data?: ConversationItem[] }) => setConversations(d.data ?? []))
      .catch(() => { })

    fetch('/api/conversations/global-announcement')
      .then((r) => r.json())
      .then((d: { data?: { id: string } }) => {
        if (d.data?.id) setGlobalAnnId(d.data.id)
      })
      .catch(() => { })
  }, [])

  // Live user search with debounce
  useEffect(() => {
    if (tab !== 'DM') return

    if (searchTimeout.current) clearTimeout(searchTimeout.current)

    if (search.trim().length < 1) {
      setUserResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`)
        const json = await res.json() as { data: UserResult[] }
        startTransition(() => setUserResults(json.data ?? []))
      } catch {
        setUserResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search, tab])

  // Start or open DM with a user
  const openDM = useCallback(async (targetUser: UserResult) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.user_id }),
      })
      const json = await res.json() as { data: { id: string } }
      if (json.data?.id) {
        const displayName = targetUser.full_name ?? targetUser.username
        // Add to conversation list if not already there
        setConversations((prev) => {
          if (prev.find((c) => c.id === json.data.id)) return prev
          return [{
            id: json.data.id,
            type: 'DIRECT',
            title: null,
            updated_at: new Date().toISOString(),
            otherUserName: displayName,
            otherUserRole: targetUser.role,
          }, ...prev]
        })
        setSearch('')
        setUserResults([])
        setActiveConvId(json.data.id)
        setActiveConvTitle(displayName)
      }
    } catch {
      // ignore
    }
  }, [])

  // Decide what to show in DM tab
  const showUserSearch = search.trim().length > 0
  const filteredConvs = conversations.filter((c) =>
    (c.otherUserName ?? c.title ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 h-screen w-[22rem] bg-white z-50 flex flex-col shadow-2xl border-l border-slate-200">

        {/* ── Header ── */}
        {!activeConvId && (
          <div className="flex items-center justify-between px-4 pt-4 pb-0 flex-shrink-0">
            <div className="flex items-center gap-2">
              <ChatTeardrop weight="fill" className="w-5 h-5 text-slate-700" />
              <h2 className="text-sm font-semibold text-slate-900">Messages</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X weight="bold" className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}

        {/* ── Content: Chat list or Chat window ── */}
        {activeConvId ? (
          <div className="flex-1 overflow-hidden">
            <ChatWindow
              conversationId={activeConvId}
              currentUserId={currentUser?.user_id ?? 0}
              title={activeConvTitle}
              onBack={() => { setActiveConvId(null); setActiveConvTitle('') }}
            />
          </div>
        ) : (
          <>
            {/* Search + New Chat */}
            <div className="px-3 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                {searchLoading
                  ? <Spinner className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
                  : <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                }
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === 'DM' ? 'Search name, username, or email...' : 'Search announcements...'}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 flex-shrink-0 px-1">
              {([
                { key: 'DM' as DrawerTab, label: 'Direct Message', icon: ChatCircle },
                { key: 'ANNOUNCEMENTS' as DrawerTab, label: 'Announcement', icon: Megaphone },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setSearch(''); setUserResults([]) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${tab === key
                      ? 'border-slate-800 text-slate-800'
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                    }`}
                >
                  <Icon weight="regular" className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto">

              {/* ── DM Tab ── */}
              {tab === 'DM' && (
                <>
                  {/* User search results */}
                  {showUserSearch ? (
                    <div>
                      {userResults.length === 0 && !searchLoading ? (
                        <div className="py-10 text-center">
                          <p className="text-sm text-slate-400">No users found</p>
                          <p className="text-xs text-slate-300 mt-1">Try another name</p>
                        </div>
                      ) : (
                        <>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            User Search Results
                          </p>
                          {userResults.map((u) => (
                            <button
                              key={u.user_id}
                              onClick={() => openDM(u)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                            >
                              <UserAvatar user={u} size={38} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {u.full_name ?? u.username}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{u.email ?? u.username}</p>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor(u.role)}`}>
                                {u.role}
                              </span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    /* Existing DM conversations */
                    <div>
                      {filteredConvs.length === 0 ? (
                        <div className="py-14 px-6 text-center">
                          <ChatCircle weight="light" className="w-14 h-14 text-slate-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-400">No conversations yet</p>
                          <p className="text-xs text-slate-300 mt-1">
                            Type a name or email to start a new chat
                          </p>
                          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                            <Plus weight="bold" className="w-3.5 h-3.5" />
                            <span>Search for users in the search bar above</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Conversations
                          </p>
                          {filteredConvs.map((c) => {
                            const displayName = c.otherUserName ?? c.title ?? 'Chat'
                            const role = c.otherUserRole
                            return (
                              <button
                                key={c.id}
                                onClick={() => { setActiveConvId(c.id); setActiveConvTitle(displayName) }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                              >
                                <UserAvatar user={{ username: displayName, full_name: null, role: role ?? '' }} size={38} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-slate-400 truncate">{timeAgo(c.updated_at)}</p>
                                </div>
                                {role && (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColor(role)}`}>
                                    {role}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Announcements Tab ── */}
              {tab === 'ANNOUNCEMENTS' && (
                <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
                  {globalAnnId ? (
                    <ChatWindow
                      conversationId={globalAnnId}
                      currentUserId={currentUser?.user_id ?? 0}
                      title="Global Announcement"
                      onBack={() => {}} // not used
                      hideHeader={true}
                      readonly={currentUser?.role !== 'ADMIN'}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <Spinner className="w-5 h-5 text-slate-400 animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── MessagingButton ─────────────────────────────────────────────────────────

interface MessagingButtonProps {
  currentUser: CurrentUser | null
  unreadDmCount?: number
}

export function MessagingButton({ currentUser, unreadDmCount = 0 }: MessagingButtonProps) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(unreadDmCount)

  const fetchUnread = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/conversations/unread')
      const json = await res.json()
      if (json.data?.count !== undefined) {
        setUnreadCount(json.data.count)
      }
    } catch {
      // ignore
    }
  }, [currentUser])

  useEffect(() => {
    const timer = setTimeout(() => fetchUnread(), 0)
    const interval = setInterval(fetchUnread, 15000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [fetchUnread])

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => fetchUnread(), 0)
      return () => clearTimeout(timer)
    }
  }, [open, fetchUnread])

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2 rounded-lg transition-colors ${open ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
        aria-label="Pesan"
      >
        <ChatCircle weight={open ? 'fill' : 'bold'} className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-[1.1rem] h-[1.1rem] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <MessagingDrawer
          currentUser={currentUser}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
