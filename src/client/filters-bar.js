import * as React from 'react';
import { css, StyleSheet } from 'aphrodite';
import Select from 'react-select';
import 'react-select/dist/react-select.css';

import DataLoader from './data-loader';
import DateRangeFilter from './date-range-filter';
import ButtonGroup from './button-group';

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    padding: 20,
    boxSizing: 'border-box',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderTopColor: '#aaa',
    borderLeftColor: '#aaa',
    borderBottomColor: '#aaa',
    borderRightColor: '#ccc',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderStyle: 'solid',
  },
  innerWrapper: {
    flex: 1,
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    textAlign: 'start',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 10,
  },
  select: {
    marginTop: 5,
  },
  input: {
    marginTop: 5,
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #ccc',
    borderRadius: 4,
    color: '#333',
    height: 36,
    fontSize: 'inherit',
    borderSpacing: 0,
    borderCollapse: 'separate',
    paddingLeft: 10,
    paddingRight: 10,
    '::placeholder': {
      color: '#aaa',
    }
  },

  dateSelectWrapper: {
    position: 'relative',
  },

  clearDatesButton: {
    position: 'absolute',
    top: 0,
    right: 0,
  },

  buttonGroup: {
    alignSelf: 'stretch',
    display: 'flex',
    flexDirection: 'row',
    height: 36,
  },

  groupButtons: {
    flexGrow: 1,
    flexBasis: 'auto',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default class FiltersBar extends React.Component {

  _onChange = (filter) => {
    this.props.onChange(Object.assign({
      dates: null,
      uuid: null,
      path: null,
      browser: null,
      os: null,
    }, this.props.filters, filter));
  }

  _onChangePath = (e) => {
    let newPath = e.target.value || null;
    if (newPath && newPath[0] !== '/') {
      newPath = '/' + newPath;
    }
    this._onChange({ path: newPath });
  };

  _onChangeDates = (dates) => {
    this._onChange({ dates: dates });
  };

  render() {
    return <DataLoader
      style={[styles.container, this.props.style]}
      url="/api/values"
      passThroughErrors={true}
    >
      {(data) => {

        // caching because otherwise react-select resets
        let osOptions = data.os || ['⚠️  /api/values did not load'];
        osOptions = osOptions.filter(name => name != null);
        osOptions = osOptions.map(name => ({ value: name, label: name }));

        let browserOptions = data.browser || ['⚠️  /api/values did not load'];
        browserOptions = browserOptions.filter(name => name != null);
        browserOptions = browserOptions.map(name => ({ value: name, label: name }));

        return <div className={css(styles.innerWrapper)}>
          <div className={css(styles.label)}>
            <ButtonGroup
              style={styles.buttonGroup}
              buttonStyle={styles.groupButtons}
              allowEmpty={false}
              value={this.props.unique}
              buttons={[
                { content: 'All Visits', value: false },
                { content: 'Unique Visitors', value: true },
              ]}
              onChange={this.props.onUniquenessChange}
            />
          </div>
          <div className={css(styles.dateSelectWrapper)}>
            <label className={css(styles.label)}>
              Date range:
              <DateRangeFilter
                dates={this.props.filters.dates}
                onChange={this._onChangeDates}
              />
            </label>
            {/*<button
              type="button"
              onClick={() => this._onChangeDates(null)}
              className={css(styles.clearDatesButton)}
            >
              Clear / Live View
            </button>*/}
          </div>
          <label className={css(styles.label)}>
            <div>
              Web Browser:
            </div>
            <Select
              className={css(styles.select)}
              value={this.props.filters.browser}
              options={browserOptions}
              onChange={option => this._onChange({ browser: option && option.value })}
            />
          </label>
          <label className={css(styles.label)}>
            <div>
              Operating System:
            </div>
            <Select
              className={css(styles.select)}
              value={this.props.filters.os}
              options={osOptions}
              onChange={option => this._onChange({ os: option && option.value })}
            />
          </label>
          <label className={css(styles.label)}>
            Path (prefix):
            <input
              className={css(styles.input)}
              value={this.props.filters.path || ''}
              placeholder="/path"
              onChange={this._onChangePath}
            />
          </label>
        </div>;
      }}
    </DataLoader>;
  }
}

