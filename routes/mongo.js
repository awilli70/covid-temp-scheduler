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
    regex = RegExp(/(Y|y)/gm)
    client = req.client;
    const phone = req.body.phone;
    let temp = parseFloat(req.body.temp);
    let taste = (parseInt(req.body.symptomOne) === 1 || regex.test(symptomOne));
    let cough = (parseInt(req.body.symptomTwo) === 1 || regex.test(req.body.symptomTwo));
    let fever = (parseInt(req.body.symptomThree) === 1 || regex.test(req.body.symptomThree));
    let evacuation = (parseInt(req.body.symptomFour) === 1 || regex.test(req.body.symptomFour));

    try {
        const time = moment().format('MMMM Do YYYY, h:mm:ss a');
        let participant = await client.db(process.env.DB).collection(process.env.USER_COLLECTION).findOne({phone: phone})
        
        insertSingleUser(client, process.env.DB, process.env.DATA_COLLECTION, 
            {
                "id": participant.id,
                "time": time,
                "temp": temp,
                "taste-smell": taste,
                "cough-ache": cough,
                "fever-chills": fever,
                "diarrhea-vomiting": evacuation
            });

        res.status(200).send('Updated user record.');
    } catch (e) {
        if (e.message !== 'Invalid temperature!') {
            console.log(e)
        }
        res.status(500).send({'message': e});
    }
});

router.post('/checkTemp/', async (req, res) => {
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
        res.status(200).send({temp: temp});
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
        let id = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).findOne({phone: phone})
        let removeNum = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "no-thermo",
        {
                "phone": phone,
                "hasThermo": hasThermo,
                "id": id.id
            }
        );
        res.send('User Answered Call')
    } catch (e) {
        next(e)
    }
});

router.post('/firstCallAnswered', async (req, res, next) => {
    client = req.client;
    let phone = req.body.phone
    let newPhone = req.body.newPhone
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
        let id = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).findOne({phone: phone})
        let removeNum = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        if (!newPhone) {
            newPhone = phone
        }
        await insertSingleUser(client, process.env.DB, "participants",
        {
                "phone": newPhone,
                "hasThermo": hasThermo,
                "prefersCall": prefersCall,
                "id": id.id
            }
        );
        res.send('User Answered Call')
    } catch (e) {
        console.log(e)
        next(e)
    }
    
});

// The next 2 methods are exposed to Twilio FirstCall flow, for people that
// need to be contacted by humans
router.post('/firstCallNoAnswer', async (req, res, next) => {
    client = req.client;
    const phone = req.body.phone
    try {
        let id = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).findOne({phone: phone})
        let removeNum = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "no-response",
        {
                "phone": phone,
                "id": id.id
            }
        );
        res.send('User did not answer call')
    } catch (e) {
        next(e)
    }
});

router.post('/moreInfo', async (req, res, next) => {
    client = req.client;
    const phone = req.body.phone
    try {
        let id = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).findOne({phone: phone})
        let removeNum = await client.db(process.env.DB).collection(process.env.INGEST_COLLECTION).deleteOne({phone: phone})
        await insertSingleUser(client, process.env.DB, "more-info",
        {
                "phone": phone,
                "id": id.id
            }
        );
        res.send('User requested more info')
    } catch (e) {
        next(e)
    }
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
