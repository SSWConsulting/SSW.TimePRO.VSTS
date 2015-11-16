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
            this.allCheckins = [
                {
                    title: "One"
                },
                {
                    title: "Two"
                },
                {
                    title: "Three"
                }
            ];
            VSS.init({
                usePlatformScripts: true
            });
            // Wait for the SDK to be initialized
            VSS.ready(function () {
                require(["q", "TFS/VersionControl/TfvcRestClient", "TFS/VersionControl/GitRestClient"], function (Q, TfvcRestClient, GitRestClient) {
                    _this.Q = Q;
                    _this.tfvcRestClient = TfvcRestClient.getClient();
                    _this.gitRestClient = GitRestClient.getClient();
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
                _this.webContext = VSS.getWebContext();
                _this.loadCheckins();
            });
            this.Q.all([
                this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID),
                this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME),
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id)
            ])
                .spread(function (userId, accountName, projectId) {
                _this.$scope.$apply(function () {
                    _this.currentUserId = userId;
                    _this.accountName = accountName;
                    _this.projectId = projectId;
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
        TimesheetHubController.prototype.loadCheckins = function () {
            var _this = this;
            //this.gitRestClient.getPullRequestsByProject(this.webContext.project.id)
            //    .then((data) => {
            //        this.$scope.$apply(() => {
            //            this.allCheckins = data;
            //        });
            //    });
            this.tfvcRestClient.getChangesets(this.webContext.project.id, null, null, true, null, null, null, null, null, { fromDate: moment().format("YYYY-MM-DD"), toDate: moment().add(1, "day").format("YYYY-MM-DD") })
                .then(function (data) {
                var promiseList = [];
                var i = 0;
                for (i = 0; i < data.length; i++) {
                    promiseList.push(_this.tfvcRestClient.getChangesetWorkItems(data[i].changesetId));
                }
                _this.Q.all(promiseList).then(function (values) {
                    _this.$scope.$apply(function () {
                        var w = 0;
                        for (w = 0; w < values.length; w++) {
                            data[w].workItems = values[w];
                        }
                        _this.allCheckins = data;
                    });
                });
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
        TimesheetHubController.prototype.toggleActive = function (item) {
            item.active = !item.active;
            if (item.workItems && item.workItems.length > 0) {
                for (var i = 0; i < item.workItems.length; i++) {
                    item.workItems[i].active = item.active;
                }
            }
        };
        TimesheetHubController.prototype.saveTimesheet = function () {
        };
        TimesheetHubController.$inject = ['$http', '$scope'];
        return TimesheetHubController;
    })();
    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
})(TimesheetHub || (TimesheetHub = {}));
