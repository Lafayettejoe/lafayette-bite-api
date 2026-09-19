import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse, checkRateLimit } from '@/lib/api-helpers'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    const category = await db.category.findFirst({
        where: {
            OR: [{ id }, { slug: id }],
        },
        include: {
            products: {
                where: { inStock: true },
                include: {
                    variants: true,
                    _count: { select: { orderItems: true } },
                },
            },
        },
    })

    if (!category) {
        return errorResponse('NOT_FOUND', 'Category not found', 404)
    }

    return successResponse(category)
}