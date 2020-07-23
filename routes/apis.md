## APIs exposed:

* GET: `/` -> login form using auth0, redirects to `/control`, the control panel
* POST: `/ingest/csvFile` {File: .csv} -> uploads user records from .csv data (should have phone header included). Key must be named "file" and set body type to be "form-data"
* POST: `/mongo/updateTemp` {phone: string, temp: string} -> adds a new temperatureRecord for user by provided phone number
* POST: `mongo/firstCallNoThermo` -> {phone: string, hasThermo: bool} -> adds user to the no-thermo collection
* POST: `mongo/firstCallAnswered` -> {phone: string, hasThermo: bool, prefersCall, bool} -> adds a user to the participants collection on the firstcall
* POST: `mongo/firstCallNoAnswer` {phone: string} -> adds a user to the no-response collection if they do not answer the first call
* POST: `mongo/moreInfo` {phone: string} -> adds a user to the more-info collection in the database if they request more information during the first call
* GET: `/twilio/firstCall` -> makes firstCall to all users from the ingested collection
* GET: `/mongo/participantData.csv` -> exports data from mongoDB instance using mongoexport and execSync

* GET: `/twilio/checkIn/morning` -> kicks off morning checkIn job for all users in database
* GET: `/twilio/checkIn/evening` -> kicks off evening checkIn job for all users in database
