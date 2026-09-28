import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
    successResponse,
    errorResponse,
    parsePagination,
    buildMeta,
    checkRateLimit,
    handleZodError,
} from '@/lib/api-helpers'
import { z } from 'zod'

export async function GET(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)

    const pagination = parsePagination(searchParams)
    if ('error' in pagination) {
        return errorResponse('INVALID_PAGINATION', pagination.error, 400)
    }
    const { limit, offset } = pagination

    const allowedSortFields = ['name', 'email', 'createdAt']
    const sort = searchParams.get('sort') ?? 'createdAt'
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    if (!allowedSortFields.includes(sort)) {
        return errorResponse(
            'INVALID_SORT',
            `sort must be one of: ${allowedSortFields.join(', ')}`,
            400
        )
    }

    const search = searchParams.get('search')
    const where = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ],
        }
        : {}

    const [customers, total] = await Promise.all([
        db.customer.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { [sort]: order },
            include: {
                _count: { select: { orders: true } },
            },
        }),
        db.customer.count({ where }),
    ])

    return successResponse(customers, buildMeta(total, limit, offset))
}

// ── NEW: create (or reuse) a customer ─────────────────────
const createCustomerSchema = z.object({
    name: z.string().min(1, 'name is required'),
    email: z.string().email('a valid email is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
})

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400)
    }

    const parsed = createCustomerSchema.safeParse(body)
    if (!parsed.success) {
        return handleZodError(parsed.error)
    }

    const { name, email, phone, address } = parsed.data

    try {
        // find-or-create by email, so placing a second order with the same
        // email never creates a duplicate customer row
        const customer = await db.customer.upsert({
            where: { email },
            update: { name, phone: phone ?? undefined, address: address ?? undefined },
            create: { name, email, phone, address },
        })

        return successResponse(customer, undefined, 201)
    } catch {
        return errorResponse('SERVER_ERROR', 'Something went wrong', 500)
    }
}