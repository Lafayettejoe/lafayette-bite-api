import { OrderStatus } from '@prisma/client'

// The order lifecycle only moves forward, with CANCELLED as a side exit.
// Cancellation is only allowed before baking starts, since once an order
// is BAKING or READY, ingredients are committed / the order is essentially done.
// DELIVERED and CANCELLED are terminal — nothing can follow them.
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['BAKING', 'CANCELLED'],
    BAKING: ['READY'],
    READY: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
}

export function isValidOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}