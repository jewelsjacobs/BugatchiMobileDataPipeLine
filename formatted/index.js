console.log('Loading function');
let aws = require('aws-sdk');
let athena = new aws.Athena({
  apiVersion: '2017-05-18',
  endpoint: new aws.Endpoint('https://athena.us-east-1.amazonaws.com'),
});
let data;
let selectQuery = `SELECT * FROM bugatchi;`;

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  console.log('remaining time =', context.getRemainingTimeInMillis());
  let params = {
    QueryString: selectQuery,
    ResultConfiguration: {
      OutputLocation: `s3://${process.env.ATHENA_S3_BUCKET}-${process.env.STAGE}/results`
    },
    QueryExecutionContext: {
      Database: 'products'
    }
  };
  try {
    data = await athena.startQueryExecution(params).promise();
  } catch (err) {
    console.log(err);
    return err;
  }

  return data;
};
