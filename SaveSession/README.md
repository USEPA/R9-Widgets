# SaveSession-Widget
The SaveSession Widget for ArcGIS Web AppBuilder enables users to save the current map settings into a session and restore them again later. A saved session includes the extent, visible layers and annotations of the current map. Sessions may be saved and loaded from files so they can be shared with others.

##Using the Widget
The SaveSession Widget is an in-panel widget that will be displayed in the toolbar of your WebApp Builder application.

### Saving a Session
Once you have the map just the way you want it - zoomed to the area and layers turned on, enter a name for the session and click the Save button. The session will be added to the Saved Sessions list.

### Enable a Session
To return the map to the same state as when you saved the session, you can double-click the title of the session to load the map.

### Managing Sessions in the List
Hover over the Actions column for a session entry to reveal the actions that can be performed on the entry. 

1. Load Map = will load the selected session to the current map

2. Download Map = will save the session entry to a file that may be shared.

3. Edit = allows the user to change the session name

4. Move Up - Down = lets you arrange the entries in the session list in the desired order
5. Delete = click the Delete button to remove the entry from the list

### Sharing Sessions
Saved Sessions may be shared with other users or another browser on the same PC by saving the session to a file and then loading the session from the file into the session list.

To save a single session to a file, click the Download Map action for the entry. To save all sessions in the list to a file, click the Save to file link.

To load the sessions from a file, click the Load from file link to display the Load sessions from file dialog

Click the Choose File button and select the file to load. The selected file must be a saved session file. All sessions from the file will be loaded. If a loaded session has the same name as an existing session, a number will be appended to the session to make the name unique.

## Adding the Widget to the Web AppBuilder
To add this widget to your ArcGIS WebApp Builder: 

1. download the zip file of the widgets
2. unzip the contents and move the SaveSession folder into client\stemapp\widgets
3. add the widget through the WAB Developer UI to your WAB project the same as any of the defuilt widgets

Example:

	"widgets": [  
        {
	        "name": "SaveSession",
	        "version": "1.3.1",
	        "IsController": false,
	        "uri": "widgets/SaveSession/Widget",
	        "config": "configs/SaveSession/config_widgets_SaveSession_Widget_38.json",
	        "index": 10,
	        "id": "widgets_SaveSession_Widget_38"
      	},
    	...
    ]

## Configuring the Widget
Using the Web AppBuilder, click the edit icon on the SaveSession widget in the in-panel widgets to display the Configure Dialog.

**Use Server To Download File** = Leave this box unchecked

**Url for Save To File** = example: https://r9.ercloud.org/R9WAB/statejson/

**Filename for All Sessions** = the file name to use when the Save to File link is clicked.

**Filename for 1 Session** = the file name to use when the Download action is used to save a single session to a file. Include the "{name}" placeholder that will be replaced with the session name at runtime.   

## Authors

Original widget was downloaded from this GeoNet URL: https://community.esri.com/docs/DOC-7661-savesession-widget

Modified and implemented by
**David Wood** - [dwood@innovateteam.com](mailto:dwood@innovateteam.com)
**Travis Bock** - [tbock@innovateteam.com](mailto:tbock@innovateteam.com)