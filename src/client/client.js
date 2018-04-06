import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite';
import qs from 'qs';
import moment from 'moment';

import TimeSeries from './timeseries';
import FiltersBar from './filters-bar';
import DisplayTabs from './display-tabs';

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
  },

  left: {
    width: 260,
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 200,
    marginLeft: 20,
  },

  filtersHeader: {
    paddingLeft: 20,
  },

  filtersBar: {
    alignSelf: 'stretch',
  },

  right: {
    minWidth: 400,
    flex: 1,
    display: 'flex',
    paddingRight: 20,
  },

  tabContainer: {
    position: 'relative',
    zIndex: 1,
    alignSelf: 'flex-end',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },

  header: {
    fontSize: '1.25em',
    marginTop: 0,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },

  tabsHeader: {
    marginLeft: 40,
    display: 'inline-block'
  },

  tabs: {
    minWidth: 400,
  },

  chartWrapper: {
    position: 'relative',
    zIndex: 0,
    height: 400,
    borderLeftWidth: 0,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderStyle: 'solid',
    borderColor: '#aaa',
  },

  innerWrapper: {
    flex: 1,
  },

  horizontalArea: {
    width: '100%',
    display: 'flex',
  },
});


const stringifyState = (state) => {
  let query = {};
  if (state.filters.dates && state.filters.dates[0]) {
    query.start = state.filters.dates[0].toISOString().match(/^\d+-\d+-\d+/)[0];
  }
  if (state.filters.dates && state.filters.dates[1]) {
    query.end = state.filters.dates[1].toISOString().match(/^\d+-\d+-\d+/)[0];
  }
  Object.keys(state.filters).filter(k => k !== 'dates').forEach(key => {
    if (state.filters[key] != null) {
      query[key] = state.filters[key];
    }
  });
  if (state.segmentation) {
    query.segmentation = state.segmentation;
  }
  if (state.unique) {
    query.unique = true;
  }
  return '#' + qs.stringify(query);
};

const destringifyState = (hash) => {
  const query = qs.parse(hash.slice(1));
  const dates = (query.start || query.end) ? [
    query.start ? new Date(query.start) : null,
    query.end ? moment(query.end).endOf('day').toDate() : null
  ] : null;

  return {
    unique: !!(query.unique && query.unique !== 'false'),
    filters: {
      dates: dates,
      uuid: query.uuid || null,
      path: query.path || null,
      browser: query.browser || null,
      os: query.os || null,
    },
    segmentation: query.segmentation || null,
  };
};


class App extends Component {

  constructor() {
    super();
    this.state = destringifyState(window.location.hash);
  }

  _updateState = (newState) => {
    const state = Object.assign({}, this.state, newState);
    window.location.hash = stringifyState(state);
    this.setState(state);
  };

  _updateFilters = (newFilters) => {
    this._updateState({ filters: newFilters });
  };

  _updateSegmentation = (newSegmentation) => {
    this._updateState({ segmentation: newSegmentation});
  };

  render() {
    return (
      <div className="App">
        <h1 className={css(styles.title)}>Site Analytics</h1>
        <div className={css(styles.horizontalArea)}>
          <h2 className={css(styles.left, styles.header, styles.filtersHeader)}>
            Filters:
          </h2>
          <div className={css(styles.right, styles.tabContainer)}>
            <h2 className={css(styles.header, styles.tabsHeader)}>
              Segmentation:
            </h2>
            <DisplayTabs
              style={styles.tabs}
              segmentation={this.state.segmentation}
              onChange={this._updateSegmentation}
            />
          </div>
        </div>
        <div className={css(styles.horizontalArea)}>
          <FiltersBar style={[styles.filtersBar, styles.left]}
            unique={this.state.unique}
            filters={this.state.filters}
            onChange={this._updateFilters}
            onUniquenessChange={isUnique => this._updateState({ unique: isUnique })}
          />
          <div className={css(styles.right)}>
            <TimeSeries
              style={styles.chartWrapper}
              uniqueVisitors={this.state.unique}
              filters={this.state.filters}
              segmentation={this.state.segmentation}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
