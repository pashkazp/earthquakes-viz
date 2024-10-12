require([
    "esri/Map",
    "esri/views/SceneView",
    "esri/layers/CSVLayer",
    "esri/layers/FeatureLayer",
    "esri/Basemap",
    "esri/core/watchUtils"
], function(Map, SceneView, CSVLayer, FeatureLayer, Basemap, watchUtils) {
    const countryBorders = new FeatureLayer({
        url:
            "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0",
        renderer: {
            type: "simple",
            symbol: {
                type: "polygon-3d",
                symbolLayers: [
                    {
                        type: "fill",
                        outline: {
                            color: [255, 255, 255, 0.8],
                            size: 1
                        }
                    }
                ]
            }
        }
    });

    const plateTectonicBorders = new FeatureLayer({
        url: "https://services2.arcgis.com/cFEFS0EWrhfDeVw9/arcgis/rest/services/plate_tectonics_boundaries/FeatureServer",
        elevationInfo: {
            mode: "on-the-ground"
        },
        renderer: {
            type: "simple",
            symbol: {
                type: "line-3d",
                symbolLayers: [
                    {
                        type: "line",
                        material: { color: [255, 133, 125, 0.7] },
                        size: 3
                    }
                ]
            }
        }
    });

    const earthquakeLayer = new CSVLayer({
        url: "./earthquake_data.csv",
        elevationInfo: {
            mode: "absolute-height", // Використовуємо абсолютну висоту для відображення глибини
            featureExpressionInfo: {
                expression: "-$feature.depth" // Глибина представлена як від'ємне значення, щоб точка була нижче поверхні
            }
        },
        screenSizePerspectiveEnabled: false,
        renderer: {
            type: "simple",
            symbol: {
                type: "point-3d",
                symbolLayers: [
                    {
                        type: "object",
                        resource: {
                            primitive: "sphere"
                        },
                        material: {
                            color: {
                                type: "color",
                                field: "mag",
                                stops: [
                                    { value: 0, color: "green" },
                                    { value: 5, color: "yellow" },
                                    { value: 10, color: "red" }
                                ]
                            }
                        },
                        depth: 10000,
                        height: 10000,
                        width: 10000
                    }
                ]
            },
            visualVariables: [
                {
                    type: "size",
                    field: "mag",
                    axis: "all",
                    stops: [
                        { value: 0, size: 10000 },
                        { value: 10, size: 250000 }
                    ]
                },
                {
                    type: "color",
                    field: "mag",
                    colorMixMode: "tint",
                    stops: [
                        { value: 0, color: "green" },
                        { value: 5, color: "yellow" },
                        { value: 10, color: "red" }
                    ],
                    legendOptions: {
                        title: "Magnitude"
                    }
                }
            ]
        }
    });

    const map = new Map({
        ground: {
            opacity: 0,
            navigationConstraint: "none"
        },
        basemap: new Basemap({
            baseLayers: [countryBorders, plateTectonicBorders]
        }),
        layers: [earthquakeLayer]
    });

    // Ініціалізація SceneView
    const view = new SceneView({
        container: "view-container",
        qualityProfile: "high",
        map: map,
        alphaCompositingEnabled: true,
        environment: {
            background: {
                type: "color",
                color: [0, 0, 0, 0]
            },
            starsEnabled: false,
            atmosphereEnabled: false
        },
        ui: {
            components: []
        },
        highlightOptions: {
            color: "cyan"
        },
        padding: {
            bottom: 200
        },
        popup: {
            collapseEnabled: false,
            dockEnabled: false,
            dockOptions: {
                breakpoint: false
            }
        },
        camera: {
            position: [
                -105.61273180,
                3.20596275,
                13086004.69753
            ],
            heading: 0.24,
            tilt: 0.16
        }
    });

    // Використання watchUtils для гарантії завершення завантаження шарів
    watchUtils.when(view, "stationary", function() {
        if (view.stationary) {
            console.log("Карта завантажена і готова до використання");
        }
    });

    // Додавання обробників подій для взаємодії користувача
    view.whenLayerView(earthquakeLayer).then(function(layerView) {
        watchUtils.whenFalse(layerView, "updating", function() {
            console.log("Earthquake data завантажено і готово до використання");
        });
    });
});
