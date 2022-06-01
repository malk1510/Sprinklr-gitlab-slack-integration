const message = require("./message.js")
require("dotenv").config();
const express = require("express");
const axios = require("axios").default;

const app = express();
const port = 3000;

app.use(express.json());

app.post("/", async (req, res) => {
  //st = JSON.stringify(req);
  //FileSystem.writeFile('./sample_file.JSON');
  text = await message.slack_msg(req.body);
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
