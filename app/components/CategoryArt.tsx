// ── Product photography ───────────────────────────────────
// Real Lafayette Bite photos, placed in /public/products.
// None of these are tagged to a specific flavour in the database
// (Product has no image field in prisma/schema.prisma), so we
// don't pretend a photo shows one exact flavour. Instead:
//   - Two products have an honest exact match: Puff Puff has a
//     tray that is only puff puff, and the platters match the
//     "samosa, spring roll, puff puff + peppered meat" photos,
//     which is exactly how Beef/Chicken Platter are described
//     in prisma/seed.ts.
//   - Every other product gets a real photo from its category's
//     pool, picked deterministically per product so the grid
//     shows variety instead of one repeated image.

type Props = {
    categorySlug: string
    productSlug: string
    productId: string
    className?: string
}

const CAKE_PHOTOS = [
    '/products/cake-layers-plain.jpg',
    '/products/cake-white-ruffle-birthday.jpg',
    '/products/cake-bluey.jpg',
    '/products/cake-pchi-blue-ombre.jpg',
    '/products/cake-naked-layers.jpg',
    '/products/cake-piano-brian.jpg',
    '/products/cake-teddybear-halfway.jpg',
    '/products/cake-graduation-2026.jpg',
    '/products/cake-purple-birthday.jpg',
    '/products/cake-balloon-uriel.jpg',
    '/products/cake-naked-stack-2.jpg',
    '/products/cake-gold-champagne.jpg',
    '/products/cake-blue-ombre-gold.jpg',
    '/products/cake-white-husband-daddy.jpg',
]

const PASTRY_PHOTOS = [
    '/products/pastry-puffpuff-tray.jpg',
    '/products/platter-samosa-meatpie.jpg',
    '/products/platter-springroll-samosa-meat.jpg',
    '/products/platter-packaged-bags.jpg',
]

const PLATTER_PHOTOS = [
    '/products/platter-meat-puffpuff-samosa.jpg',
    '/products/platter-meat-samosa-puffpuff-2.jpg',
    '/products/platter-springroll-samosa-meat.jpg',
]

// Exact matches: these product slugs get one specific real photo
// instead of a pooled pick, because the photo genuinely is that item.
const EXACT_MATCH: Record<string, string> = {
    'puff-puff': '/products/pastry-puffpuff-tray.jpg',
    'beef-platter': '/products/platter-meat-puffpuff-samosa.jpg',
    'chicken-platter': '/products/platter-meat-samosa-puffpuff-2.jpg',
}

function poolFor(categorySlug: string): string[] {
    if (categorySlug === 'cakes') return CAKE_PHOTOS
    if (categorySlug === 'platters') return PLATTER_PHOTOS
    return PASTRY_PHOTOS
}

function pickDeterministic(pool: string[], seed: string): string {
    let hash = 0
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return pool[hash % pool.length]
}

export function CategoryArt({ categorySlug, productSlug, productId, className }: Props) {
    const src = EXACT_MATCH[productSlug] ?? pickDeterministic(poolFor(categorySlug), productId || productSlug)

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            className={className}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
    )
}