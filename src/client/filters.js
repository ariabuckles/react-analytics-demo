const moment = require('moment');

export const defaultDates = (filterDates) => {
  let dates = filterDates;
  if (dates == null) {
    const now = moment().endOf('minute');
    dates = [moment(now).subtract(1, 'hour').startOf('minute').toDate(), now.toDate()];
  }
  if (dates[1] == null) {
    dates[1] = moment().endOf('hour').toDate();
  }
  if (dates[0] == null) {
    dates[0] = moment(dates[1]).startOf('hour').toDate();
  }
  return dates;
};

export const encodeFiltersAsURI = (filters) => {
  const dates = defaultDates(filters.dates);

  const filtersURI = [
    `start=${dates[0].toISOString()}`,
    `end=${dates[1].toISOString()}`,
    filters.uuid && `uuid=${encodeURIComponent(filters.uuid)}`,
    filters.path && `path=${encodeURIComponent(filters.path)}`,
    filters.browser && `browser=${encodeURIComponent(filters.browser)}`,
    filters.os && `os=${encodeURIComponent(filters.os)}`,
  ].filter(v => v != null).join('&');

  return filtersURI;
};
