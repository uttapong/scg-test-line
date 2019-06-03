const line = require("@line/bot-sdk");
const axios = require("axios");
const mapKey = "AIzaSyCQWpAtVowR7C1BRlml8_LeRMWSpKUZ1HQ";
const endPoint = "https://maps.googleapis.com/maps/api/place/";
const express = require("express");
const app = express();
const port = process.env.PORT || 80;
const bodyParser = require("body-parser");
app.use(bodyParser.json());

/*
 * Call Google Place API to retrieve lat,lng from keyword using findplacefromtext function
 *
 * @param {string} searchLocation search location string
 * @param {Object} place object include lat,lng information
 *
 */
async function searchLocation(searchLocation) {
  const result = await new Promise((resolve, reject) => {
    axios
      .get(
        `${endPoint}findplacefromtext/json?input=${searchLocation}&inputtype=textquery&fields=photos,formatted_address,name,rating,opening_hours,geometry&key=${mapKey}`
      )
      .then(function(response) {
        if (response.data.candidates.length > 0) {
          const resultLatLng = response.data.candidates[0].geometry.location;

          resolve(resultLatLng);
        }
        resolve(false);
      })
      .catch(function(error) {
        console.log(error);
        reject(error);
      });
  });
  return result;
}

/*
 * Call Google Place API to retrieve list of restaurant from keyword using nearbysearch function
 *
 * @param {string} lat location latitude to search for restaurant
 * @param {string} lng location longitude to search for restaurant
 * @param {Object[]} list of restaurant object coresponded for search location
 *
 */
async function searchRestaurant(lat, lng) {
  const result = await new Promise((resolve, reject) => {
    axios
      .get(
        `${endPoint}nearbysearch/json?location=${lat},${lng}&radius=1500&type=restaurant&key=${mapKey}`
      )
      .then(function(response) {
        resolve(response.data);
      })
      .catch(function(error) {
        reject(error);
      });
  });
  return result;
}

/*
 * function responsible for create LINE Message response from restaturant object
 *
 * @param {string} query search location string
 * @param {string} replyToken client's token inwhich message is called
 * @param {Object} Object message in LINE Message format to send to LINE webhook client
 *
 */
async function replyMessage(query, replyToken) {
  const client = new line.Client({
    channelAccessToken:
      "p4iNhwyIUCEQcGqLDh+QW9WAdw/lj0landPWV/tkyBKNNwsGk33uWipPATAwBCL7PSsLgNnVd5SJcbzCyOuZg40QxyP2ZatwZcmXhWmrPwn/7OTPvlnbPlp4xeBWVD6WLjCsO/rtzxHyAv1cBfbECwdB04t89/1O/w1cDnyilFU="
  });
  let loc = await searchLocation(query);
  let restaurants = await searchRestaurant(loc.lat, loc.lng);

  const carousal = restaurants.results.slice(0, 5).map((value, index) => {
    console.log(
      encodeURI(
        `https://www.google.com/maps/search/?api=1&query=${
          value.geometry.location.lat
        },${value.geometry.location.lng}&query_place_id=${value.id}`
      )
    );
    let rating = value.rating ? value.rating : "-";
    return {
      thumbnailImageUrl:
        value.photos && value.photos[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?key=${mapKey}&maxwidth=300&maxheight=200&photoreference=${
              value.photos[0].photo_reference
            }`
          : value.icon,
      imageBackgroundColor: "#FFFFFF",
      title: value.name,
      text: `Rating ${rating}`,
      defaultAction: {
        type: "uri",
        label: "View",
        uri: encodeURI(
          `https://www.google.com/maps/search/?api=1&query=${
            value.geometry.location.lat
          },${value.geometry.location.lng}&query_place_id=${value.id}`
        )
      },
      actions: [
        {
          type: "uri",
          label: "View on Map",
          uri: encodeURI(
            `https://www.google.com/maps/search/?api=1&query=${
              value.geometry.location.lat
            },${value.geometry.location.lng}&query_place_id=${value.id}`
          )
        }
      ]
    };
  });

  const message = {
    type: "template",
    altText: "Search result for " + query,
    template: {
      type: "carousel",
      columns: carousal
    }
  };
  if (restaurants.results.length > 0) {
    client
      .replyMessage(replyToken, message)
      .then(() => {})
      .catch(err => {
        // error handling
        client.replyMessage(replyToken, {
          type: "text",
          text: "Restaurant not found"
        });
        console.log(err);
      });
  } else {
    client
      .replyMessage(replyToken, {
        type: "text",
        text: "Restaurant not found"
      })
      .then(() => {})
      .catch(err => {
        console.log(err);
      });
  }
}

/*
 * Express url route endpoint for LINE webhook used to searching for restaurant from input location
 */
app.post("/webhook", (req, res) => {
  const event = req.body.events[0];
  replyMessage(encodeURI(event.message.text), event.replyToken);
  res.send("OK");
});

app.listen(port, () => console.log(`LINE Webhook listening on port ${port}!`));
