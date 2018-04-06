// Animation from https://github.com/tobiasahlin/SpinKit
// Licensed under the MIT License, Copyright (c) 2015 Tobias Ahlin
import React from 'react';
import { css, StyleSheet } from 'aphrodite';

const styles = StyleSheet.create({
  dot: {
    display: 'inline-block',
    width: 20,
    height: 20,
    backgroundColor: 'black',
    borderRadius: '100%',
    animationName: { // keyframes
      '0%': {
        transform: 'scale(0)',
      },

      '40%': {
        transform: 'scale(1)',
      },

      '80%': {
        transform: 'scale(0)',
      },

      '100%': {
        transform: 'scale(0)',
      },
    },
    animationTimingFunction: 'ease-in-out',
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
  },
  dot1: {
    animationDelay: '-0.32s',
  },
  dot2: {
    animationDelay: '-0.16s',
  },
  dot3: {
    animationDelay: '0s',
  },
});

const LoadingIndicator = (props) => {
  return <div className={props.className}>
    <div className={css(styles.dot, styles.dot1, props.dotStyle)} />
    <div className={css(styles.dot, styles.dot2, props.dotStyle)} />
    <div className={css(styles.dot, styles.dot3, props.dotStyle)} />
  </div>;
};

export default LoadingIndicator;
