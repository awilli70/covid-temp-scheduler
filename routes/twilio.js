require('dotenv').config();
var express = require('express');
var router = express.Router();
const accountSid = process.env.TWILIO_AC;
const authToken = process.env.TWILIO_AUTH;
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

router.get('/test/tempCheck/:textOrPhone/:period/:phone', async (req, res) => {
    try {
        const isTextTest = req.params.textOrPhone === 'text';
        let period, nextCheckIn;
        if (req.params.period === 'morning') {
            period = 'morning';
            nextCheckIn = '6pm tonight'
        } else {
            period = 'evening';
            nextCheckIn = '9am tomorrow morning'
        }
        const phone = req.params.phone;
        await testTemperatureCheckin(client, phone, isTextTest, nextCheckIn, period);
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

/*
@params: twilioClient 
    - client object, used to make Twilio API calls
    - userPhone string, for user's phone number to test with
    - isTextTest boolean, true if testing with text-based temperature checkin
    - nextCheck string, duration of next checkin
    - period string, morning/evening
*/
async function testTemperatureCheckin(twilioClient, userPhone, isTextTest, nextCheckIn, period) {
    const flow = isTextTest ? process.env.TWILIO_TEXT_CHECKIN_FLOW : process.env.TWILIO_PHONE_CHECKIN_FLOW;
    await twilioClient.studio.flows(flow)
        .executions
        .create(
            { 
                to: userPhone,
                from: process.env.TWILIO_FROM,
                parameters: JSON.stringify({nextCheckIn, period})
            }
        ).then(execution => 
            {
                console.log(`Successfully sent temperature check for ${userPhone}! using ${execution.sid}`);
            }
        ).catch (e => {
            console.log(`Error sending temperature check for ${userPhone}! using ${execution.sid}`);
        })
}

module.exports = router;
