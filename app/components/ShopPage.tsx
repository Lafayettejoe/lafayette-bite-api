'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatKobo } from '@/lib/format'
import { CategoryArt } from './CategoryArt'

// ── Types, matching the real API response shapes ──────────
// (app/api/v1/products/route.ts and app/api/v1/categories/route.ts)

type Category = {
    id: string
    name: string
    slug: string
    description: string | null
    _count: { products: number }
}

type Variant = {
    id: string
    label: string
    priceKobo: number
    inStock: boolean
    sizeInches: number | null
    layers: number | null
    quantity: number | null
}

type Product = {
    id: string
    name: string
    slug: string
    description: string | null
    category: { id: string; name: string; slug: string }
    hasVariants: boolean
    basePriceKobo: number | null
    inStock: boolean
    isPlatter: boolean
    variants: Variant[]
}

type Meta = { total: number; limit: number; offset: number; hasMore: boolean }
type ApiError = { error: { code: string; message: string } }

type CartLine = {
    key: string
    productId: string
    productName: string
    productSlug: string
    categorySlug: string
    variantId: string
    variantLabel: string
    priceKobo: number
    qty: number
}

const API_BASE_URL = 'https://lafayette-bite-api-nine.vercel.app'
const PAGE_SIZE = 8
const SEARCH_LIMIT = 100

type SortValue = 'name-asc' | 'name-desc' | 'new'

const SORT_OPTIONS: { value: SortValue; label: string; sort: string; order: 'asc' | 'desc' }[] = [
    { value: 'name-asc', label: 'Name (A to Z)', sort: 'name', order: 'asc' },
    { value: 'name-desc', label: 'Name (Z to A)', sort: 'name', order: 'desc' },
    { value: 'new', label: 'Newest first', sort: 'createdAt', order: 'desc' },
]

function cheapestVariant(product: Product): Variant | null {
    if (!product.variants.length) return null
    return product.variants.reduce((min, v) => (v.priceKobo < min.priceKobo ? v : min), product.variants[0])
}

function sizeOptions(product: Product): number[] {
    const sizes = new Set<number>()
    for (const v of product.variants) {
        if (v.sizeInches != null) sizes.add(v.sizeInches)
    }
    return Array.from(sizes).sort((a, b) => a - b)
}

function variantForSize(product: Product, size: number): Variant | null {
    const matches = product.variants.filter((v) => v.sizeInches === size)
    if (!matches.length) return null
    return matches.reduce((min, v) => (v.priceKobo < min.priceKobo ? v : min), matches[0])
}

// ── Small inline icons (no icon library needed) ────────────

function Icon({ path, size = 18 }: { path: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} />
        </svg>
    )
}

const ICONS = {
    home: 'M4 11.5 12 4l8 7.5M6 10v9h12v-9',
    cake: 'M4 12h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z M4 12c0-2 2-3 2-5s-1-3-1-3 M11 12c0-2 2-3 2-5s-1-3-1-3 M18 12c0-2-2-3-2-5s1-3 1-3',
    pastry: 'M12 4c5 0 9 4 9 9 0 4-3 6-3 6H6s-3-2-3-6c0-5 4-9 9-9Z',
    platter: 'M4 10h16l-3-5H7l-3 5Z M4 10v9h16v-9',
    info: 'M12 8h.01M11 12h1v5h1 M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
    contact: 'M4 5h16v14H4z M4 5l8 7 8-7',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3',
    location: 'M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    bell: 'M6 10a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z M10 20a2 2 0 0 0 4 0',
    cart: 'M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4 20c1.8-3.6 5-5 8-5s6.2 1.4 8 5',
    heart: 'M12 20s-7-4.4-9.5-8.8C.9 8 2 5 5 4.3 7.3 3.7 9.7 5 12 8c2.3-3 4.7-4.3 7-3.7 3 .7 4.1 3.7 2.5 6.9C19 15.6 12 20 12 20Z',
    heartFill: 'M12 20s-7-4.4-9.5-8.8C.9 8 2 5 5 4.3 7.3 3.7 9.7 5 12 8c2.3-3 4.7-4.3 7-3.7 3 .7 4.1 3.7 2.5 6.9C19 15.6 12 20 12 20Z',
    close: 'M6 6l12 12M18 6 6 18',
    truck: 'M3 7h11v9H3z M14 10h4l3 3v3h-7z M6.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M17.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
    chevronRight: 'M9 6l6 6-6 6',
    chevronLeft: 'M15 6l-6 6 6 6',
}

