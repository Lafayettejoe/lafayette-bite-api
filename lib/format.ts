// ── Currency formatting ───────────────────────────────────
// API prices are always in kobo (1 naira = 100 kobo).

const nairaFormatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
})

export function formatKobo(kobo: number): string {
    return nairaFormatter.format(kobo / 100)
}