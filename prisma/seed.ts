import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const db = new PrismaClient()

// ── Nigerian first and last names for realistic customers ──
const nigerianFirstNames = [
    'Amaka', 'Chidi', 'Ngozi', 'Emeka', 'Adaeze', 'Tunde', 'Bimpe',
    'Kelechi', 'Ifeoma', 'Obinna', 'Chisom', 'Yemi', 'Folake', 'Uche',
    'Blessing', 'Chinwe', 'Seun', 'Tobi', 'Nkechi', 'Chukwu', 'Aisha',
    'Fatima', 'Musa', 'Hauwa', 'Ibrahim', 'Zainab', 'Kabir', 'Sadiya',
    'Taiwo', 'Kehinde', 'Wale', 'Dami', 'Sola', 'Bola', 'Kunle',
]

const nigerianLastNames = [
    'Okafor', 'Adeleke', 'Nwosu', 'Balogun', 'Eze', 'Adeyemi', 'Okonkwo',
    'Abubakar', 'Musa', 'Aliyu', 'Obi', 'Chukwu', 'Nwachukwu', 'Olawale',
    'Adebayo', 'Ogundimu', 'Nnamdi', 'Okeke', 'Fashola', 'Danjuma',
    'Usman', 'Garba', 'Suleiman', 'Yakubu', 'Lawal', 'Idris', 'Hassan',
]

const abujaAreas = [
    'Wuse 2', 'Maitama', 'Garki', 'Asokoro', 'Gwarinpa', 'Kubwa',
    'Lugbe', 'Kuje', 'Bwari', 'Gwagwalada', 'Lokogoma', 'Nbora',
    'Jabi', 'Utako', 'Wuse', 'Central Area', 'Life Camp', 'Katampe',
]

function randomNigerianName() {
    const first = nigerianFirstNames[Math.floor(Math.random() * nigerianFirstNames.length)]
    const last = nigerianLastNames[Math.floor(Math.random() * nigerianLastNames.length)]
    return { first, last, full: `${first} ${last}` }
}

function randomAbujaAddress() {
    const area = abujaAreas[Math.floor(Math.random() * abujaAreas.length)]
    const houseNo = Math.floor(Math.random() * 50) + 1
    return `${houseNo} ${faker.location.street()}, ${area}, Abuja`
}

function nigerianPhone() {
    const prefixes = ['0801', '0802', '0803', '0805', '0806', '0807',
        '0808', '0809', '0810', '0811', '0812', '0813',
        '0814', '0815', '0816', '0817', '0818', '0819',
        '0901', '0902', '0903', '0904', '0905', '0906',
        '0907', '0908', '0909']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const rest = Math.floor(Math.random() * 9000000) + 1000000
    return `${prefix}${rest}`
}

