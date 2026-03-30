import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('[Auth Me Error]', error)
    const statusCode = error instanceof Error && 'statusCode' in error ? (error as any).statusCode : 500
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: statusCode }
    )
  }
}
