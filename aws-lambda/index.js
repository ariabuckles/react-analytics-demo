const AWS = require('aws-sdk');
const { Pool } = require('pg');
const db = new Pool();

const sqs = new AWS.SQS({region: process.env.AWS_REGION});

exports.handler = async (event) => {

  console.log('starting lambda');

  let messages;
  let allMessages = [];
  let events = [];
  do {

    console.log('listening for messages');

    let data = await sqs.receiveMessage({
      QueueUrl: process.env.TASK_QUEUE_URL,
      MaxNumberOfMessages: 10
    }).promise();
    messages = data.Messages || [];

    console.log('retrieved messages', messages.length, data);

    const localEvents = messages.map(message => {
      try {
        return JSON.parse(message.Body);
      } catch (e) {
        console.error('Could not parse message:', message.Body, e);
        return null;
      }
    }).filter(e => e != null);

    allMessages.push.apply(allMessages, messages);
    events.push.apply(events, localEvents);

  } while (messages.length === 10);

  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let valueCount = 1;
  let valuesList = [];
  const valuesStr = events.map(event => {
    valuesList.push.apply(valuesList, [
      event.uniqueuserid,
      event.timestamp,
      event.path,
      event.browser,
      event.os,
    ]);
    return `('visit', $${valueCount++}, $${valueCount++}, $${valueCount++}, $${valueCount++}, $${valueCount++})`;
  }).join(', ');

  if (valuesList.length !== 0) {
    console.log('db query');

    console.log('INSERT INTO events token, timestamp, path, browser, os VALUES ' + valuesStr);
    console.log.apply(console, valuesList);

    const dbResult = await db.query(
      'INSERT INTO events (eventname, token, timestamp, path, browser, os) VALUES ' + valuesStr,
      valuesList
    );

    console.log('finished db query', dbResult);
  } else {
    console.log('no messages to send to db');
  }

  console.log('deleting messages');

  await Promise.all(allMessages.map(message => {
    return sqs.deleteMessage({
      ReceiptHandle: message.ReceiptHandle,
      QueueUrl: process.env.TASK_QUEUE_URL
    }).promise();
  }));

  console.log('deleted messages');

  return 'success';
};


