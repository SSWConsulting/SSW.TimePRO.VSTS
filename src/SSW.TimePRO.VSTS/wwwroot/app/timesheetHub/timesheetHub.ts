/// <reference path="../../sdk/scripts/vss.d.ts" />

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

        private webContext: WebContext;
        private extensionData: IExtensionDataService;
        private Q: any;
        private tfsCoreRestClient: any;
        private tfvcRestClient: any;
        private gitRestClient: any;
        private VssControls: any;
        private VssSplitter: any;

        private isGitRepository: boolean;

        private splitter: any;

        private currentDays: Date[] = [];

        static $inject = ['$http', '$scope', 'Base64'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private Base64: any) {
            this.loginForm = <ILoginForm>{};
            this.loading = <ILoading>{
                page: true
            };
            this.error = <IError>{};

            VSS.init({
                usePlatformScripts: true
            });

            // Wait for the SDK to be initialized
            VSS.ready(() => {
                require(["q","TFS/Core/RestClient", "TFS/VersionControl/TfvcRestClient", "TFS/VersionControl/GitRestClient", "VSS/Controls", "VSS/Controls/Splitter"], (Q, TfsCoreRestClient, TfvcRestClient, GitRestClient, Controls, Splitter) => {
                    this.Q = Q;
                    this.tfsCoreRestClient = TfsCoreRestClient.getClient();
                    this.tfvcRestClient = TfvcRestClient.getClient();
                    this.gitRestClient = GitRestClient.getClient();
                    this.VssControls = Controls;
                    this.VssSplitter = Splitter;

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
                this.splitter = this.VssControls.Enhancement.enhance(this.VssSplitter.Splitter, $(".my-splitter"), { initialSize: 350 });
                this.splitter.collapse();
                this.loading.page = true;
                this.webContext = VSS.getWebContext();
                console.log(this.webContext);
                this.tfsCoreRestClient.getProject(this.webContext.project.id, true, false).then((data) => {
                    console.log(data);
                    if (data.capabilities.versioncontrol.sourceControlType == "Git") {
                        console.log("Detected Git Repository, loading pull request data.");
                        this.isGitRepository = true;
                    } else {
                        console.log("Could not find git repository, falling back to TFVC - Loading Checkin data.");
                        this.isGitRepository = false;
                    }
                });
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

                        if (!projectId) {
                            this.splitter.expand();
                        }

                        var authdata = this.Base64.encode(this.apiKey + ':');
                        this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;

                        this.changeDay(0);

                        this.loading.page = false;
                    });
                }, (error) => {
                    console.log("Error loading VSTS data");
                    console.log(error);
                });
        }

        expand() {
            this.splitter.expand();
        }

        collapse() {
            this.splitter.collapse();
        }

        changeDay(days) {
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
        }

        login() {
            this.loading.login = true;
            this.error.login = false;

            var requestData = {
                email: this.loginForm.username,
                password: this.loginForm.password
            };

            this.$http.post(this.getApiUri("Authorization"), requestData)
                .success((data: IAuthorizationResponse) => {
                    console.log("Success");
                    console.log(data);

                    this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID, { scopeType: "User" });
                    this.currentUserId = data.EmpID;
                    this.loading.login = false;
                    this.loggedIn = true;

                    //this.changeDay(0);
                })
                .error((error) => {
                    console.log("Error");
                    console.log(error);
                    this.loading.login = false;
                    this.error.login = true;
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

        getApiUri(relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        }

    }

    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
}