// ── Component ────────────────────────────────────────────

export function ShopPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [sort, setSort] = useState<SortValue>('name-asc')
    const [priceDirection, setPriceDirection] = useState<'none' | 'asc' | 'desc'>('none')
    const [search, setSearch] = useState('')
    const [offset, setOffset] = useState(0)

    const [products, setProducts] = useState<Product[]>([])
    const [meta, setMeta] = useState<Meta | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [selectedSize, setSelectedSize] = useState<Record<string, number>>({})
    const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({})
    const [favorites, setFavorites] = useState<Set<string>>(new Set())
    const [cart, setCart] = useState<CartLine[]>([])
    const [cartOpen, setCartOpen] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    const isSearching = search.trim().length > 0

    // Load favorites and cart from localStorage once.
    useEffect(() => {
        try {
            const savedFav = localStorage.getItem('lb-favorites')
            if (savedFav) setFavorites(new Set(JSON.parse(savedFav)))
            const savedCart = localStorage.getItem('lb-cart')
            if (savedCart) setCart(JSON.parse(savedCart))
        } catch {
            // localStorage unavailable — page still works without it
        }
    }, [])

    useEffect(() => {
        try {
            localStorage.setItem('lb-favorites', JSON.stringify(Array.from(favorites)))
        } catch { }
    }, [favorites])

    useEffect(() => {
        try {
            localStorage.setItem('lb-cart', JSON.stringify(cart))
        } catch { }
    }, [cart])

    // Load categories once.
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/v1/categories?limit=20`)
            .then((r) => r.json())
            .then((json) => setCategories(json.data ?? []))
            .catch(() => setCategories([]))
    }, [])

    // Load products whenever filters change.
    const loadProducts = useCallback(async () => {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        const sortOption = SORT_OPTIONS.find((o) => o.value === sort)!
        params.set('sort', sortOption.sort)
        params.set('order', sortOption.order)

        if (activeCategory !== 'all') params.set('category', activeCategory)

        if (isSearching) {
            // The API has no search/name param (see app/api/v1/products/route.ts),
            // so we pull up to the API's max page size and filter by name here.
            params.set('limit', String(SEARCH_LIMIT))
            params.set('offset', '0')
        } else {
            params.set('limit', String(PAGE_SIZE))
            params.set('offset', String(offset))
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/products?${params.toString()}`)
            const json = (await res.json()) as { data: Product[]; meta: Meta } | ApiError
            if (!res.ok || 'error' in json) {
                const message = 'error' in json ? json.error.message : 'Something went wrong loading products.'
                setError(message)
                setProducts([])
                setMeta(null)
                return
            }
            setProducts(json.data)
            setMeta(json.meta)
        } catch {
            setError('Could not reach the Lafayette Bite API. Is the server running?')
            setProducts([])
            setMeta(null)
        } finally {
            setLoading(false)
        }
    }, [activeCategory, sort, offset, isSearching])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Reset to page 1 whenever category, sort, or search changes.
    useEffect(() => {
        setOffset(0)
    }, [activeCategory, sort, search])

    const visibleProducts = useMemo(() => {
        let list = products
        if (isSearching) {
            const q = search.trim().toLowerCase()
            list = list.filter((p) => p.name.toLowerCase().includes(q))
        }
        if (priceDirection !== 'none') {
            list = [...list].sort((a, b) => {
                const pa = cheapestVariant(a)?.priceKobo ?? a.basePriceKobo ?? 0
                const pb = cheapestVariant(b)?.priceKobo ?? b.basePriceKobo ?? 0
                return priceDirection === 'asc' ? pa - pb : pb - pa
            })
        }
        return list
    }, [products, isSearching, search, priceDirection])

    function toggleFavorite(id: string) {
        setFavorites((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function addToCart(product: Product, variant: Variant) {
        setCart((prev) => {
            const key = `${product.id}:${variant.id}`
            const existing = prev.find((l) => l.key === key)
            if (existing) {
                return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
            }
            return [
                ...prev,
                {
                    key,
                    productId: product.id,
                    productName: product.name,
                    productSlug: product.slug,
                    categorySlug: product.category.slug,
                    variantId: variant.id,
                    variantLabel: variant.label,
                    priceKobo: variant.priceKobo,
                    qty: 1,
                },
            ]
        })
        setCartOpen(true)
    }

    function removeFromCart(key: string) {
        setCart((prev) => prev.filter((l) => l.key !== key))
    }

    const cartCount = cart.reduce((n, l) => n + l.qty, 0)
    const cartTotalKobo = cart.reduce((n, l) => n + l.qty * l.priceKobo, 0)

    const navCategories = categories.length
        ? categories
        : [
            { id: 'cakes', name: 'Cakes', slug: 'cakes', description: null, _count: { products: 5 } },
            { id: 'pastries', name: 'Pastries', slug: 'pastries', description: null, _count: { products: 6 } },
            { id: 'platters', name: 'Platters', slug: 'platters', description: null, _count: { products: 2 } },
        ]

    return (
        <div className="lb-shell">
            {/* ── Sidebar ─────────────────────────────────── */}
            <aside className={`lb-sidebar ${mobileNavOpen ? 'lb-sidebar-open' : ''}`}>
                <div className="lb-brand">
                    <span className="lb-brand-name">Lafayette Bite</span>
                    <span className="lb-brand-tagline">Satisfaction in every bite</span>
                </div>

                <nav className="lb-nav">
                    <button
                        className={`lb-nav-item ${activeCategory === 'all' ? 'lb-nav-item-active' : ''}`}
                        onClick={() => {
                            setActiveCategory('all')
                            setSearch('')
                            setMobileNavOpen(false)
                        }}
                    >
                        <Icon path={ICONS.home} />
                        <span>Home</span>
                    </button>
                    {navCategories.map((c) => (
                        <button
                            key={c.id}
                            className={`lb-nav-item ${activeCategory === c.slug ? 'lb-nav-item-active' : ''}`}
                            onClick={() => {
                                setActiveCategory(c.slug)
                                setSearch('')
                                setMobileNavOpen(false)
                            }}
                        >
                            <Icon path={c.slug === 'cakes' ? ICONS.cake : c.slug === 'pastries' ? ICONS.pastry : ICONS.platter} />
                            <span>{c.name}</span>
                        </button>
                    ))}
                    <div className="lb-nav-divider" />
                    <button className="lb-nav-item lb-nav-item-static" disabled>
                        <Icon path={ICONS.info} />
                        <span>About Us</span>
                    </button>
                    <button className="lb-nav-item lb-nav-item-static" disabled>
                        <Icon path={ICONS.contact} />
                        <span>Contact Us</span>
                    </button>
                </nav>

                <div className="lb-sidebar-footer">Freshly baked with love ♡</div>
            </aside>

            {mobileNavOpen && <div className="lb-scrim" onClick={() => setMobileNavOpen(false)} />}

            {/* ── Main ────────────────────────────────────── */}
            <div className="lb-main">
                <header className="lb-header">
                    <button className="lb-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
                        <Icon path="M4 7h16M4 12h16M4 17h16" />
                    </button>

                    <div className="lb-search">
                        <Icon path={ICONS.search} size={17} />
                        <input
                            type="text"
                            placeholder="Search for cakes, pastries, platters..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            aria-label="Search products"
                        />
                    </div>

                    <div className="lb-header-controls">
                        <div className="lb-pill-control">
                            <Icon path={ICONS.location} size={16} />
                            <span>Abuja, FCT</span>
                        </div>
                        <div className="lb-pill-control lb-pill-control-hide-sm">
                            <Icon path={ICONS.truck} size={16} />
                            <span>Delivery</span>
                        </div>
                        <button className="lb-icon-btn" aria-label="Notifications">
                            <Icon path={ICONS.bell} size={18} />
                        </button>
                        <button className="lb-icon-btn lb-cart-btn" aria-label="Cart" onClick={() => setCartOpen(true)}>
                            <Icon path={ICONS.cart} size={18} />
                            {cartCount > 0 && <span className="lb-badge">{cartCount}</span>}
                        </button>
                        <button className="lb-icon-btn" aria-label="Account">
                            <Icon path={ICONS.user} size={18} />
                        </button>
                    </div>
                </header>

                <div className="lb-filterbar">
                    <div className="lb-category-pills">
                        <button
                            className={`lb-pill ${activeCategory === 'all' ? 'lb-pill-active' : ''}`}
                            onClick={() => setActiveCategory('all')}
                        >
                            All
                        </button>
                        {navCategories.map((c) => (
                            <button
                                key={c.id}
                                className={`lb-pill ${activeCategory === c.slug ? 'lb-pill-active' : ''}`}
                                onClick={() => setActiveCategory(c.slug)}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                    <div className="lb-filterbar-divider" />
                    <div className="lb-functional-filters">
                        <select
                            className="lb-select"
                            value={priceDirection}
                            onChange={(e) => setPriceDirection(e.target.value as 'none' | 'asc' | 'desc')}
                            aria-label="Filter by price"
                        >
                            <option value="none">Price</option>
                            <option value="asc">Price: Low to High</option>
                            <option value="desc">Price: High to Low</option>
                        </select>
                        <select
                            className="lb-select"
                            value={sort}
                            onChange={(e) => setSort(e.target.value as SortValue)}
                            aria-label="Sort products"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <section className="lb-content-header">
                    <h1>Delicious Treats for Every Occasion ♡</h1>
                    <p>Cakes, pastries and platters — freshly baked, always.</p>
                </section>

                {error && (
                    <div className="lb-error">
                        <strong>Couldn&apos;t load products.</strong> {error}
                        <button onClick={loadProducts}>Try again</button>
                    </div>
                )}

                {!error && loading && <div className="lb-loading">Loading Lafayette Bite treats…</div>}

                {!error && !loading && visibleProducts.length === 0 && (
                    <div className="lb-empty">No products match &quot;{search}&quot; right now.</div>
                )}

                {!error && !loading && visibleProducts.length > 0 && (
                    <div className="lb-grid">
                        {visibleProducts.map((product) => {
                            const sizes = sizeOptions(product)
                            const usesSize = sizes.length > 0
                            const chosenSize = selectedSize[product.id] ?? sizes[0]
                            const chosenVariantId = selectedVariant[product.id]

                            let activeVariant: Variant | null
                            if (usesSize) {
                                activeVariant = chosenSize != null ? variantForSize(product, chosenSize) : cheapestVariant(product)
                            } else if (chosenVariantId) {
                                activeVariant = product.variants.find((v) => v.id === chosenVariantId) ?? cheapestVariant(product)
                            } else {
                                activeVariant = cheapestVariant(product)
                            }

                            const cheapest = cheapestVariant(product)
                            const isFav = favorites.has(product.id)

                            return (
                                <article className="lb-card" key={product.id}>
                                    <div className="lb-card-media-wrap">
                                        <CategoryArt
                                            categorySlug={product.category.slug}
                                            productSlug={product.slug}
                                            productId={product.id}
                                            className="lb-card-media"
                                        />
                                        {product.hasVariants && product.category.slug === 'cakes' && (
                                            <span className="lb-badge-tag">CUSTOM SIZE</span>
                                        )}
                                        {!product.inStock && <span className="lb-badge-tag lb-badge-tag-muted">SOLD OUT</span>}
                                        <button
                                            className={`lb-heart ${isFav ? 'lb-heart-active' : ''}`}
                                            onClick={() => toggleFavorite(product.id)}
                                            aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                        >
                                            <Icon path={ICONS.heart} size={16} />
                                        </button>
                                    </div>

                                    <div className="lb-card-body">
                                        <h3 className="lb-card-name">{product.name}</h3>
                                        <p className="lb-card-category">{product.category.name}</p>

                                        <p className="lb-card-price">
                                            {activeVariant ? formatKobo(activeVariant.priceKobo) : cheapest ? `From ${formatKobo(cheapest.priceKobo)}` : '—'}
                                        </p>

                                        {usesSize ? (
                                            <div className="lb-variant-pills">
                                                {sizes.slice(0, 3).map((size) => (
                                                    <button
                                                        key={size}
                                                        className={`lb-variant-pill ${chosenSize === size ? 'lb-variant-pill-active' : ''}`}
                                                        onClick={() =>
                                                            setSelectedSize((prev) => ({ ...prev, [product.id]: size }))
                                                        }
                                                    >
                                                        {size}&quot;
                                                    </button>
                                                ))}
                                                {sizes.length > 3 && <span className="lb-variant-pill lb-variant-pill-more">+{sizes.length - 3}</span>}
                                            </div>
                                        ) : (
                                            <div className="lb-variant-pills">
                                                {product.variants.map((v) => (
                                                    <button
                                                        key={v.id}
                                                        className={`lb-variant-pill ${(chosenVariantId ?? cheapest?.id) === v.id ? 'lb-variant-pill-active' : ''
                                                            }`}
                                                        onClick={() =>
                                                            setSelectedVariant((prev) => ({ ...prev, [product.id]: v.id }))
                                                        }
                                                    >
                                                        {v.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            className="lb-add-btn"
                                            disabled={!product.inStock || !activeVariant}
                                            onClick={() => activeVariant && addToCart(product, activeVariant)}
                                        >
                                            🛒 Add to Cart
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}

                {!error && !isSearching && meta && (
                    <div className="lb-pagination">
                        <button
                            className="lb-page-btn"
                            disabled={offset === 0}
                            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                        >
                            <Icon path={ICONS.chevronLeft} size={16} /> Previous
                        </button>
                        <span className="lb-page-status">
                            Showing {Math.min(offset + 1, meta.total)}–{Math.min(offset + PAGE_SIZE, meta.total)} of {meta.total}
                        </span>
                        <button className="lb-page-btn" disabled={!meta.hasMore} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
                            Next page <Icon path={ICONS.chevronRight} size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Cart drawer ─────────────────────────────── */}
            {cartOpen && (
                <div className="lb-cart-overlay" onClick={() => setCartOpen(false)}>
                    <aside className="lb-cart-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="lb-cart-drawer-header">
                            <h2>Your Order</h2>
                            <button className="lb-icon-btn" onClick={() => setCartOpen(false)} aria-label="Close cart">
                                <Icon path={ICONS.close} size={18} />
                            </button>
                        </div>
                        {cart.length === 0 ? (
                            <p className="lb-cart-empty">Your cart is empty. Add something delicious!</p>
                        ) : (
                            <>
                                <ul className="lb-cart-list">
                                    {cart.map((line) => (
                                        <li key={line.key} className="lb-cart-line">
                                            <CategoryArt
                                                categorySlug={line.categorySlug}
                                                productSlug={line.productSlug}
                                                productId={line.productId}
                                                className="lb-cart-thumb"
                                            />
                                            <div className="lb-cart-line-info">
                                                <span className="lb-cart-line-name">{line.productName}</span>
                                                <span className="lb-cart-line-variant">{line.variantLabel} · Qty {line.qty}</span>
                                            </div>
                                            <span className="lb-cart-line-price">{formatKobo(line.priceKobo * line.qty)}</span>
                                            <button
                                                className="lb-cart-remove"
                                                onClick={() => removeFromCart(line.key)}
                                                aria-label={`Remove ${line.productName}`}
                                            >
                                                <Icon path={ICONS.close} size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <div className="lb-cart-total">
                                    <span>Total</span>
                                    <span>{formatKobo(cartTotalKobo)}</span>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}
        </div>
    )
}
