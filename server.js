const express = require('express');
const request = require('request');
const querystring = require('querystring');
const app = express();
const port = 3000;

// OAuth2 parameters
const CLIENT_ID = '';
const CLIENT_SECRET = '';
const AUTHORIZATION_URL = 'https://login-staging.katanamrp.com/authorize'; 
const TOKEN_URL = 'https://login-staging.katanamrp.com/oauth/token';

// Notice this test url param. This can be anything. This is an example of passing custom params to callback url.
const REDIRECT_URL = `http://localhost:${port}/callback?test=123&companyCode=CODE_HERE`;

// Saving these in variables to keep it simple
let currentRefreshToken = undefined;
let currentAccessToken = undefined;

// Initial page redirecting to Auth Server
app.get('/auth', (req, res) => {
  const authRequestUri = `${AUTHORIZATION_URL}?scope=offline_access&response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URL)}&audience=https://api-staging.katanamrp.com/v1`;
  res.redirect(authRequestUri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', (req, res) => {
  console.log(req.query)
  const code = req.query.code;
  const options = {
      url: TOKEN_URL,
      json: true,
      form: {
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URL,
          code: code
      }
  };

  request.post(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
          // Caching the current token and refresh token
          currentAccessToken = body.access_token;
          currentRefreshToken = body.refresh_token;
          console.log('Initial token', body);
          res.type('html').send(`
          <!DOCTYPE html>
            <html>
            <head>
              <title>Token refresh example</title>
            </head>
            <body>
              <button id="refreshButton">Refresh token</button>
              <h1>Initial token:</h1>
              <p>${JSON.stringify(body)}</p>
              <h1>Refreshed token:</h1>
              <div id="dataDisplay"></div>
            
              <script>
                document.addEventListener("DOMContentLoaded", function() {
                  var refreshButton = document.getElementById("refreshButton");
                  var dataDisplay = document.getElementById("dataDisplay");
            
                  refreshButton.addEventListener("click", function() {
                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", "/refresh", true);
            
                    xhr.onload = function() {
                      if (xhr.readyState === 4 && xhr.status === 200) {
                        var data = xhr.responseText;
                        // Assuming the JSON data has a property called 'message'
                        dataDisplay.textContent = data;
                      }
                    };
            
                    xhr.send();
                  });
                });
              </script>
            </body>
            </html>
            `);
      } else {
          res.send(`Failed to get access token, check console for details`);
          console.error(`Failed to get access token: ${error}, statusCode: ${response.statusCode}, body: `, body);
      }
  });
});

// Refresh service for refreshing the token
app.get('/refresh', (req, res) => {
  // Caching the current token and refresh token
  const options = {
      url: TOKEN_URL,
      json: true,
      form: {
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URL,
          refresh_token: currentRefreshToken,
      }
  };

  request.post(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
          currentAccessToken = body.access_token;
          currentRefreshToken = body.refresh_token;
          console.log('Refreshed token', body);
          res.type('json').send(body);
      } else {
          res.send(`Failed to refresh token, check console for details`);
          console.error(`Failed to refresh token: ${error}, statusCode: ${response.statusCode}, body: `, body);
      }
  });
});

app.listen(port, () => {
    console.log(`Start your auth journey here http://localhost:${port}/auth`)
});
