var express = require('express');
var util = require('util');
var url = require('url');
var querystring = require('querystring');
var router = express.Router();
var path = require('path')
var passport = require('passport')
const multer = require('multer');
const csv = require('fast-csv');
const fs = require('fs');
// handler to work with multi-part form data i.e. files
const upload = multer({ dest: 'tmp/csv/' });
var secured = require('../middleware/secured');

router.get('/', passport.authenticate('auth0', {
  scope: 'openid email profile'
}), function (req, res) {
  res.redirect('/controls');
});

router.get('/callback', function (req, res, next) {
  passport.authenticate('auth0', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect('/'); }
    req.logIn(user, function (err) {
      if (err) { return next(err); }
      const returnTo = req.session.returnTo;
      delete req.session.returnTo;
      res.redirect(returnTo || '/controls');
    });
  })(req, res, next);
});

router.get('/logout', secured(), (req, res) => {
  try {
      req.logOut();

    var returnTo = req.protocol + '://' + req.hostname;
    var port = req.connection.localPort;
    if (port !== undefined && port !== 80 && port !== 443) {
      returnTo += ':' + port;
    }
    var logoutURL = new url.URL(
      util.format('https://%s/v2/logout', process.env.AUTH0_DOMAIN)
    );
    var searchString = querystring.stringify({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: returnTo
    });
    logoutURL.search = searchString;
    res.redirect(logoutURL);
  } catch (e) {
    console.log(e)
    res.send(e)
  }
});

router.get('/controls', secured(), async (req, res, next) =>{
  res.sendFile(path.resolve('./public/controls.html'));
});

router.post('/ingest/csvFile', secured(), upload.single('file'), async (req, res, next) => {
    const filePath = req.file.path;
    let results = [];
    fs.createReadStream(filePath)
    .pipe(csv.parse({ headers: ['id', 'phone'], renameHeaders: true}))
    .on('error', error => console.error(error))
    .on('data', row => {
      if(row.id !== '' && row.phone !== '') {
        row.phone = '+1' + row.phone.replace(/[^\d+]|_|(\+1)/g, "")
        results.push(row)
      }
    })
    .on('end', async rowCount => {
      console.log(`Parsed ${rowCount} rows`);
      // delete temporary file stored in tmp/csv
      fs.unlinkSync(filePath);
      for (let user of results) {
        let phone = user.phone
        let id = user.id
        let duplicate = await req.client.db(process.env.DB).collection(process.env.INGEST_COLLECTION)
                                .findOne({'phone': phone})
        if (duplicate) {
          req.client.db(process.env.DB).collection(process.env.DUPLICATE_COLLECTION)
            .insertOne({'phone': duplicate.phone, 'id': duplicate.id})
        }
        const result = await req.client.db(process.env.DB).collection(process.env.INGEST_COLLECTION)
                                       .updateOne({'phone': phone}, 
                                                  {$set: {'phone': phone, 'id': id}}, 
                                                  {upsert: true});
      }
      res.sendFile(path.resolve('public/ingest/csvFile.html'))
    });
});

module.exports = router;
