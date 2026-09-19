import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
    successResponse,
    errorResponse,
    parsePagination,
    buildMeta,
    handleZodError,
    checkRateLimit,
} from '@/lib/api-helpers'
import { z } from 'zod'
import { OrderStatus } from '@prisma/client'

// Validation schema for creating an order
const createOrderSchema = z.object({
    customerId: z.string().min(1, 'customerId is required'),
    notes: z.string().optional(),
    items: z
        .array(
            z.object({
                productId: z.string().min(1, 'productId is required'),
                variantId: z.string().optional(),
                quantity: z.number().int().min(1, 'quantity must be at least 1'),
            })
        )
        .min(1, 'items must contain at least one item'),
})

export async function GET(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)

    const pagination = parsePagination(searchParams)
    if ('error' in pagination) {
        return errorResponse('INVALID_PAGINATION', pagination.error, 400)
    }
    const { limit, offset } = pagination

    const allowedSortFields = ['createdAt', 'totalKobo', 'status']
    const sort = searchParams.get('sort') ?? 'createdAt'
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    if (!allowedSortFields.includes(sort)) {
        return errorResponse(
            'INVALID_SORT',
            `sort must be one of: ${allowedSortFields.join(', ')}`,
            400
        )
    }

    // Filter by status
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const where: Record<string, unknown> = {}

    if (status) {
        if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
            return errorResponse(
                'INVALID_STATUS',
                `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
                400
            )
        }
        where.status = status
    }

    if (customerId) {
        where.customerId = customerId
    }

    const [orders, total] = await Promise.all([
        db.order.findMany({
            where,
            take: limit,
            skip: offset,
            orderBy: { [sort]: order },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true } },
                        variant: { select: { id: true, label: true, priceKobo: true } },
                    },
                },
            },
        }),
        db.order.count({ where }),
    ])

    return successResponse(orders, buildMeta(total, limit, offset))
}

export async function POST(request: NextRequest) {
    const rateLimitResponse = await checkRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400)
    }

    try {
        const parsed = createOrderSchema.safeParse(body)

        if (!parsed.success) {
            return handleZodError(parsed.error)
        }

        const { customerId, notes, items } = parsed.data

        // Verify customer exists
        const customer = await db.customer.findUnique({ where: { id: customerId } })
        if (!customer) {
            return errorResponse('NOT_FOUND', 'Customer not found', 404)
        }

        // Fetch all products and variants to calculate total
        let totalKobo = 0
        const resolvedItems = []

        for (const item of items) {
            const product = await db.product.findUnique({
                where: { id: item.productId },
                include: { variants: true },
            })

            if (!product) {
                return errorResponse(
                    'NOT_FOUND',
                    `Product ${item.productId} not found`,
                    404
                )
            }

            if (!product.inStock) {
                return errorResponse(
                    'OUT_OF_STOCK',
                    `${product.name} is currently out of stock`,
                    400
                )
            }

            let unitPriceKobo: number

            if (product.hasVariants) {
                if (!item.variantId) {
                    return errorResponse(
                        'VARIANT_REQUIRED',
                        `${product.name} requires a variantId`,
                        422
                    )
                }

                const variant = product.variants.find(v => v.id === item.variantId)
                if (!variant) {
                    return errorResponse(
                        'NOT_FOUND',
                        `Variant ${item.variantId} not found for ${product.name}`,
                        404
                    )
                }

                unitPriceKobo = variant.priceKobo
            } else {
                unitPriceKobo = product.basePriceKobo ?? 0
            }

            totalKobo += unitPriceKobo * item.quantity

            resolvedItems.push({
                productId: item.productId,
                variantId: item.variantId ?? null,
                quantity: item.quantity,
                unitPriceKobo,
                currency: 'NGN',
            })
        }

        const order = await db.order.create({
            data: {
                customerId,
                totalKobo,
                currency: 'NGN',
                notes: notes ?? null,
                status: 'PENDING',
                items: { create: resolvedItems },
            },
            include: {
                customer: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, slug: true } },
                        variant: { select: { id: true, label: true } },
                    },
                },
            },
        })

        return successResponse(order, undefined, 201)
    } catch {
        return errorResponse('SERVER_ERROR', 'Something went wrong', 500)
    }
}