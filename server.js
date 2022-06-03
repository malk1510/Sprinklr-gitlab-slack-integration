const message = require("./message.js")
require("dotenv").config();
const express = require("express");
const { set } = require("express/lib/application");
const axios = require("axios").default;

const app = express();
const port = 3000;

app.use(express.json());

app.post("/", async (req, res) => {
  //st = JSON.stringify(req);
  //FileSystem.writeFile('./sample_file.JSON');
  let text_new = "";
  text_new = await message.slack_msg(req.body);
  if(text_new !== ""){
  axios
    .post(process.env.SLACK_WEBHOOK_URL, {
      "text": text_new,
      "channel" : "Random"
    })
    .then((slackResponse) => {
      console.log("Connection Established with Slack");
      res.status(204).send();
    })
    .catch((err) => console.error(`Error: ${err}`));}
});


app.use((error, req, res, next) => {
  res.status(500)
  res.send({error: error})
  console.error(error.stack)
  next(error)
})

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);

async function print_every_hour(){
  let text = await message.all_mrs_msg(36472059);
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));
  text = await message.all_discussions_msg(36472059);
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));
}

setInterval(print_every_hour, 3600000);