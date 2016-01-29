module TimesheetEntryDay {

    interface ITimesheetForm {
        TimesheetID: string;
        EmpID: string;
        ProjectID: string;
        Hours: number;
        TimesheetDate: string;
        Notes: string;
        ChangesetIds: string[];
        WorkItemIds: string[];
    }

    interface ITimesheet {
        TimesheetID: string;
        BillableHours: number;
        Note: string;
        TimesheetDate: Date;
        CheckinIds: string[];
        WorkItemIds: string[];
    }

    interface ILoading {
        timesheet: boolean;
        checkins: boolean;
        save: boolean;
    }

    class TimesheetEntryDay {
        //public link: (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes) => void;
        public scope = {
            timesheetDate: "=",
            currentUserId: "=",
            projectId: "=",
            accountName: "=",
            isGitRepository: "=",
            gitRestClient: "=",,
            tfvcRestClient: "=",
            vstsProjectId: "=",
            q: "=",
        };
        public templateUrl = "/app/timesheetEntryDay/timesheetEntryDay.html";
        public controllerAs = "vm";
        public controller = TimesheetEntryDayController;
        public bindToController = true;

        constructor(/* list of dependencies */) {
            //TimesheetEntryDay.prototype.link = (scope: angular.IScope, element: angular.IAugmentedJQuery, attrs: angular.IAttributes) => {
            //    // Handle linking
            //};
        }

        public static Factory() {
            var directive = ( /* list of dependencies */) => {
                return new TimesheetEntryDay( /* list of dependencies */);
            };
            directive["$inject"] = [];

            return directive;
        }
    }

    class TimesheetEntryDayController {
        private timesheetForm: ITimesheetForm = <ITimesheetForm>{};
        private timesheetDate: Date;
        private existingTimesheet: ITimesheet;
        private currentUserId: string;
        private projectId: string;
        private accountName: string;
        private allCheckins: any[] = [];
        private loading: ILoading = <ILoading>{};
        private isGitRepository: boolean;
        private gitRestClient: any;
        private tfvcRestClient: any;
        private vstsProjectId: string;
        private q: any;

        constructor(private $http: angular.IHttpService, private $scope: angular.IScope) {
            this.init();
        }

        init() {
            this.loadTimesheet();
            this.loadCheckinsOrCommits();
        }

        loadTimesheet() {
            this.existingTimesheet = null;
            this.timesheetForm = <ITimesheetForm>{};

            this.$http.get(this.getApiUri("Timesheets/SingleTimesheet?empId=" + this.currentUserId + "&projectId=" + this.projectId + "&timesheetDate=" + moment(this.timesheetDate).format("YYYY-MM-DD")))
                .success((data: ITimesheet) => {
                    console.log("Found timesheet for currentDate");
                    this.existingTimesheet = data;
                    this.timesheetForm.Hours = data.BillableHours;
                    this.timesheetForm.Notes = data.Note;

                    this.updateActiveCheckins();
                })
                .error((error) => {
                    console.log("No timesheet found for currentDate or there was an error");
                    console.log(error);
                });
        }

        updateActiveCheckins() {
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
        }

        loadCheckinsOrCommits() {
            if (this.isGitRepository) {
                this.loadGitCommits();
            } else {
                this.loadCheckins();
            }
        }

        loadCheckins() {
            this.loading.checkins = true;
            this.allCheckins = [];

            this.tfvcRestClient.getChangesets(this.vstsProjectId, null, null, true, null, null, null, null, null, { fromDate: moment(this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(this.timesheetDate).add(1, "day").format("YYYY-MM-DD") })
                .then((data) => {
                    var promiseList = [];
                    var i = 0;
                    for (i = 0; i < data.length; i++) {
                        promiseList.push(this.tfvcRestClient.getChangesetWorkItems(data[i].changesetId));
                    }
                    this.q.all(promiseList).then((values) => {
                        this.$scope.$apply(() => {
                            var w = 0;
                            for (w = 0; w < values.length; w++) {
                                data[w].workItems = values[w];
                            }
                            this.allCheckins = data;
                            this.updateActiveCheckins();
                            this.loading.checkins = false;
                        });
                    });
                });
        }

        loadGitCommits() {
            this.loading.checkins = true;
            this.allCheckins = [];

            this.gitRestClient.getPullRequestsByProject(this.vstsProjectId)
                .then((data) => {
                    var promiseList = [];
                    var i = 0;
                    for (i = 0; i < data.length; i++) {
                        promiseList.push(this.gitRestClient.getPullRequestWorkItems(data[i].repository.id, data[i].pullRequestId));
                    }
                    this.q.all(promiseList).then((values) => {
                        this.$scope.$apply(() => {
                            var w = 0;
                            for (w = 0; w < values.length; w++) {
                                data[w].workItems = values[w];
                            }
                            this.allCheckins = data;
                            this.updateActiveCheckins();
                            this.loading.checkins = false;
                        });
                    });
                });
        }

        saveTimesheet() {
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
                .success((data: ITimesheet) => {
                    this.existingTimesheet = data;
                    this.loading.save = false;
                })
                .error((error) => {
                    console.log("Error saving timesheet");
                    console.log(error);
                    this.loading.save = false;
                });
        }

        getApiUri(relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        }
    }

    angular.module('TimesheetEntryDay', [])
        .directive("timesheetEntryDay", TimesheetEntryDay.Factory());
}