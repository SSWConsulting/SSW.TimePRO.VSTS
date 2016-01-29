var TimesheetEntryDay;
(function (TimesheetEntryDay_1) {
    var TimesheetEntryDay = (function () {
        function TimesheetEntryDay() {
            //public link: (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes) => void;
            this.scope = {
                timesheetDate: "=",
                currentUserId: "=",
                projectId: "=",
                accountName: "=",
                isGitRepository: "=",
                gitRestClient: "=",
                tfvcRestClient: "=",
                vstsProjectId: "=",
                q: "=",
            };
            this.templateUrl = "/app/timesheetEntryDay/timesheetEntryDay.html";
            this.controllerAs = "vm";
            this.controller = TimesheetEntryDayController;
            this.bindToController = true;
            //TimesheetEntryDay.prototype.link = (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes) => {
            //    // Handle linking
            //};
        }
        TimesheetEntryDay.Factory = function () {
            var directive = function () {
                return new TimesheetEntryDay();
            };
            directive["$inject"] = [];
            return directive;
        };
        return TimesheetEntryDay;
    })();
    var TimesheetEntryDayController = (function () {
        function TimesheetEntryDayController($http, $scope) {
            this.$http = $http;
            this.$scope = $scope;
            this.timesheetForm = {};
            this.allCheckins = [];
            this.loading = {};
            this.init();
        }
        TimesheetEntryDayController.prototype.init = function () {
            this.loadTimesheet();
            this.loadCheckinsOrCommits();
        };
        TimesheetEntryDayController.prototype.loadTimesheet = function () {
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
        TimesheetEntryDayController.prototype.updateActiveCheckins = function () {
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
        TimesheetEntryDayController.prototype.loadCheckinsOrCommits = function () {
            if (this.isGitRepository) {
                this.loadGitCommits();
            }
            else {
                this.loadCheckins();
            }
        };
        TimesheetEntryDayController.prototype.loadCheckins = function () {
            var _this = this;
            this.loading.checkins = true;
            this.allCheckins = [];
            this.tfvcRestClient.getChangesets(this.vstsProjectId, null, null, true, null, null, null, null, null, { fromDate: moment(this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(this.timesheetDate).add(1, "day").format("YYYY-MM-DD") })
                .then(function (data) {
                var promiseList = [];
                var i = 0;
                for (i = 0; i < data.length; i++) {
                    promiseList.push(_this.tfvcRestClient.getChangesetWorkItems(data[i].changesetId));
                }
                _this.q.all(promiseList).then(function (values) {
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
        TimesheetEntryDayController.prototype.loadGitCommits = function () {
            var _this = this;
            this.loading.checkins = true;
            this.allCheckins = [];
            this.gitRestClient.getPullRequestsByProject(this.vstsProjectId)
                .then(function (data) {
                var promiseList = [];
                var i = 0;
                for (i = 0; i < data.length; i++) {
                    promiseList.push(_this.gitRestClient.getPullRequestWorkItems(data[i].repository.id, data[i].pullRequestId));
                }
                _this.q.all(promiseList).then(function (values) {
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
        TimesheetEntryDayController.prototype.saveTimesheet = function () {
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
        TimesheetEntryDayController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        };
        return TimesheetEntryDayController;
    })();
    angular.module('TimesheetEntryDay', [])
        .directive("timesheetEntryDay", TimesheetEntryDay.Factory());
})(TimesheetEntryDay || (TimesheetEntryDay = {}));
