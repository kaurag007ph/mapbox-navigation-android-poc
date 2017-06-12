import * as application from 'application'
import * as utils from "utils/utils";
import { Color } from 'color';
import { View } from 'ui/core/view';
import { StackLayout } from 'ui/layouts/stack-layout'
import { 
  Mapbox,
  AddGeoJsonClusteredOptions,
  MapboxMarker, AddPolygonOptions, AddPolylineOptions, AnimateCameraOptions, DeleteOfflineRegionOptions,
  DownloadOfflineRegionOptions, LatLng,
  MapboxApi,
  MapboxCommon,
  MapboxViewBase,
  MapStyle, OfflineRegion, SetCenterOptions, SetTiltOptions, SetViewportOptions, SetZoomLevelOptions, ShowOptions,
  Viewport
} from 'nativescript-mapbox'

declare var com, retrofit2, java, android: any
let locationEngine = null
let routeLine
let accessToken = 'pk.eyJ1Ijoia2F1cmFnMDA3IiwiYSI6ImNpeW03cHZjNzAwMzMzM2w3MjZsMjFkb3AifQ.3fDvF714qVeY8K44oXLY1w'

const ACCESS_FINE_LOCATION_PERMISSION_REQUEST_CODE = 111

export class MapboxNavigation extends StackLayout {
    private navigation: any
    private mapView: any

