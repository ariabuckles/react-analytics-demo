import * as React from 'react';
import { css, StyleSheet } from 'aphrodite';
import LoadingIndicator from './loading-indicator';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(192, 192, 192, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    animationName: {
      from: {
        opacity: 0,
      },
      to: {
        opacity: 1,
      },
    },
    animationDuration: '0.25s',
  },

  loadingDot: {
    backgroundColor: 'white',
  },

  error: {
    color: 'orangered',
    fontWeight: 'bold',
    alignSelf: 'center',
  },

  errorMessage: {
    alignSelf: 'flex-start',
    textAlign: 'start',
  },
});

export default class DataLoader extends React.Component {
  constructor() {
    super();

    this.state = {
      status: 'unloaded',
      url: null,
      state: null,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    let status_ = prevState.status;
    if (nextProps.url !== prevState.url) {
      status_ = 'unloaded';
    }
    return {
      status: status_,
      url: nextProps.url,
    };
  }

  render() {
    let status_ = this.state.status;
    const renderProp = this.props.children;

    let rendered = null;
    let localError = null;
    if (this.state.data) {
      try {
        rendered = renderProp(this.state.data, this.state.state);
      } catch (e) {
        console.warn('Error while processing returned data from ' + this.state.url, e);
        status_ = 'error';
        rendered = null;
        localError = e;
      }
    }

    return <div className={css(styles.container, this.props.style)}>
      {rendered}
      {status_ === 'loading' &&
        <div className={css(styles.loadingBox)}>
          <LoadingIndicator dotStyle={styles.loadingDot} />
        </div>
      }
      {status_ === 'error' && !this.props.passThroughErrors &&
        <div className={css(styles.loadingBox)}>
          <div className={css(styles.error)}>
            {localError ?
              'Error processing returned data:'
            :
              'Error loading data from:'
            }
          </div>
          <div className={css(styles.errorMessage)}>
            {localError ?
              localError.toString()
            :
              <a href={this.state.url} target="_blank">
                {window.location.origin + this.state.url}
              </a>
            }
          </div>
        </div>
      }
    </div>;
  }

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    if (this.state.status === 'unloaded') {
      const url = this.state.url;
      const state_ = this.props.state;

      fetch(this.state.url, {
        'Content-Type': 'application/json'
      }).then(response => {
        if (!response.ok) {
          throw new Error('Server returned ' + response.status);
        }
        return response.json();
      }).then(data => {
        if (this.state.url === url) {
          this.setState({
            status: 'loaded',
            data: data,
            state: state_,
          });
        }
      }, err => {
        if (this.state.url === url) {
          console.warn(err);
          let newState = { status: 'error' };
          if (this.props.passThroughErrors) {
            newState.data = {
              error: err,
            };
          }
          this.setState(newState);
        }
      });

      this.setState(state => ({
        status: state.status === 'loaded' ? 'pre-loading' : 'loading',
      }));

      // TODO(aria): handle rapid typing in path box better
      setTimeout(() => {
        this.setState(state => ({
          status: (state.url === url && state.status === 'pre-loading') ?
              'loading' : state.status,
        }));
      }, 250);
    }
  }

  componentDidCatch(err, info) {
    console.warn(err, info);
    this.setState((state, props) => ({
      status: 'error',
      data: props.passThroughErrors ? { error: err } : null,
    }));
  }
}

