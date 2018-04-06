const assert = require('assert').strict || require('assert');
const globalfetch = require('node-fetch');
const express = require('express');
const uuidv4 = require('uuid/v4');
const moment = require('moment');

const host = 'http://127.0.0.1:3001';
const pathname = '/test/server.test.js';
const pathQuery = 'path=' + encodeURIComponent(pathname);

const shallowStringify = (obj) => {
  // From https://stackoverflow.com/questions/16466220/limit-json-stringification-depth
  return JSON.stringify(obj, (k, v) => k ? String(v) : v);
};

const UserAgents = {
  WindowsPhone: 'Mozilla/5.0 (compatible; MSIE 9.0; Windows Phone OS 7.5; Trident/5.0; IEMobile/9.0)',
  iOSSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
};

const fetch = async (url, ...args) => {
  const res = await globalfetch(url, ...args);
  assert.ok(res.ok, 'fetch returned status ' + res.status + ': ' + url);
  return res;
};

describe('analytics server', () => {

  // Ensure the server is running
  before((done) => {
    globalfetch(host).then(res => {
      // If our server is already running, we're ready to test!
      done();

    }, e => {
      // server not running on 3001, so try starting it:
      console.log('server not running on 3001, starting...');

      // monkey-patch express so we can wait for the start
      const listen = express.application.listen;
      express.application.listen = function(port) {
        const args = Array.from(arguments);
        let callback = () => {};
        if (typeof args[args.length - 1] === 'function') {
          callback = args.pop();
        }
        args.push(function() {
          callback.apply(undefined, arguments);
          done();
        });
        listen.apply(this, args);
      };

      // and load our server
      require('../server/app.js');
    });
  });

  // Shut down the test runner when all tests & queued callbacks
  // (for printing error messages) finish, even if mocha was not
  // run with --exit
  after(() => setTimeout(() => process.exit(0), 1000));

  describe('server', () => {
    it('should listen on port 3001', async () => {
      try {
        await globalfetch(host);
      } catch (e) {
        assert.fail('Server does not seem to be running on port 3001:\n' + e.stack);
      }
    });
  });

  describe('GET /log/visit/:uuid', () => {
    it('should accept a get request with no timestamp', async () => {
      const uuid = uuidv4();
      try {
        const res = await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery);
        if (!res.ok) {
          assert.fail('/api/log/visit returned HTTP status ' + res.status);
        }
      } catch (e) {
        assert.fail('/api/log/visit was not successful:\n' + e.stack);
      }
    });

    it('should accept a post request with a timestamp', async () => {
      const uuid = uuidv4();
      try {
        const res = await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery + '&timestamp=' + new Date().toISOString());
        if (!res.ok) {
          assert.fail('/api/log/visit returned HTTP status ' + res.status);
        }
      } catch (e) {
        assert.fail('/api/log/visit was not successful:\n' + e.stack);
      }
    });
  });

  describe('GET /api/events', () => {
    it('should be able to return a logged visit', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      const now = new Date().toISOString()
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery + '&timestamp=' + now);
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      assert.ok(json.length > 0, 'did not return any events');
    });

    it('should return an event with the correct uuid', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      const now = new Date(Date.now()).toISOString()
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery + '&timestamp=' + now);
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      const event = json.find(e => e.uuid === uuid);
      if (event == null) {
        // This
        assert.fail(
          json,
          ["Array containing { uuid: '" + uuid + "' }"],
          'Did not find the expected uuid in the results'
        );
      }
    });

    it('should return an event with the correct path', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      const now = new Date(Date.now()).toISOString()
      await fetch(host + '/api/log/visit/' + uuid + '?timestamp=' + now + '&' + pathQuery);
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      const event = json.find(e => e.uuid === uuid);
      assert.ok(event != null, '/api/events did not return the posted visit');
      assert.equal(event.path, pathname);
    });

    it('should return an event with the correct browser and os', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      const now = new Date(Date.now()).toISOString()
      await fetch(host + '/api/log/visit/' + uuid + '?timestamp=' + now + '&' + pathQuery, {
        headers: { 'User-Agent': UserAgents.WindowsPhone },
      });
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      const event = json.find(e => e.uuid === uuid);
      assert.ok(event != null, '/api/events did not return the posted visit');
      assert.equal(event.browser, 'IE Mobile');
      assert.equal(event.os, 'Windows Phone');
    });

    it('should return a correct event when a timestamp is not specified', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery, {
        headers: { 'User-Agent': UserAgents.iOSSafari },
      });
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      const event = json.find(e => e.uuid === uuid);
      assert.ok(event != null, '/api/events did not return the posted visit');
      assert.equal(event.browser, 'Mobile Safari');
      assert.equal(event.os, 'iOS');
    });

    it('should return multiple events', async () => {
      const uuid = uuidv4();
      const start = new Date(Date.now() - 1).toISOString();
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery, {
        headers: { 'User-Agent': UserAgents.iOSSafari },
      });
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery, {
        headers: { 'User-Agent': UserAgents.iOSSafari },
      });
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery, {
        headers: { 'User-Agent': UserAgents.iOSSafari },
      });
      const end = new Date(Date.now() + 1).toISOString();

      const res = await fetch(host + `/api/events?start=${start}&end=${end}`);
      const json = await res.json();

      assert.ok(Array.isArray(json), '/api/events did not return an array, got: ' + shallowStringify(json));
      const events = json.filter(e => e.uuid === uuid);
      assert.equal(events.length, 3);
      for (event of events) {
        assert.equal(event.path, pathname);
        assert.equal(event.browser, 'Mobile Safari');
        assert.equal(event.os, 'iOS');
      }
    });

    it('should be able to return an event from a specified time period', async () => {
      const uuid = uuidv4();
      const start = moment().subtract(366 * 10 + Math.floor(Math.random() * 10000), 'day').startOf('day').toDate();
      const end = moment(start).endOf('day').toDate();
      const timestamp = moment(start).add(3, 'hours').add(30, 'minutes').toISOString();

      await fetch(host + `/api/log/visit/${uuid}?${pathQuery}&timestamp=${timestamp}`);

      const res = await fetch(host + `/api/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      const events = await res.json();
      assert.equal(events.length, 1, 'could not find event for timestamp. Check /api/log/visit and make sure it is handling its timestamp parameter: ' + events.length);
    });

    it('should return an event from a specified time period with all proper fields', async () => {
      const uuid = uuidv4();
      const start = moment().subtract(366 * 10 + Math.floor(Math.random() * 10000), 'day').startOf('day').toDate();
      const end = moment(start).endOf('day').toDate();
      const timestamp = moment(start).add(3, 'hours').add(30, 'minutes').toISOString();

      await fetch(host + `/api/log/visit/${uuid}?timestamp=${timestamp}&${pathQuery}`, {
        headers: { 'User-Agent': UserAgents.iOSSafari },
      });

      const res = await fetch(host + `/api/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      const events = await res.json();
      assert.ok(events.length >= 1, 'could not find event for timestamp. Check /api/log/visit and make sure it is handling its timestamp parameter');
      const event = events[0];
      assert.equal(event.uuid, uuid);
      assert.equal(event.timestamp, timestamp);
      assert.equal(event.path, pathname);
      assert.equal(event.browser, 'Mobile Safari');
      assert.equal(event.os, 'iOS');
    });

  });

  describe('GET /api/statistics/:timeunit', () => {

    let sample = {};

    before(async () => {
      // Setup some events on a random hour 10+ years ago for testing
      sample.uuid = uuidv4();
      sample.start = moment().subtract(366 * 10 * 24 + Math.floor(Math.random() * 10000), 'hour').startOf('hour').toDate();
      sample.end = moment(sample.start).endOf('hour').toDate();

      sample.events = [
        {
          timestamp: moment(sample.start).add(5, 'minutes').add(0, 'seconds'),
          useragent: UserAgents.iOSSafari,
        },
        {
          timestamp: moment(sample.start).add(7, 'minutes').add(12, 'seconds'),
          useragent: UserAgents.iOSSafari,
        },
        {
          timestamp: moment(sample.start).add(22, 'minutes').add(24, 'seconds'),
          useragent: UserAgents.WindowsPhone,
        },
      ];

      await Promise.all(sample.events.map(e => {
        return fetch(`${host}/api/log/visit/${sample.uuid}?${pathQuery}&timestamp=${e.timestamp.toISOString()}`, {
          headers: { 'User-Agent': e.useragent },
        });
      }));

      sample.query = `${host}/api/statistics/hour?direct=true&start=${sample.start.toISOString()}&end=${sample.end.toISOString()}`;
    });

    it('should return an array', async () => {
      const start = moment().startOf('day').toISOString();
      const end = moment().endOf('day').toISOString();

      const res = await fetch(host + `/api/statistics/hour?direct=true&start=${start}&end=${end}`);
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        assert.fail('endpoint returned non-json body');
      }

      assert.ok(
        Array.isArray(json),
        'Returned body should be an array, but was: ' + JSON.stringify(json)
      );
    });

    it('should return at least one datapoint', async () => {
      const uuid = uuidv4();

      const start = moment().startOf('hour').toISOString();
      // Make a new data point:
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery);
      const end = moment().endOf('hour').toISOString();

      const res = await fetch(host + `/api/statistics/hour?direct=true&start=${start}&end=${end}`);
      const json = await res.json();

      const bucket = json.find(bucket => bucket.timebucket === start)
      assert.ok(bucket != null, 'could not find the expected time bucket in the results');
      assert.ok(+bucket.count > 0);
      assert.ok(bucket.browser == null);
      assert.ok(bucket.os == null);
      assert.ok(bucket.path == null);
    });

    it('can retrieve the correct items in a given bucket', async () => {
      const res = await fetch(sample.query);
      const json = await res.json();

      assert.equal(
        json.reduce((count, e) => count + (+e.count), 0),
        3,
        'expected three events but got: ' + shallowStringify(json)
      );

    });

    it('can filter by path to find specific visits', async () => {
      const uuid = uuidv4();
      const path = pathname + '/' + uuidv4().slice(-4);

      const start = moment().startOf('hour').toISOString();
      // Make a new data point:
      await fetch(host + '/api/log/visit/' + uuid + '?path=' + encodeURIComponent(path));
      const end = moment().endOf('hour').toISOString();

      const res = await fetch(host + `/api/statistics/hour?direct=true&start=${start}&end=${end}&path=${encodeURIComponent(path)}`);
      const json = await res.json();

      assert.equal(json.length, 1, 'expected one result but got: ' + shallowStringify(json));
      const bucket = json[0];
      assert.ok(bucket != null, 'could not find the expected time bucket in the results');
      assert.equal(+bucket.count, 1);
      assert.equal(bucket.timebucket, start);
      assert.ok(bucket.browser == null);
      assert.ok(bucket.os == null);
      assert.ok(bucket.path == null || bucket.path == path);
    });
  });

  describe('GET /api/values', () => {
    it('should return a json object', async () => {
      const res = await fetch(host + '/api/values');
      assert.ok(res.ok, 'returned status code: ' + res.status);
      const json = await res.json();

      assert.ok(
        typeof json === 'object' && json != null,
        'returned result should be an object, but was:\n' +
        JSON.stringify(json, null, 2)
      );
    });

    it('should return the correct fields on the object', async () => {
      const res = await fetch(host + '/api/values');
      assert.ok(res.ok, 'returned status code: ' + res.status);
      const json = await res.json();

      assert.ok(
        typeof json === 'object' && json != null,
        'returned result should be an object, but was:\n' +
        JSON.stringify(json, null, 2)
      );

      assert.ok(
        Array.isArray(json.browser),
        'result.browser should be an array, but was:\n' +
        JSON.stringify(json.browser, null, 2)
      );
      assert.ok(
        Array.isArray(json.os),
        'result.os should be an array, but was:\n' +
        JSON.stringify(json.os, null, 2)
      );
    });

    it('should include the correct values', async () => {
      const uuid = uuidv4();
      await fetch(host + '/api/log/visit/' + uuid + '?' + pathQuery, {
        headers: { 'User-Agent': UserAgents.WindowsPhone },
      });

      const res = await fetch(host + '/api/values?direct=true');
      assert.ok(res.ok, 'returned status code: ' + res.status);
      const json = await res.json();

      assert.ok(
        typeof json === 'object' && json != null,
        'returned result should be an object, but was:\n' +
        JSON.stringify(json, null, 2)
      );

      assert.ok(
        Array.isArray(json.browser),
        'result.browser should be an array, but was:\n' +
        JSON.stringify(json.browser, null, 2)
      );
      assert.ok(
        Array.isArray(json.os),
        'result.os should be an array, but was:\n' +
        JSON.stringify(json.os, null, 2)
      );

      assert.ok(
        json.browser.includes('IE Mobile'),
        'result.browser should include IE Mobile, which is inserted in test cases, but did not:\n' +
        JSON.stringify(json.browser, null, 2)
      );
      assert.ok(
        json.os.includes('Windows Phone'),
        'result.os should include Windows Phone, which is inserted in test cases, but did not:\n' +
        JSON.stringify(json.os, null, 2)
      );
    });
  });
});
