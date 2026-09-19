import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
    successResponse,
    errorResponse,
    parsePagination,
    buildMeta,
    checkRateLimit,
} from '@/lib/api-helpers'

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

    // Filter by name search
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