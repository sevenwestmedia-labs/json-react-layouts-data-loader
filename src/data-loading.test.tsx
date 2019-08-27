import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import { init } from '.'
import { DataDefinition } from './DataLoading'
import { DataLoaderResources, DataProvider } from 'react-ssr-data-loader'
import { getRegistrationCreators, ComponentRegistrar, CompositionRegistrar, RouteBuilder } from 'react-json-page-layout'
import { mount, configure } from 'enzyme'

configure({ adapter: new Adapter() })

const lengthCalculatorDataDefinition: DataDefinition<{ dataArg: string }, number, {}> = {
    loadData: props => new Promise(resolve => setTimeout(() => resolve(props.dataArg.length))),
}

// Test component with data
export const TestComponentWithData: React.FC<{ length: number | undefined }> = ({ length }) => (
    <div>{length ? `Length: ${length}` : 'Loading'}</div>
)

const resources = new DataLoaderResources<{}>()
const { createRegisterableComposition } = getRegistrationCreators<{}>()
const { middleware, createRegisterableComponentWithData } = init<{}>(resources)

export const testCompositionRegistration = createRegisterableComposition<'main', {}>()(
    'test-composition',
    ({ contentAreas }) => <TestComposition main={contentAreas.main} />,
)

export const testComponentWithDataRegistration = createRegisterableComponentWithData(
    'test-with-data',
    lengthCalculatorDataDefinition,
    (props, data) => {
        return (
            <TestComponentWithData
                length={data.loaded ? data.result : undefined}
                {...props}
                {...{ dataProps: { data } }}
            />
        )
    },
)

it('can load data for component', async () => {
    const componentRegistrar = new ComponentRegistrar()
        .register(testComponentWithDataRegistration)
        .registerMiddleware(middleware)
    const compositionRegisrar = CompositionRegistrar.create(componentRegistrar).registerComposition(
        testCompositionRegistration,
    )
    const routeBuilder = new RouteBuilder(compositionRegisrar)

    const wrapper = mount(
        <DataProvider resources={resources} globalProps={{}}>
            <compositionRegisrar.ContentAreaRenderer
                componentRenderPath="test"
                contentArea={[
                    { type: 'test-with-data', props: { dataDefinitionArgs: { dataArg: 'Foo' } } },
                ]}
                routeBuilder={routeBuilder}
                loadDataServices={{}}
            />
        </DataProvider>,
    )

    expect(wrapper.find(TestComponentWithData).text()).toBe('Loading')
    await new Promise(resolve => setTimeout(resolve))
    await new Promise(resolve => setTimeout(resolve))

    const component = wrapper.update().find(TestComponentWithData)
    expect(component.text()).toBe('Length: 3')
    expect(component.props()).toMatchSnapshot()
})

export const TestComposition: React.FC<{ main: React.ReactElement<any> }> = props => (
    <div>{props.main}</div>
)
