'use server'

import { cookies } from 'next/headers'

/**
 * Get current user from NestJS API
 * Server-side calls the backend directly and passes cookies as headers
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()

    // Extract cookies and forward to backend
    const accessToken = cookieStore.get('access_token')?.value

    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pass access token via Authorization header for server-side calls
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Error fetching user:', error)
    return null
  }
}
