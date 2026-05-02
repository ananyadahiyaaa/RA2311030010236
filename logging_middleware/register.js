// one-time registration helper
// usage:
//   1. fill in the fields below with YOUR details
//   2. cd logging_middleware && npm install (if not already)
//   3. node register.js
//   4. copy clientID and clientSecret from the printed response into your .env files
//
// you can only run this successfully ONCE per email - the server rejects repeats.

const axios = require('axios')

const ME = {
    email:          '<your-college-email>',     // e.g. ananyadahiya@srmist.edu.in
    name:           '<your-full-name>',         // e.g. Ananya Dahiya
    mobileNo:       '<10-digit-mobile>',        // e.g. 9999999999
    githubUsername: '<your-github-username>',   // e.g. anany
    rollNo:         'RA2311030010236',
    accessCode:     'QkbpxH'
}

async function main() {
    // sanity check - bail if any placeholder still has '<>'
    for (const [k, v] of Object.entries(ME)) {
        if (v.includes('<') || v.includes('>')) {
            console.error(`fill in "${k}" first`)
            process.exit(1)
        }
    }

    try {
        const res = await axios.post(
            'http://20.207.122.201/evaluation-service/register',
            ME,
            { headers: { 'Content-Type': 'application/json' } }
        )
        console.log('--- registration successful ---')
        console.log(JSON.stringify(res.data, null, 2))
        console.log('\nnow copy these into BOTH .env files:')
        console.log(`LOG_EMAIL=${ME.email}`)
        console.log(`LOG_NAME=${ME.name}`)
        console.log(`LOG_ROLL_NO=${ME.rollNo}`)
        console.log(`LOG_ACCESS_CODE=${ME.accessCode}`)
        console.log(`LOG_CLIENT_ID=${res.data.clientID}`)
        console.log(`LOG_CLIENT_SECRET=${res.data.clientSecret}`)
    } catch (err) {
        console.error('registration failed:', err.response ? err.response.data : err.message)
        process.exit(1)
    }
}

main()
