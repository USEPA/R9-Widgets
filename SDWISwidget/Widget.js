var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "jimu/BaseWidget", "./support/declareDecorator"], function (require, exports, BaseWidget, declareDecorator_1) {
    declareDecorator_1 = __importDefault(declareDecorator_1);
    /// <amd-dependency path="jimu/BaseWidget" name="BaseWidget" />
    var Widget = /** @class */ (function () {
        function Widget() {
            this.baseClass = 'sdwis-widget';
            // private startup(): void {
            //   let self: any = this;
            //   self.inherited(arguments);
            //   console.log('SDWISwidget::startup');
            // };
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
        Widget.prototype.postCreate = function (args) {
            var self = this;
            self.inherited(arguments);
            console.log('SDWISwidget::postCreate');
        };
        Widget = __decorate([
            declareDecorator_1.default(BaseWidget)
        ], Widget);
        return Widget;
    }());
    return Widget;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vd2lkZ2V0cy9TRFdJU3dpZGdldC9XaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7SUFDQSwrREFBK0Q7SUFtQi9EO1FBQUE7WUFDUyxjQUFTLEdBQVcsY0FBYyxDQUFDO1lBVTFDLDRCQUE0QjtZQUM1QiwwQkFBMEI7WUFDMUIsK0JBQStCO1lBQy9CLHlDQUF5QztZQUN6QyxLQUFLO1lBQ0wsMkJBQTJCO1lBQzNCLHdDQUF3QztZQUN4QyxLQUFLO1lBQ0wsNEJBQTRCO1lBQzVCLHlDQUF5QztZQUN6QyxLQUFLO1lBQ0wsK0JBQStCO1lBQy9CLDRDQUE0QztZQUM1QyxLQUFLO1lBQ0wsK0JBQStCO1lBQy9CLDRDQUE0QztZQUM1QyxLQUFLO1lBQ0wsdUNBQXVDO1lBQ3ZDLHNEQUFzRDtZQUN0RCxLQUFLO1lBQ0wsOEJBQThCO1lBQzlCLDJDQUEyQztZQUMzQyxLQUFLO1lBQ0wscUNBQXFDO1lBQ3JDLGtEQUFrRDtZQUNsRCxLQUFLO1lBQ0wsMkJBQTJCO1lBQzNCLHdDQUF3QztZQUN4QyxLQUFLO1FBQ1AsQ0FBQztRQWxDUywyQkFBVSxHQUFsQixVQUFtQixJQUFTO1lBQzFCLElBQU0sSUFBSSxHQUFRLElBQUksQ0FBQztZQUN2QixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzFCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBVkcsTUFBTTtZQURYLDBCQUFPLENBQUMsVUFBVSxDQUFDO1dBQ2QsTUFBTSxDQXdDWDtRQUFELGFBQUM7S0FBQSxBQXhDRCxJQXdDQztJQUVELE9BQVMsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaklNVSAoV0FCKSBpbXBvcnRzOlxyXG4vLy8gPGFtZC1kZXBlbmRlbmN5IHBhdGg9XCJqaW11L0Jhc2VXaWRnZXRcIiBuYW1lPVwiQmFzZVdpZGdldFwiIC8+XHJcbmRlY2xhcmUgdmFyIEJhc2VXaWRnZXQ6IGFueTsgLy8gdGhlcmUgaXMgbm8gdHMgZGVmaW5pdGlvbiBvZiBCYXNlV2lkZ2V0ICh5ZXQhKVxyXG4vLyBkZWNsYXJlRGVjb3JhdG9yIC0gdG8gZW5hYmxlIHVzIHRvIGV4cG9ydCB0aGlzIG1vZHVsZSB3aXRoIERvam8ncyBcImRlY2xhcmUoKVwiIHN5bnRheCBzbyBXQUIgY2FuIGxvYWQgaXQ6XHJcbmltcG9ydCBkZWNsYXJlIGZyb20gJy4vc3VwcG9ydC9kZWNsYXJlRGVjb3JhdG9yJztcclxuXHJcbi8vIGVzcmkgaW1wb3J0czpcclxuaW1wb3J0IEVzcmlNYXAgZnJvbSAnZXNyaS9tYXAnO1xyXG5cclxuLy8gZG9qbyBpbXBvcnRzOlxyXG4vLyBpbXBvcnQgb24gZnJvbSAnZG9qby9vbic7XHJcblxyXG5pbXBvcnQgSUNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XHJcblxyXG5pbnRlcmZhY2UgSVdpZGdldCB7XHJcbiAgYmFzZUNsYXNzOiBzdHJpbmc7XHJcbiAgY29uZmlnPzogSUNvbmZpZztcclxufVxyXG5cclxuQGRlY2xhcmUoQmFzZVdpZGdldClcclxuY2xhc3MgV2lkZ2V0IGltcGxlbWVudHMgSVdpZGdldCB7XHJcbiAgcHVibGljIGJhc2VDbGFzczogc3RyaW5nID0gJ3Nkd2lzLXdpZGdldCc7XHJcbiAgcHVibGljIGNvbmZpZzogSUNvbmZpZztcclxuXHJcbiAgcHJpdmF0ZSBtYXA6IEVzcmlNYXA7XHJcblxyXG4gIHByaXZhdGUgcG9zdENyZWF0ZShhcmdzOiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnN0IHNlbGY6IGFueSA9IHRoaXM7XHJcbiAgICBzZWxmLmluaGVyaXRlZChhcmd1bWVudHMpO1xyXG4gICAgY29uc29sZS5sb2coJ1NEV0lTd2lkZ2V0Ojpwb3N0Q3JlYXRlJyk7XHJcbiAgfVxyXG4gIC8vIHByaXZhdGUgc3RhcnR1cCgpOiB2b2lkIHtcclxuICAvLyAgIGxldCBzZWxmOiBhbnkgPSB0aGlzO1xyXG4gIC8vICAgc2VsZi5pbmhlcml0ZWQoYXJndW1lbnRzKTtcclxuICAvLyAgIGNvbnNvbGUubG9nKCdTRFdJU3dpZGdldDo6c3RhcnR1cCcpO1xyXG4gIC8vIH07XHJcbiAgLy8gcHJpdmF0ZSBvbk9wZW4oKTogdm9pZCB7XHJcbiAgLy8gICBjb25zb2xlLmxvZygnU0RXSVN3aWRnZXQ6Om9uT3BlbicpO1xyXG4gIC8vIH07XHJcbiAgLy8gcHJpdmF0ZSBvbkNsb3NlKCk6IHZvaWQge1xyXG4gIC8vICAgY29uc29sZS5sb2coJ1NEV0lTd2lkZ2V0OjpvbkNsb3NlJyk7XHJcbiAgLy8gfTtcclxuICAvLyBwcml2YXRlIG9uTWluaW1pemUoKTogdm9pZCB7XHJcbiAgLy8gICBjb25zb2xlLmxvZygnU0RXSVN3aWRnZXQ6Om9uTWluaW1pemUnKTtcclxuICAvLyB9O1xyXG4gIC8vIHByaXZhdGUgb25NYXhpbWl6ZSgpOiB2b2lkIHtcclxuICAvLyAgIGNvbnNvbGUubG9nKCdTRFdJU3dpZGdldDo6b25NYXhpbWl6ZScpO1xyXG4gIC8vIH07XHJcbiAgLy8gcHJpdmF0ZSBvblNpZ25JbihjcmVkZW50aWFsKTogdm9pZCB7XHJcbiAgLy8gICBjb25zb2xlLmxvZygnU0RXSVN3aWRnZXQ6Om9uU2lnbkluJywgY3JlZGVudGlhbCk7XHJcbiAgLy8gfTtcclxuICAvLyBwcml2YXRlIG9uU2lnbk91dCgpOiB2b2lkIHtcclxuICAvLyAgIGNvbnNvbGUubG9nKCdTRFdJU3dpZGdldDo6b25TaWduT3V0Jyk7XHJcbiAgLy8gfTtcclxuICAvLyBwcml2YXRlIG9uUG9zaXRpb25DaGFuZ2UoKTogdm9pZCB7XHJcbiAgLy8gICBjb25zb2xlLmxvZygnU0RXSVN3aWRnZXQ6Om9uUG9zaXRpb25DaGFuZ2UnKTtcclxuICAvLyB9O1xyXG4gIC8vIHByaXZhdGUgcmVzaXplKCk6IHZvaWQge1xyXG4gIC8vICAgY29uc29sZS5sb2coJ1NEV0lTd2lkZ2V0OjpyZXNpemUnKTtcclxuICAvLyB9O1xyXG59XHJcblxyXG5leHBvcnQgPSBXaWRnZXQ7XHJcbiJdfQ==
