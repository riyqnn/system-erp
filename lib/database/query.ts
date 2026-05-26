/* eslint-disable @typescript-eslint/no-explicit-any */
import { createRouteHandlerClient, createAdminClient } from '@/lib/supabase/server'
import type { Database } from '../database.types'

export type Tables = Database['public']['Tables']
export type Roles = Tables['roles']['Row']
export type Users = Tables['users']['Row']
export type Products = Tables['products']['Row']

export type UserWithRole = Users & {
  roles?: Roles
  is_pending?: boolean
}

/**
 * Get user profile with role by user ID
 */
export async function getUserProfile(userId: string): Promise<UserWithRole | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      full_name,
      role_id,
      is_active,
      is_pending,
      created_at,
      updated_at,
      roles (
        id,
        name,
        description
      )
    `
    )
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    ...data,
    roles: (data as any).roles,
  }
}

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<Roles[]> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`)
  }

  return data || []
}

/**
 * Get role by name
 */
export async function getRoleByName(name: string): Promise<Roles | null> {
  const supabase = await createRouteHandlerClient()

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single()

  if (error) {
    return null
  }

  return data
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
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserWithRole[]> {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      full_name,
      role_id,
      is_active,
      is_pending,
      created_at,
      updated_at,
      roles (
        id,
        name,
        description
      )
    `
    )
    .order('email')

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return (data || []).map((user: any) => ({
    ...user,
    roles: user.roles,
  }))
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  roleId: string
): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('users')
    .update({ role_id: roleId })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`)
  }
}
