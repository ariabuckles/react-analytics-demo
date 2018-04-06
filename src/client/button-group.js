// From https://github.com/Khan/react-components
// MIT Licensed, Copyright Khan Academy 2014-2018
/**
The MIT License (MIT)

Copyright (c) 2014 Khan Academy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* ButtonGroup is an aesthetically pleasing group of buttons.
 *
 * The class requires these properties:
 *   buttons - an array of objects with keys:
 *     "value": this is the value returned when the button is selected
 *     "content": this is the JSX shown within the button, typically a string
 *         that gets rendered as the button's display text
 *     "title": this is the title-text shown on hover
 *   onChange - a function that is provided with the updated value
 *     (which it then is responsible for updating)
 *
 * The class has these optional properties:
 *   value - the initial value of the button selected, defaults to null.
 *   allowEmpty - if false, exactly one button _must_ be selected; otherwise
 *     it defaults to true and _at most_ one button (0 or 1) may be selected.
 *
 * Requires stylesheets/perseus-admin-package/editor.less to look nice.
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { css, StyleSheet } from 'aphrodite';

const styles = {};
styles.button = StyleSheet.create({
    outerStyle: {
        display: 'inline-block',
    },

    buttonStyle: {
        backgroundColor: 'white',
        border: '1px solid #ccc',
        borderLeft: '0',
        cursor: 'pointer',
        margin: '0',
        padding: '5px 10px',
        position: 'relative', // for hover

        ':first-child': {
            borderLeft: '1px solid #ccc',
            borderTopLeftRadius: '3px',
            borderBottomLeftRadius: '3px',
        },

        ':last-child': {
            borderRight: '1px solid #ccc',
            borderTopRightRadius: '3px',
            borderBottomRightRadius: '3px',
        },

        ':hover': {
            backgroundColor: '#ccc',
        },

        ':focus': {
            zIndex: '2',
        },
    },

    selectedStyle: {
        backgroundColor: '#ddd',
    },
});

class ButtonGroup extends React.Component {
    /*static propTypes = {
        value: React.PropTypes.any,
        buttons: React.PropTypes.arrayOf(React.PropTypes.shape({
            value: React.PropTypes.any.isRequired,
            content: React.PropTypes.node,
            title: React.PropTypes.string,
        })).isRequired,
        onChange: React.PropTypes.func.isRequired,
        allowEmpty: React.PropTypes.bool,
    };*/

    static defaultProps = {
        value: null,
        allowEmpty: true,
    };

    focus() {
        ReactDOM.findDOMNode(this).focus();
        return true;
    }

    toggleSelect(newValue) {
        const value = this.props.value;

        if (this.props.allowEmpty) {
            // Select the new button or unselect if it's already selected
            this.props.onChange(value !== newValue ? newValue : null);
        } else {
            this.props.onChange(newValue);
        }
    }

    render() {
        const value = this.props.value;
        const buttons = this.props.buttons.map((button, i) => {
            return <button title={button.title}
                type="button"
                id={"" + i}
                ref={"button" + i}
                key={"" + i}
                className={css(
                    styles.button.buttonStyle,
                    this.props.buttonStyle,
                    button.value === value &&
                        styles.button.selectedStyle,
                    button.value === value &&
                        this.props.selectedStyle
                )}
                onClick={this.toggleSelect.bind(this, button.value)}
            >
                {button.content || "" + button.value}
            </button>;
        });

        return <div className={css(styles.button.outerStyle, this.props.style)}>
            {buttons}
        </div>;
    }
}

export default ButtonGroup;
