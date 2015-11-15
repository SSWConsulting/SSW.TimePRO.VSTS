var TimesheetHub;
(function (TimesheetHub) {
    var TimesheetHubController = (function () {
        function TimesheetHubController($http, $scope) {
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
                require(["q", "TFS/VersionControl/TfvcRestClient"], function (Q, TfvcRestClient) {
                    _this.Q = Q;
                    _this.tfvcRestClient = TfvcRestClient.getClient();
                    _this.Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
                        .spread(function (dataService) {
                        _this.extensionData = dataService;
                        VSS.notifyLoadSucceeded();
                        _this.init(); // Init assumes no scope
                    });
                });
            });
        }
        Object.defineProperty(TimesheetHubController, "API_KEY", {
            get: function () { return "TimePROApiKey"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimesheetHubController, "ACCOUNT_NAME", {
            get: function () { return "TimePROAccountName"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TimesheetHubController, "CURRENT_USER_ID", {
            get: function () { return "TimePROCurrentUserId"; },
            enumerable: true,
            configurable: true
        });
        TimesheetHubController.prototype.init = function () {
            var _this = this;
            this.$scope.$apply(function () {
                _this.loading.page = true;
            });
            this.Q.all([
                this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID),
                this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME)
            ])
                .spread(function (userId, accountName) {
                _this.$scope.$apply(function () {
                    _this.currentUserId = userId;
                    _this.accountName = accountName;
                    if (userId && accountName) {
                        _this.loggedIn = true;
                    }
                    else {
                        _this.loggedIn = false;
                    }
                    _this.loading.page = false;
                });
            }, function (error) {
                console.log("Error loading VSTS data");
                console.log(error);
            });
        };
        TimesheetHubController.prototype.login = function () {
            var _this = this;
            this.loading.login = true;
            this.error.login = false;
            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success(function (data) {
                console.log("Success");
                console.log(data);
                _this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID);
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
        TimesheetHubController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        };
        TimesheetHubController.$inject = ['$http', '$scope'];
        return TimesheetHubController;
    })();
    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
})(TimesheetHub || (TimesheetHub = {}));
