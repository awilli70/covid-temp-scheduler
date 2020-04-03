require('dotenv').config();
var express = require('express');
var router = express.Router();
const accountSid = process.env.TWILIO_AC;
const authToken = process.env.TWILIO_AUTH;
const client = require('twilio')(accountSid, authToken);
const moment = require('moment');
var { checkIn } = require('../cronHelpers');

router.get('/start', async (req, res) => {
    try {
        const flow = process.env.TWILIO_CHECKIN_FLOW;
        const timeNow = moment().format('MMMM Do YYYY, h:mm:ss a');
        client.studio.v1.flows(flow).executions.create({ to: process.env.TWILIO_TO, from: process.env.TWILIO_FROM, parameters: JSON.stringify({time: timeNow})}).then(function(execution) { console.log("Successfully executed flow!", execution.sid); });
    } catch (e) {
        res.json({
            message: e
        });
    }
    res.send('Successfully started process with no errors')
});

router.get('/firstCall', async (req, res) => {
    dbclient = req.client;
    const flow = process.env.TWILIO_FIRST_CALL_FLOW
    const phoneNums = await readCollection(dbclient, process.env.DB, process.env.INGEST_COLLECTION)
    phoneNums.forEach((number) => {
        try {
            client.studio.v1.flows(flow).executions.create({ to: number.phone, from: process.env.TWILIO_FROM, MachineDetection: "Enable" }).then(function(execution) { console.log("Successfully executed flow!", execution.sid); });
        } catch (e) {
            res.json({
                message: e
            });
        }
    });
    res.send("Successful call to twilio API")
});

router.get('/checkIn/morning', async (req, res) => {
    try {
        dbclient = req.client;
        await checkIn(dbclient, "6pm tonight", "morning");
    } catch (e) {
        next(e);
    }
    res.send("Successfully started morning checkIn twilio API");
});

router.get('/checkIn/evening', async (req, res) => {
    try {
        dbclient = req.client;
        await checkIn(dbclient, "9am tomorrow morning", "evening");
    } catch (e) {
        next(e);
    }
    res.send("Successfully started evening checkIn twilio API");
});

async function readCollection(dbclient, database, collection) {
    const cursor = await dbclient.db(database).collection(collection)
        .find({})
    const results = await cursor.toArray();
    return results;
}

module.exports = router;
