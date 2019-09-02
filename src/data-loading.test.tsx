import React from 'react'
import Adapter from 'enzyme-adapter-react-16'
import { init } from '.'
import { DataDefinition } from './DataLoading'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DataLoaderResources, DataProvider } from 'react-ssr-data-loader'
import { getRegistrationCreators, LayoutRegistration } from 'json-react-layouts'
import { mount, configure } from 'enzyme'

configure({ adapter: new Adapter() })

const lengthCalculatorDataDefinition: DataDefinition<{ dataArg: string }, number, {}> = {
    loadData: props =>
        new Promise(resolve =>
            setTimeout(() => {
                resolve(props.dataArg.length)
            }),
        ),
}

// Test component with data
export const TestComponentWithData: React.FC<{ length: number | undefined }> = ({ length }) => (
    <div>{length ? `Length: ${length}` : 'Loading'}</div>
)

const resources = new DataLoaderResources<{}>()
const { createRegisterableComposition } = getRegistrationCreators<{}>()
const { middleware, createRegisterableComponentWithData } = init<{}>(resources)

export const testCompositionRegistration = createRegisterableComposition<'main'>()(
    'test-composition',
    contentAreas => <TestComposition main={contentAreas.main} />,
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

export const TestComposition: React.FC<{ main: React.ReactElement<any> }> = props => (
    <div>{props.main}</div>
)
