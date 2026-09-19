async function run() {
    const counts = {}

    for (let i = 0; i < 105; i++) {
        const res = await fetch('http://localhost:3000/api/v1/products')
        counts[res.status] = (counts[res.status] || 0) + 1
    }

    console.log('Results:', counts)
}

run()