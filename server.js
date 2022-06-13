const message = require("./message.js")
require("dotenv").config();
const express = require("express");
const { set, all } = require("express/lib/application");
const axios = require("axios").default;

const app = express();
const port = 1800;

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

async function print_every_hour(time){
  let text = await message.all_mrs_msg(36881373, time);
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    //res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));
  text = await message.all_discussions_msg(36881373, time);
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    //res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));
  setTimeout(function() {print_every_hour(time)}, time);
}

async function print_every_day(){
  let text = await message.get_summary(36881373);
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    //res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));
  setTimeout(print_every_day, 24*60*60*1000);
}

async function notify(thresh_time){
  let text = await message.notify_mr(36881373, thresh_time);
  if(text !== ''){
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    //res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));}
  text = await message.notify_comment(36881373, thresh_time);
  if(text !== ''){
  axios
  .post(process.env.SLACK_WEBHOOK_URL, {
    "text": text,
    "channel" : "Random"
  })
  .then((slackResponse) => {
    console.log("Connection Established with Slack");
    //res.status(204).send();
  })
  .catch((err) => console.error(`Error: ${err}`));}
  setTimeout(function() {notify(thresh_time);}, 60000);
}

//print_every_hour();
print_every_hour(1000*3600);
print_every_day();
notify(1000*3600);