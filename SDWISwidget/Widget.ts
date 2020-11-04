// jIMU (WAB) imports:
/// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
declare var BaseWidget: any; // there is no ts definition of BaseWidget (yet!)
// declareDecorator - to enable us to export this module with Dojo's "declare()" syntax so WAB can load it:
import declare from './support/declareDecorator';

// esri imports:
import EsriMap from 'esri/map';

// dojo imports:
// import on from 'dojo/on';

import IConfig from './config';

interface IWidget {
  baseClass: string;
  config?: IConfig;
  myvar: any;

}

@declare(BaseWidget)
class Widget implements IWidget {
  public baseClass: string = 'sdwiswidget';
  public config: IConfig;
  public myvar: any = {'variableone'};
  public myvari: any = {};


  private map: EsriMap;

  private postCreate(args: any): void {
    const self: any = this;
    self.inherited(arguments);
    console.log('SDWISwidget::postCreate');
  }
 private startup(): void {

   let self: any = this;
   self.inherited(arguments);
   console.log('SDWISwidget::startup');
   self.myNode.innerHTML = `<b>${self.myvar}SDWISwidget</b>`;
   self.myvari = 'sdwis info';
   //self.myvar.x = 'sdwis data';
 };
  // private onOpen(): void {
  //   console.log('SDWISwidget::onOpen');
  // };
  // private onClose(): void {
  //   console.log('SDWISwidget::onClose');
  // };
  // private onMinimize(): void {
  //   console.log('SDWISwidget::onMinimize');
  // };
  // private onMaximize(): void {
  //   console.log('SDWISwidget::onMaximize');
  // };
  // private onSignIn(credential): void {
  //   console.log('SDWISwidget::onSignIn', credential);
  // };
  // private onSignOut(): void {
  //   console.log('SDWISwidget::onSignOut');
  // };
  // private onPositionChange(): void {
  //   console.log('SDWISwidget::onPositionChange');
  // };
  // private resize(): void {
  //   console.log('SDWISwidget::resize');
  // };
}

export = Widget;
