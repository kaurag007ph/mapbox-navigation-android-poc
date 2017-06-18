import { StackLayout } from 'ui/layouts/stack-layout';

declare var CLLocationCoordinate2D, MBWaypoint, MBRouteOptions, MBDirections, MBNavigationViewController, UIAplication: any
// class MyNavigation extends NavigationViewController {

//     viewDidLoad() {
//         super.viewDidLoad()
//     }
// }

export class MapboxNavigation extends StackLayout {
    private _navigation
    private _enable: boolean


    public set enable(value: boolean) {
        this._enable = value

        if (this._enable) {
            let origin = new CLLocationCoordinate2D(<any>{latitude: 14.52299974, longitude: 121.05443895})
            let destination = new CLLocationCoordinate2D(<any> {latitude: 14.51758724, longitude: 121.05094497})
            let originCoordinates = new MBWaypoint(<any>{coordinate: origin, coordinateAccuracy: 10, name: "Mapbox"})
            let destinationCoordinates = new MBWaypoint(<any>{coordinate: destination, coordinateAccuracy: 10, name: "White House"})
            console.log('After waypoint')
            var options = new MBRouteOptions(<any>{waypoints: [originCoordinates, destinationCoordinates], profileIdentifier: MBRouteOptions.automobileAvoidingTraffic });
        
            options.includesSteps = true
            
            console.log('Direction')

            let directions = new MBDirections('pk.eyJ1Ijoia2F1cmFnMDA3IiwiYSI6ImNpeW03cHZjNzAwMzMzM2w3MjZsMjFkb3AifQ.3fDvF714qVeY8K44oXLY1w')
            directions.calculateDirectionsWithOptionsCompletionHandler(options, (waypoints, routes, error) => {
            console.log('Waypoints', waypoints)
            console.log('Routes', routes)
            console.log('Error', error)
                if (routes) {
                    let route = routes[0]
                    this._navigation = MBNavigationViewController(route)
                    rootVC().presentViewControllerAnimatedCompletion(this._navigation, true, null)
                }
            })
        }
    }
}

const rootVC = function() {
    let appWindow = UIApplication.sharedApplication.keyWindow
    return appWindow.rootViewController
}
