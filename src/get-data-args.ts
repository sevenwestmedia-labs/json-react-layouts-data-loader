import { getRegistrars, LayoutApi } from 'json-react-layouts'
import { DataDefinition } from './DataLoading'

export function getComponentDataArgs<Services extends object>(
    layout: LayoutApi<any, any, any, any, any>,
    componentType: string,
): DataDefinition<any, any, Services> | undefined {
    const { componentRegistrar } = getRegistrars(layout)
    const componentDataDefinition = componentRegistrar.get(componentType)

    const dataDefinition = (componentDataDefinition as any).dataDefinition

    return dataDefinition
}
