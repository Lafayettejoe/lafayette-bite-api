import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
    successResponse,
    errorResponse,
    parsePagination,
    buildMeta,
} from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)

    // Parse pagination
    const pagination = parsePagination(searchParams)
    if ('error' in pagination) {
        return errorResponse('INVALID_PAGINATION', pagination.error, 400)
    }
    const { limit, offset } = pagination

    // Sorting
    const allowedSortFields = ['name', 'createdAt']
    const sort = searchParams.get('sort') ?? 'name'
    const order = searchParams.get('order') === 'desc' ? 'desc' : 'asc'

    if (!allowedSortFields.includes(sort)) {
        return errorResponse(
            'INVALID_SORT',
            `sort must be one of: ${allowedSortFields.join(', ')}`,
            400
        )
    }

    const [categories, total] = await Promise.all([
        db.category.findMany({
            take: limit,
            skip: offset,
            orderBy: { [sort]: order },
            include: {
                _count: { select: { products: true } },
            },
        }),
        db.category.count(),
    ])

    return successResponse(categories, buildMeta(total, limit, offset))
}