const { Pool } = require('pg');
const db = new Pool();

const query = (cmd, values) => {
  console.log('SQL: ' + cmd, values);
  return db.query(cmd, values);
};

const updateBuckets = exports.updateBuckets = async (interval, start, end) => {
  if (interval !== 'minute' && interval !== 'hour') {
    throw new Error('Interval not supported: ' + interval);
  }

  start.setUTCMilliseconds(0);
  start.setUTCSeconds(0);
  end.setUTCMilliseconds(0);
  end.setUTCSeconds(0);

  if (interval === 'hour') {
    start.setUTCHours(0);
    end.setUTCHours(0);
  }

  const select = 'SELECT ' +
    'date_trunc($1, timestamp) as bucket, ' +
    'count(*) as count, ' +
    'count(DISTINCT token) as uniquecount, ' +
    'browser, ' +
    'os ' +
    'FROM events ' +
    'WHERE timestamp BETWEEN $2 AND $3 ' +
    'AND browser IS NOT NULL AND os IS NOT NULL ' +
    'GROUP BY bucket, browser, os';
  const params = [interval, start.toISOString(), end.toISOString()];

  await query('INSERT INTO ' + interval + 's ' +
    '(bucket, count, uniquecount, browser, os) ' +
    '(' +
    select +
    ')' +
    ' ON CONFLICT ON CONSTRAINT ' + interval + 's_pkey DO UPDATE SET ' +
    'count = excluded.count, uniquecount = excluded.uniquecount',
    params
  );
};

const updateValues = exports.updateValues = async (segment, start, end) => {
  if (segment !== 'os' && segment !== 'browser') {
    throw new Error('segment must be one of: browser, os');
  }

  const select = 'SELECT DISTINCT $1 as segment, ' + segment + ' as value ' +
    ' FROM events ' +
    'WHERE timestamp BETWEEN $2 AND $3 ' +
    'AND ' + segment + ' IS NOT NULL';
  const params = [segment, start.toISOString(), end.toISOString()];

  await query('INSERT INTO values ' +
    '(segment, value) ' +
    '(' +
    select +
    ')' +
    ' ON CONFLICT DO NOTHING',
    params
  );
};

const MILLIS_IN_MINUTE = 1000 * 60;
const MILLIS_IN_HOUR = MILLIS_IN_MINUTE * 60;

// AWS lambda endpoint
exports.handler = async (event) => {
  let interval = 'minute';
  let end = new Date();
  let start = new Date(end - 15 * MILLIS_IN_MINUTE);

  if (event.resources && event.resources.length &&
    /every-hour$/.test(event.resources[0])
  ) {
    interval = 'hour';
    start = new Date(end - 2 * MILLIS_IN_HOUR);
  }

  await Promise.all([
    updateBuckets(interval, start, end),
    updateValues('browser', start, end),
    updateValues('os', start, end),
  ]);
};

