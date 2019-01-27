const aws = require('aws-sdk');
const awsXRay = require('aws-xray-sdk-core');

const docClient = new aws.DynamoDB.DocumentClient({
  region: process.env.REGION
});
const csv = require('csvtojson');
let awsConfig = {
  region: process.env.REGION,
  signatureVersion: 'v4'
};
let s3Config = {
  apiVersion: '2006-03-01',
  region: process.env.REGION
};

if (process.env.STAGE === 'local') {
  awsConfig = {
    ...awsConfig,
    endpoint: "http://localhost:8000"
  };

  s3Config = {
    ...s3Config,
    s3ForcePathStyle: true,
    endpoint: new aws.Endpoint('http://localhost:8080'),
  };
}
aws.config.update(awsConfig);
const s3 = new aws.S3(s3Config);

exports.handler = (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  const queryId = event.Records[0].Sns.Message;
  const key = `results/${queryId}.csv`;

  //grab the csv file from s3
  const s3params = { Key: key, Bucket: `${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}` };
  const s3Stream = s3.getObject(s3params).createReadStream();

  csv({ignoreEmpty: true})
    .fromStream(s3Stream, {headers : true})
    .subscribe((json, lineNumber) => {
      return new Promise((resolve,reject)=> {
        const params = {
          TableName : 'subcategories',
          Item: {
            subcategory: json.subcategory,
            category: json.category
          }
        };
        docClient.put(params, (err, savedCategory) => {
          if (err) {
            reject(console.error(JSON.stringify(err, null, '\t')));
          } else {
            resolve(console.log({json, success: true}));
          }
        });
      })
        // long operation for each json e.g. transform / write into database.
    }, (err) => context.fail({error: err}), () => context.succeed({success: true}));
};
