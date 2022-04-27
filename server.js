const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from the main application');
});

const reportingApp = express();
app.use('/reporting', reportingApp);

const server = app.listen(3000);

const jsreport = require('jsreport')({
  extensions: {
      express: { app: reportingApp, server: server },
      authentication: {
        cookieSession: {
            secret: "secret"
        },
        admin: {
            username: "admin",
            password: "password"
        }    
      }
  },
  appPath: "/reporting"
});

jsreport.init().then(() => {
  console.log('jsreport server started')
}).catch((e) => {
  console.error(e);
});