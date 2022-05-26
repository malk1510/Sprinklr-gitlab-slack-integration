require("dotenv").config();
const express = require("express");
const axios = require("axios").default;

const app = express();
const port = 3000;

app.use(express.json());

app.get("/", (req, res) => res.send(`
  <html>
    <head><title></title></head>
    <body>
    </body>
  </html>
`));

app.post("/", (req, res) => {
  //st = JSON.stringify(req);
  //FileSystem.writeFile('./sample_file.JSON');
  const content = req.body.object_kind;
  axios
    .post(process.env.SLACK_WEBHOOK_URL, {
      "text": `Type of object is ${content}`,
      "channel" : "Random"
    })
    .then((slackResponse) => {
      console.log("Success!");
      res.status(204).send();
    })
    .catch((err) => console.error(`${err}`));
});

app.use((error, req, res, next) => {
  res.status(500)
  res.send({error: error})
  console.error(error.stack)
  next(error)
})

app.listen(port, () =>
  console.log(`Demo app listening at http://localhost:${port}`)
);
