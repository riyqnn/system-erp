import { createRouteHandlerClient, createAdminClient } from '@/lib/supabase/server'
import type { Database } from '../database.types'

export type Tables = Database['public']['Tables']
export type MsUser = Tables['ms_user']['Row']
export type Products = Tables['products']['Row']

/**
 * Get user profile from ms_user by email
 */
export async function getUserProfile(email: string): Promise<MsUser | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_user')
    .select('user_id, username, full_name, email, role, status, created_at')
    .eq('email', email)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as MsUser
}

/**
 * Get user profile from ms_user by username
 */
export async function getUserByUsername(username: string): Promise<MsUser | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('ms_user')
    .select('user_id, username, full_name, email, role, status, created_at')
    .eq('username', username)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as MsUser
}

/**
 * Get all products
 */
export async function getAllProducts(): Promise<Products[]> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return data || []
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Products | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Get product by SKU
 */
export async function getProductBySku(sku: string): Promise<Products | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Create a new product (admin only - uses service role)
 */
export async function createProduct(
  product: Omit<Tables['products']['Insert'], 'id' | 'created_at' | 'updated_at'>
): Promise<Products> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`)
  }

  return data
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  updates: Partial<Tables['products']['Update']>
): Promise<Products> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`)
  }

  return data
}

/**
 * Delete a product (soft delete by setting is_active to false)
 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createRouteHandlerClient()

  const { error } = await supabase
    .from('products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete product: ${error.message}`)
  }
}

/**
 * Get all users from ms_user (admin only)
 */
export async function getAllUsers(): Promise<MsUser[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('ms_user')
    .select('user_id, username, full_name, email, role, status, created_at')
    .order('username')

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return (data || []) as MsUser[]
}

/**
 * Update user role in ms_user
 */
export async function updateUserRole(
  userId: number,
  role: string
): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('ms_user')
    .update({ role })
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`)
  }
}