async function main() {
    console.log('🧹 Clearing existing data...')
    await db.orderItem.deleteMany()
    await db.order.deleteMany()
    await db.customer.deleteMany()
    await db.productVariant.deleteMany()
    await db.product.deleteMany()
    await db.category.deleteMany()

    // ── STEP 1: CREATE CATEGORIES ──────────────────────────────
    console.log('📦 Creating categories...')

    const cakesCategory = await db.category.create({
        data: {
            name: 'Cakes',
            slug: 'cakes',
            description: 'Custom celebration cakes in multiple sizes and layers. All flavours available.',
        },
    })

    const pastriesCategory = await db.category.create({
        data: {
            name: 'Pastries',
            slug: 'pastries',
            description: 'Fresh Nigerian pastries and small chops. Made daily.',
        },
    })

    const plattersCategory = await db.category.create({
        data: {
            name: 'Platters',
            slug: 'platters',
            description: 'Curated small chops platters. Perfect for events and gatherings.',
        },
    })

    // ── STEP 2: CREATE CAKE PRODUCTS ──────────────────────────
    console.log('🎂 Creating cake products and variants...')

    // Cake size + layer price table in kobo
    const cakeVariants = [
        { label: '6 inch – 1 layer', sizeInches: 6, layers: 1, priceKobo: 2000000 },
        { label: '6 inch – 2 layers', sizeInches: 6, layers: 2, priceKobo: 2300000 },
        { label: '6 inch – 3 layers', sizeInches: 6, layers: 3, priceKobo: 2600000 },
        { label: '7 inch – 1 layer', sizeInches: 7, layers: 1, priceKobo: 2300000 },
        { label: '7 inch – 2 layers', sizeInches: 7, layers: 2, priceKobo: 2600000 },
        { label: '7 inch – 3 layers', sizeInches: 7, layers: 3, priceKobo: 3000000 },
        { label: '8 inch – 1 layer', sizeInches: 8, layers: 1, priceKobo: 3000000 },
        { label: '8 inch – 2 layers', sizeInches: 8, layers: 2, priceKobo: 3500000 },
        { label: '8 inch – 3 layers', sizeInches: 8, layers: 3, priceKobo: 4000000 },
        { label: '9 inch – 1 layer', sizeInches: 9, layers: 1, priceKobo: 3500000 },
        { label: '9 inch – 2 layers', sizeInches: 9, layers: 2, priceKobo: 4000000 },
        { label: '9 inch – 3 layers', sizeInches: 9, layers: 3, priceKobo: 5000000 },
        { label: '10 inch – 1 layer', sizeInches: 10, layers: 1, priceKobo: 4000000 },
        { label: '10 inch – 2 layers', sizeInches: 10, layers: 2, priceKobo: 5000000 },
        { label: '10 inch – 3 layers', sizeInches: 10, layers: 3, priceKobo: 6000000 },
    ]

    const cakeFlavours = [
        { name: 'Vanilla Cake', slug: 'vanilla-cake', description: 'Classic vanilla sponge with smooth buttercream. Light, airy and crowd-pleasing.' },
        { name: 'Red Velvet Cake', slug: 'red-velvet-cake', description: 'Soft red velvet layers with velvety cream cheese frosting.' },
        { name: 'Lemon Cake', slug: 'lemon-cake', description: 'Fresh lemon zest cake with lemon curd filling and citrus buttercream.' },
        { name: 'Chocolate Cake', slug: 'chocolate-cake', description: 'Rich dark chocolate sponge with chocolate ganache and buttercream.' },
        { name: 'Cookies and Cream Cake', slug: 'cookies-and-cream-cake', description: 'Vanilla cake loaded with crushed Oreos and cookies and cream frosting.' },
    ]

    for (const flavour of cakeFlavours) {
        const product = await db.product.create({
            data: {
                name: flavour.name,
                slug: flavour.slug,
                description: flavour.description,
                categoryId: cakesCategory.id,
                hasVariants: true,
                basePriceKobo: null,
                currency: 'NGN',
                inStock: true,
                isPlatter: false,
            },
        })

        await db.productVariant.createMany({
            data: cakeVariants.map(v => ({
                productId: product.id,
                label: v.label,
                sizeInches: v.sizeInches,
                layers: v.layers,
                priceKobo: v.priceKobo,
                currency: 'NGN',
                inStock: true,
            })),
        })
    }

    // ── STEP 3: CREATE PASTRY PRODUCTS ────────────────────────
    console.log('🥟 Creating pastry products and variants...')

    const pastries = [
        {
            name: 'Meat Pie',
            slug: 'meat-pie',
            description: 'Golden shortcrust pastry filled with seasoned minced beef, potatoes and carrots.',
            variants: [
                { label: '1 piece', quantity: 1, priceKobo: 80000 },
                { label: '6 pieces', quantity: 6, priceKobo: 450000 },
                { label: '12 pieces', quantity: 12, priceKobo: 850000 },
            ],
        },
        {
            name: 'Corn Dog',
            slug: 'corn-dog',
            description: 'Juicy beef sausage coated in a sweet cornmeal batter and deep fried to golden perfection.',
            variants: [
                { label: '1 piece', quantity: 1, priceKobo: 80000 },
                { label: '6 pieces', quantity: 6, priceKobo: 450000 },
                { label: '12 pieces', quantity: 12, priceKobo: 850000 },
            ],
        },
        {
            name: 'Chin Chin',
            slug: 'chin-chin',
            description: 'Crunchy fried dough snack lightly sweetened and perfectly seasoned. Nigerian party staple.',
            variants: [
                { label: 'Small bag (250g)', quantity: null, priceKobo: 200000 },
                { label: 'Medium bag (500g)', quantity: null, priceKobo: 380000 },
                { label: 'Large bag (1kg)', quantity: null, priceKobo: 700000 },
            ],
        },
        {
            name: 'Samosa',
            slug: 'samosa',
            description: 'Crispy triangular pastry filled with spiced minced beef and vegetables.',
            variants: [
                { label: '1 piece', quantity: 1, priceKobo: 80000 },
                { label: '6 pieces', quantity: 6, priceKobo: 450000 },
                { label: '12 pieces', quantity: 12, priceKobo: 850000 },
            ],
        },
        {
            name: 'Spring Roll',
            slug: 'spring-roll',
            description: 'Crispy roll filled with seasoned vegetables and beef. Served fresh and hot.',
            variants: [
                { label: '1 piece', quantity: 1, priceKobo: 80000 },
                { label: '6 pieces', quantity: 6, priceKobo: 450000 },
                { label: '12 pieces', quantity: 12, priceKobo: 850000 },
            ],
        },
        {
            name: 'Puff Puff',
            slug: 'puff-puff',
            description: 'Soft, fluffy deep-fried dough balls. Slightly sweet with a pillowy centre.',
            variants: [
                { label: '1 piece', quantity: 1, priceKobo: 10000 },
                { label: '6 pieces', quantity: 6, priceKobo: 55000 },
                { label: '12 pieces', quantity: 12, priceKobo: 100000 },
            ],
        },
    ]

    for (const pastry of pastries) {
        const product = await db.product.create({
            data: {
                name: pastry.name,
                slug: pastry.slug,
                description: pastry.description,
                categoryId: pastriesCategory.id,
                hasVariants: true,
                basePriceKobo: null,
                currency: 'NGN',
                inStock: true,
                isPlatter: false,
            },
        })

        await db.productVariant.createMany({
            data: pastry.variants.map(v => ({
                productId: product.id,
                label: v.label,
                quantity: v.quantity,
                priceKobo: v.priceKobo,
                currency: 'NGN',
                inStock: true,
            })),
        })
    }

    // ── STEP 4: CREATE PLATTER PRODUCTS ───────────────────────
    console.log('🍱 Creating platter products and variants...')

    const platters = [
        {
            name: 'Beef Platter',
            slug: 'beef-platter',
            description: 'Samosa, Spring Roll, Puff Puff and Peppered Beef in one box. Perfect for events.',
            variants: [
                { label: 'Small (5 items)', priceKobo: 400000 },
                { label: 'Medium (8 items)', priceKobo: 630000 },
                { label: 'Large (10 items)', priceKobo: 780000 },
            ],
        },
        {
            name: 'Chicken Platter',
            slug: 'chicken-platter',
            description: 'Samosa, Spring Roll, Puff Puff and Peppered Chicken in one box. Great for celebrations.',
            variants: [
                { label: 'Small (5 items)', priceKobo: 500000 },
                { label: 'Medium (8 items)', priceKobo: 730000 },
                { label: 'Large (10 items)', priceKobo: 980000 },
            ],
        },
    ]

    for (const platter of platters) {
        const product = await db.product.create({
            data: {
                name: platter.name,
                slug: platter.slug,
                description: platter.description,
                categoryId: plattersCategory.id,
                hasVariants: true,
                basePriceKobo: null,
                currency: 'NGN',
                inStock: true,
                isPlatter: true,
            },
        })

        await db.productVariant.createMany({
            data: platter.variants.map(v => ({
                productId: product.id,
                label: v.label,
                priceKobo: v.priceKobo,
                currency: 'NGN',
                inStock: true,
            })),
        })
    }

    // ── STEP 5: CREATE CUSTOMERS ───────────────────────────────
    console.log('👥 Creating 200 customers...')

    const customers = []
    const usedEmails = new Set<string>()

    for (let i = 0; i < 200; i++) {
        const person = randomNigerianName()
        let email = `${person.first.toLowerCase()}.${person.last.toLowerCase()}${i}@gmail.com`
        while (usedEmails.has(email)) {
            email = `${person.first.toLowerCase()}.${person.last.toLowerCase()}${i}${Math.floor(Math.random() * 99)}@gmail.com`
        }
        usedEmails.add(email)

        customers.push({
            name: person.full,
            email,
            phone: nigerianPhone(),
            address: randomAbujaAddress(),
        })
    }

    await db.customer.createMany({ data: customers })
    const createdCustomers = await db.customer.findMany()

    // ── STEP 6: CREATE ORDERS ──────────────────────────────────
    console.log('🛒 Creating 300 orders...')

    const allVariants = await db.productVariant.findMany({
        include: { product: true },
    })

    const statuses = [
        'PENDING', 'CONFIRMED', 'BAKING', 'READY', 'DELIVERED', 'CANCELLED',
    ] as const

    for (let i = 0; i < 300; i++) {
        const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)]
        const status = statuses[Math.floor(Math.random() * statuses.length)]

        // Pick 1 to 4 random variants for this order
        const itemCount = Math.floor(Math.random() * 4) + 1
        const shuffled = [...allVariants].sort(() => Math.random() - 0.5)
        const selectedVariants = shuffled.slice(0, itemCount)

        let totalKobo = 0
        const items = selectedVariants.map(variant => {
            const quantity = Math.floor(Math.random() * 3) + 1
            totalKobo += variant.priceKobo * quantity
            return {
                productId: variant.productId,
                variantId: variant.id,
                quantity,
                unitPriceKobo: variant.priceKobo,
                currency: 'NGN',
            }
        })

        // Random date within the last 12 months
        const createdAt = faker.date.past({ years: 1 })

        await db.order.create({
            data: {
                customerId: customer.id,
                status,
                totalKobo,
                currency: 'NGN',
                notes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
                createdAt,
                updatedAt: createdAt,
                items: {
                    create: items,
                },
            },
        })
    }

    // ── DONE ───────────────────────────────────────────────────
    const summary = await Promise.all([
        db.category.count(),
        db.product.count(),
        db.productVariant.count(),
        db.customer.count(),
        db.order.count(),
        db.orderItem.count(),
    ])

    console.log('\n✅ Lafayette Bite seeded successfully!')
    console.log(`   Categories:       ${summary[0]}`)
    console.log(`   Products:         ${summary[1]}`)
    console.log(`   Product Variants: ${summary[2]}`)
    console.log(`   Customers:        ${summary[3]}`)
    console.log(`   Orders:           ${summary[4]}`)
    console.log(`   Order Items:      ${summary[5]}`)
}

main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => db.$disconnect())