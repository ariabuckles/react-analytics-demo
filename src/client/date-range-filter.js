import "react-dates/initialize";
import * as React from 'react';
import moment from 'moment';
import { DateRangePicker } from 'react-dates';
import 'react-dates/lib/css/_datepicker.css';
import './react-dates-customizations.css';

export default class DateRangeFilter extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      focusedInput: null,
    }
  }

  render() {
    const start = this.props.dates && this.props.dates[0] && moment(this.props.dates[0]).startOf('day');
    const end = this.props.dates && this.props.dates[1] && moment(this.props.dates[1]).startOf('day');

    return <DateRangePicker
      startDate={start}
      startDateId="filter-start-date"
      endDate={end}
      endDateId="filter-end-date"
      onDatesChange={this._onChange}
      focusedInput={this.state.focusedInput}
      onFocusChange={this._onFocusChange}
      isOutsideRange={this._isOutsideRange}
      keepOpenOnDateSelect={false}
      small={true}
      minimumNights={0}
      showClearDates={true}
    />;
  }

  _onChange = ({ startDate, endDate }) => {
    const start = startDate && startDate.startOf('day').toDate();
    const end = endDate && endDate.endOf('day').toDate();
    if (start == null && end == null) {
      this.props.onChange(null);
    } else {
      this.props.onChange([start, end]);
    }
  };

  _onFocusChange = focusedInput => this.setState({ focusedInput: focusedInput });

  _isOutsideRange = (time) => {
    return time.isAfter(Date.now());
  };
}

