# RMP Widget

The RMP Identify widget is designed to display a subset the of the RMP data available for a selected site.  It does not display all available information in the RMP dataset.  Please use RMP*Review to obtain all available information about a given facility's RMP.

The widget needs to be configured prior to usage but prior to configuration the RMP map service needs to be added to the map.  Add <insert geoplatform url here> to the WAB map.  Download a copy of this widget from <a href="https://github.com/USEPA/R9-Widgets/releases/tag/RMP_v1">releases</a>.  Place the widget in the `\client\stemapp\widgets` folder of the Developer Edition of the ESRI WAB.  Navigate to the Widget tab of the Web AppBuilder configuration tool for the WebApp you would like to deploy it to.   Add the widget and configure it.  Set the Facility Layer to the All Facilities layer of the RMP service and set the Status Layer to the Admin Refresh Info layer of the RMP service.  Your configuration page should look similar to this:
[[https://user-images.githubusercontent.com/4040295/44278627-710bcb00-a203-11e8-84a8-fafbead5459b.png]]
