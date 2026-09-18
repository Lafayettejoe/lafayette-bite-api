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

    // Pagination
    const pagination = parsePagination(searchParams)
    if ('error' in pagination) {
        return errorResponse('INVALID_PAGINATION', pagination.error, 400)
    }
    const { limit, offset } = pagination

    // Sorting
    const allowedSortFields = ['name', 'createdAt', 'basePriceKobo']
    const sort = searchParams.get('sort') ?? 'name'
    const order = searchParams.get('order') === 'desc' ? 'desc' : 'asc'

    if (!allowedSortFields.includes(sort)) {
        return errorResponse(
            'INVALID_SORT',
            `sort must be one of: ${allowedSortFields.join(', ')}`,
            400
        )
    }

    // Filtering
    const category = searchParams.get('category')
    const inStock = searchParams.get('inStock')
    const isPlatter = searchParams.get('isPlatter')
    const hasVariants = searchParams.get('hasVariants')

    const where: Record<string, unknown> = {}

    if (category) {
        where.category = {
            OR: [{ slug: category }, { id: category }],
        }
    }

    if (inStock !== null && inStock !== undefined && inStock !== '') {
        where.inStock = inStock === 'true'
    }

    if (isPlatter !== null && isPlatter !== undefined && isPlatter !== '') {
        where.isPlatter = isPlatter === 'true'
    }

    if (hasVariants !== null && hasVariants !== undefined && hasVariants !== '') {
        where.hasVariants = hasVariants === 'true'
    }

    const [products, total] = await Promise.all([
        db.product.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { [sort]: order },
            include: {
                category: { select: { id: true, name: true, slug: true } },
                variants: true,
            },
        }),
        db.product.count({ where }),
    ])

    return successResponse(products, buildMeta(total, limit, offset))
}