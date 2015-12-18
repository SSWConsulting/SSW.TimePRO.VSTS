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
                    _this.Q = Q;
                    _this.Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
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
        Object.defineProperty(AdminCollectionController, "ACCOUNT_NAME", {
            get: function () { return "TimePROAccountName"; },
            enumerable: true,
            configurable: true
        });
        AdminCollectionController.prototype.init = function () {
            var _this = this;
            this.$scope.$apply(function () {
                _this.loading.page = true;
            });
            this.Q.all([
                this.extensionData.getValue(AdminCollectionController.API_KEY),
                this.extensionData.getValue(AdminCollectionController.ACCOUNT_NAME)
            ])
                .spread(function (apiKey, accountName) {
                _this.$scope.$apply(function () {
                    if (apiKey) {
                        _this.loggedIn = true;
                    }
                    else {
                        _this.loggedIn = false;
                    }
                    _this.accountName = accountName;
                    _this.loading.page = false;
                });
            });
        };
        AdminCollectionController.prototype.login = function () {
            var _this = this;
            this.loading.login = true;
            this.error.login = false;
            var requestData = {
                email: this.loginForm.username,
                password: this.loginForm.password
            };
            this.$http.post(this.getApiUri("Authorization"), requestData)
                .success(function (data) {
                console.log("Success");
                console.log(data);
                _this.extensionData.setValue(AdminCollectionController.API_KEY, data.CurrentKey);
                _this.extensionData.setValue(AdminCollectionController.ACCOUNT_NAME, data.timeProUrlID);
                _this.accountName = data.timeProUrlID;
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
            return "https://" + this.loginForm.accountName + ".sswtimepro.com/api/" + relativeUri;
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
