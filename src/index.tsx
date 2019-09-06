import React from 'react'
import {
    ComponentRendererMiddleware,
    ComponentRegistration,
    RenderFunction,
} from 'json-react-layouts'
import { DataLoaderResources } from 'react-ssr-data-loader'

import { ComponentState, LoadArguments, DataDefinition, MaybeLoaded, LoadData } from './DataLoading'
import { getComponentDataArgs } from './get-data-args'

type RenderComponentWithDataProps<
    ComponentProps extends {},
    TData,
    TConfig extends {},
    Services
> = (
    props: ComponentProps,
    dataProps: MaybeLoaded<TData> & {
        dataDefinitionArgs: TConfig
    },
    services: Services,
) => React.ReactElement<any> | false | null

// TODO this could have a better name
export function init<Services extends object>(
    resources: DataLoaderResources<Services>,
    /** Hook into data load functions */
    wrapLoad?: (loadData: LoadData<any, any, Services>) => LoadData<any, any, Services>,
): {
    createRegisterableComponentWithData: <
        ComponentType extends string,
        ComponentProps extends object,
        DataLoadArgs extends object,
        ComponentData,
        AdditionalParams extends object
    >(
        type: ComponentType,
        dataDefinition: DataDefinition<DataLoadArgs, ComponentData, Services, AdditionalParams>,
        render: RenderComponentWithDataProps<ComponentProps, ComponentData, DataLoadArgs, Services>,
    ) => ComponentRegistration<
        ComponentType,
        ComponentProps & { dataDefinitionArgs: DataLoadArgs },
        Services
    >
    middleware: ComponentRendererMiddleware<Services, {}>
} {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ComponentDataLoader = resources.registerResource<any, LoadArguments<Services>>(
        'component-data-loader',
        ({
            dataDefinitionArgs,
            componentRenderPath,
            dataDefinition,
            layout,
            resourceType,
            paramsCacheKey,
            ...services
        }) => {
            const loadFn = wrapLoad ? wrapLoad(dataDefinition.loadData) : dataDefinition.loadData

            return loadFn(dataDefinitionArgs, services as any, {
                componentRenderPath,
                resourceType,
                paramsCacheKey,
            })
        },
        ['componentRenderPath', 'dataDefinitionArgs'],
    )

    return {
        createRegisterableComponentWithData: function createRegisterableComponentWithData<
            ComponentType extends string,
            ComponentProps extends {},
            DataLoadArgs extends {},
            ComponentData,
            AdditionalParams extends object
        >(
            type: ComponentType,
            dataDefinition: DataDefinition<DataLoadArgs, ComponentData, Services, AdditionalParams>,
            render: RenderComponentWithDataProps<
                ComponentProps,
                ComponentData,
                DataLoadArgs,
                Services
            >,
        ) {
            // This is quite a complex transform which can't be modelled in typescript.
            //
            // The dataDefinition which is passed to this object is hidden from the types returned
            // The content area renderer has a data loader which will look for this property
            // Then use the loadData function
            const normalRender: RenderFunction<
                ComponentProps &
                    ComponentState<ComponentData> & {
                        dataDefinitionArgs: DataLoadArgs & AdditionalParams
                    },
                Services
            > = ({ data, dataDefinitionArgs, ...rest }, services) => {
                return render(
                    rest as any,
                    {
                        ...data,
                        dataDefinitionArgs,
                    },
                    services,
                )
            }

            const registrationWithData: any = { type, render: normalRender, dataDefinition }
            // Once the data is loaded it will be passed to the render function on the
            // data prop, which will be typed as LoadedData<TData>

            // The route info looks like this:
            // { type: TType, props: TProps & { dataDefinition: TData } }
            return registrationWithData
        },
        middleware: (componentProps, middlewareProps, services, next) => {
            const dataDefinition = getComponentDataArgs<Services>(
                services.layout,
                componentProps.componentType,
            )

            if (dataDefinition) {
                const dataDefinitionArgs = dataDefinition.getRuntimeParams
                    ? {
                          ...componentProps.dataDefinitionArgs,
                          ...dataDefinition.getRuntimeParams(
                              componentProps.dataDefinitionArgs,
                              services.services,
                          ),
                      }
                    : componentProps.dataDefinitionArgs

                if (dataDefinition.getRuntimeParams) {
                    componentProps = { ...componentProps, dataDefinitionArgs }
                }

                return (
                    <ComponentDataLoader
                        layout={services.layout}
                        componentRenderPath={componentProps.componentRenderPath}
                        dataDefinition={dataDefinition}
                        dataDefinitionArgs={dataDefinitionArgs}
                        renderData={renderProps => {
                            if (!renderProps.lastAction.success) {
                                // We have failed to load data, use error boundaries
                                // to send error back up and render error page
                                throw renderProps.lastAction.error
                            }

                            const data: ComponentState<any> = renderProps.data.hasData
                                ? { data: { loaded: true, result: renderProps.data.result } }
                                : { data: { loaded: false } }

                            return (
                                next(
                                    {
                                        ...componentProps,
                                        ...data,
                                    },
                                    middlewareProps,
                                    services,
                                ) || null
                            )
                        }}
                    />
                )
            }

            return next(componentProps, middlewareProps, services)
        },
    }
}

export { DataDefinition, MaybeLoaded, getComponentDataArgs }
