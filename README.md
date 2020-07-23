# Covid Temperature Monitoring App
App to ingest temperature data, and send scheduled checkins for temperature self-reporting

## Purpose:
This app provides a server with simple endpoints that allow for:
* Importing participant details from a csv file (id and phone number)
* Making an initial call to imported participants to determine whether or not they will take part in the monitoring
* Making scheduled calls to monitoring participants to get their temperature
* Allow data analysts to export data from a mongo database to a csv file
* Perform symptom tracking (eg coughing, stomach aches)

## Setup:
This app uses Express.js with auth0 used to provided authentication for all routes where a user can add information to the database. 
It requires an auth0 account, and a mongodb instance *somewhere* - the server must be able to interact with it, but it could be locally hosted

## Usage Guide for adding participants and sending calls:
1. Visit the Temperature Monitoring Dashboard (currently https://tufts-covid.herokuapp.com/)

2. Log in using an auth0 users' email and password.

3. Select a .csv file. It should look like this:

![CSV](https://i.imgur.com/zi8kig2.png)

4. Click upload file. This should bring you to a different page, saying that the CSV was successfully parsed.

5. Back on the dashboard, click Make Calls. This will use twilio to phone every number uploaded from the csv.

6. To log out, double click on the log out button

## Data Exportation:
Thanks to auth0, it is possible to export files using certain protected routes, such as /mongo/participantData.csv.
This does require mongodb community drivers to be installed. Because of this, it may not work on all servers.  
To remedy this, I will provide shell scripts in a seperate repo for the purpose of data collection.
