/// <reference path="../../sdk/scripts/vss.d.ts" />
var AdminCollection;
(function (AdminCollection) {
    var AdminCollectionController = (function () {
        function AdminCollectionController($http, $scope) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.loginForm = {};
            this.loading = {
                page: true
            };
            this.error = {};
            VSS.init({
                usePlatformScripts: true
            });
            // Wait for the SDK to be initialized
            VSS.ready(function () {
                require(["q"], function (Q) {
                    Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
                        .spread(function (dataService) {
                        _this.extensionData = dataService;
                        VSS.notifyLoadSucceeded();
                        _this.init(); // Init assumes no scope
                    });
                });
            });
        }
        Object.defineProperty(AdminCollectionController, "API_KEY", {
            get: function () { return "TimePROApiKey"; },
            enumerable: true,
            configurable: true
        });
        AdminCollectionController.prototype.init = function () {
            var _this = this;
            this.$scope.$apply(function () {
                _this.loading.page = true;
            });
            this.extensionData.getValue(AdminCollectionController.API_KEY).then(function (value) {
                _this.$scope.$apply(function () {
                    if (value) {
                        _this.loggedIn = true;
                    }
                    else {
                        _this.loggedIn = false;
                    }
                    _this.loading.page = false;
                });
            });
        };
        AdminCollectionController.prototype.login = function () {
            var _this = this;
            this.loading.login = true;
            this.error.login = false;
            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success(function (data) {
                console.log("Success");
                console.log(data);
                _this.extensionData.setValue(AdminCollectionController.API_KEY, data.CurrentKey);
                _this.loading.login = false;
                _this.loggedIn = true;
            })
                .error(function (error) {
                console.log("Error");
                console.log(error);
                _this.loading.login = false;
                _this.error.login = true;
            });
        };
        AdminCollectionController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.loginForm.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        };
        AdminCollectionController.prototype.alertKey = function () {
            this.extensionData.getValue(AdminCollectionController.API_KEY).then(function (value) {
                alert(value);
            });
        };
        AdminCollectionController.prototype.disconnect = function () {
            var _this = this;
            this.loading.disconnect = true;
            this.extensionData.setValue(AdminCollectionController.API_KEY, null).then(function () {
                _this.$scope.$apply(function () {
                    _this.loading.disconnect = false;
                });
                _this.init(); // Init assumes no scope
            });
        };
        AdminCollectionController.$inject = ['$http', '$scope'];
        return AdminCollectionController;
    })();
    angular.module('adminCollection', [])
        .controller('AdminCollectionController', AdminCollectionController);
})(AdminCollection || (AdminCollection = {}));
