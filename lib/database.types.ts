export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ms_user: {
        Row: {
          user_id: number
          username: string
          password_hash: string
          full_name: string | null
          email: string | null
          role: string
          status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
          created_at: string
        }
        Insert: {
          user_id?: number
          username: string
          password_hash: string
          full_name?: string | null
          email?: string | null
          role: string
          status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
          created_at?: string
        }
        Update: {
          user_id?: number
          username?: string
          password_hash?: string
          full_name?: string | null
          email?: string | null
          role?: string
          status?: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sku: string
          name: string
          description: string | null
          category: string | null
          unit: string
          type: 'RAW_MATERIAL' | 'FINISHED_GOOD' | 'CONSUMABLE'
          cost_price: number
          selling_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku: string
          name: string
          description?: string | null
          category?: string | null
          unit: string
          type: 'RAW_MATERIAL' | 'FINISHED_GOOD' | 'CONSUMABLE'
          cost_price?: number
          selling_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string
          name?: string
          description?: string | null
          category?: string | null
          unit?: string
          type?: 'RAW_MATERIAL' | 'FINISHED_GOOD' | 'CONSUMABLE'
          cost_price?: number
          selling_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          title: string
          message: string | null
          type: 'APPROVAL' | 'INFORMATION' | 'WARNING'
          priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status: 'UNREAD' | 'READ' | 'ARCHIVED'
          recipient_role: string | null
          recipient_id: number | null
          source_module: string | null
          source_ref_id: string | null
          source_ref_type: string | null
          action_url: string | null
          created_by: number | null
          created_at: string
          read_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          title: string
          message?: string | null
          type?: 'APPROVAL' | 'INFORMATION' | 'WARNING'
          priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status?: 'UNREAD' | 'READ' | 'ARCHIVED'
          recipient_role?: string | null
          recipient_id?: number | null
          source_module?: string | null
          source_ref_id?: string | null
          source_ref_type?: string | null
          action_url?: string | null
          created_by?: number | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          message?: string | null
          type?: 'APPROVAL' | 'INFORMATION' | 'WARNING'
          priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
          status?: 'UNREAD' | 'READ' | 'ARCHIVED'
          recipient_role?: string | null
          recipient_id?: number | null
          source_module?: string | null
          source_ref_id?: string | null
          source_ref_type?: string | null
          action_url?: string | null
          created_by?: number | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          type: 'DIRECT' | 'ANNOUNCEMENT'
          title: string | null
          created_by: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type?: 'DIRECT' | 'ANNOUNCEMENT'
          title?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'DIRECT' | 'ANNOUNCEMENT'
          title?: string | null
          created_by?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          user_id: number
          role: string
          joined_at: string
          last_read_at: string | null
        }
        Insert: {
          conversation_id: string
          user_id: number
          role?: string
          joined_at?: string
          last_read_at?: string | null
        }
        Update: {
          conversation_id?: string
          user_id?: number
          role?: string
          joined_at?: string
          last_read_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: number | null
          type: 'TEXT' | 'SYSTEM' | 'ANNOUNCEMENT'
          content: string
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id?: number | null
          type?: 'TEXT' | 'SYSTEM' | 'ANNOUNCEMENT'
          content: string
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: number | null
          type?: 'TEXT' | 'SYSTEM' | 'ANNOUNCEMENT'
          content?: string
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          user_id: number
          avatar_url: string | null
          avatar_style: string
          department: string | null
          phone: string | null
          bio: string | null
          theme: string
          notif_email: boolean
          notif_push: boolean
          updated_at: string
        }
        Insert: {
          user_id: number
          avatar_url?: string | null
          avatar_style?: string
          department?: string | null
          phone?: string | null
          bio?: string | null
          theme?: string
          notif_email?: boolean
          notif_push?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: number
          avatar_url?: string | null
          avatar_style?: string
          department?: string | null
          phone?: string | null
          bio?: string | null
          theme?: string
          notif_email?: boolean
          notif_push?: boolean
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      notif_type_enum: 'APPROVAL' | 'INFORMATION' | 'WARNING'
      notif_priority_enum: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
      notif_status_enum: 'UNREAD' | 'READ' | 'ARCHIVED'
      conversation_type_enum: 'DIRECT' | 'ANNOUNCEMENT'
      message_type_enum: 'TEXT' | 'SYSTEM' | 'ANNOUNCEMENT'
    }
  }
}
