import { NextResponse } from 'next/server'

const DEFAULT_MANAGER_ACCESS_CODE = 'MP-2026'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { accessCode } = body

    const validCode =
      process.env.MANAGER_PURCHASING_ACCESS_CODE || DEFAULT_MANAGER_ACCESS_CODE

    if (!accessCode || String(accessCode).trim() !== validCode) {
      return NextResponse.json(
        {
          message: 'Invalid manager access code',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: 'Manager access granted',
      data: {
        role: 'MANAGER_PURCHASING',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Unexpected error while validating manager access',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}