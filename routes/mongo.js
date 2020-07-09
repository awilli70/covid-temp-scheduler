require('dotenv').config();
const express = require('express');
const router = express.Router();
const twilio = require('twilio')
const moment = require('moment');
const { execSync } = require('child_process')
var secured = require('../middleware/secured');

/*
Exposed to Twilio
- TWILIO post request webhook must have temp, phone defined as form-url-encoded http parameters
*/
router.post('/updateTemp', async (req, res) => {
    client = req.client;
    const phone = req.body.phone;
    let temp = parseFloat(req.body.temp);
    try {
        if (temp !== temp) {
            throw new Error('Invalid temperature!');
        } else if (temp > 900) {
            temp /= 10;
        }
        if (temp < 80 || temp > 120) {
            throw new Error('Invalid temperature!')
        }

        const time = moment().format('MMMM Do YYYY, h:mm:ss a');
        
        const tempRecord = {
            phone,
            time,
            temp
        }
        await client.db(process.env.DB).collection("participant-data").insertOne(tempRecord)
        res.status(200).send('Updated user record.');
    } catch (e) {
        if (e.message !== 'Invalid temperature!') {
            console.log(e)
        }
        res.status(500).send({'message': e});
    }
});

/*
Exposed to Twilio
- TWILIO post request webhook must have hasThermo and phone defined as form-url-encoded http params
*/
router.post('/firstCallNoThermo', async (req, res, next) => {
    client = req.client;
    const phone = req.body.phone
    const thermoString = req.body.hasThermo
    var hasThermo = false;
    if (thermoString === "true") {
        hasThermo = true;
    }
    try {
        let removeNum = await dbclient.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "no-thermo",
        {
                "phone": phone,
                "hasThermo": hasThermo
            }
        );
    } catch (e) {
        next(e)
    }
    res.send('User Answered Call')
});

router.post('/firstCallAnswered', async (req, res, next) => {
    client = req.client;
    let phone = req.body.phone
    phone = '+1' + phone.replace(/[^\d+]|_|(\+1)/g, "")
    const thermoString = req.body.hasThermo
    var hasThermo = false;
    if (thermoString === "true") {
        hasThermo = true;
    }
    const reminders = req.body.reminders
    var prefersCall = false;
    if (reminders === "call") {
        prefersCall = true;
    }
    try {
        let removeNum = await dbclient.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "participants",
        {
                "phone": phone,
                "hasThermo": hasThermo,
                "prefersCall": prefersCall
            }
        );
    } catch (e) {
        next(e)
    }
    res.send('User Answered Call')
});

// The next 2 methods are exposed to Twilio FirstCall flow, for people that
// need to be contacted by humans
router.post('/firstCallNoAnswer', async (req, res, next) => {
    client = req.client;
    const phone = req.body.phone
    try {
        let removeNum = await dbclient.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "no-response",
        {
                "phone": phone
            }
        );
    } catch (e) {
        next(e)
    }
    res.send('User did not answer call')
});

router.post('/moreInfo', async (req, res, next) => {
    client = req.client;
    const phone = req.body.phone
    try {
        let removeNum = await dbclient.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "more-info",
        {
                "phone": phone
            }
        );
    } catch (e) {
        next(e)
    }
    res.send('User did not answer call')
});

/*
 * Routes to display csv - these utilise child-process to execute shell
 * scripts
 */
router.get('/participantData.csv', secured(), async (req, res, next) => {
    try {
        let output = execSync(`mongoexport --uri=${process.env.DBURI} -c=${process.env.DATA_COLLECTION} --type="csv" -f="phone,time,temp"`)
        res.send(output)
    } catch (e) {
        console.log(e)
        res.status(500).send({'message': e})
    }
})


// Helper: Inserts one user into the Mongo Database
async function insertSingleUser(client, database, collection, post) {
    try{
        const result = await client.db(database).collection(collection).insertOne(post);
    } catch (e) {
        console.error(e)
    }
}
module.exports = router;
