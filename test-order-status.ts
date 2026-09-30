import { isValidOrderTransition } from './lib/order-status'

function check(label: string, actual: boolean, expected: boolean) {
    const result = actual === expected ? 'PASS' : 'FAIL'
    console.log(`${result} - ${label} (expected ${expected}, got ${actual})`)
}

// Valid forward transitions
check('PENDING -> CONFIRMED', isValidOrderTransition('PENDING', 'CONFIRMED'), true)
check('CONFIRMED -> BAKING', isValidOrderTransition('CONFIRMED', 'BAKING'), true)
check('BAKING -> READY', isValidOrderTransition('BAKING', 'READY'), true)
check('READY -> DELIVERED', isValidOrderTransition('READY', 'DELIVERED'), true)

// Cancellation allowed only before baking starts
check('PENDING -> CANCELLED', isValidOrderTransition('PENDING', 'CANCELLED'), true)
check('CONFIRMED -> CANCELLED', isValidOrderTransition('CONFIRMED', 'CANCELLED'), true)

// Invalid forward jumps
check('READY -> BAKING', isValidOrderTransition('READY', 'BAKING'), false)
check('PENDING -> DELIVERED', isValidOrderTransition('PENDING', 'DELIVERED'), false)

// Cancellation no longer allowed once baking has started (the bug the reviewer caught)
check('BAKING -> CANCELLED', isValidOrderTransition('BAKING', 'CANCELLED'), false)
check('READY -> CANCELLED', isValidOrderTransition('READY', 'CANCELLED'), false)

// Terminal states allow nothing
check('DELIVERED -> CONFIRMED', isValidOrderTransition('DELIVERED', 'CONFIRMED'), false)
check('CANCELLED -> PENDING', isValidOrderTransition('CANCELLED', 'PENDING'), false)