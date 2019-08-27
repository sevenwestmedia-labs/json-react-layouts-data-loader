# JSON React layouts data loader

Component middleware for JSON React layouts which enables data loading via the [React SSR Data Loader](https://www.npmjs.com/package/react-ssr-data-loader) library.

## Usage

```ts
import { init } from 'json-react-layouts-data-loader
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
        loadData: props => ...,
    },
    (props, data) => {
        if (!data.loaded) {
            return <div>Loading...</div>
        }

        return (
            <TestComponentWithData
                data={data.result}
            />
        )
    }
)
```
