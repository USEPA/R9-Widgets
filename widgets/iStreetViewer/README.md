# iStreetViewer-Widget
The iStreetViewer Widget for ArcGIS Web AppBuilder enables users to utilize google's street view functionality dirrectly inside the WAB.

### Using the Widget
When the widget first lawnches the user is prompted to click a location on the map. A Dual Maps notice is presented and the user must then click on the "View Map" text.

The widget will then load three views, 
* The top down map view that allows a user to move the little man around to change the streeview.
* The Streetviewer.
* And by scrolling to the right there is a satelite view map.

### Adding the Widget to the Web AppBuilder
To add this widget to your ArcGIS WebApp Builder: 

* download the zip file of the widget
* unzip the contents into client\stemapp\widgets\iStreetViewer directory

![Install Folder](./help/InstallFolder.png)

* edit the \client\stemapp\config.json and enter the iStreetViewer widget in the widgets entry

Example:

	"widgets": [  
        {
            "uri": "widgets/iStreetViewer/Widget"
        }
    	...
    ]

### Configuring the Widget
This widget has no configuration.

## Authors
Developed by Frank Roberts - froberts@innovateteam.com and implemented by David Wood - dwood@innovateteam.com