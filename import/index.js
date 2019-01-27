const aws = require('aws-sdk');
const awsXRay = require('aws-xray-sdk-core');
const dynamoDB = new aws.DynamoDB({
  apiVersion: '2012-08-10',
  signatureVersion: 'v4',
  maxRetries: 15,
  retryDelayOptions: {base: 300}
});

//14508
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
const docClient = new aws.DynamoDB.DocumentClient({
  region: process.env.REGION,
  service: dynamoDB
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

// The number of records to pass to aws.DynamoDB.DocumentClient.batchWrite
// See https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
const MAX_RECORDS_PER_BATCH = parseInt(process.env.MAX_RECORDS_PER_BATCH, 10);

// The number of batches to upload concurrently.
// https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/node-configuring-maxsockets.html
const MAX_CONCURRENT_BATCHES = parseInt(process.env.MAX_CONCURRENT_BATCHES, 10);

// A whitelist of the CSV columns to ingest.
const CSV_KEYS = [
  "product_id",
  "name",
  "category",
  "subcategory",
  "retail_price",
  "sale_price",
  "description",
  "manufacturer_part_number",
  "pixel",
  "product_url",
  "productimage_url",
  "sku_number",
  "upc",
  "shipping_info",
  "date_timestamp"
];

let retryCount = 0;

exports.handler = (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  const time = process.hrtime();
  const queryId = event.Records[0].Sns.Message;
  const key = `results/${queryId}.csv`;

  //grab the csv file from s3
  const s3params = { Key: key, Bucket: `${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}` };
  const s3Stream = s3.getObject(s3params).createReadStream();
  let linesRead = 0;
  let batchBuffer = [];
  let idx = 0;

  csv({
    ignoreEmpty: true
  }).fromStream(s3Stream, {headers : true})
    .on('data', (row) => {
      //read each row
      let jsonContent = JSON.parse(row);
      linesRead++;

      const batchIdx = Math.floor(idx / MAX_RECORDS_PER_BATCH);
      if (idx % MAX_RECORDS_PER_BATCH === 0 && batchIdx < MAX_CONCURRENT_BATCHES) {
        batchBuffer.push([])
      }

      batchBuffer[batchIdx].push(jsonContent);

      if (MAX_CONCURRENT_BATCHES === batchBuffer.length &&
        MAX_RECORDS_PER_BATCH === batchBuffer[MAX_CONCURRENT_BATCHES - 1].length) {
          const params = buildRequestParams(batchBuffer);
          setTimeout(() => addData(params), 900);
          batchBuffer = [];
          idx = 0
      } else {
        idx++
      }
    })
    .on('error',(err) => {
      console.log(err)
    })
    .on('done',() => {
      const diff = process.hrtime(time);
      console.log(`Benchmark took ${ (diff[0] * NS_PER_SEC + diff[1])  * MS_PER_NS } milliseconds`);
      console.log(`completed processing ${linesRead} rows`);
    });

};

// Build request payload for the batchWrite
function buildRequestParams(batch) {
  let params = {
    RequestItems: {}
  };
  params.RequestItems['bugatchi'] = batch.map(obj => {
    return obj.map(innerObj => {
      let item = {};
      CSV_KEYS.forEach((keyName) => {
        if (innerObj[keyName] && innerObj[keyName].length > 0) {
            item[keyName] = innerObj[keyName]
        }
      });
      return {
        PutRequest: {
          Item: item
        }
      }
    });
  })[0];
  return params;
}

function addData(params) {
  docClient.batchWrite(params, function(err, data) {
    if (err) {
      console.log("bad params:", JSON.stringify(params, null, 2));
      console.error("Unable to add batch. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      if (data.UnprocessedItems && Object.keys(data.UnprocessedItems).length !== 0) {
        console.log("Retry batchWriteItem: " + JSON.stringify(data, null, 2));
        retryCount++;
        let retry = {
          RequestItems: data.UnprocessedItems,
          ReturnConsumedCapacity: "INDEXES",
          ReturnItemCollectionMetrics: "SIZE"
        };
        // retry with exponential backoff
        let delay = retryCount > 0 ? (300 * Math.pow(2, retryCount - 1)) : 0;
        setTimeout(() => addData(retry), delay);
      }
      retryCount = 0;
      console.log("Data inserted:", JSON.stringify(data, null, 2));
    }
  });
}
