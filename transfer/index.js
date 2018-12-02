console.log('Loading function');
const fs = require('fs');
const aws = require('aws-sdk');
const jsftp = require("jsftp");
const s3 = new aws.S3({ apiVersion: '2006-03-01' });
const process = require("process");

exports.handler = function(event, context, callback) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log('remaining time =', context.getRemainingTimeInMillis());
    // FTP Info
    const remote = `${process.env.FTP_REMOTE_PATH}${process.env.FILENAME}`;
    const fileName = process.env.FILENAME;
    const FTP_CONFIG = {
      host: process.env.FTP_HOST,
      port: process.env.FTP_PORT, // defaults to 21
      user: process.env.FTP_USER,
      pass: process.env.FTP_PASSWORD
    };

    const ftp = new jsftp(FTP_CONFIG);
    /**
     * Download from FTP to stream
     */
    ftp.get(remote, (error, socket) => {
        let chunks = [];
        if (error) {
          callback(JSON.stringify(error));
          }

          socket.on("data", (data) => {
            // you will get chunks here will pull all chunk to an array and later concat it.
            console.log(chunks.length);
            chunks.push(data)
          });

          socket.on("close", (had_error) => {
            if (had_error) {
              callback(JSON.stringify({ hadError: had_error, status: 'error' }));
            }
            const params = {
              Bucket: process.env.S3_BUCKET, // pass your bucket name
              Key: fileName, // file will be saved as testBucket/contacts.csv
              Body: Buffer.concat(chunks), // concatinating all chunks
              ACL: 'public-read',
              ContentEncoding: 'gzip',
              ContentType: 'application/gzip' // required
            }
            // we are sending buffer data to s3.
            s3.upload(params, (s3Err, s3res) => {
              if (s3Err) {
                callback(JSON.stringify({ s3Err, status: 'error' }));
              }
              callback(null, JSON.stringify({ data: s3res, status: 'success', msg: 'File successfully uploaded.' }));
            });

          });

          socket.resume();
        });

    };
