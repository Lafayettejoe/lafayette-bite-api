import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

// ── Standard success response ─────────────────────────────
export function successResponse(data: unknown, meta?: unknown, status = 200) {
    return NextResponse.json(
        { data, ...(meta ? { meta } : {}) },
        { status }
    )
}

// ── Standard error response ───────────────────────────────
export function errorResponse(
    code: string,
    message: string,
    status: number
) {
    return NextResponse.json(
        { error: { code, message } },
        { status }
    )
}

// ── Parse pagination query params ────────────────────────
export function parsePagination(searchParams: URLSearchParams) {
    const MAX_LIMIT = 100
    const DEFAULT_LIMIT = 20

    let limit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT))
    let offset = parseInt(searchParams.get('offset') ?? '0')

    // Clamp limit between 1 and MAX_LIMIT
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    // Reject negative offset
    if (isNaN(offset) || offset < 0) {
        return { error: 'offset must be a non-negative integer' }
    }

    return { limit, offset }
}

// ── Build meta object for list responses ─────────────────
export function buildMeta(total: number, limit: number, offset: number) {
    return {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
    }
}

// ── Handle Zod validation errors ─────────────────────────
export function handleZodError(error: ZodError) {
    const message = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    return errorResponse('VALIDATION_ERROR', message, 422)
}

// ── Convert kobo to naira for display ────────────────────
export function koboToNaira(kobo: number) {
    return kobo / 100
}

import { apiRateLimit } from './ratelimit'

export async function checkRateLimit(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success, limit, remaining, reset } = await apiRateLimit.limit(ip)
    console.log('[ratelimit]', { ip, success, remaining })

    if (!success) {
        return NextResponse.json(
            { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' } },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                },
            }
        )
    }

    return null
}