    destroy() {
      console.log('destroy')
      return
    }
    getNativeMapView(): any {
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

    initMap() {

      if (!this.mapView && accessToken) {
        com.mapbox.mapboxsdk.Mapbox.getInstance(this._context, accessToken);

        let drawMap = () => {
          this.mapView = new com.mapbox.mapboxsdk.maps.MapView(this._context, _getMapboxMapOptions({
            zoomLevel: 12,
            // center: {
            //   lat: 55.687199,
            //   lng: 12.526923
            // }
          }));

          this.mapView.onCreate(null);
          this.mapView.getMapAsync(
              new com.mapbox.mapboxsdk.maps.OnMapReadyCallback({
                onMapReady: (mbMap) => {
                  this.mapView.mapboxMap = mbMap
                  this.mapView.mapboxMap.setMyLocationEnabled(true);
                  this.mapView.mapboxMap.getTrackingSettings().setMyLocationTrackingMode(com.mapbox.mapboxsdk.constants.MyLocationTracking.TRACKING_FOLLOW);
                  this.mapView.mapboxMap.getTrackingSettings().setDismissAllTrackingOnGesture(false);
                  this.mapView.mapboxMap.moveCamera(com.mapbox.mapboxsdk.camera.CameraUpdateFactory.zoomBy(12))
                  setTimeout(() => {
                    this.initMapNavigation()
                  }, 1000)
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

    initMapNavigation() {
      this.navigation = new com.mapbox.services.android.navigation.v5.MapboxNavigation(this._context, accessToken)
      this.navigation.addProgressChangeListener(new com.mapbox.services.android.navigation.v5.listeners.ProgressChangeListener({
        onProgressChange: (location, routeProgress) => {
          console.log('progress', location)
          console.log(routeProgress.getFractionTraveled())
          let newOrigin = com.mapbox.services.commons.models.Position.fromCoordinates(location.getLongitude(), location.getLatitude())
          this.getRoute(newOrigin).then((route) => {
            this.drawRouteLine(route)
          })
        }
      }));
      this.navigation.addAlertLevelChangeListener(new com.mapbox.services.android.navigation.v5.listeners.AlertLevelChangeListener({
        onAlertLevelChange: (alertLevel, routeProgress) => {
          console.log('routeProgress', routeProgress)
        }
      }));
      this.navigation.addNavigationEventListener(new com.mapbox.services.android.navigation.v5.listeners.NavigationEventListener({
        onRunning: (onRunning) => {
          console.log('Navigation', onRunning)
        }
      }));

      locationEngine = new com.mapbox.services.android.location.LostLocationEngine(this._context)
      locationEngine.setInterval(0);
      locationEngine.setPriority(com.mapbox.services.android.telemetry.location.LocationEnginePriority.HIGH_ACCURACY)
      locationEngine.setFastestInterval(1000)
      locationEngine.activate()

      let myLocation = this.mapView.mapboxMap.getMyLocation()
      let origin = com.mapbox.services.commons.models.Position.fromCoordinates(myLocation.getLongitude(), myLocation.getLatitude())

      this.getRoute(origin).then((route) => {
          this.drawRouteLine(route)
          this.navigation.startNavigation(route);
      })
  }
  
  getRoute(origin) {
    return new Promise((resolve) => {
      let destination = com.mapbox.services.commons.models.Position.fromCoordinates(121.050864, 14.517618)
      this.navigation.getRoute(origin, destination, new retrofit2.Callback({
        onResponse: (call, response) => {
          let route = response.body().getRoutes().get(0)

          resolve(route)
        },
        onFailure: function(error) {
          console.log('onFailure', error)
        }
      }))
    })
  }

  drawRouteLine(route) {
    let positions = com.mapbox.services.commons.geojson.LineString.fromPolyline(route.getGeometry(), com.mapbox.services.Constants.PRECISION_6).getCoordinates()
    let latLngs = new java.util.ArrayList();
    
    const polylineOptions = new com.mapbox.mapboxsdk.annotations.PolylineOptions();
    polylineOptions.width(7)
    polylineOptions.color(new Color('#5189c6').android)

    for (let i = 0; i < positions.size(); i++) {
      polylineOptions.add(new com.mapbox.mapboxsdk.geometry.LatLng(positions.get(i).getLatitude(), positions.get(i).getLongitude()))
    }

    if (routeLine) {
      this.mapView.mapboxMap.removePolyline(routeLine)
    }

    routeLine = this.mapView.mapboxMap.addPolyline(polylineOptions);
  }

    requestFineLocationPermission(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (_fineLocationPermissionGranted()) {
        resolve();
        return;
      }

      // grab the permission dialog result
      application.android.on(application.AndroidApplication.activityRequestPermissionsEvent, (args: any) => {
        for (let i = 0; i < args.permissions.length; i++) {
          if (args.grantResults[i] === android.content.pm.PackageManager.PERMISSION_DENIED) {
            reject("Permission denied");
            return;
          }
        }
        resolve();
      });

      // invoke the permission dialog
      android.support.v4.app.ActivityCompat.requestPermissions(
          application.android.foregroundActivity,
          [android.Manifest.permission.ACCESS_FINE_LOCATION],
          ACCESS_FINE_LOCATION_PERMISSION_REQUEST_CODE);
    });
  }
  

}

const _fineLocationPermissionGranted = () => {
  let hasPermission = android.os.Build.VERSION.SDK_INT < 23; // Android M. (6.0)
  if (!hasPermission) {
    hasPermission = android.content.pm.PackageManager.PERMISSION_GRANTED ===
        android.support.v4.content.ContextCompat.checkSelfPermission(application.android.foregroundActivity, android.Manifest.permission.ACCESS_FINE_LOCATION);
  }
  return hasPermission;
};

const _getMapStyle = (input: any) => {
  const Style = com.mapbox.mapboxsdk.constants.Style;
  // allow for a style URL to be passed
  if (/^mapbox:\/\/styles/.test(input)) {
    return input;
  }
  if (input === MapStyle.LIGHT || input === MapStyle.LIGHT.toString()) {
    return Style.LIGHT;
  } else if (input === MapStyle.DARK || input === MapStyle.DARK.toString()) {
    return Style.DARK;
  } else if (input === MapStyle.OUTDOORS || input === MapStyle.OUTDOORS.toString()) {
    return Style.OUTDOORS;
  } else if (input === MapStyle.SATELLITE || input === MapStyle.SATELLITE.toString()) {
    return Style.SATELLITE;
  } else if (input === MapStyle.HYBRID || input === MapStyle.SATELLITE_STREETS || input === MapStyle.HYBRID.toString() || input === MapStyle.SATELLITE_STREETS.toString()) {
    return Style.SATELLITE_STREETS;
  } else {
    // default
    return Style.MAPBOX_STREETS;
  }
};


const _getMapboxMapOptions = (settings) => {
  const resourcename = "mapbox_mylocation_icon_default";
  const res = utils.ad.getApplicationContext().getResources();
  const identifier = res.getIdentifier(resourcename, "drawable", utils.ad.getApplication().getPackageName());
  const iconDrawable = android.support.v4.content.ContextCompat.getDrawable(application.android.context, identifier);

  const mapboxMapOptions = new com.mapbox.mapboxsdk.maps.MapboxMapOptions()
      .styleUrl(_getMapStyle(settings.style))
      .compassEnabled(!settings.hideCompass)
      .rotateGesturesEnabled(!settings.disableRotation)
      .scrollGesturesEnabled(!settings.disableScroll)
      .tiltGesturesEnabled(!settings.disableTilt)
      .zoomGesturesEnabled(!settings.disableZoom)
      .attributionEnabled(!settings.hideAttribution)
      .myLocationForegroundDrawable(iconDrawable)
      // .myLocationBackgroundDrawable(iconDrawable)
      .myLocationForegroundTintColor(android.graphics.Color.rgb(135, 206, 250)) // "lightskyblue"
      // .myLocationBackgroundTintColor(android.graphics.Color.YELLOW)
      .myLocationAccuracyTint(android.graphics.Color.rgb(135, 206, 250)) // "lightskyblue"
      .myLocationAccuracyAlpha(80)
      .logoEnabled(!settings.hideLogo);

  // zoomlevel is not applied unless center is set
  if (settings.zoomLevel && !settings.center) {
    // Eiffel tower, Paris
    settings.center = {
      lat: 48.858093,
      lng: 2.294694
    };
  }

  if (settings.center && settings.center.lat && settings.center.lng) {
    const cameraPositionBuilder = new com.mapbox.mapboxsdk.camera.CameraPosition.Builder()
        .zoom(settings.zoomLevel)
        .target(new com.mapbox.mapboxsdk.geometry.LatLng(settings.center.lat, settings.center.lng));
    mapboxMapOptions.camera(cameraPositionBuilder.build());
  }

  return mapboxMapOptions;
};