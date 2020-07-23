require('dotenv').config();
var express = require('express');
var router = express.Router();
const accountSid = process.env.TWILIO_AC;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
var { checkIn } = require('../cronHelpers');
var path = require('path');
var secured = require('../middleware/secured');


router.get('/firstCall', secured(), async (req, res) => {
    dbclient = req.client;
    const flow = process.env.TWILIO_FIRST_CALL_FLOW
    const phoneNums = await readCollection(dbclient, process.env.DB, process.env.INGEST_COLLECTION)
    await Promise.all(phoneNums.map(async (numberRecord) => {
        try {
            const phone = numberRecord.phone;
            client.studio.flows(flow).executions
                .create({ to: phone, from: process.env.TWILIO_FROM, MachineDetection: "Enable" })
                .then(function(execution) { 
                    console.log("Successfully executed flow!", execution.sid);
                });
        } catch (e) {
            res.status(500).send({
                message: e
            });
        }
        res.sendFile(path.resolve('public/twilio/firstCall.html'))
    }));
});

router.get('/checkIn/morning', async (req, res) => {
    try {
        dbclient = req.client;
        await checkIn(dbclient, "6pm tonight", "morning");
        res.send("Successfully started morning checkIn twilio API");
    } catch (e) {
        next(e);
    }
});

router.get('/checkIn/evening', async (req, res) => {
    try {
        dbclient = req.client;
        await checkIn(dbclient, "9am tomorrow morning", "evening");
        res.send("Successfully started evening checkIn twilio API");
    } catch (e) {
        next(e);
    }
});

async function readCollection(dbclient, database, collection, search) {
    const cursor = await dbclient.db(database).collection(collection)
        .find(search)
    const results = await cursor.toArray();
    return results;
}

module.exports = router;
