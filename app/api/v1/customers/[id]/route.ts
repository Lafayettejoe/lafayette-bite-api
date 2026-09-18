import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-helpers'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const customer = await db.customer.findUnique({
        where: { id },
        include: {
            orders: {
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, name: true, slug: true } },
                            variant: { select: { id: true, label: true } },
                        },
                    },
                },
            },
            _count: { select: { orders: true } },
        },
    })

    if (!customer) {
        return errorResponse('NOT_FOUND', 'Customer not found', 404)
    }

    return successResponse(customer)
}