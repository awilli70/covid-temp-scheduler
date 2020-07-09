# Covid Temperature Monitoring App
App to ingest temperature data, and send scheduled checkins for temperature self-reporting

## Purpose:
This app provides a server with simple endpoints that allow for:
* Importing participant details from a csv file (id and phone number)
* Making an initial call to imported participants to determine whether or not they will take part in the monitoring
* Making scheduled calls to monitoring participants to get their temperature

TODO:
* Exporting data from a mongo database to a csv file
* Symptom tracking (eg coughing, stomach aches)/ Generic how do you feel 1-5

## Setup:
This app uses Express.js, and has other package dependencies listed in package.json.

Environment variables are listed in .env.tpl, and are required for the proper functioning of the app.

## Usage Guide for adding participants and sending calls:
1. Visit the Temperature Monitoring Dashboard (currently https://tufts-covid.herokuapp.com/)

2. Select a .csv file. It should look like this:

![CSV](https://i.imgur.com/zi8kig2.png)

3. Click upload file. This should bring you to a different page, saying that the CSV was successfully parsed.

4. Back on the dashboard, click Make Calls. This will use twilio to phone every number uploaded from the csv.

## Data Exportation:
Thanks to auth0, it is possible to export files using certain protected routes.

## APIs exposed:

* POST: `/ingest/csvFile` {File: .csv} -> uploads user records from .csv data (should have phone header included). Key must be named "file" and set body type to be "form-data"

* POST: `/mongo/updateTemp` {phone: string, temp: string} -> adds a new temperatureRecord for user by provided phone number
* POST: `mongo/firstCallNoThermo` -> {phone: string, hasThermo: bool} -> adds user to the no-thermo collection
* POST: `mongo/firstCallAnswered` -> {phone: string, hasThermo: bool, prefersCall, bool} -> adds a user to the participants collection on the firstcall
* POST: `mongo/firstCallNoAnswer` {phone: string} -> adds a user to the no-response collection if they do not answer the first call
* POST: `mongo/moreInfo` {phone: string} -> adds a user to the more-info collection in the database if they request more information during the first call

* GET: `/twilio/checkIn/morning` -> kicks off morning checkIn job for all users in database
* GET: `/twilio/checkIn/evening` -> kicks off evening checkIn job for all users in database
* GET: `/twilio/firstCall` -> makes firstCall to all users from the ingested collection
