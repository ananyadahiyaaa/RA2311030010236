// score = (type weight)*scale + recency seconds
// spec says placement > result > event
// scale is big enough so type always beats recency
// const DEBUG = false

const TYPE_WEIGHT = {
    placement: 3,
    result:    2,
    event:     1
}

const SCALE = 1e12

function priorityScore(notif) {
    const t = (notif.Type || '').toLowerCase()
    const w = TYPE_WEIGHT[t] || 0
    const ts = Date.parse(notif.Timestamp)
    const recency = Number.isFinite(ts) ? Math.floor(ts / 1000) : 0
    return w * SCALE + recency
}

module.exports.priorityScore = priorityScore
module.exports.TYPE_WEIGHT = TYPE_WEIGHT
