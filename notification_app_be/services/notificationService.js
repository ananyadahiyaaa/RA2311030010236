const { fetchNotifications } = require('../models/evaluationApi')
const { priorityScore } = require('../utils/priorityScore')
const { TopKMinHeap } = require('../utils/minHeap')
const { Log } = require('../../logging_middleware/src')

async function fetchAll() {
    return fetchNotifications()
}

// stage 6 - top N priority notifications using a min-heap of size n
// works for both finite lists and a streaming source (just keep .push'ing)
// hmm could probably parallelize the fetch + scoring eventually but not worth it now
async function getPriorityInbox(n) {
    const all = await fetchNotifications()

    let heap = new TopKMinHeap(n, priorityScore)
    for (let i = 0; i < all.length; i++) {
        heap.push(all[i])
    }

    const top = heap.drain()
    await Log('backend', 'info', 'service',
        `priority inbox: top ${top.length} of ${all.length}`)
    return top
}

module.exports = { fetchAll, getPriorityInbox }
