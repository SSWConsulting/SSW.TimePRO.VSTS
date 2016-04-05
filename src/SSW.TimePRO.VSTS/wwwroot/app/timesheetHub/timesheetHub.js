/// <reference path="../../sdk/scripts/vss.d.ts" />
var TimesheetHub;
(function (TimesheetHub) {
    var TimesheetHubController = (function () {
        function TimesheetHubController($http, $scope, Base64, timeproApi, hotkeys) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.timeproApi = timeproApi;
            this.hotkeys = hotkeys;
            this.currentDays = [];
            this.currentWeeks = [];
            this.selectedWeekOffset = 0;
            this.currentWeekSelectorStartOffset = 0;
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
            hotkeys.bindTo($scope).add({
                combo: 'a',
                description: "Show all commits, instead of just your own",
                callback: function () {
                    _this.showAllCommits = !_this.showAllCommits;
                }
            });
            this.changeWeeks(0);
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
        Object.defineProperty(TimesheetHubController, "CURRENT_USER_EMAIL", {
            get: function () { return "TimePROCurrentUserEmail"; },
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
                _this.vstsProjectId = _this.webContext.project.id;
                _this.currentUserVstsId = _this.webContext.user.id;
                console.log(_this.webContext);
                _this.tfsCoreRestClient.getProject(_this.vstsProjectId, true, false).then(function (data) {
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
                _this.gitRestClient.getRepositories(_this.vstsProjectId).then(function (data) {
                    _this.repositories = data;
                });
            });
            this.Q.all([
                this.extensionData.getValue(TimesheetHubController.API_KEY),
                this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID, { scopeType: "User" }),
                this.extensionData.getValue(TimesheetHubController.CURRENT_USER_EMAIL, { scopeType: "User" }),
                this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME),
                this.extensionData.getValue("ProjectID-" + this.vstsProjectId, { scopeType: "User" }),
                this.extensionData.getValue("ProjectName-" + this.vstsProjectId, { scopeType: "User" })
            ])
                .spread(function (apiKey, userId, userEmail, accountName, projectId, projectName) {
                _this.$scope.$apply(function () {
                    _this.apiKey = apiKey;
                    _this.currentUserId = userId;
                    _this.currentUserEmail = userEmail;
                    _this.accountName = accountName;
                    _this.projectId = projectId;
                    _this.projectName = projectName;
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
        TimesheetHubController.prototype.changeWeeks = function (weekOffset) {
            this.currentWeekSelectorStartOffset += weekOffset;
            this.currentWeeks = [];
            var monday = moment().startOf("week").add(1, "day").add(this.currentWeekSelectorStartOffset, 'week');
            for (var i = 0; i < 20; i++) {
                var start = monday.clone().add(i - 10, "week");
                var friday = start.clone().add(4, "day");
                var week = {
                    start: start.toDate(),
                    days: start.date() + " - " + friday.date(),
                    hours: i,
                    offset: (this.currentWeekSelectorStartOffset + i) - 10
                };
                this.currentWeeks.push(week);
            }
        };
        TimesheetHubController.prototype.changeDay = function (weekOffset) {
            //var currentDate = this.currentDays[0] || moment().toDate();
            this.selectedWeekOffset = weekOffset;
            var monday = moment().startOf("week").add(1, "day").add(weekOffset, "week");
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
            this.timeproApi.authorize(this.accountName, this.loginForm.username, this.loginForm.password)
                .then(function (data) {
                _this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID, { scopeType: "User" });
                _this.extensionData.setValue(TimesheetHubController.CURRENT_USER_EMAIL, _this.loginForm.username, { scopeType: "User" });
                _this.currentUserId = data.EmpID;
                _this.loading.login = false;
                _this.loggedIn = true;
            }, function (error) {
                _this.loading.login = false;
                _this.error.login = true;
            });
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
        TimesheetHubController.$inject = ['$http', '$scope', 'Base64', 'timeproApi', 'hotkeys'];
        return TimesheetHubController;
    })();
    angular.module('TimesheetHub', ['cfp.hotkeys'])
        .controller('TimesheetHubController', TimesheetHubController);
})(TimesheetHub || (TimesheetHub = {}));
