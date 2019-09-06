# JSON React layouts data loader

[![Build Status](https://travis-ci.com/sevenwestmedia-labs/json-react-layouts-data-loader.svg?branch=master)](https://travis-ci.com/sevenwestmedia-labs/json-react-layouts-data-loader)
[![npm](https://img.shields.io/npm/v/json-react-layouts-data-loader)](https://www.npmjs.com/package/json-react-layouts-data-loader)

Component middleware for JSON React layouts which enables data loading via the [React SSR Data Loader](https://www.npmjs.com/package/react-ssr-data-loader) library.

## Usage

```ts
import { init } from 'json-react-layouts-data-loader'
import { DataLoaderResources, DataProvider } from 'react-ssr-data-loader'

interface MyServices {
    // Put the services you want available to components
}

const resources = new DataLoaderResources<MyServices>()
const { middleware, createRegisterableComponentWithData } = init<MyServices>(resources)

const componentRegistrar = new ComponentRegistrar()
    // Register your components, then register the component data loading middleware
    .registerMiddleware(middleware)

export const testComponentWithDataRegistration = createRegisterableComponentWithData(
    'test-with-data',
    {
        // You provide this function to load the data
        loadData: props => {},
    },
    (props, data) => {
        if (!data.loaded) {
            return <div>Loading...</div>
        }

        return <TestComponentWithData data={data.result} />
    },
)
```

## FAQ

### My data load function references global variables and does not update when they change

The data load props make up a cache key in the data loader, meaning all used references need to be visible to the data loader.

You can use the `getRuntimeParams` function to provide additional runtime params as an escape hatch. For example if you had state stored in redux.

```ts
import { init } from 'json-react-layouts-data-loader'
import { DataLoaderResources, DataProvider } from 'react-ssr-data-loader'

export const testComponentWithDataRegistration = createRegisterableComponentWithData(
    'test-with-data',
    {
        getRuntimeParams: (props, services) => services.store.getState().myAdditionalState
        // You provide this function to load the data
        loadData: props => {
            // Now the global state is visible to the data loader and will make up the cache key so changes to myAdditionalState will cause the data to be re-loaded
            props.myAdditionalState
        },
    },
    (props, data) => {
        if (!data.loaded) {
            return <div>Loading...</div>
        }

        return <TestComponentWithData data={data.result} />
    },
)
```
