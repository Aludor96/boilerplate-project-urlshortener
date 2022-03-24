require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dns = require('dns');
const app = express();
const { connect, Schema, model } = require("mongoose");
const { application } = require('express');

// Basic Configuration
const port = process.env.PORT || 3000;

connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
},
  error => {
    console.log("Error: " + error);
  }
);

let urlShortenerSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number }
});

let urlShortener = model("urlShorteener", urlShortenerSchema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

const urlEncoded = express.urlencoded({ extended: true });

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

let urlResponse = {};

app.post("/api/shorturl", urlEncoded, (req, res) => {
  const originalURL = req.body.url;
  const urlObject = new URL(originalURL);

  dns.lookup(urlObject.hostname, (err, address, family) => {
    if (err) {
      res.json({
        error: "invalid url"
      });
    } else {
      let inputShort = 1;
      urlResponse['original_url'] = originalURL;
      urlShortener
        .findOne({})
        .sort({ short_url: "desc" })
        .exec((error, result) => {
          if (!error && result != undefined) {
            inputShort = result.short_url + 1;
          }
          if (!error) {
            urlShortener.findOneAndUpdate(
              { original_url: originalURL },
              { original_url: originalURL, short_url: inputShort },
              { new: true, upsert: true },
              (error, savedUrl) => {
                if (error) return "Error " + error.toString();
                urlResponse["short_url"] = savedUrl.short_url;
                res.json(urlResponse);
              }
            );
          }
        });
    };
  });
});

app.get("/api/shorturl/:short_url", (req, res) => {
  const shortUrl = req.params.short_url;
  urlShortener.findOne({ short_url: shortUrl }, (err, result) => {
    if (!err && result != undefined) {
      console.log(result);
      res.redirect(result.original_url);
    }
    return res.json("Url not found");

  })
})

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
