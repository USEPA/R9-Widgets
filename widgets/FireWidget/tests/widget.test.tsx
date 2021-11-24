import React from "react";
import {shallow, configure} from "enzyme";

import _Widget from "../src/runtime/widget";
import {wrapWidget} from "jimu-for-test";

// setup file
import * as Adapter from "enzyme-adapter-react-16";
import {mockFeatureLayer, widgetRender, MockFeatureLayerData} from "../../../../jimu-for-test";
import {unmountComponentAtNode} from "react-dom";
import {ArcGISServerInfo, ServiceDefinition} from "../../../../jimu-core";
import SpatialReference from "esri/geometry/SpatialReference";
import Extent from "esri/geometry/Extent";

jest.mock("esri/geometry/SpatialReference", () => jest.fn(() => {}));
jest.mock('esri/layers/FeatureLayer', () => jest.fn(() => {}));
jest.mock('esri/geometry/Extent', () => jest.fn(() => {}));
const render = widgetRender();
const Widget = wrapWidget(_Widget, {config: {}});
let props;
let server: ArcGISServerInfo = {
    currentVersion: 10.81,
    fullVersion: '10.8.1',
    authInfo: {
        isTokenBasedSecurity: true,
        tokenServicesUrl: 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/tokens'
    }
}

let layerSR: SpatialReference = new SpatialReference({wkid: 102100})
let layerExtent: Extent = new Extent({xmax:-161.52099999999726, xmin: 18.47899999999968,
    ymax: -26.520999999999553, ymin: 54.05899999999908
});
let layerDef: ServiceDefinition = {
    name: "R9Notifiable",
    type: "Feature Service",
    description: "",
    extent: layerExtent,
    spatialReference: layerSR
}

let data: MockFeatureLayerData = {
    layerDefinition: layerDef,
    url: "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/R9Notifiable/FeatureServer/0",
    serverInfo: server,

}

beforeEach(() => {
    props = {
        all_fires: {
            perimeterBufferFC: mockFeatureLayer(data)
        }
    }
});


// jest.mock('jimu-core', () => {
//     return {
//         ...jest.requireActual('jimu-core') as any,
//         FeatureLayer: jest.fn().mockImplementation(moduleId => {
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
    it('sets fire state of all_fires array and generates acres array', () => {
        const render = widgetRender();
        const Widget = wrapWidget(_Widget, {config: {all_fires: [1, 2, 3]}});


    });
    it('renders app', () => {

        // let a = 1;
        // expect(a).toEqual(1)
        const  render = widgetRender();

        const Widget = wrapWidget(_Widget, {config: {}});
        const {queryByText} = render(<Widget/>);
        expect(queryByText('Percent Contained')).toBeTruthy();
    });
    // it("with config", function () {
    //     // const config = {
    //     //     prop: 1
    //     // };
    //     let Widget = wrapWidget(_Widget, {
    //         // config: config,
    //     });
    //
    //     const {queryByText} = render(<Widget widgetId='1'/>);
    //     expect(queryByText('prop: 1')).toBeTruthy();
    //     // Widget.find('#switch').simulate('click');
    //     // // expect(wrapper.state('checked')).toBeTruthy();
    //
    //
    // });

    it("without config", function() {
      let Widget = wrapWidget(_Widget, {
        manifest: { name: "simple" } as any,
        messages: {}
      });
      let wrapper = shallow(<Widget />).shallow();
      expect(wrapper.find(".widget-simple").length).toEqual(1);
    });
});
