// fixed-capacity min-heap used as a top-K maintainer
// idea: keep heap of K smallest-of-the-top-K. when a new item beats the min, swap.
// total cost over N pushes is O(N log K), memory O(K).
// FIXME: if we ever need a real heap with deletes/updates, swap this for a lib like heap-js

class TopKMinHeap {
    constructor(capacity, scoreFn) {
        this.cap = capacity
        this.scoreFn = scoreFn
        this.data = []
    }

    size() { return this.data.length }
    peek() { return this.data[0] }

    push(item) {
        const score = this.scoreFn(item)

        if (this.data.length < this.cap) {
            this.data.push({ item, score })
            this._siftUp(this.data.length - 1)
            return
        }

        // heap is full - only keep this item if it beats the current min
        if (score > this.data[0].score) {
            this.data[0] = { item, score }
            this._siftDown(0)
        }
    }

    // returns items sorted highest score first
    drain() {
        return this.data
            .slice()
            .sort((a, b) => b.score - a.score)
            .map(e => e.item)
    }

    _siftUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1
            if (this.data[i].score < this.data[parent].score) {
                ;[this.data[i], this.data[parent]] = [this.data[parent], this.data[i]]
                i = parent
            } else {
                break
            }
        }
    }

    _siftDown(i) {
        const n = this.data.length
        while (true) {
            const l = 2 * i + 1
            const r = 2 * i + 2
            let s = i
            if (l < n && this.data[l].score < this.data[s].score) s = l
            if (r < n && this.data[r].score < this.data[s].score) s = r
            if (s === i) break
            ;[this.data[i], this.data[s]] = [this.data[s], this.data[i]]
            i = s
        }
    }
}

module.exports = { TopKMinHeap }
