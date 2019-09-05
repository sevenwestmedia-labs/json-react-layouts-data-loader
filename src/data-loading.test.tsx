import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import { init } from '.'
import { DataDefinition } from './DataLoading'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DataLoaderResources, DataProvider } from 'react-ssr-data-loader'
import { getRegistrationCreators, LayoutRegistration } from 'json-react-layouts'
import { mount, configure } from 'enzyme'

configure({ adapter: new Adapter() })

it('can load data for component', async () => {
    const resources = new DataLoaderResources<{}>()
    const { middleware, createRegisterableComponentWithData } = init<{}>(resources)

    const testComponentWithDataRegistration = createRegisterableComponentWithData(
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

    const layout = new LayoutRegistration()
        .registerComponents(registrar =>
            registrar
                .registerComponent(testComponentWithDataRegistration)
                .registerMiddleware(middleware),
        )
        .registerCompositions(registrar =>
            registrar.registerComposition(testCompositionRegistration),
        )

    const wrapper = mount(
        <DataProvider resources={resources} globalProps={{}}>
            <layout.CompositionsRenderer
                compositions={[
                    {
                        type: 'test-composition',
                        contentAreas: {
                            main: [
                                {
                                    type: 'test-with-data',
                                    props: { dataDefinitionArgs: { dataArg: 'Foo' } },
                                },
                            ],
                        },
                        props: {},
                    },
                ]}
                services={{}}
            />
        </DataProvider>,
    )

    expect(wrapper.find(TestComponentWithData).text()).toBe('Loading')
    await new Promise(resolve => setTimeout(resolve))

    const component = wrapper.update().find(TestComponentWithData)
    expect(component.text()).toBe('Length: 3')
    expect(component.props()).toMatchSnapshot()
})

it('cap wrap data load function', async () => {
    let wrapArgs: any
    let wrapServices: any
    let wrapContext: any
    const resources = new DataLoaderResources<{ serviceProp: 'example' }>()
    const { middleware, createRegisterableComponentWithData } = init<{ serviceProp: 'example' }>(
        resources,
        load => (args, services, context) => {
            wrapArgs = args
            wrapServices = services
            wrapContext = context
            return load(args, services, context)
        },
    )

    const testComponentWithDataRegistration = createRegisterableComponentWithData(
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

    const layout = new LayoutRegistration<{ serviceProp: 'example' }>()
        .registerComponents(registrar =>
            registrar
                .registerComponent(testComponentWithDataRegistration)
                .registerMiddleware(middleware),
        )
        .registerCompositions(registrar =>
            registrar.registerComposition(testCompositionRegistration),
        )

    mount(
        <DataProvider resources={resources} globalProps={{ serviceProp: 'example' }}>
            <layout.CompositionsRenderer
                compositions={[
                    {
                        type: 'test-composition',
                        contentAreas: {
                            main: [
                                {
                                    type: 'test-with-data',
                                    props: { dataDefinitionArgs: { dataArg: 'Foo' } },
                                },
                            ],
                        },
                        props: {},
                    },
                ]}
                services={{ serviceProp: 'example' }}
            />
        </DataProvider>,
    )

    expect(wrapArgs).toEqual({ dataArg: 'Foo' })
    expect(wrapServices).toEqual({ serviceProp: 'example' })
    expect(wrapContext).toEqual({
        componentRenderPath: '[0-test-composition]/main[0]',
        paramsCacheKey: 'dba86410',
        resourceType: 'component-data-loader',
    })
})

it('component can provide additional arguments dynamically', async () => {
    const resources = new DataLoaderResources<{}>()
    const { middleware, createRegisterableComponentWithData } = init<{}>(resources)

    const lengthCalculatorWithMultiplierDataDefinition: DataDefinition<
        { dataArg: string },
        number,
        {},
        { multiplier: number }
    > = {
        // Additional params can come from anywhere, for instance redux or
        // other environmental variables (window.location?)
        getAdditionalParams: () => {
            return {
                multiplier: 2,
            }
        },
        loadData: props =>
            new Promise(resolve =>
                setTimeout(() => {
                    resolve(props.dataArg.length * props.multiplier)
                }),
            ),
    }

    const testComponentWithDataRegistration = createRegisterableComponentWithData(
        'test-with-data',
        lengthCalculatorWithMultiplierDataDefinition,
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

    const layout = new LayoutRegistration()
        .registerComponents(registrar =>
            registrar
                .registerComponent(testComponentWithDataRegistration)
                .registerMiddleware(middleware),
        )
        .registerCompositions(registrar =>
            registrar.registerComposition(testCompositionRegistration),
        )

    const wrapper = mount(
        <DataProvider resources={resources} globalProps={{}}>
            <layout.CompositionsRenderer
                compositions={[
                    {
                        type: 'test-composition',
                        contentAreas: {
                            main: [
                                {
                                    type: 'test-with-data',
                                    props: { dataDefinitionArgs: { dataArg: 'Foo' } },
                                },
                            ],
                        },
                        props: {},
                    },
                ]}
                services={{}}
            />
        </DataProvider>,
    )

    await new Promise(resolve => setTimeout(resolve))

    const component = wrapper.update().find(TestComponentWithData)
    expect(component.text()).toBe('Length: 6')
    expect(component.props()).toMatchObject({
        dataProps: {
            data: {
                dataDefinitionArgs: { dataArg: 'Foo', multiplier: 2 },
            },
        },
    })
})

const { createRegisterableComposition } = getRegistrationCreators<{}>()

// Test component with data
const TestComponentWithData: React.FC<{ length: number | undefined }> = ({ length }) => (
    <div>{length ? `Length: ${length}` : 'Loading'}</div>
)

const TestComposition: React.FC<{ main: React.ReactElement<any> }> = props => (
    <div>{props.main}</div>
)

const testCompositionRegistration = createRegisterableComposition<'main'>()(
    'test-composition',
    contentAreas => <TestComposition main={contentAreas.main} />,
)

const lengthCalculatorDataDefinition: DataDefinition<{ dataArg: string }, number, {}> = {
    loadData: props =>
        new Promise(resolve =>
            setTimeout(() => {
                resolve(props.dataArg.length)
            }),
        ),
}
