import { OrderStatus } from '@prisma/client'

// The order lifecycle only moves forward, with CANCELLED as a side exit.
// DELIVERED and CANCELLED are terminal — nothing can follow them.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['BAKING', 'CANCELLED'],
    BAKING: ['READY', 'CANCELLED'],
    READY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: [],
    CANCELLED: [],
}

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}