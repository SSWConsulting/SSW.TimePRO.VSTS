module TimesheetHub {

    interface ILoginForm {
        username: string;
        password: string;
    }

    interface IAuthorizationResponse {
        EmpID: string;
        Surname: string;
        MiddleName: string;
        FirstName: string;
        CurrentKey: string;
        timeProUrlID: string;
    }

    interface ILoading {
        page: boolean;
        login: boolean;
        disconnect: boolean;
        checkins: boolean;
        save: boolean;
    }

    interface IError {
        login: boolean;
    }

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

    class TimesheetHubController {
        public static get API_KEY(): string { return "TimePROApiKey"; }
        public static get ACCOUNT_NAME(): string { return "TimePROAccountName"; }
        public static get CURRENT_USER_ID(): string { return "TimePROCurrentUserId"; }

        private configured: boolean;
        private apiKey: string;
        private accountName: string;
        private loginForm: ILoginForm;
        private loggedIn: boolean;
        private loading: ILoading;
        private error: IError;
        private currentUserId: string;
        private projectId: string;
        private timesheetDate: Date;
        private existingTimesheet: ITimesheet;
        private timesheetForm: ITimesheetForm;

        private webContext: WebContext;
        private extensionData: IExtensionDataService;
        private Q: any;
        private tfvcRestClient: any;
        private gitRestClient: any;

        private allCheckins: any[];

        static $inject = ['$http', '$scope', 'Base64'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private Base64: any) {
            this.loginForm = <ILoginForm>{};
            this.timesheetForm = <ITimesheetForm>{};
            this.loading = <ILoading>{
                page: true
            };
            this.error = <IError>{};

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
            VSS.ready(() => {
                require(["q", "TFS/VersionControl/TfvcRestClient", "TFS/VersionControl/GitRestClient"], (Q, TfvcRestClient, GitRestClient) => {
                    this.Q = Q;
                    this.tfvcRestClient = TfvcRestClient.getClient();
                    this.gitRestClient = GitRestClient.getClient();
                    this.Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
                        .spread((dataService: IExtensionDataService) => {
                            this.extensionData = dataService;

                            VSS.notifyLoadSucceeded();
                            this.init(); // Init assumes no scope
                        });
                });
            });
        }

        init() {
            this.$scope.$apply(() => {
                this.timesheetDate = moment('2015-11-16').toDate();
                this.loading.page = true;
                this.webContext = VSS.getWebContext();
                this.loadCheckins();
            });
            this.Q.all([
                    this.extensionData.getValue(TimesheetHubController.API_KEY),
                    this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID, { scopeType: "User" }),
                    this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME),
                    this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" })
                ])
                .spread((apiKey, userId, accountName, projectId) => {

                    this.$scope.$apply(() => {
                        this.apiKey = apiKey;
                        this.currentUserId = userId;
                        this.accountName = accountName;
                        this.projectId = projectId;

                        if (!apiKey) {
                            this.configured = false;
                        } else {
                            this.configured = true;
                        }

                        if (userId && accountName) {
                            this.loggedIn = true;
                        } else {
                            this.loggedIn = false;
                        }

                        var authdata = this.Base64.encode(this.apiKey + ':');
                        this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;

                        this.loadTimesheet();
                        this.loading.page = false;
                    });
                }, (error) => {
                    console.log("Error loading VSTS data");
                    console.log(error);
                });
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

        loadCheckins() {
            //this.gitRestClient.getPullRequestsByProject(this.webContext.project.id)
            //    .then((data) => {
            //        this.$scope.$apply(() => {
            //            this.allCheckins = data;
            //        });
            //    });
            this.loading.checkins = true;
            this.allCheckins = [];

            this.tfvcRestClient.getChangesets(this.webContext.project.id, null, null, true, null, null, null, null, null, { fromDate: moment(this.timesheetDate).format("YYYY-MM-DD"), toDate: moment(this.timesheetDate).add(1, "day").format("YYYY-MM-DD") })
                .then((data) => {
                    var promiseList = [];
                    var i = 0;
                    for (i = 0; i < data.length; i++) {
                        promiseList.push(this.tfvcRestClient.getChangesetWorkItems(data[i].changesetId));
                    }
                    this.Q.all(promiseList).then((values) => {
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

        changeDay(days) {
            this.timesheetDate = moment(this.timesheetDate).add(days, "day").toDate();
            this.loadCheckins();
            this.loadTimesheet();
        }

        login() {
            this.loading.login = true;
            this.error.login = false;

            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success((data: IAuthorizationResponse) => {
                    console.log("Success");
                    console.log(data);

                    this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID, { scopeType: "User" });
                    this.currentUserId = data.EmpID;
                    this.loading.login = false;
                    this.loggedIn = true;

                    this.changeDay(0);
                })
                .error((error) => {
                    console.log("Error");
                    console.log(error);
                    this.loading.login = false;
                    this.error.login = true;
                });
        }

        getApiUri(relativeUri) {
            return "https://" + this.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        }

        toggleActive(item) {
            item.active = !item.active;

            if (item.workItems && item.workItems.length > 0) {
                for (var i = 0; i < item.workItems.length; i++) {
                    item.workItems[i].active = item.active;
                }
            }
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

        disconnect() {
            this.loading.disconnect = true;
            this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, null, { scopeType: "User" }).then(() => {
                this.$scope.$apply(() => {
                    this.loading.disconnect = false;
                });

                this.init(); // Init assumes no scope
            });
        }
    }

    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
}