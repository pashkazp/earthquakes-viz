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

  const exaggeratedElevation = {
    mode: "absolute-height",
    offset: 100000
  };

  const earthquakeLayer = new CSVLayer({
    url: "./earthquake_data.csv",
    elevationInfo: exaggeratedElevation,
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
                        },
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
                    { value: 1, size: 10000 },
                    { value: 10, size: 300000 }
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
                },
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

  // the view associated with the map has a transparent background
  // so that we can apply a CSS shadow filter for the glow
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

  // The watchUtils.when function ensures that the function passed as the second argument is executed when the
  // condition passed as the first argument is met. In this case, the function will execute when the view is stationary
  watchUtils.when(view, "stationary", function() {
    const options = {
      size: 20,
      color: [255, 255, 255, 0.2],
      blendMode: "screen"
    };

    const blurIntensity = 3;
    const brightness = 0.5;
    const textureSize = 2048;
    const texture = document.createElement("canvas");
    const context = texture.getContext("2d");
    texture.width = textureSize;
    texture.height = textureSize;
    context.fillStyle = "black";
    context.fillRect(0, 0, textureSize, textureSize);

    // Use the normal distribution function to generate a random halo
    for (let i = 0; i < options.size; i++) {
      const x = textureSize * 0.5 + 3 * textureSize * (Math.random() - 0.5);
      const y = textureSize * 0.5 + 3 * textureSize * (Math.random() - 0.5);
      const size = 2 * options.size * Math.random();
      const intensity = Math.random();
      context.globalAlpha = options.color[3] * intensity;
      context.beginPath();
      context.arc(x, y, size, 0, 2 * Math.PI, false);
      context.fillStyle = `rgba(${options.color[0]}, ${options.color[1]}, ${options.color[2]}, 1)`;
      context.fill();
    }

    view.environment.lighting.shadowColor.value = {
      r: options.color[0],
      g: options.color[1],
      b: options.color[2],
      a: options.color[3]
    };
    view.environment.lighting.shadowIntensity.value = blurIntensity;
    view.environment.lighting.shadowBlurIntensity.value = brightness;
    view.environment.lighting.shadowTexture.value = texture;
  });
});
