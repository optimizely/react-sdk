/**
 * Copyright 2024 Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as utils from './utils';
import React, { forwardRef } from 'react';
import { render, screen } from '@testing-library/react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { UserInfo } from './utils';

describe('utils', () => {
  describe('areUsersEqual', () => {
    const user = { id: '1', attributes: { name: 'user1' } };

    it('returns true if users are equal', () => {
      const user2 = JSON.parse(JSON.stringify(user));
      const areUsersEqual = utils.areUsersEqual(user, user2);

      expect(areUsersEqual).toBe(true);
    });

    it('returns false if users are not equal', () => {
      const user2 = { id: '2', attributes: { name: 'user2' } };
      const areUsersEqual = utils.areUsersEqual(user, user2);

      expect(areUsersEqual).toBe(false);
    });

    it('returns false if key lengths are not equal', () => {
      const user2 = { id: '1', attributes: { name: 'user1', age: 30 } };
      const areUsersEqual = utils.areUsersEqual(user, user2);

      expect(areUsersEqual).toBe(false);
    });

    it('returns false if one of the key value pairs are not equal', () => {
      const user2 = { id: '1', attributes: { name: 'user2' } };
      const areUsersEqual = utils.areUsersEqual(user, user2);

      expect(areUsersEqual).toBe(false);
    });
  });

  describe('hoistStaticsAndForwardRefs', () => {
    class TestComponent extends React.Component<{ forwardedRef?: React.Ref<HTMLDivElement> }> {
      static testStaticMethod = () => 'static method result';

      render() {
        return (
          <div ref={this.props.forwardedRef} data-testid="test-div">
            Hello
          </div>
        );
      }
    }

    // source component with statics, that should be available in the wrapped component
    class SourceComponent extends React.Component {
      static sourceStaticMethod = () => 'source static method result';

      render() {
        return <div />;
      }
    }

    const WrappedComponent = utils.hoistStaticsAndForwardRefs(TestComponent, SourceComponent, 'WrappedComponent');

    it('should forward refs and hoist static methods', () => {
      const ref = React.createRef<HTMLDivElement>();

      render(<WrappedComponent ref={ref} />);

      expect(ref.current).toBeDefined();
      expect(ref.current?.nodeName).toBe('DIV');
      expect(screen.getByTestId('test-div')).toBe(ref.current);

      // @ts-ignore
      expect(WrappedComponent.sourceStaticMethod()).toBe('source static method result');
    });
  });

  describe('areAttributesEqual', () => {
    it('should return true for equal attributes', () => {
      const attrs1 = { a: 1, b: 2 };
      const attrs2 = { a: 1, b: 2 };
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(true);
    });

    it('should return false for different attribute keys', () => {
      const attrs1 = { a: 1, b: 2 };
      const attrs2 = { a: 1, c: 2 };
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(false);
    });

    it('should return false for different attribute values', () => {
      const attrs1 = { a: 1, b: 2 };
      const attrs2 = { a: 1, b: 3 };
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(false);
    });

    it('should return false if the number of attributes differs', () => {
      const attrs1 = { a: 1, b: 2 };
      const attrs2 = { a: 1 };
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(false);
    });

    it('should handle undefined or null attributes as empty objects', () => {
      const attrs1 = null;
      const attrs2 = undefined;
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(true);
    });

    it('should return false when one attribute is an object and another is not', () => {
      const attrs1 = { a: 1 };
      const attrs2 = 'not an object';
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(false);
    });

    it('should handle different types of attribute values correctly', () => {
      const attrs1 = { a: '1', b: true };
      const attrs2 = { a: '1', b: true };
      const areAttributesEqual = utils.areAttributesEqual(attrs1, attrs2);

      expect(areAttributesEqual).toBe(true);
    });
  });

  describe('createFailedDecision', () => {
    it('should return a correctly formatted OptimizelyDecision object', () => {
      const flagKey = 'testFlag';
      const message = 'Decision failed due to some reason';
      const user: UserInfo = {
        id: 'user123',
        attributes: { age: 25, location: 'NY' },
      };

      const expectedDecision: utils.OptimizelyDecision = {
        enabled: false,
        flagKey: 'testFlag',
        ruleKey: null,
        variationKey: null,
        variables: {},
        reasons: ['Decision failed due to some reason'],
        userContext: {
          id: 'user123',
          attributes: { age: 25, location: 'NY' },
        },
      };

      const result = utils.createFailedDecision(flagKey, message, user);

      expect(result).toEqual(expectedDecision);
    });
  });

  describe('sprintf', () => {
    it('should replace %s with a string argument', () => {
      expect(utils.sprintf('Hello, %s!', 'world')).toBe('Hello, world!');
    });

    it('should replace %s with a function result', () => {
      const dynamicString = () => 'dynamic';
      expect(utils.sprintf('This is a %s string.', dynamicString)).toBe('This is a dynamic string.');
    });

    it('should replace %s with various types of arguments', () => {
      expect(utils.sprintf('Boolean: %s, Number: %s, Object: %s', true, 42, { key: 'value' })).toBe(
        'Boolean: true, Number: 42, Object: [object Object]'
      );
    });

    it('should handle a mix of strings, functions, and other types', () => {
      const dynamicPart = () => 'computed';
      expect(utils.sprintf('String: %s, Function: %s, Number: %s', 'example', dynamicPart, 123)).toBe(
        'String: example, Function: computed, Number: 123'
      );
    });

    it('should handle missing arguments as undefined', () => {
      expect(utils.sprintf('Two placeholders: %s and %s', 'first')).toBe('Two placeholders: first and undefined');
    });
  });
});
