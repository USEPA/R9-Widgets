import React from "react";
import {shallow, configure} from "enzyme";

import _Widget from "../src/runtime/widget";
import {wrapWidget} from "jimu-for-test";
import { screen} from '@testing-library/react'
// setup file
import * as Adapter from "enzyme-adapter-react-16";
import {mockFeatureLayer, widgetRender, MockFeatureLayerData} from "../../../../jimu-for-test";
import {unmountComponentAtNode} from "react-dom";
import {ArcGISServerInfo, ServiceDefinition} from "../../../../jimu-core";
import SpatialReference from "esri/geometry/SpatialReference";
import Extent from "esri/geometry/Extent";
import {fireEvent, queryByRole, queryByTestId} from "@testing-library/dom";

// jest.mock("esri/geometry/SpatialReference", ( ()=>{ return {
//     __esModule: true
// }}));
// jest.mock('esri/layers/FeatureLayer',  ( ()=>{ return {
//     __esModule: true
// }}));
// jest.mock('esri/geometry/Extent',  ( ()=>{ return {
//     __esModule: true
// }}));

// beforeAll(() => {
    let config = {

    }
    const render = widgetRender();
const Widget = wrapWidget(_Widget, {config: {}});
// })

// let props;
// let server: ArcGISServerInfo = {
//     currentVersion: 10.81,
//     fullVersion: '10.8.1',
//     authInfo: {
//         isTokenBasedSecurity: true,
//         tokenServicesUrl: 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/tokens'
//     }
// }
//
// let layerSR: SpatialReference = new SpatialReference({wkid: 102100})
// let layerExtent: Extent = new Extent({xmax:-161.52099999999726, xmin: 18.47899999999968,
//     ymax: -26.520999999999553, ymin: 54.05899999999908
// });
// let layerDef: ServiceDefinition = {
//     name: "R9Notifiable",
//     type: "Feature Service",
//     description: "",
//     extent: layerExtent,
//     spatialReference: layerSR
// }
//
// let data: MockFeatureLayerData = {
//     layerDefinition: layerDef,
//     url: "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9Notifiable/FeatureServer/0",
//     serverInfo: server,
//
// }

// beforeEach(() => {
//     props = {
//         all_fires: {
//             perimeterBufferFC: mockFeatureLayer(data)
//         }
//     }
// });


// jest.mock('../src/runtime/widget', () => {
//     return {
//         return jest.fn().mockImplementation(moduleId => {
//             jest.fn().mockImplementation(() => {
//                     return {
//                         queryFeatureCount: () => Promise.resolve(5)
//                     }
//                 // })
//             })
//         })
//     }
// })

configure({adapter: new Adapter()});

describe("TestWidget", function () {


    it('sets up widget, checks legend items', () => {
        // mock function for when the component mounts
        _Widget.prototype.componentDidMount = jest.fn();

        const {queryByText} = render(<Widget/>);

        // we are checking that the legend is rendered
        expect(queryByText('Percent Contained')).toBeTruthy();
        expect(queryByText('Percent Not Contained')).toBeTruthy();
    });

    it('check component updates and toggles fires when switch is clicked', () => {
        // mock functions and implementations for functions we are interested on in this test
        let didUpdate = _Widget.prototype.componentDidUpdate = jest.fn();
        // first option for checking on fireToggle (commented out)
        // let fireToggle = _Widget.prototype.toggleFires = jest.fn();
        // fireToggle.mockImplementation(() => 'toggled');

         // second option, spyOn sample, another method for checking if it is called
        let fireToggle = jest.spyOn(_Widget.prototype, 'toggleFires').mockImplementation(() => 'toggled');

        // widget renderer
        const render = widgetRender();

        let {queryByTestId} = render(<Widget/>)
         // get the element
        let element = queryByTestId('fire-switch');
        fireEvent.click(element);

        // assert that these methods are called when the fire-switch is clicked
        expect(fireToggle).toHaveBeenCalled();
        expect(didUpdate).toHaveBeenCalled();
    });

});
