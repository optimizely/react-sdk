/**
 * Copyright 2022-2023, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import { UserAttributes } from '@optimizely/optimizely-sdk';
import { getLogger } from '@optimizely/optimizely-sdk';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { OptimizelyContextProvider } from './Context';
import { ReactSDKClient, DefaultUser } from './client';
import { areUsersEqual, UserInfo } from './utils';

const logger = getLogger('<OptimizelyProvider>');

interface OptimizelyProviderProps {
  optimizely: ReactSDKClient;
  timeout?: number;
  isServerSide?: boolean;
  user?: Promise<UserInfo> | UserInfo;
  userId?: string;
  userAttributes?: UserAttributes;
  children?: React.ReactNode;
}

interface OptimizelyProviderState {
  userId: string;
  attributes: { [key: string]: string } | undefined;
}

export class OptimizelyProvider extends React.Component<OptimizelyProviderProps, OptimizelyProviderState> {
  constructor(props: OptimizelyProviderProps) {
    super(props);
  }

  componentDidMount(): void {
    this.setUserInOptimizely();
  }

  async setUserInOptimizely(): Promise<void> {
    const { optimizely, userId, userAttributes, user } = this.props;

    if (!optimizely) {
      logger.error('OptimizelyProvider must be passed an instance of the Optimizely SDK client');
      return;
    }

    let finalUser: UserInfo | null = null;

    if (user) {
      if ('then' in user) {
        user.then((res: UserInfo) => {
          optimizely.setUser(res);
        });
      } else {
        finalUser = {
          id: user.id,
          attributes: user.attributes || {},
        };
      }
    } else if (userId) {
      finalUser = {
        id: userId,
        attributes: userAttributes || {},
      };
      // deprecation warning
      logger.warn('Passing userId and userAttributes as props is deprecated, please switch to using `user` prop');
    } else {
      finalUser = DefaultUser;
    }

    if (finalUser) {
      try {
        await optimizely.onReady();
        await optimizely.setUser(finalUser);
      } catch {
        logger.error('Error while trying to set user.');
      }
    }
  }

  componentDidUpdate(prevProps: OptimizelyProviderProps): void {
    if (prevProps.isServerSide) {
      // dont react to updates on server
      return;
    }
    const { optimizely } = this.props;
    if (this.props.user && 'id' in this.props.user) {
      if (!optimizely.user.id) {
        // no user is set in optimizely, update
        optimizely.setUser(this.props.user);
      } else if (
        // if the users aren't equal update
        !areUsersEqual(
          {
            id: optimizely.user.id,
            attributes: optimizely.user.attributes || {},
          },
          {
            id: this.props.user.id,
            // TODO see if we can use computeDerivedStateFromProps
            attributes: this.props.user.attributes || {},
          }
        )
      ) {
        optimizely.setUser(this.props.user);
      }
    }
  }

  render(): JSX.Element {
    const { optimizely, children, timeout } = this.props;
    const isServerSide = !!this.props.isServerSide;
    const value = {
      optimizely,
      isServerSide,
      timeout,
    };

    return <OptimizelyContextProvider value={value}>{children}</OptimizelyContextProvider>;
  }
}
