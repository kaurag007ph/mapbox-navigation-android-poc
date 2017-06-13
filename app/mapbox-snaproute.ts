import * as application from 'application'
import * as utils from "utils/utils";
import { StackLayout } from 'ui/layouts/stack-layout'
import { Color } from 'color'

declare var com, android, java, retrofit2: any
let accessToken = 'pk.eyJ1Ijoia2F1cmFnMDA3IiwiYSI6ImNpeW03cHZjNzAwMzMzM2w3MjZsMjFkb3AifQ.3fDvF714qVeY8K44oXLY1w'
let stepCount = 0
let _mapbox: any = {};

export interface LatLng {
  lat: number;
  lng: number;
}

export class MapboxNavigation extends StackLayout {
    private navigation: any
    private currentRoute: any
    private distanceRoutePolyline: any
    private stepCount = 0
    private stepPolyline: any
    private mapView: any
    private userLocation: any
    private snappedLocation: any
    private distancePolyline: any

    public getNativeMapView(): any {
      return this.navigation;
    }

    public createNativeView(): Object {
        console.log('Initialize createNativeView')
        
        let nativeView = new android.widget.FrameLayout(this._context);
        setTimeout(() => {
          this.initMap()
        }, 0);
        return nativeView;
    }

    private initMap() {      
      if (!this.mapView && accessToken) {
        console.log('InitMap')
        com.mapbox.mapboxsdk.Mapbox.getInstance(this._context, accessToken);

        let drawMap = () => {
          this.mapView = new com.mapbox.mapboxsdk.maps.MapView(this._context, _getMapboxMapOptions({}));

          this.mapView.onCreate(null);
          this.mapView.getMapAsync(
              new com.mapbox.mapboxsdk.maps.OnMapReadyCallback({
                onMapReady: (mbMap) => {
                    console.log('map ready')
                    this.mapView.mapboxMap = mbMap
                    this.mapView.mapboxMap.setOnMapClickListener(
                        new com.mapbox.mapboxsdk.maps.MapboxMap.OnMapClickListener({
                        onMapClick: (point) => {
                            console.log('Map click')
                            this.start(point)
                        }
                    }))
                    let target = new com.mapbox.mapboxsdk.geometry.LatLng(14.52348788, 121.0546267);                    
                    let cameraPosition = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder()
                        .target(target)
                        .zoom(14)
                        .build();

                    this.mapView.mapboxMap.moveCamera(com.mapbox.mapboxsdk.camera.CameraUpdateFactory.newCameraPosition(cameraPosition));

                    // this.mapView.mapboxMap.moveCamera(cameraPosition)
                    setTimeout(() => {
                        let origin = com.mapbox.services.commons.models.Position.fromCoordinates(-95.75188, 29.78533)
                        let destination = com.mapbox.services.commons.models.Position.fromCoordinates(-95.71892, 29.77516)
                        this.getRoute(origin, destination)
                    }, 5000)
                },
                onFailure: (error) => {
                  console.log(error)
                }
              })
          );
          this.nativeView.addView(this.mapView);
        }
        drawMap()
      }
    }

    private getRoute(origin, destination) {
        let positions = new java.util.ArrayList();
        positions.add(origin);
        positions.add(destination)
    
        let client = new com.mapbox.services.api.directions.v5.MapboxDirections.Builder()
            .setAccessToken(com.mapbox.mapboxsdk.Mapbox.getAccessToken())
            .setCoordinates(positions)
            .setProfile(com.mapbox.services.api.directions.v5.DirectionsCriteria.PROFILE_DRIVING)
            .setSteps(true)            
            .setOverview(com.mapbox.services.api.directions.v5.DirectionsCriteria.OVERVIEW_FULL)
            .build();

        console.log('Request: ' + client.cloneCall().request());

        client.enqueueCall(new retrofit2.Callback({
            onResponse: (call, response) => {
                // You can get the generic HTTP info about the response
                console.log('Response code: ' + response.code());
                if (response.body() == null) {
                    console.log('No routes found, make sure you set the right user and access token.');
                    return
                } else if (response.body().getRoutes().size() < 1) {
                    console.log('No routes found');
                    return;
                }

                // Print some info about the route
                this.currentRoute = response.body().getRoutes().get(0);
                console.log('Distance: ' + this.currentRoute.getDistance());
                console.log('Legs: ' + this.currentRoute.getLegs().get(0).getSteps())
                android.widget.Toast.makeText(application.android.context, 'Route is ' + this.currentRoute.getDistance() + ' meters long.', android.widget.Toast.LENGTH_SHORT).show();

                // Draw the route on the map
                this.drawRoute(this.currentRoute);
            },
            onFailure: (call, throwable) => {
                console.log('Error: ' + throwable.getMessage());
                android.widget.Toast.makeText(application.android.context, 'Error: ' + throwable.getMessage(), android.widget.Toast.LENGTH_SHORT).show();
            }
        }));
        
    }

    private drawStepPolyline() {
        let lineString = com.mapbox.services.commons.geojson.LineString
            .fromPolyline(this.currentRoute.getLegs().get(0).getSteps().get(this.stepCount).getGeometry(),
            com.mapbox.services.Constants.PRECISION_6
        );
        let coordinates = lineString.getCoordinates();
        let points = new java.util.ArrayList();

        for (let i = 0; i < coordinates.size(); i++) {
            points.add(
                new com.mapbox.mapboxsdk.geometry.LatLng(coordinates.get(i).getLatitude(), coordinates.get(i).getLongitude())
            );
        }

        if (this.stepPolyline) {
            this.mapView.mapboxMap.removePolyline(this.stepPolyline);
        }

        this.stepPolyline = this.mapView.mapboxMap
        .addPolyline(new com.mapbox.mapboxsdk.annotations.PolylineOptions()
            .addAll(points)
            .color(new Color('#e55e5e').android)
            .width(5)
        );
    }

