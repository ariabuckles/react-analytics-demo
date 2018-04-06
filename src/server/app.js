const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const morgan = require('morgan');
const asyncHandler = require('express-async-handler');
const useragent = require('useragent');

const app = express();
const db = new Pool();

app.use(bodyParser.text());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));

console.log('server started!');

const getFilters = (query, agentString) => {
  const agent = useragent.lookup(agentString);
  return {
    uuid: query.uuid || null,
    path: query.path || null,
    browser: query.browser || null,
    os: query.os || null,
  };
};

const buildWhereClause = (filters, count = 1) => {
  const clause = [
    filters.uuid && `token = $${count++}`,
    filters.path&& `path LIKE $${count++}`,
    filters.browser && `browser= $${count++}`,
    filters.os && `os = $${count++}`,
  ].filter(f => f != null).join(' AND ');

  const values = [
    filters.uuid,
    filters.path && (filters.path + '%'),
    filters.browser,
    filters.os
  ].filter(v => v != null);

  return {
    clause: clause ? ' WHERE ' + clause : '',
    values: values,
    count: count,
  }
};

const query = (cmd, values) => {
  console.log('SQL: ' + cmd, values);
  return db.query(cmd, values);
};

app.get('/api/log/visit/:uuid', asyncHandler(async (req, res) => {
  const uuid = req.params.uuid;
  const timestamp = req.query.timestamp || new Date().toISOString();
  const path = req.query.path;
  const agent = useragent.lookup(req.headers['user-agent']);
  const browser = agent.family;
  const os = agent.os.family;

  await query(
    "insert into events " +
    "(timestamp, token, path, eventname, browser, os)" +
    "values ($1, $2, $3, 'visit', $4, $5)",
    [timestamp, uuid, path, browser, os]
  );

  res.status(200);
  res.send();
}));

app.get('/api/values', asyncHandler(async (req, res) => {
  let browsers, oses;

  if (req.query.direct) {
    let bresults = await query('SELECT DISTINCT browser FROM EVENTS');
    browsers = bresults.rows.map(r => r.browser);
    let oresults = await query('SELECT DISTINCT os FROM events');
    oses = oresults.rows.map(r => r.os);

  } else {
    browsers = [];
    oses = [];
    const results = await query('SELECT segment, value FROM values');
    results.rows.forEach(pair => {
      if (pair.segment === 'browser') {
        browsers.push(pair.value);
      }
      if (pair.segment === 'os') {
        oses.push(pair.value);
      }
    });
  }

  res.json({
    browser: browsers,
    os: oses,
  });
}));

app.get('/api/events', asyncHandler(async (req, res) => {
  if (!req.query.start || !req.query.end) {
    res.status(400).json({ error: 'start & end query params are required' });
    return;
  }
  const start = new Date(req.query.start);
  const end = new Date(req.query.end);
  const filters = getFilters(req.query);
  const where = buildWhereClause(filters, 3);

  let events = await query(
    'SELECT token as uuid, path, browser, os, timestamp FROM events' + where.clause +
    (where.clause ? ' AND ' : ' WHERE ') +
    'timestamp BETWEEN $1 AND $2',
    [start, end].concat(where.values)
  );

  res.json(events.rows);
}));

app.get('/api/statistics/:timeunit', asyncHandler(async (req, res) => {
  const timeunit = req.params.timeunit;
  if (!req.query.start || !req.query.end) {
    res.status(400).json({ error: 'start & end query params are required' });
    return;
  }
  const start = new Date(req.query.start);
  const end = new Date(req.query.end);

  const filters = getFilters(req.query);
  let segmentation = req.query.segmentation || null;
  if ([null, 'browser', 'os', 'path'].indexOf(segmentation) < 0) {
    throw new Error("Invalid segmentation: " + segmentation);
  }

  if (req.query.direct ||
      filters.uuid ||
      filters.path ||
      segmentation === 'path' ||
      (timeunit !== 'minute' && timeunit !== 'hour')
  ) {

    // direct from events table
    const where = buildWhereClause(filters, 4);
    let results = await query(
      'SELECT date_trunc($1, timestamp) as timebucket, ' +
      (segmentation ? segmentation + ', ' : '') +
      ' count(*) as count, ' +
      ' count(DISTINCT token) as uniquecount ' +
      ' FROM events ' +
      where.clause +
      (where.clause ? ' AND ' : ' WHERE ') +
      ' timestamp BETWEEN $2 AND $3' +
      ' GROUP BY date_trunc($1, timestamp)' +
      (segmentation ? ', ' + segmentation : ''),
      [timeunit, start, end].concat(where.values)
    );

    res.json(results.rows);

  } else {
    // using stats table:

    const where = buildWhereClause(filters, 3);
    let results = await query(
      'SELECT bucket as timebucket, ' +
      (segmentation ? segmentation + ', ' : '') +
      'sum(count) as count, ' +
      'sum(uniquecount) as uniquecount ' +
      'FROM ' + timeunit + 's ' +
      where.clause +
      (where.clause ? ' AND ' : ' WHERE ') +
      ' bucket BETWEEN $1 AND $2' +
      ' GROUP BY bucket ' +
      (segmentation ? ', ' + segmentation : ''),
      [start, end].concat(where.values)
    );
    res.json(results.rows);
  }
}));

const MILLIS_IN_MINUTE = 1000 * 60;

app.get('/api/update-statistics', asyncHandler(async (req, res) => {
  const { updateBuckets, updateValues } = require('../update-stats');
  const end = new Date(req.query.end || Date.now());
  const start = new Date(req.query.start || end - 15 * MILLIS_IN_MINUTE);
  // TODO(aria): Fix things not being on exact minute bounds!
  await Promise.all([
    updateBuckets('minute', start, end),
    updateBuckets('hour', start, end),
    updateValues('browser', start, end),
    updateValues('os', start, end),
  ]);
  res.send(200);
}));


app.use(function(err, req, res, next) {
  console.error('Error', err);
  res.status(500).json({
    error: err.message
  });
});

const events = query('CREATE TABLE IF NOT EXISTS events(timestamp timestamptz, token uuid, path varchar(256), eventname varchar(64), browser varchar(64), os varchar(64))');
const minutes = query('CREATE TABLE IF NOT EXISTS minutes(bucket timestamptz, browser varchar(64), os varchar(64), count integer, uniquecount integer, PRIMARY KEY (bucket, browser, os))');
const hours = query('CREATE TABLE IF NOT EXISTS hours(bucket timestamptz, browser varchar(64), os varchar(64), count integer, uniquecount integer, PRIMARY KEY (bucket, browser, os))');
const values = query('CREATE TABLE IF NOT EXISTS values(segment varchar(64), value varchar(256), PRIMARY KEY (segment, value))');

if (process.env.NODE_ENV !== 'production') {
  const { updateBuckets, updateValues } = require('../update-stats');

  console.log('Development update-stats cron set up!');
  setInterval(() => {
    console.log('Updating stats:');
    const end = new Date();
    const start = new Date(end - 5 * MILLIS_IN_MINUTE);
    Promise.all([
      updateBuckets('minute', start, end),
      updateBuckets('hour', start, end),
      updateValues('browser', start, end),
      updateValues('os', start, end),
    ]).catch(e => {
      console.error('Error updating stats:', e);
    });
  }, MILLIS_IN_MINUTE);
}

Promise.all([events, minutes, hours]).then(() => {
  app.listen(3001, function() {
    console.log('Started listening on 3001');
  });
}).catch((err) => {
  console.error('ERROR creating tables');
  console.error(err);
  process.exit(1);
});

