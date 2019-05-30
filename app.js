const line = require("@line/bot-sdk");
const axios = require("axios");
const mapKey = "AIzaSyCQWpAtVowR7C1BRlml8_LeRMWSpKUZ1HQ";
const endPoint = "https://maps.googleapis.com/maps/api/place/";
const express = require("express");
const app = express();
const port = 3000;
const bodyParser = require("body-parser");
app.use(bodyParser.json());
// client.replyMessage('<to>', message)
//   .then(() => {

//   })
//   .catch((err) => {
//     // error handling
//   });
async function searchLocation(searchLocation) {
  const result = await new Promise((resolve, reject) => {
    axios
      .get(
        `${endPoint}findplacefromtext/json?input=${searchLocation}&inputtype=textquery&fields=photos,formatted_address,name,rating,opening_hours,geometry&key=${mapKey}`
      )
      .then(function(response) {
        if (response.data.candidates.length > 0) {
          const resultLatLng = response.data.candidates[0].geometry.location;
          //   console.log(resultLatLng);
          // if(!$resultLatLng)
          //     return new JsonModel(['status'=>-1,"message"=>"Location not found"]);
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

async function searchRestaurant(lat, lng) {
  const result = await new Promise((resolve, reject) => {
    axios
      .get(
        `${endPoint}nearbysearch/json?location=${lat},${lng}&radius=1500&type=restaurant&key=${mapKey}`
      )
      .then(function(response) {
        // handle success
        resolve(response.data);
        //   console.log(response.data.results);
      })
      .catch(function(error) {
        reject(error);
      });
  });
  return result;
}
async function replyMessage(query, userID) {
  const client = new line.Client({
    channelAccessToken:
      "p4iNhwyIUCEQcGqLDh+QW9WAdw/lj0landPWV/tkyBKNNwsGk33uWipPATAwBCL7PSsLgNnVd5SJcbzCyOuZg40QxyP2ZatwZcmXhWmrPwn/7OTPvlnbPlp4xeBWVD6WLjCsO/rtzxHyAv1cBfbECwdB04t89/1O/w1cDnyilFU="
  });
  let loc = await searchLocation(query);
  //   console.log(loc);
  let restaurants = await searchRestaurant(loc.lat, loc.lng);

  //   console.log(restaurants);
  const carousal = restaurants.results.slice(0, 5).map((value, index) => {
    console.log(
      encodeURI(
        `https://www.google.com/maps/search/?api=1&query=${
          value.geometry.location.lat
        },${value.geometry.location.lng}&query_place_id=${value.id}`
      )
    );
    return {
      thumbnailImageUrl:
        value.photos && value.photos[0]
          ? `https://maps.googleapis.com/maps/api/place/photo?key=${mapKey}&maxwidth=300&maxheight=200&photoreference=${
              value.photos[0].photo_reference
            }`
          : value.icon,
      imageBackgroundColor: "#FFFFFF",
      title: value.name,
      text: `Rating ${value.rating}`,
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
  //   return;

  const message = {
    type: "template",
    altText: "Search result for " + query,
    template: {
      type: "carousel",
      columns: carousal
    }
  };

  client
    .pushMessage(userID, message)
    .then(() => {})
    .catch(err => {
      // error handling
      console.log(err);
    });
}
app.get("/", function(req, res) {
  res.send(JSON.stringify({ Hello: "World" }));
});
app.get("/webhook", (req, res) => {
  console.log(req.body.destination);
  const event = req.body.events[0];
  replyMessage(events.message.text, event.replyToken);
  res.send("OK");
});

app.listen(port, () => console.log(`LINE Webhook listening on port ${port}!`));
