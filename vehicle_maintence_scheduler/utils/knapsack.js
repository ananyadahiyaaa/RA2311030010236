// classic 0/1 knapsack
// Duration = weight, Impact = value, MechanicHours = capacity
// returns { totalImpact, totalDuration, selected: [task...] }
//
// TODO: if N gets really large we might want a meet-in-the-middle or LP-relaxation
// approach instead, but DP is fine for the depot sizes we're seeing.

const solveKnapsack = (tasks, capacity) => {
    const n = tasks.length
    const W = Math.floor(capacity)

    if (n === 0 || W <= 0) {
        return { totalImpact: 0, totalDuration: 0, selected: [] }
    }

    // dp[i][w] = best impact using first i tasks with capacity w
    const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0))

    for (let i = 1; i <= n; i++) {
        const { Duration: d, Impact: v } = tasks[i - 1]
        for (let w = 0; w <= W; w++) {
            dp[i][w] = dp[i - 1][w]
            if (d <= w) {
                let take = dp[i - 1][w - d] + v
                if (take > dp[i][w]) dp[i][w] = take
            }
        }
    }

    // walk back through the dp table to recover which tasks we picked
    const selected = []
    let w = W
    for (let i = n; i >= 1; i--) {
        if (dp[i][w] !== dp[i - 1][w]) {
            selected.push(tasks[i - 1])
            w -= tasks[i - 1].Duration
        }
    }

    const totalImpact = dp[n][W]
    const totalDuration = selected.reduce((acc, t) => acc + t.Duration, 0)
    // console.log('picked', selected.length, 'impact', totalImpact)
    return { totalImpact, totalDuration, selected: selected.reverse() }
}

module.exports = { solveKnapsack }
