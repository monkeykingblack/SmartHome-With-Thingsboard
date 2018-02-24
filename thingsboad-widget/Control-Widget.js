self.onInit = function() {
    var i, device;

    var scope = self.ctx.$scope;
    var settings = self.ctx.settings;
    
    scope.requestTimeout = settings.requestTimeout || 500;
    
    
    
    scope.devicesList = [];
    for (var g = 0; g < settings.devicesList.length; g++) {
        device = settings.devicesList[g];
        scope.devicesList.push({
            label: device.label,
            threshold: device.threshold,
            enabled: false,
        });
    }
    
    scope.columns = [];
    for (i = 0; i < scope.devicesList.length; i++) {
        devices = scope.devicesList[i];
        scope.columns.push(devices);
    }
    
    scope.devicesRequest ={
        method: "",
        paramsBody: "{}"
    }
    
    scope.changeRequest = {
        method: "setThreshold",
        paramsBody: "{\n   \"label\": \"{$label}\",\n   \"threshold\": \"{$threshold}\"\n}"
    };
    
    scope.parseDevicesThresholdFunction = function(body, label) {
        if (body[label]){
            return body[label]
        }
    }
    
    scope.parseDevicesStatusFunction = function(body, label) {
            return body[label] === true;
    }
    
    function requestDevices(method) {
        scope.devicesRequest.method = method;
        self.ctx.controlApi.sendTwoWayCommand(scope.devicesRequest.method, 
                            scope.devicesRequest.paramsBody, 
                            scope.requestTimeout)
            .then(
                function success(responseBody) {
                    for (var g = 0; g < scope.devicesList.length; g++) {
                        var device = scope.devicesList[g];
                        if(method==='getThreshold'){
                            var value = scope.parseDevicesThresholdFunction.apply(this, [responseBody, device.label]);
                            device.threshold = value;
                        } else if(method==='getStatus'){
                            value = scope.parseDevicesStatusFunction.apply(this, [responseBody, device.label]);
                            device.enabled = value;
                        }
                    }
                }
            );
    }
    
    function requestChangeThreshold(device){
        var label = device.label;
        var threshold = device.threshold+ '';
        var method = "setThreshold"
        var paramsBody = scope.changeRequest.paramsBody;
        var requestBody = JSON.parse(paramsBody.replace("\"{$label}\"",JSON.stringify(label)).replace("\"{$threshold}\"", threshold));
        self.ctx.controlApi.sendTwoWayCommand(method, 
                            requestBody, scope.requestTimeout)
            .then(
                function success(responseBody) {
                    for (var g = 0; g < scope.devicesList.length; g++) {
                        var threshold = scope.parseDevicesThresholdFunction.apply(this, [responseBody, device.label]);
                        device.threshold = threshold;
                    }
                }
            );
    }
    
    function requestChangeState(state, device){
        var label = device.label + '';
        var method ='setState';
        var enabled = state === "On" ? 'true' : 'false';
        var paramsBody = scope.changeRequest.paramsBody;
        console.log(enabled)
        var requestBody = JSON.parse(paramsBody.replace("\"{$label}\"",JSON.stringify(label)).replace("\"threshold\"", "\"enabled\"").replace("\"{$threshold}\"", enabled));
        console.log(requestBody)
        self.ctx.controlApi.sendTwoWayCommand(method, 
                            requestBody, scope.requestTimeout)
            .then(
                function success(responseBody) {
                    for (var g = 0; g < scope.devicesList.length; g++) {
                        var enabled = scope.parseDevicesStatusFunction.apply(this, [responseBody, device.label]);
                        device.enabled = enabled;
                    }
                }
            );
    }
    
    scope.setThreshold = function($event, device){
        requestChangeThreshold(device);
    }
    
    scope.ctrlDevice = function($event,state, device){
        requestChangeState(state, device);
    }
    
    requestDevices('getThreshold');
    requestDevices('getStatus');

}
// self.onDataUpdated = function() {
//     var changed = false;
//     for (var d = 0; d < self.ctx.data.length; d++) {
//         var cellData = self.ctx.data[d];
//         var dataKey = cellData.dataKey;
//         var gpio = self.ctx.$scope.gpioByPin[dataKey.label];
//         if (gpio) {
//             var enabled = false;
//             if (cellData.data.length > 0) {
//                 var tvPair = cellData.data[cellData.data
//                     .length - 1];
//                 enabled = (tvPair[1] === true || tvPair[
//                     1] === 'true');
//             }
//             if (gpio.enabled != enabled) {
//                 changed = true;
//                 gpio.enabled = enabled;
//             }
//         }
//     }
//     if (changed) {
//         self.ctx.$scope.$digest();
//     }
// }

// self.onResize = function() {
//     var rowCount = self.ctx.$scope.rows.length;
//     var prefferedRowHeight = (self.ctx.height - 35) /
//         rowCount;
//     prefferedRowHeight = Math.min(32,
//         prefferedRowHeight);
//     prefferedRowHeight = Math.max(12,
//         prefferedRowHeight);
//     self.ctx.$scope.prefferedRowHeight =
//         prefferedRowHeight;

//     var ratio = prefferedRowHeight / 32;

//     var leftLabels = $('.gpio-left-label', self.ctx.$container);
//     leftLabels.css('font-size', 16 * ratio + 'px');
//     var rightLabels = $('.gpio-right-label', self.ctx.$container);
//     rightLabels.css('font-size', 16 * ratio + 'px');
//     var pins = $('.pin', self.ctx.$container);
//     var pinsFontSize = Math.max(9, 12 * ratio);
//     pins.css('font-size', pinsFontSize + 'px');
// }

self.onDestroy = function() {}

