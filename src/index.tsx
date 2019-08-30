import React from 'react'
import {
    ComponentRendererMiddleware,
    RenderFunctionServices,
    ComponentRegistration,
    RenderFunction,
} from 'json-react-layouts'
import { ComponentState, LoadArguments, DataDefinition, MaybeLoaded } from './DataLoading'
import { DataLoaderResources } from 'react-ssr-data-loader'

type RenderComponentWithDataProps<
    TProps extends {},
    TData,
    TConfig extends {},
    LoadDataServices
> = (
    props: TProps,
    dataProps: MaybeLoaded<TData> & {
        dataDefinitionArgs: TConfig
    },
    services: RenderFunctionServices<LoadDataServices>,
) => React.ReactElement<any> | false | null

// TODO this could have a better name
export function init<LoadDataServices>(
    resources: DataLoaderResources<LoadDataServices>,
): {
    createRegisterableComponentWithData: <
        TType extends string,
        TProps extends {},
        TConfig extends {},
        TData
    >(
        type: TType,
        dataDefinition: DataDefinition<TConfig, TData, LoadDataServices>,
        render: RenderComponentWithDataProps<TProps, TData, TConfig, LoadDataServices>,
    ) => ComponentRegistration<TType, TProps & { dataDefinitionArgs: TConfig }, LoadDataServices>
    middleware: ComponentRendererMiddleware<LoadDataServices, {}>
} {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ComponentDataLoader = resources.registerResource<any, LoadArguments<LoadDataServices>>(
        'component-data-loader',
        params => {
            return params.dataDefinition.loadData(params.dataDefinitionArgs, params)
        },
        ['componentRenderPath', 'dataDefinitionArgs'],
    )

    return {
        createRegisterableComponentWithData: function createRegisterableComponentWithData<
            TType extends string,
            TProps extends {},
            TConfig extends {},
            TData
        >(
            type: TType,
            dataDefinition: DataDefinition<TConfig, TData, LoadDataServices>,
            render: RenderComponentWithDataProps<TProps, TData, TConfig, LoadDataServices>,
        ) {
            // This is quite a complex transform which can't be modelled in typescript.
            //
            // The dataDefinition which is passed to this object is hidden from the types returned
            // The content area renderer has a data loader which will look for this property
            // Then use the loadData function
            const normalRender: RenderFunction<
                TProps & ComponentState<TData> & { dataDefinitionArgs: TConfig },
                LoadDataServices
            > = ({ data, dataDefinitionArgs, ...rest }, services) => {
                return render(rest as any, { ...data, dataDefinitionArgs }, services)
            }

            const registrationWithData: any = { type, render: normalRender, dataDefinition }
            // Once the data is loaded it will be passed to the render function on the
            // data prop, which will be typed as LoadedData<TData>

            // The route info looks like this:
            // { type: TType, props: TProps & { dataDefinition: TData } }
            return registrationWithData
        },
        middleware: (componentProps, middlewareProps, services, next) => {
            const componentRegistrar = (services.layout as any).compositionRegistrar
                .componentRegistrar
            const componentDataDefinition = componentRegistrar.get(componentProps.componentType)

            const dataDefinition = (componentDataDefinition as any).dataDefinition
            if (dataDefinition) {
                return (
                    <ComponentDataLoader
                        layout={services.layout}
                        componentRenderPath={componentProps.componentRenderPath}
                        dataDefinition={dataDefinition}
                        dataDefinitionArgs={componentProps.dataDefinitionArgs}
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

export { DataDefinition }
