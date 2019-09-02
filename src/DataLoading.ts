import { LayoutApi } from 'json-react-layouts'

export interface DataDefinition<TConfig extends {}, TData, LoadDataServices> {
    getCacheKey?: (config: TConfig, services: LoadDataServices) => string
    loadData: (config: TConfig, services: LoadDataServices) => Promise<TData>
}

export type MaybeLoaded<TData> = { loaded: false } | { loaded: true; result: TData }
export interface ComponentState<TData> {
    data: MaybeLoaded<TData>
}

export interface LoadArguments<Services> {
    componentRenderPath: string
    dataDefinition: DataDefinition<any, any, Services>
    dataDefinitionArgs: any
    layout: LayoutApi<any, any, Services, any, any>
}
