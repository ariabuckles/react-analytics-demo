import * as React from 'react';
import { css, StyleSheet } from 'aphrodite';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const styles = StyleSheet.create({
  tabList: {
    marginTop: 0,
    marginBottom: 0,
  },
});

const tabValues = [null, 'browser', 'os', 'path'];
const tabNames = ['Visits', 'By Browser', 'By OS', 'By Path'];

export default class DisplayTabs extends React.Component {

  render() {
    const selectedIndex = tabValues.indexOf(this.props.segmentation);

    return <Tabs
      className={css(this.props.style)}
      selectedIndex={selectedIndex}
      onSelect={(i) => this.props.onChange(tabValues[i])}
    >
      <TabList className={css(styles.tabList)}>
        {tabNames.map((name, i) => <Tab key={i}>{name}</Tab>)}
      </TabList>
			{tabNames.map((name, i) => <TabPanel key={i} />)}
    </Tabs>;

  }
}


