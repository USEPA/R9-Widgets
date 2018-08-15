# Smoke Widget

This widget displays georeferenced transparent PNGs obtained from <a href="https://sites.google.com/firenet.gov/wfaqrp-airfire-info/daily-run-viewer">USFS R&D BlueSky Framework</a>

The images are harvested using the get_airfire_images.py script found <a href="https://github.com/USEPA/R9-Python/blob/master/BlueSky/get_airfire_images.py">here</a>.

Once images have been harvested you will need to update the root_url attribute to point to the location of the hosted images. Each time the widget loads it will look for the latest images avilable based on the time stamps of the folders created by the harvesting script.  Additionally, the names of the files can not be changed as this is what the widget uses to determine the timestamp of the image.

### Contact Information

* **Cheryl Henley**, GIS Coordinator 415-972-3586 henley.cheryl@epa.gov
* **Travis Bock**, Geospatial Developer 757-201-8188 bock.travis@epa.gov

