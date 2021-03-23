const app = angular.module('myApp', []);

app.controller('myCtrl', function ($scope, $http, $timeout) {

    $scope.title = "Project Phoenix";

    $scope.formData = {};
    $scope.formData.appserver = "Tomcat 8";
    $scope.cloudProviders = ["aws", "azure", "gcp"];
    $scope.initiateResponse = false;
    $scope.destroyResponse = false;
    $scope.initiateError = false;
    $scope.destroyError = false;

    $scope.urlparser = function (data) {
        var url = ""
        if (data == "aws") {
            url = '/api/aws'
            return url
        }
        if (data == "azure") {
            url = '/api/azure'
            return url
        }
        if (data == "gcp") {
            url = '/api/gcp'
            return url
        }
    };

    //http get method
    // http post method
    $scope.initiatePhoenix = function (cloudprovider) {
        var api_url = $scope.urlparser(cloudprovider);
        //aws, azure, gcp api -- phoenix initiate
        var req = {
            method: 'POST',
            url: api_url,
            headers: {
                'Content-Type': 'application/json'
            },
            data: $scope.formData
        }
        $http(req)
            .then(function successCallback(res) {
                $scope.formData = {};
                $scope.formData.appserver = "Tomcat 8";
                $window.alert("Successfully Initiated");
                // $scope.initiateResponse = true;
                // $timeout(function () {
                //     $scope.initiateResponse = false;
                // }, 2000);
            }, function errorCallback(err) {
                console.error("Error in POST: " + err);
                $window.alert("Unable to Initiate");
                // $scope.initiateError = true;
                // $timeout(function () {
                //     $scope.initiateError = false;
                // }, 3000);
            });
    };
    $scope.destroyPhoenix = function (cloud) {
        var api_url = $scope.urlparser(cloud);
        var req = {
            method: 'POST',
            url: api_url + '/remove',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            data: $scope.formData
        }
        $http(req)
            .then(function successCallback(res) {
                console.log("data found: " + JSON.stringify(res.data));
                $scope.formData = {};
                $scope.formData.appserver = "Tomcat 8";
                $window.alert("Successfully Destroyed");
                // $scope.destroyResponse = true;
                // $timeout(function () {
                //     $scope.destroyResponse = false;
                // }, 2000);
            }, function errorCallback(res) {
                console.error("error in finding: " + JSON.stringify(res));
                $window.alert("Unable to Destroy");
                // $scope.destroyError = true;
                // $timeout(function () {
                //     $scope.destroyError = false;
                // }, 3000);
            });
    };
});