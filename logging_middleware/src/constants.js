const STACKS = new Set(['backend', 'frontend'])

const LEVELS = new Set(['debug', 'info', 'warn', 'error', 'fatal'])

const BACKEND_ONLY = new Set([
    'cache', 'controller', 'cron_job', 'db', 'domain',
    'handler', 'repository', 'route', 'service'
])

const FRONTEND_ONLY = new Set([
    'api', 'component', 'hook', 'page', 'state', 'style'
])

const SHARED = new Set(['auth', 'config', 'middleware', 'utils'])

const PACKAGES_BY_STACK = {
    backend: new Set([...BACKEND_ONLY, ...SHARED]),
    frontend: new Set([...FRONTEND_ONLY, ...SHARED])
}

module.exports = { STACKS, LEVELS, PACKAGES_BY_STACK }
