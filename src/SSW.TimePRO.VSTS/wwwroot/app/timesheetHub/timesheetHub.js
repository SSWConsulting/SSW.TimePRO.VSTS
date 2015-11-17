var TimesheetHub;
(function (TimesheetHub) {
    var TimesheetHubController = (function () {
        function TimesheetHubController($http, $scope, Base64) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.loginForm = {};
            this.timesheetForm = {};
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
                _this.timesheetDate = moment('2015-11-16').toDate();
                _this.loading.page = true;
                _this.webContext = VSS.getWebContext();
                _this.loadCheckins();
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
                    var authdata = _this.Base64.encode(_this.apiKey + ':');
                    _this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                    _this.loadTimesheet();
                    _this.loading.page = false;
                });
            }, function (error) {
                console.log("Error loading VSTS data");
                console.log(error);
            });
        };
        TimesheetHubController.prototype.loadTimesheet = function () {
            var _this = this;
            this.existingTimesheet = null;
            this.timesheetForm = {};
            this.$http.get(this.getApiUri("Timesheets/SingleTimesheet?empId=" + this.currentUserId + "&projectId=" + this.projectId + "&timesheetDate=" + moment(this.timesheetDate).format("YYYY-MM-DD")))
                .success(function (data) {
                console.log("Found timesheet for currentDate");
                _this.existingTimesheet = data;
                _this.timesheetForm.Hours = data.BillableHours;
                _this.timesheetForm.Notes = data.Note;
                _this.updateActiveCheckins();
            })
                .error(function (error) {
                console.log("No timesheet found for currentDate or there was an error");
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
            this.loading.checkins = true;
            this.allCheckins = [];
            this.tfvcRestClient.getChangesets(this.webContext.project.id, null, null, true, null, null, null, null, null, { fromDate: moment(this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(this.timesheetDate).add(1, "day").format("YYYY-MM-DD") })
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
                        _this.updateActiveCheckins();
                        _this.loading.checkins = false;
                    });
                });
            });
        };
        TimesheetHubController.prototype.updateActiveCheckins = function () {
            var i = 0;
            var c = 0;
            var w = 0;
            var w2 = 0;
            if (!this.existingTimesheet || !this.allCheckins) {
                return;
            }
            for (i = 0; i < this.allCheckins.length; i++) {
                for (c = 0; c < this.existingTimesheet.CheckinIds.length; c++) {
                    if (this.allCheckins[i].changesetId == this.existingTimesheet.CheckinIds[c]) {
                        this.allCheckins[i].active = true;
                    }
                }
                for (w = 0; w < this.allCheckins[i].workItems.length; w++) {
                    for (w2 = 0; w2 < this.existingTimesheet.WorkItemIds.length; w2++) {
                        if (this.allCheckins[i].workItems[w].id == this.existingTimesheet.WorkItemIds[w2]) {
                            this.allCheckins[i].workItems[w].active = true;
                        }
                    }
                }
            }
        };
        TimesheetHubController.prototype.changeDay = function (days) {
            this.timesheetDate = moment(this.timesheetDate).add(days, "day").toDate();
            this.loadCheckins();
            this.loadTimesheet();
        };
        TimesheetHubController.prototype.login = function () {
            var _this = this;
            this.loading.login = true;
            this.error.login = false;
            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success(function (data) {
                console.log("Success");
                console.log(data);
                _this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID, { scopeType: "User" });
                _this.currentUserId = data.EmpID;
                _this.loading.login = false;
                _this.loggedIn = true;
                _this.changeDay(0);
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
            var _this = this;
            var i = 0;
            var k = 0;
            this.loading.save = true;
            var postData = this.timesheetForm;
            postData.EmpID = this.currentUserId;
            postData.ProjectID = this.projectId;
            postData.TimesheetDate = moment(this.timesheetDate).format("YYYY-MM-DD");
            var checkinIds = [];
            var workItemIds = [];
            for (i = 0; i < this.allCheckins.length; i++) {
                if (this.allCheckins[i].active) {
                    checkinIds.push(this.allCheckins[i].changesetId);
                }
                for (k = 0; k < this.allCheckins[i].workItems.length; k++) {
                    if (this.allCheckins[i].workItems[k].active) {
                        workItemIds.push(this.allCheckins[i].workItems[k].id);
                    }
                }
            }
            postData.ChangesetIds = checkinIds;
            postData.WorkItemIds = workItemIds;
            if (this.existingTimesheet) {
                postData.TimesheetID = this.existingTimesheet.TimesheetID;
            }
            this.$http.post(this.getApiUri("Timesheets/QuickCreate"), postData)
                .success(function (data) {
                _this.existingTimesheet = data;
                _this.loading.save = false;
            })
                .error(function (error) {
                console.log("Error saving timesheet");
                console.log(error);
                _this.loading.save = false;
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
        TimesheetHubController.$inject = ['$http', '$scope', 'Base64'];
        return TimesheetHubController;
    })();
    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
})(TimesheetHub || (TimesheetHub = {}));
