import { LayoutApi } from 'json-react-layouts'

export type LoadData<DataLoadArguments extends object, TData, Services extends object> = (
    config: DataLoadArguments,
    services: Services,
    context: { componentRenderPath: string; resourceType: string },
) => Promise<TData>

export interface DataDefinition<DataLoadArguments extends object, TData, Services extends object> {
    getCacheKey?: (config: DataLoadArguments, services: Services) => string
    loadData: LoadData<DataLoadArguments, TData, Services>
}

export type MaybeLoaded<TData> = { loaded: false } | { loaded: true; result: TData }
export interface ComponentState<TData> {
    data: MaybeLoaded<TData>
}

export interface LoadArguments<Services extends object> {
    componentRenderPath: string
    dataDefinition: DataDefinition<any, any, Services>
    dataDefinitionArgs: any
    layout: LayoutApi<any, any, Services, any, any>
}