    private drawDistanceRoutePolyline(snappedPosition) {
        console.log('SnappedPosition', snappedPosition)
        // Decode the geometry and draw the route from current position to end of route
        let routeCoords = com.mapbox.services.commons.utils.PolylineUtils.decode(this.currentRoute.getGeometry(), com.mapbox.services.Constants.PRECISION_6);

        // remove old line
        if (this.distanceRoutePolyline) {
            this.mapView.mapboxMap.removePolyline(this.distanceRoutePolyline);
        }

        let slicedRouteLine = new com.mapbox.services.api.utils.turf.TurfMisc.lineSlice(
            com.mapbox.services.commons.geojson.Point.fromCoordinates(snappedPosition),
            com.mapbox.services.commons.geojson.Point.fromCoordinates(routeCoords.get(routeCoords.size() - 1)),
            com.mapbox.services.commons.geojson.LineString.fromCoordinates(routeCoords)
        );

        let linePositions = slicedRouteLine.getCoordinates();
        let lineLatLng = new java.util.ArrayList();

        for (let i = 0; i < linePositions.size(); i++) {
            lineLatLng.add(new com.mapbox.mapboxsdk.geometry.LatLng(linePositions(i).getLatitude(), linePositions(i).getLongitude()));
        }

        this.distanceRoutePolyline = this.mapView.mapboxMap.addPolyline(new com.mapbox.mapboxsdk.annotations.PolylineOptions()
            .addAll(lineLatLng)
            .color(new Color('#3887be').android)
            .width(5)
        );
    }

    private drawRoute(route) {
        let lineString = com.mapbox.services.commons.geojson.LineString.fromPolyline(route.getGeometry(), com.mapbox.services.Constants.PRECISION_6);
        let coordinates = lineString.getCoordinates();

        let points = new java.util.ArrayList();

        console.log('coordinates size:' + coordinates.size())
        console.log('Points: ' + points)        
        for (let i = 0; i < coordinates.size(); i++) {
            points.add(new com.mapbox.mapboxsdk.geometry.LatLng(coordinates.get(i).getLatitude(), coordinates.get(i).getLongitude()));
        }

        // Draw Points on MapView
        this.mapView.mapboxMap.addPolyline(new com.mapbox.mapboxsdk.annotations.PolylineOptions()
        .addAll(points)
        .color(new Color('#e55e5e').android)
        .width(5));
    }

    private start(point) {
        console.log('point', point)
        if (this.userLocation) {
            this.mapView.mapboxMap.removeMarker(this.userLocation);
        }
        if (this.snappedLocation) {
            this.mapView.mapboxMap.removeMarker(this.snappedLocation);
        }

        console.log('Here 0')
        this.userLocation = this.mapView.mapboxMap.addMarker(new com.mapbox.mapboxsdk.annotations.MarkerOptions().setPosition(point));

        console.log('Here 1')
        console.log(this.currentRoute.getLegs().get(0))
        let snappedPosition = com.mapbox.services.android.navigation.v5.RouteUtils.getSnapToRoute(
            com.mapbox.services.commons.models.Position.fromCoordinates(point.getLongitude(), point.getLatitude()), this.currentRoute.getLegs().get(0), stepCount
        );

        console.log('Here 2')
        if (snappedPosition == null) {
            console.log('snapPosition is null');
            return;
        }

        this.snappedLocation = this.mapView.mapboxMap.addMarker(new com.mapbox.mapboxsdk.annotations.MarkerOptions()
            .setPosition(new com.mapbox.mapboxsdk.geometry.LatLng(snappedPosition.getLatitude(), snappedPosition.getLongitude()))
        );

        this.drawDistanceRoutePolyline(snappedPosition);


        // Decode the geometry and draw the route from current position to start of next step.
        let coords = com.mapbox.services.commons.utils.PolylineUtils.decode(
            this.currentRoute.getLegs().get(0).getSteps().get(stepCount).getGeometry(),
            com.mapbox.services.Constants.PRECISION_6);

        // remove old line
        if (this.distancePolyline != null) {
            this.mapView.mapboxMap.removePolyline(this.distancePolyline);
        }

        let slicedLine = new com.mapbox.services.api.utils.turf.TurfMisc.lineSlice(
            com.mapbox.services.commons.geojson.Point.fromCoordinates(snappedPosition),
            com.mapbox.services.commons.geojson.Point.fromCoordinates(coords.get(coords.size() - 1)),
            com.mapbox.services.commons.geojson.LineString.fromCoordinates(coords)
        );

        let linePositions = slicedLine.getCoordinates();
       
        let lineLatLng = new java.util.ArrayList();
     
        for (let i = 0; i < linePositions.size(); i++) {
            lineLatLng.add(new com.mapbox.mapboxsdk.geometry.LatLng(linePositions.get(i).getLatitude(), linePositions.get(i).getLongitude()));
        }

        // Draw Points on MapView
        this.mapView.mapboxMap.addPolyline(new com.mapbox.mapboxsdk.annotations.PolylineOptions()
        .addAll(lineLatLng)
        .color(new Color('#f1f075').android)
        .width(5));
    }
}

const _getMapboxMapOptions = (settings) => {
  const mapboxMapOptions = new com.mapbox.mapboxsdk.maps.MapboxMapOptions()
      .styleUrl(com.mapbox.mapboxsdk.constants.Style.MAPBOX_STREETS)    
  return mapboxMapOptions;
};
