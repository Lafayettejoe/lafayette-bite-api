import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const product = await db.product.findFirst({
        where: {
            OR: [{ id }, { slug: id }],
        },
        include: {
            category: { select: { id: true, name: true, slug: true } },
            variants: {
                orderBy: [{ sizeInches: 'asc' }, { layers: 'asc' }],
            },
        },
    })

    if (!product) {
        return errorResponse('NOT_FOUND', 'Product not found', 404)
    }

    return successResponse(product)
}