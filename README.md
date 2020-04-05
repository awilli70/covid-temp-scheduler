App to ingest temperature data, and send scheduled checkins for temperature self-reporting

APIs exposed:

* POST: `/ingest/csvFile` {File: .csv} -> uploads user records from .csv data (should have phone header included)

* GET: `/mongo/users` -> returns all users currently in database
* GET: `/mongo/twilioTest` -> kicks off the Twilio interaction for temperature check-in
* POST: `/mongo/updateTemp` {phone: string, temp: string} -> adds a new temperatureRecord for user by provided phone number
* POST: `mongo/test/upsertUser` {phone: string, hasThermo: boolean, prefersCall: boolean} -> adds or updates(by phone) a user record

* GET: `/twilio/checkIn/morning` -> kicks off morning checkIn job for all users in database
* GET: `/twilio/checkIn/evening` -> kicks off evening checkIn job for all users in database
* GET: `/twilio/test/tempCheck/:textOrPhone/:period/:phone` -> sends a text or call based (:textOrPhone should be "text" for text based), temperature check-in for the given  period (evening/morning) and phone number
* GET: `/twilio/firstCall` -> makes firstCall to all users from the ingested collection

Recommended Workflow:
1. Use POSTMAN to upload a .csv file (containing a row for headers, including "phone" for a header) via `/ingest/csvFile` POST end-point
2. Hit the `/twilio/firstCall` GET end-point 
3. Use `/mongo/users` GET end-point to check what users have been registered onto the system. You may use this API to periodically track updates in temperatures
