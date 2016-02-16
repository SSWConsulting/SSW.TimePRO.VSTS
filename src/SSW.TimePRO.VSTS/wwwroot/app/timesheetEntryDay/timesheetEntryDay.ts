module TimesheetEntryDay {
    import TimesheetAssociation = TimeproApi.ITimesheetAssociation;
    import SaveTimesheetForm = TimeproApi.ISaveTimesheetForm;
    import Timesheet = TimeproApi.ITimesheet;
    declare var _: any;

    interface ILoading {
        timesheet: boolean;
        checkins: boolean;
        save: boolean;
    }

    interface ICheckin {
        changesetId: string;
        comment: string;
        active: boolean;
        createdDate: Date;
        workItems: IWorkItem[];
        type: string;
    }

    interface IWorkItem {
        id: string;
        title: string;
        active: boolean;
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
            gitRepositories: "=",
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
        private timesheetForm: SaveTimesheetForm = <SaveTimesheetForm>{};
        private timesheetDate: Date;
        private existingTimesheet: Timesheet;
        private currentUserId: string;
        private projectId: string;
        private accountName: string;
        private allCheckins: ICheckin[] = [];
        private loading: ILoading = <ILoading>{};
        private isGitRepository: boolean;
        private gitRestClient: any;
        private tfvcRestClient: any;
        private vstsProjectId: string;
        private gitRepositories: any[];
        private q: any;

        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private timeproApi: TimeproApi.timeproApi) {
            this.init();
        }

        init() {
            this.loadTimesheet();
            this.loadCheckinsOrCommits();
        }

        loadTimesheet() {
            this.existingTimesheet = null;
            this.timesheetForm = <SaveTimesheetForm>{
                Hours: 8
            };

            this.timeproApi.getTimesheet(
                    this.accountName,
                    this.currentUserId,
                    this.projectId,
                    moment(this.timesheetDate).format("YYYY-MM-DD"))
                .then(data => {
                    if (data.noTimesheet) {
                        console.log(`No timesheet for ${moment(this.timesheetDate).format('YYYY-MM-DD')}`);
                    }
                    else if (data.TimesheetID) {
                        console.log(`Found timesheet for ${moment(this.timesheetDate).format('YYYY-MM-DD')}`);
                        this.existingTimesheet = data;
                        this.timesheetForm.Hours = data.BillableHours;

                        // Remove existing auto-generated notes
                        data.Note = data.Note || "";
                        var notesIndex = data.Note.indexOf("~~~");
                        if (notesIndex > -1) {
                            data.Note = data.Note.substring(0, notesIndex);
                        }
                        this.timesheetForm.Notes = data.Note.trim();
                    }

                    this.updateActiveCheckins();
                }, error => {
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
                                data[w].type = "changeset";
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

            this.gitRestClient.getPullRequestsByProject(this.vstsProjectId, { status: "all" })
                .then((data) => {
                    var checkinList = [];
                    var promiseList = [];
                    var i = 0;
                    for (i = 0; i < data.length; i++) {
                        if (moment(data[i].creationDate).isBetween(moment(this.timesheetDate), moment(this.timesheetDate).add(1, 'day'))) {
                            data[i].type = "pullrequest";
                            data[i].changesetId = data[i].pullRequestId;
                            checkinList.push(data[i]);
                            promiseList.push(this.gitRestClient.getPullRequestWorkItems(data[i].repository.id, data[i].pullRequestId));
                        }
                    }
                    this.q.all(promiseList).then((values) => {
                        this.$scope.$apply(() => {
                            console.log(values);
                            var w = 0;
                            for (w = 0; w < values.length; w++) {
                                checkinList[w].comment = checkinList[w].title;
                                checkinList[w].createdDate = checkinList[w].creationDate;
                                checkinList[w].active = true;

                                checkinList[w].workItems = [];
                                _(values[w]).forEach(workitem => {
                                    workitem.active = true;
                                    checkinList[w].workItems.push(workitem);
                                });
                            }
                            _(checkinList).forEach(x => this.allCheckins.push(x));                            
                            this.updateActiveCheckins();
                            this.loading.checkins = false;
                        });
                    });
                });


            _(this.gitRepositories).forEach(repo => {
                this.gitRestClient.getCommits(repo.id, { fromDate: moment(this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(this.timesheetDate).add(1, 'day').format("YYYY-MM-DD") }).then(data => {
                    _(data).forEach(commit => {
                        var checkin = <ICheckin>{
                            type: "commit",
                            changesetId: commit.commitId,
                            comment: commit.comment + (commit.commentTruncated ? "..." : ""),
                            createdDate: commit.author.date,
                            active: true
                        };

                        // Remove commits that starts with "merge"
                        if (checkin.comment.toLowerCase().lastIndexOf("merge", 0) !== 0) {
                            this.allCheckins.push(checkin);
                        }
                    });
                });
            });

        }

        saveTimesheet() {
            var i = 0;
            var k = 0;
            this.loading.save = true;
            var postData = <SaveTimesheetForm>JSON.parse(JSON.stringify(this.timesheetForm));

            postData.EmpID = this.currentUserId;
            postData.ProjectID = this.projectId;
            postData.TimesheetDate = moment(this.timesheetDate).format("YYYY-MM-DD");
            postData.Notes = postData.Notes || "";

            // Add auto-generated notes
            postData.Notes += "\n\n~~~\n";

            var associations: TimesheetAssociation[] = [];
            
            for (i = 0; i < this.allCheckins.length; i++) {
                if (this.allCheckins[i].active) {
                    var typeId = 0;
                    if (this.allCheckins[i].type == "changeset") {
                        typeId = 1;
                    } else if (this.allCheckins[i].type == "commit") {
                        typeId = 3;
                    } else if (this.allCheckins[i].type == "pullrequest") {
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
                                // TODO: Implement the below, once the work items endpoint is fixed by the VSTS team.
                                //postData.Notes += this.allCheckins[i].workItems[k].title + "\n";
                            }
                        }
                    }
                }
            }
            postData.AssociatedItems = associations;

            if (this.existingTimesheet) {
                postData.TimesheetID = this.existingTimesheet.TimesheetID;
            }

            this.timeproApi.saveTimesheet(this.accountName, postData)
                .then(data => {
                    this.existingTimesheet = data;
                    this.loading.save = false;

                }, error => {
                    this.loading.save = false;
                });
        }

        toggleActive(item) {
            item.active = !item.active;

            if (item.workItems && item.workItems.length > 0) {
                for (var i = 0; i < item.workItems.length; i++) {
                    item.workItems[i].active = item.active;
                }
            }
        }
    }

    angular.module('TimesheetEntryDay', [])
        .directive("timesheetEntryDay", TimesheetEntryDay.Factory());
}