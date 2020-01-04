/* eslint-disable promise/no-nesting */
const functions = require("firebase-functions");
const axios = require("axios");
var { google } = require("googleapis");
var MSG_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
var SCOPES = [MSG_SCOPE];

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//

function gettoken() {
  return new Promise((resolve, reject) => {
    var key = require("./account.json");
    var jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      SCOPES,
      null
    );

    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

exports.taskDue = functions.pubsub.schedule("*/5 * * * *").onRun(() => {
  gettoken()
    .then(token => {
      const headers = {
        Authorization: "Bearer " + token
      };

      axios
        .get("https://backendthesis.herokuapp.com/data")
        .then(data => {
          const tasks = data.data;
          if (tasks) {
            for (let i = 0; i < tasks.length; i++) {
              let task = tasks[i]["task"];
              let date = tasks[i]["date"];
              let done = tasks[i]["active"];

              const today = new Date(new Date().toISOString());
              today.setHours(today.getHours() - 5);
              const taskDate = new Date(new Date(date).toISOString());
              const diffMs = taskDate - today;
              const diffMins = Math.round(
                ((diffMs % 86400000) % 3600000) / 60000
              );

              if (today > new Date(new Date(date).toISOString()) && !done) {
                const dataAfter = {
                  message: {
                    topic: "push",
                    notification: {
                      title: "Task Due Date Passed",
                      body: `The task ${task} is past it's due date`
                    }
                  }
                };
                axios.post(
                  "https://fcm.googleapis.com/v1/projects/flutterspaghetti-cd14f/messages:send",
                  dataAfter,
                  {
                    headers: headers
                  }
                );
              } else if (diffMins <= 15 && !done) {
                const dataMinutes = {
                  message: {
                    topic: "push",
                    notification: {
                      title: "Task coming soon, hurry!",
                      body: `The task ${task} expires in ${Math.round(
                        diffMins
                      )} minutes`
                    }
                  }
                };
                axios.post(
                  "https://fcm.googleapis.com/v1/projects/flutterspaghetti-cd14f/messages:send",
                  dataMinutes,
                  {
                    headers: headers
                  }
                );
              }
            }
          }
          return;
        })
        .catch(e => e);
      return;
    })
    .catch(e => e);
});
