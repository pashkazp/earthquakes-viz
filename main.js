// Чекаємо, поки DOM буде повністю завантажений
document.addEventListener("DOMContentLoaded", function() {
    // Чекаємо, поки ArcGIS API буде завантажено
    require(["esri/Map", "esri/views/SceneView", "esri/layers/GraphicsLayer", "esri/Graphic", "esri/geometry/Point"], 
    function(Map, SceneView, GraphicsLayer, Graphic, Point) {
        // Перевіряємо, чи PapaParse завантажено
        if (typeof Papa === 'undefined') {
            console.error("PapaParse is not loaded. Make sure it's included in your HTML file.");
            return;
        }

        console.log("PapaParse version:", Papa.version);

        // Створення карти та SceneView
        const map = new Map({
            basemap: "satellite",
            ground: {
                opacity: 0.3  // Встановлюємо початкову прозорість ground на 0.3
            }
        });

        const view = new SceneView({
            container: "view-container",
            map: map,
            camera: {
                position: {
                    latitude: 20,
                    longitude: 0,
                    z: 20000000
                },
                tilt: 0,
                heading: 0
            },
            constraints: {
                snapToZoom: false
            },
            environment: {
                atmosphere: { 
                    quality: 'high'
                },
                lighting: {
                    type: "virtual",
                    date: null,  // Встановлюємо null для рівномірного освітлення
                    directShadowsEnabled: false
                }
            },
            qualityProfile: "high",
            viewingMode: "global"
        });

        // Створення GraphicsLayer для відображення землетрусів
        const earthquakeLayer = new GraphicsLayer();
        map.add(earthquakeLayer);
        console.log("Earthquake layer added to map");

        // Функція для визначення кольору на основі магнітуди
        function magnitudeColor(mag) {
            if (mag < 3) return [255, 255, 0, 1];
            if (mag < 5) return [255, 165, 0, 1];
            if (mag < 7) return [255, 69, 0, 1];
            return [255, 0, 0, 1];
        }

        const MAX_EARTHQUAKES = 1000; // Обмежте кількість землетрусів
        let earthquakeCount = 0;

        function addEarthquakeToLayer(row) {
            if (earthquakeCount >= MAX_EARTHQUAKES) return;
            
            const lat = row.latitude;
            const lon = row.longitude;
            const depth = row.depth;
            const magnitude = row.mag;

            if (!lat || !lon || !depth || !magnitude) return;

            // Радіус Землі в метрах
            const earthRadius = 6371000;

            const point = {
                type: "point",
                longitude: lon,
                latitude: lat,
                z: -(depth * 1000) // Конвертуємо глибину з км в метри і робимо від'ємною
            };

            const size = Math.max(50000, magnitude * 50000) / Math.sqrt(view.scale / 20000000);
            const graphic = new Graphic({
                geometry: point,
                symbol: {
                    type: "point-3d",
                    symbolLayers: [{
                        type: "object",
                        width: size,
                        height: size,
                        depth: size,
                        resource: { primitive: "sphere" },
                        material: { color: magnitudeColor(magnitude) }
                    }]
                },
                attributes: {
                    magnitude: magnitude,
                    depth: depth,
                    location: `${lat}, ${lon}`
                },
                popupTemplate: {
                    title: "Землетрус",
                    content: "Магнітуда: {magnitude}<br>Глибина: {depth} км<br>Координати: {location}"
                }
            });

            earthquakeLayer.add(graphic);
            earthquakeCount++;
        }

        function createEarthquakeSymbol(magnitude, scale) {
            const baseSize = 50000; // Базовий розмір у метрах
            const size = Math.max(baseSize, magnitude * baseSize) / Math.sqrt(scale);
            return {
                type: "point-3d",
                symbolLayers: [{
                    type: "object",
                    width: size,
                    height: size,
                    depth: size,
                    resource: { primitive: "sphere" },
                    material: { color: magnitudeColor(magnitude) }
                }]
            };
        }

        view.when(() => {
            console.log("View loaded");
            loadEarthquakeData();
        }).catch((error) => {
            console.error("Error loading view:", error);
        });

        function loadEarthquakeData() {
            console.log("Starting to load earthquake data");
            Papa.parse("earthquake_data.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                complete: function(results) {
                    console.log("Parsed earthquakes:", results.data.length);
                    results.data.forEach(addEarthquakeToLayer);
                    console.log("Added earthquakes to layer:", earthquakeLayer.graphics.length);
                    // Видалимо автоматичну зміну виду
                    // if (earthquakeLayer.graphics.length > 0) {
                    //     view.goTo(earthquakeLayer.graphics, { duration: 2000 }).catch((error) => {
                    //         console.warn("goTo rejected:", error);
                    //     });
                    // }
                },
                error: function(error) {
                    console.error("Error parsing CSV:", error);
                }
            });
        }
        
        function updateEarthquakeSymbols(newScale) {
            earthquakeLayer.graphics.forEach(graphic => {
                const magnitude = graphic.attributes.magnitude;
                const depth = graphic.attributes.depth;
                const size = Math.max(50000, magnitude * 50000) / Math.sqrt(newScale / 20000000);
                graphic.symbol = {
                    type: "point-3d",
                    symbolLayers: [{
                        type: "object",
                        width: size,
                        height: size,
                        depth: size,
                        resource: { primitive: "sphere" },
                        material: { color: magnitudeColor(magnitude) }
                    }]
                };
                // Оновлюємо позицію по Z для збереження правильної глибини
                graphic.geometry.z = -(depth * 1000);
            });
        }

        view.watch("scale", function(newValue) {
            updateEarthquakeSymbols(newValue);
        });

        // Додаємо обробник події для кнопки зміни виду
        document.getElementById('toggleView').addEventListener('click', function() {
            if (view.camera.tilt === 0) {
                view.goTo({
                    tilt: 45,
                    heading: 0,
                    position: {
                        latitude: 20,
                        longitude: 0,
                        z: 25000000
                    }
                }, { duration: 1000 });
            } else {
                view.goTo({
                    tilt: 0,
                    heading: 0,
                    position: {
                        latitude: 0,
                        longitude: 0,
                        z: 25000000
                    }
                }, { duration: 1000 });
            }
        });

        // Функція для зміни basemap
        function changeBasemap(basemap) {
            map.basemap = basemap;
            map.ground.opacity = 0.3;  // Встановлюємо прозорість ground на 0.3
        }

        // Додаємо обробник події для випадаючого списку
        document.getElementById('basemapSelect').addEventListener('change', function(e) {
            changeBasemap(e.target.value);
        });

        // Додайте цей код після створення view, щоб встановити початкове значення випадаючого списку
        document.getElementById('basemapSelect').value = "satellite";
    });
});
