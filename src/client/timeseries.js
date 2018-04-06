import * as React from 'react';
import { StyleSheet } from 'aphrodite';
import { Line as LineChart } from 'react-chartjs-2';

import DataLoader from './data-loader';
import * as Filters from './filters';
import moment from 'moment';

const styles = StyleSheet.create({
  chartWrapper: {
    width: '100%',
    height: 400,
    overflow: 'hidden',
  },
});

const colors = [
  'hsl(180, 70%, 50%)', // azure
  'hsl(340, 100%, 70%)', // pink
  'hsl(140, 70%, 50%)', // green
  'hsl(10, 100%, 70%)', // orangered
  'hsl(160, 70%, 50%)', // aqua
  'hsl(290, 70%, 50%)', // purple
  'hsl(90, 90%, 40%)', // lime
  'hsl(220, 60%, 60%)', // blue
  'hsl(60, 90%, 50%)', // yellow
];

const amOrPm = date => {
  return date.getHours() < 12 ? 'am' : 'pm'
};
const getShortHour = date => {
  return date.getHours() % 12;
};

const calculateLabels = (dates, unit) => {
  return dates.map(d => {
    if (d === null) {
      return undefined;
    }
    if (unit === 'day') {
      return d.toDateString();
    }
    if (unit === 'hour') {
      return getShortHour(d) + ':00' + amOrPm(d);
    }
    if (unit === 'minute') {
      return getShortHour(d) + ':' + ('0' + d.getMinutes()).slice(-2) + amOrPm(d);
    }
    return d.toString();
  });
};

const testsPath = /^\/test\/server\.test\.js./;

const processData = (data, segmentation, unit, dateFilters, countField) => {
  let times = {};
  let segmentations = [];
  data.forEach(d => {
    if (d.timebucket == null) {
      throw new Error(
        "/api/statistics returned a time bucket without a 'timebucket' " +
        "field:\n" + JSON.stringify(d, null, 2)
      );
    }
    const time = moment(d.timebucket).startOf(unit).toISOString();
    times[time] = times[time] || [];
    times[time].push(d);

    const segmentationVal = segmentation ? d[segmentation] : 'All Visits';

    if (segmentation === 'path' && testsPath.test(segmentationVal)) {
      return;
    }
    // Save the total count for sorting
    segmentations[segmentationVal] = segmentations[segmentationVal] || 0;
    segmentations[segmentationVal] += (+d[countField] || 0);
  });

  const specifiedTimeLabels = Object.keys(times)
    .map(t => new Date(t))
    .sort((a, b) => a - b);

  const startTime = moment(dateFilters[0]).startOf(unit).toDate();
  const endTime = moment(dateFilters[1]).endOf(unit).toDate();
  let timeLabels = [
    (specifiedTimeLabels[0] && specifiedTimeLabels[0] < startTime) ?
      specifiedTimeLabels[0] : startTime
  ];

  for (let i = 0; (i < specifiedTimeLabels.length || timeLabels[timeLabels.length - 1] < endTime); i++) {
    const nextSpecified = specifiedTimeLabels[i] || endTime;

    let time = moment(timeLabels[timeLabels.length - 1]);
    time.add(1, unit + 's');
    while (time.isBefore(nextSpecified)) {
      timeLabels.push(time.toDate());
      time.add(1, unit + 's');
    }

    if (nextSpecified >= endTime) {
      break;
    }

    if (timeLabels[timeLabels.length - 1] < nextSpecified) {
      timeLabels.push(nextSpecified);
    }
  }

  let setLabels = Object.keys(segmentations).sort((a, b) => {
    // sort in reverse order
    return segmentations[b] - segmentations[a];
  });

  let datasets = setLabels.map(segmentationVal => {
    return timeLabels.map(time => {
      return (times[time.toISOString()] || [])
        .filter(d => !segmentation || d[segmentation] === segmentationVal)
        .map(d => +d[countField])
        .reduce((a, b) => a + b, 0);
    });
  });

  const otherIndex = setLabels.indexOf('Other'); // useragent parses other.
  let otherData = timeLabels.map(x => 0);
  if (otherIndex >= 0) {
    setLabels.splice(otherIndex, 1);
    otherData = datasets.splice(otherIndex, 1)[0];
  }
  for (let i = 9; i < datasets.length; i++) {
    const dataset = datasets[i];
    dataset.forEach((count, j) => otherData[j] += count);
  }
  setLabels.splice(9, setLabels.length);
  datasets.splice(9, datasets.length);
  if (otherData.reduce((a, b) => a + b) > 0) {
    setLabels.push('Other');
    datasets.push(otherData);
  }

  return {
    timeLabels: calculateLabels(timeLabels, unit),
    setLabels: setLabels,
    datasets: datasets,
  };
};

