/// <reference path="../../sdk/scripts/vss.d.ts" />
var TimesheetHub;
(function (TimesheetHub) {
    var TimesheetHubController = (function () {
        function TimesheetHubController($http, $scope, Base64) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.currentDays = [];
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
                require(["q", "TFS/Core/RestClient", "TFS/VersionControl/TfvcRestClient", "TFS/VersionControl/GitRestClient", "VSS/Controls", "VSS/Controls/Splitter"], function (Q, TfsCoreRestClient, TfvcRestClient, GitRestClient, Controls, Splitter) {
                    _this.Q = Q;
                    _this.tfsCoreRestClient = TfsCoreRestClient.getClient();
                    _this.tfvcRestClient = TfvcRestClient.getClient();
                    _this.gitRestClient = GitRestClient.getClient();
                    _this.VssControls = Controls;
                    _this.VssSplitter = Splitter;
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
                _this.splitter = _this.VssControls.Enhancement.enhance(_this.VssSplitter.Splitter, $(".my-splitter"), { initialSize: 350 });
                _this.splitter.collapse();
                _this.loading.page = true;
                _this.webContext = VSS.getWebContext();
                console.log(_this.webContext);
                _this.tfsCoreRestClient.getProject(_this.webContext.project.id, true, false).then(function (data) {
                    console.log(data);
                    if (data.capabilities.versioncontrol.sourceControlType == "Git") {
                        console.log("Detected Git Repository, loading pull request data.");
                        _this.isGitRepository = true;
                    }
                    else {
                        console.log("Could not find git repository, falling back to TFVC - Loading Checkin data.");
                        _this.isGitRepository = false;
                    }
                });
            });
            this.Q.all([
                this.extensionData.getValue(TimesheetHubController.API_KEY),
                this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID, { scopeType: "User" }),
                this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME),
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread(function (apiKey, userId, accountName, projectId) {
                _this.$scope.$apply(function () {
                    _this.apiKey = apiKey;
                    _this.currentUserId = userId;
                    _this.accountName = accountName;
                    _this.projectId = projectId;
                    if (!apiKey) {
                        _this.configured = false;
                    }
                    else {
                        _this.configured = true;
                    }
                    if (userId && accountName) {
                        _this.loggedIn = true;
                    }
                    else {
                        _this.loggedIn = false;
                    }
                    if (!projectId) {
                        _this.splitter.expand();
                    }
                    var authdata = _this.Base64.encode(_this.apiKey + ':');
                    _this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                    _this.changeDay(0);
                    _this.loading.page = false;
                });
            }, function (error) {
                console.log("Error loading VSTS data");
                console.log(error);
            });
        };
        TimesheetHubController.prototype.expand = function () {
            this.splitter.expand();
        };
        TimesheetHubController.prototype.collapse = function () {
            this.splitter.collapse();
        };
        TimesheetHubController.prototype.changeDay = function (days) {
            var currentDate = this.currentDays[0] || moment().toDate();
            var monday = moment(currentDate).startOf("week").add(1, "day").add(days, "week");
            this.currentDays = [
                monday.toDate(),
                monday.clone().add(1, "day").toDate(),
                monday.clone().add(2, "day").toDate(),
                monday.clone().add(3, "day").toDate(),
                monday.clone().add(4, "day").toDate()
            ];
            //this.timesheetDate = moment(this.timesheetDate).add(days, "day").toDate();
            //this.loadCheckinsOrCommits();
            //this.loadTimesheet();
        };
        TimesheetHubController.prototype.login = function () {
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
                _this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID, { scopeType: "User" });
                _this.currentUserId = data.EmpID;
                _this.loading.login = false;
                _this.loggedIn = true;
                //this.changeDay(0);
            })
                .error(function (error) {
                console.log("Error");
                console.log(error);
                _this.loading.login = false;
                _this.error.login = true;
            });
        };
        TimesheetHubController.prototype.toggleActive = function (item) {
            item.active = !item.active;
            if (item.workItems && item.workItems.length > 0) {
                for (var i = 0; i < item.workItems.length; i++) {
                    item.workItems[i].active = item.active;
                }
            }
        };
        TimesheetHubController.prototype.disconnect = function () {
            var _this = this;
            this.loading.disconnect = true;
            this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, null, { scopeType: "User" }).then(function () {
                _this.$scope.$apply(function () {
                    _this.loading.disconnect = false;
                });
                _this.init(); // Init assumes no scope
            });
        };
        TimesheetHubController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        };
        TimesheetHubController.$inject = ['$http', '$scope', 'Base64'];
        return TimesheetHubController;
    })();
    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
})(TimesheetHub || (TimesheetHub = {}));
