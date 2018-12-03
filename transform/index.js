console.log('Loading function');
const aws = require('aws-sdk');
const awsXRay = require('aws-xray-sdk');
const awsSdk = awsXRay.captureAWS(aws);

const athena = new aws.Athena({
  apiVersion: '2017-05-18',
  endpoint: new aws.Endpoint('https://athena.us-east-1.amazonaws.com'),
});

exports.handler = function(event, context, callback) {
    context.callbackWaitsForEmptyEventLoop = false;
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('remaining time =', context.getRemainingTimeInMillis());
  const params = {};
  athena.listNamedQueries(params, (err, data) => {
    if (err) {
      callback({ err, status: 'error' });
    } else {
      return callback(null, { data: data, status: 'success', msg: 'Named Queries Received' });
    }
  });
};
