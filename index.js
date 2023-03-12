const crypto = require('crypto')
const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();
const path = require('path');
const port = 3000;
    
// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

app.use(express.raw({          // Need raw message body for signature verification
    type: 'application/json'
}))  

// app.use('/', (req,res,next) =>
// {
//     res.send('Hello from ssl server');
// })


app.post('/twitch/webhook', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    console.log(secret);

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);
        
        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            // TODO: Do something with the event's data.

            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));
            
            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})

app.get('/twitch/webhook', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    console.log(secret);

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        console.log("signatures match");

        // Get JSON object from body, so you can process the message.
        let notification = JSON.parse(req.body);
        
        if (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
            // TODO: Do something with the event's data.

            console.log(`Event type: ${notification.subscription.type}`);
            console.log(JSON.stringify(notification.event, null, 4));
            
            res.sendStatus(204);
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);

            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        }
        else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    }
    else {
        console.log('403');    // Signatures didn't match.
        res.sendStatus(403);
    }
})
  
// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`);
// })

const sslServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'))
},app);

sslServer.listen(443, () =>
{
    SuscribeEvents()
    console.log("server sssl listen on port 443" )

}
)


function getSecret() {
    // TODO: Get secret from secure storage. This is the secret you pass 
    // when you subscribed to the event.
    return 'this is my secret';
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] + 
        request.headers[TWITCH_MESSAGE_TIMESTAMP] + 
        request.body);
}

// Get the HMAC.
function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}

let clinetId = "icqkyq2xvk0e3ds60ogayi58phffmn";
let clinetSecret = "qd76rqdjgawtorc1l4uvj45v2pkq0i";
let id = "240540239";
let tokeNauth = "qpceb4on0dr3utlfmooo7cwmgje61a"
let idWater = '4c982dec-40fc-4756-84ee-ac26d2891f60'

async function getTwitchAuthorization() {
    let url = `https://id.twitch.tv/oauth2/token?client_id=${clinetId}&client_secret=${clinetSecret}&grant_type=client_credentials`;
    // let url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${clinetId}&redirect_uri=http://localhost:3000/redirect&scope=channel:read:redemptions`;
    
    return fetch(url, {
    method: "POST",
    })
    .then((res) => res.json())
    .then((data) =>{
       return data
    } )
}

async function SuscribeEvents(){
    const endpoint = `https://api.twitch.tv/helix/eventsub/subscriptions`;
    //  const endpoint = `https://api.twitch.tv/helix/users?login=javinix`;
    
    let authorizationObject = await getTwitchAuthorization();
    let { access_token, expires_in, token_type } = authorizationObject;

    //token_type first letter must be uppercase    
    token_type =
    token_type.substring(0, 1).toUpperCase() +
    token_type.substring(1, token_type.length);
    
    let authorization = `${token_type} ${access_token}`;
    let setTypes =
    {
        type: ""
    }
    let headers = {
        'Authorization':authorization,
        "Client-Id": clinetId,
        'Content-Type' : 'application/json',
        
        //""{"type":"channel.follow","version":"1","condition":{"broadcaster_user_id": id},"transport":{"method":"webhook","callback":"https://example.com/callback","secret":"s3cre77890ab"}""
        // 'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Headers': "*",
        // 'Content-Type': 'application/json',
        // 'mode': 'no-cors',
    };

    let body = 
    {
        type: "channel.channel_points_custom_reward_redemption.add",
        version: "1",
        condition: {
            broadcaster_user_id: id,
            reward_id: idWater // optional; gets notifications for a specific reward
        },
        transport: {
            method: "webhook",
            callback: "https://example.com/webhooks/callback",
            secret: clinetSecret
        }
    }
    // '{"type":"channel.channel_points_custom_reward_redemption.add",
    // "version":"1","condition":{"broadcaster_user_id":"1234"},"transport":{"method":"webhook","callback":"https://example.com/callback","secret":"s3cre77890ab"}}'
    
    return fetch(endpoint, {
        headers,
        method: "POST",
        body: JSON.stringify(body)
        })
        .then((res) => res.json())
        .then((data) => { console.log(data); return data.data});
}
