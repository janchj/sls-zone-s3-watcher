const { create, jsonMiddleware } = require('slspress');
const AWS = require('aws-sdk');

const app = create();

// instatiating the SES from AWS SDK
const ses = new AWS.SES();

// returns formatted email
const getEmail = (events) => {
    return {
      Destination: {
        ToAddresses: ['fake@fake.com']
      },
      Message: {
        Body: {
          Text: {
              Charset: 'UTF-8', 
              Data: JSON.stringify(events)
             }
        },
        Subject: {
          Charset: 'UTF-8', 
          Data: 'Something was created/removed on your S3 bucket'
        }
      },
      Source: 'fake@fake.com'
    };
}

const getEventTypeName = (type) => {
    if (type.indexOf('ObjectCreated') > -1)
        return 'created';
    else
        return 'removed';
}

const getEvent = (event) => {
    let evt = {
        type: 'unknown',
        typeName: 'unknown',
        item: 'unknown',
    };
    // if changes are detected
    if (event !== undefined){
        evt = {
            type: event.eventName || '',
            typeName: getEventTypeName(event.eventName) || '',
            item: event.s3.object.key || ''
        }
    }
    return evt;
}

// handle requests
app.on('handle')
    .middleware(jsonMiddleware)
    .use((req, res) => {

        // get details from source
        let events = [];
        if (req.event.Records !== undefined) {
            const eventSource = req.event.Records;
            events = eventSource.map((evt => getEvent(evt)));
        }

        // get email content
        const emailToSend = getEmail(events);
        // send email using SES
        ses.sendEmail(emailToSend, (err, data) => {
            if (err) {
                console.log(err, err.stack);
                res.ok('Something went wrong. Email not sent.');
            } else {
                res.ok('Email sent successfuly.');
            }
        });
    });

module.exports = app.export();