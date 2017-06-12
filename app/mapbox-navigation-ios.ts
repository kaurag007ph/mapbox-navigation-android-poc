import { StackLayout } from 'ui/layouts/stack-layout';

declare var CLLocationCoordinate2D, Waypoint, RouteOptions, Directions, NavigationViewController, UIAplication: any
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

        if (true) {
            let originCoordinates = CLLocationCoordinate2D(38.9131752, -77.0324047)
            let destinationCoordinates = CLLocationCoordinate2D(38.8977, -77.0365)

            let origin = Waypoint(originCoordinates, "Mapbox")
            let destination = Waypoint(destinationCoordinates, "White House")
            
            let options = RouteOptions([origin, destination])

            options.includesSteps = true
            options.routeShapeResolution = true
            
            Directions.shared.calculate(options, (waypoints, routes, error) => {
                if (routes) {
                    let route = routes.first
                    this._navigation = NavigationViewController(route)
                    rootVC().presentViewControllerAnimatedCompletion(this._navigation, true, null)
                }
            })
        }
    }
}

const rootVC = function() {
    let appWindow = UIAplication.sharedApplication.keyWindow
    return appWindow.rootViewController
}