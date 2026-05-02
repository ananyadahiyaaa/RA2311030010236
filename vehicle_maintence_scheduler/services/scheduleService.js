const { fetchDepots, fetchVehicles } = require('../models/evaluationApi')
const { solveKnapsack } = require('../utils/knapsack')
const { Log } = require('../../logging_middleware/src')

// builds the plan object for a single depot - just packages knapsack output
const buildPlanForDepot = (depot, tasks) => {
    let r = solveKnapsack(tasks, depot.MechanicHours)
    return {
        depotId: depot.ID,
        mechanicHours: depot.MechanicHours,
        totalImpact: r.totalImpact,
        totalDurationUsed: r.totalDuration,
        unusedHours: depot.MechanicHours - r.totalDuration,
        taskCount: r.selected.length,
        tasks: r.selected
    }
}

const scheduleAllDepots = async () => {
    await Log('backend', 'info', 'service', 'scheduleAllDepots: fetching depots and vehicles')
    const [depots, tasks] = await Promise.all([fetchDepots(), fetchVehicles()])

    if (!Array.isArray(depots) || depots.length === 0) {
        const err = new Error('no depots returned by evaluation service')
        err.status = 502
        throw err
    }

    // run the knapsack for each depot independantly - they don't share tasks really
    // console.log('depots', depots.length, 'tasks', tasks.length)
    const plans = depots.map(d => buildPlanForDepot(d, tasks))

    await Log('backend', 'info', 'service',
        `scheduleAllDepots: planned ${plans.length} depots over ${tasks.length} tasks`)

    return { taskPoolSize: tasks.length, depotsPlanned: plans.length, plans }
}

const scheduleForDepot = async (depotId) => {
    // fetch in parallel - both calls are independent
    const [depots, tasks] = await Promise.all([fetchDepots(), fetchVehicles()])
    const depot = depots.find(d => d.ID === depotId)
    if (!depot) {
        const err = new Error(`depot ${depotId} not found`)
        err.status = 404
        throw err
    }
    let plan = buildPlanForDepot(depot, tasks)
    await Log('backend', 'info', 'service',
        `scheduleForDepot ${depotId}: impact=${plan.totalImpact} used=${plan.totalDurationUsed}/${depot.MechanicHours}`)
    return plan
}

// when caller wants to override the depot budget with their own number
const scheduleForBudget = async (budget) => {
    const tasks = await fetchVehicles()
    let result = solveKnapsack(tasks, budget)
    await Log('backend', 'info', 'service',
        `scheduleForBudget ${budget}: impact=${result.totalImpact} used=${result.totalDuration}`)
    return {
        budget,
        totalImpact: result.totalImpact,
        totalDurationUsed: result.totalDuration,
        unusedHours: budget - result.totalDuration,
        taskCount: result.selected.length,
        tasks: result.selected
    }
}

module.exports = { scheduleAllDepots, scheduleForDepot, scheduleForBudget }
