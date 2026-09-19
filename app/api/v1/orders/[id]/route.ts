import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
    successResponse,
    errorResponse,
    handleZodError,
    checkRateLimit,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'

const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus),
})

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    const order = await db.order.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, email: true, phone: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true, slug: true } },
                    variant: {
                        select: {
                            id: true,
                            label: true,
                            priceKobo: true,
                            sizeInches: true,
                            layers: true,
                        },
                    },
                },
            },
        },
    })

    if (!order) {
        return errorResponse('NOT_FOUND', 'Order not found', 404)
    }

    return successResponse(order)
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400)
    }

    try {
        const order = await db.order.findUnique({ where: { id } })
        if (!order) {
            return errorResponse('NOT_FOUND', 'Order not found', 404)
        }

        const parsed = updateOrderSchema.safeParse(body)

        if (!parsed.success) {
            return handleZodError(parsed.error)
        }

        // Prevent updating a delivered or cancelled order
        if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
            return errorResponse(
                'INVALID_TRANSITION',
                `Cannot update an order with status ${order.status}`,
                400
            )
        }

        const updated = await db.order.update({
            where: { id },
            data: { status: parsed.data.status },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                        variant: { select: { id: true, label: true } },
                    },
                },
            },
        })

        return successResponse(updated)
    } catch {
        return errorResponse('SERVER_ERROR', 'Something went wrong', 500)
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
        return errorResponse('NOT_FOUND', 'Order not found', 404)
    }

    if (order.status === 'DELIVERED') {
        return errorResponse(
            'INVALID_OPERATION',
            'Cannot cancel a delivered order',
            400
        )
    }

    const updated = await db.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
    })

    return successResponse(updated)
}