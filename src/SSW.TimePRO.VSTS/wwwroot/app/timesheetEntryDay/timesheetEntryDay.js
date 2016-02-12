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
                gitRepositories: "=",
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
                if (data.noTimesheet) {
                    console.log("No timesheet for " + moment(_this.timesheetDate).format('YYYY-MM-DD'));
                }
                else if (data.TimesheetID) {
                    console.log("Found timesheet for " + moment(_this.timesheetDate).format('YYYY-MM-DD'));
                    _this.existingTimesheet = data;
                    _this.timesheetForm.Hours = data.BillableHours;
                    // Remove existing auto-generated notes
                    data.Note = data.Note || "";
                    var notesIndex = data.Note.indexOf("~~~");
                    if (notesIndex > -1) {
                        data.Note = data.Note.substring(0, notesIndex);
                    }
                    _this.timesheetForm.Notes = data.Note.trim();
                }
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
                this.allCheckins[i].active = false;
                var typeId = 0;
                if (this.allCheckins[i].type == "changeset") {
                    typeId = 1;
                }
                else if (this.allCheckins[i].type == "commit") {
                    typeId = 3;
                }
                else if (this.allCheckins[i].type == "pullrequest") {
                    typeId = 4;
                }
                for (c = 0; c < this.existingTimesheet.Associations.length; c++) {
                    if (this.existingTimesheet.Associations[c].Type == typeId && this.allCheckins[i].changesetId == this.existingTimesheet.Associations[c].ExternalId) {
                        this.allCheckins[i].active = true;
                    }
                }
                if (this.allCheckins[i].workItems) {
                    for (w = 0; w < this.allCheckins[i].workItems.length; w++) {
                        for (w2 = 0; w2 < this.existingTimesheet.Associations.length; w2++) {
                            if (this.existingTimesheet.Associations[w2].Type == 2 && this.allCheckins[i].workItems[w].id == this.existingTimesheet.Associations[w2].ExternalId) {
                                this.allCheckins[i].workItems[w].active = true;
                            }
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
                            data[w].type = "changeset";
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
            this.gitRestClient.getPullRequestsByProject(this.vstsProjectId, { status: "all" })
                .then(function (data) {
                var checkinList = [];
                var promiseList = [];
                var i = 0;
                for (i = 0; i < data.length; i++) {
                    if (moment(data[i].creationDate).isBetween(moment(_this.timesheetDate), moment(_this.timesheetDate).add(1, 'day'))) {
                        data[i].type = "pullrequest";
                        data[i].changesetId = data[i].pullRequestId;
                        checkinList.push(data[i]);
                        promiseList.push(_this.gitRestClient.getPullRequestWorkItems(data[i].repository.id, data[i].pullRequestId));
                    }
                }
                _this.q.all(promiseList).then(function (values) {
                    _this.$scope.$apply(function () {
                        console.log(values);
                        var w = 0;
                        for (w = 0; w < values.length; w++) {
                            checkinList[w].comment = checkinList[w].title;
                            checkinList[w].createdDate = checkinList[w].creationDate;
                            checkinList[w].active = true;
                            checkinList[w].workItems = [];
                            _(values[w]).forEach(function (workitem) {
                                workitem.active = true;
                                checkinList[w].workItems.push(workitem);
                            });
                        }
                        _(checkinList).forEach(function (x) { return _this.allCheckins.push(x); });
                        _this.updateActiveCheckins();
                        _this.loading.checkins = false;
                    });
                });
            });
            _(this.gitRepositories).forEach(function (repo) {
                _this.gitRestClient.getCommits(repo.id, { fromDate: moment(_this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(_this.timesheetDate).add(1, 'day').format("YYYY-MM-DD") }).then(function (data) {
                    _(data).forEach(function (commit) {
                        var checkin = {
                            type: "commit",
                            changesetId: commit.commitId,
                            comment: commit.comment + (commit.commentTruncated ? "..." : ""),
                            createdDate: commit.author.date,
                            active: true
                        };
                        // Remove commits that starts with "merge"
                        if (checkin.comment.toLowerCase().lastIndexOf("merge", 0) !== 0) {
                            _this.allCheckins.push(checkin);
                        }
                    });
                });
            });
        };
        TimesheetEntryDayController.prototype.saveTimesheet = function () {
            var _this = this;
            var i = 0;
            var k = 0;
            this.loading.save = true;
            var postData = JSON.parse(JSON.stringify(this.timesheetForm));
            postData.EmpID = this.currentUserId;
            postData.ProjectID = this.projectId;
            postData.TimesheetDate = moment(this.timesheetDate).format("YYYY-MM-DD");
            // Add auto-generated notes
            postData.Notes += "\n\n~~~\n";
            var associations = [];
            for (i = 0; i < this.allCheckins.length; i++) {
                if (this.allCheckins[i].active) {
                    var typeId = 0;
                    if (this.allCheckins[i].type == "changeset") {
                        typeId = 1;
                    }
                    else if (this.allCheckins[i].type == "commit") {
                        typeId = 3;
                    }
                    else if (this.allCheckins[i].type == "pullrequest") {
                        typeId = 4;
                    }
                    associations.push({
                        ExternalId: this.allCheckins[i].changesetId,
                        Type: typeId
                    });
                    postData.Notes += this.allCheckins[i].comment + "\n";
                    if (this.allCheckins[i].workItems) {
                        for (k = 0; k < this.allCheckins[i].workItems.length; k++) {
                            if (this.allCheckins[i].workItems[k].active) {
                                associations.push({
                                    ExternalId: this.allCheckins[i].workItems[k].id,
                                    Type: 2 // WorkItem
                                });
                            }
                        }
                    }
                }
            }
            postData.AssociatedItems = associations;
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
        TimesheetEntryDayController.prototype.toggleActive = function (item) {
            item.active = !item.active;
            if (item.workItems && item.workItems.length > 0) {
                for (var i = 0; i < item.workItems.length; i++) {
                    item.workItems[i].active = item.active;
                }
            }
        };
        TimesheetEntryDayController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        };
        return TimesheetEntryDayController;
    })();
    angular.module('TimesheetEntryDay', [])
        .directive("timesheetEntryDay", TimesheetEntryDay.Factory());
})(TimesheetEntryDay || (TimesheetEntryDay = {}));