const MILLIS_IN_MINUTE = 1000 * 60;
const MILLIS_IN_HOUR = MILLIS_IN_MINUTE * 60;
const MILLIS_IN_DAY = MILLIS_IN_HOUR * 24;

export default class TimeSeries extends React.Component {

  constructor(props) {
    super();
    this.state = TimeSeries.getDerivedStateFromProps(props);
  }

  static getDerivedStateFromProps(props, prevState) {

    const dates = Filters.defaultDates(props.filters.dates);
    const millis = dates[1] - dates[0];
    let unit;
    if (millis > 2 * MILLIS_IN_DAY) {
      unit = 'day';
    } else if (millis > 2 * MILLIS_IN_HOUR) {
      unit = 'hour';
    } else {
      unit = 'minute';
    }

    return {
      segmentation: props.segmentation,
      unit: unit,
      filters: Object.assign({}, props.filters, { dates: dates }),
    };
  }

  render() {

    const isDirect = window.location.search &&
      window.location.search.includes('direct=true');

    // We are going to make all queries in hours, then aggregate after for
    // days, to avoid timezone issues
    const urlUnit = this.state.unit === 'day' ? 'hour' : this.state.unit;

    const url = "/api/statistics/" +
      urlUnit + '?' +
      (this.props.segmentation ? `segmentation=${this.props.segmentation}&` : '') +
      Filters.encodeFiltersAsURI(this.props.filters) +
      (isDirect ? '&direct=true' : '');

    return (
      <DataLoader
        style={[styles.chartWrapper, this.props.style]}
        url={url}
        state={this.state}
      >
        {(data, state) => {
          const { timeLabels, setLabels, datasets } = processData(
            data,
            state.segmentation,
            state.unit,
            state.filters.dates,
            this.props.uniqueVisitors ? 'uniquecount' : 'count'
          );

          // reverse for reversed labels
          setLabels.reverse();
          datasets.reverse();

          return <LineChart
            data={{
              labels: timeLabels,
              datasets: setLabels.map((label, i) => ({
                data: datasets[i],
                label: label,
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderColor: colors[datasets.length - 1 - i],
                borderJoinStyle: 'miter',
                borderCapStyle: 'butt',
                lineTension: 0.1,
              })),
            }}
            options={{
              elements: {
                point: {
                  borderWidth: 8,
                  radius: 2,
                  hoverRadius: 4,
                  hitRadius: 15,
                },
                line: {
                  borderWidth: 3,
                },
              },
              borderJoinStyle: 'miter',
              maintainAspectRatio: false,
              legend: {
                reverse: true,
                labels: {
                  usePointStyle: true,
                },
              },
              scales: {
                xAxes: [{
                  display: true,
                  scaleLabel: {
                    display: false,
                    labelString: 'Month'
                  }
                }],
                yAxes: [{
                  display: true,
                  scaleLabel: {
                    display: false,
                    labelString: 'Visits'
                  }
                }]
              }
            }}
          />;
        }}
      </DataLoader>
    );
  }
}
