module ProjectSettingsHub {

    interface ISettingsForm {
        projectId: string;
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
        save: boolean;
    }

    interface IError {
        save: boolean;
    }

    interface ISuccess {
        save: boolean;
    }

    class ProjectSettingsHubController {
        public static get API_KEY(): string { return "TimePROApiKey"; }
        public static get ACCOUNT_NAME(): string { return "TimePROAccountName"; }
        public static get CURRENT_USER_ID(): string { return "TimePROCurrentUserId"; }

        private configured: boolean;
        private accountName: string;
        private settingsForm: ISettingsForm;
        private loggedIn: boolean;
        private loading: ILoading;
        private error: IError;
        private success: ISuccess;
        private apiKey: string;

        private webContext: WebContext;
        private extensionData: IExtensionDataService;
        private Q: any;

        static $inject = ['$http', '$scope', 'Base64'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private Base64: any) {
            this.settingsForm = <ISettingsForm>{};
            this.loading = <ILoading>{
                page: true
            };
            this.error = <IError>{};
            this.success = <ISuccess>{};

            VSS.init({
                usePlatformScripts: true
            });

            // Wait for the SDK to be initialized
            VSS.ready(() => {
                require(["q"], (Q) => {
                    this.Q = Q;
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
                this.loading.page = true;
                this.webContext = VSS.getWebContext();
            });
            this.Q.all([
                this.extensionData.getValue(ProjectSettingsHubController.API_KEY),
                this.extensionData.getValue(ProjectSettingsHubController.ACCOUNT_NAME),
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread((apiKey, accountName, projectId) => {

                    this.$scope.$apply(() => {
                        this.apiKey = apiKey;
                        this.accountName = accountName;
                        this.settingsForm.projectId = projectId;

                        if (apiKey && accountName) {
                            this.loggedIn = true;
                        } else {
                            this.loggedIn = false;
                        }

                        if (!apiKey) {
                            this.configured = false;
                        } else {
                            this.configured = true;
                        }

                        this.loading.page = false;

                        var authdata = this.Base64.encode(this.apiKey + ':');
                        this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                    });
                }, (error) => {
                    console.log("Error loading VSTS data");
                    console.log(error);
                });
        }

        save() {
            this.loading.save = true;
            this.error.save = false;
            this.success.save = false;

            this.$http.get(this.getApiUri("Projects/" + this.settingsForm.projectId))
                .success((data) => {
                    console.log("Success");
                    console.log(data);

                    this.extensionData.setValue("ProjectID-" + this.webContext.project.id, this.settingsForm.projectId, { scopeType: "User" });
                    this.loading.save = false;
                    this.success.save = true;
                })
                .error((error) => {
                    console.log("Error");
                    console.log(error);
                    this.loading.save = false;
                    this.error.save = true;
                });
        }

        getApiUri(relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        }
    }

    angular.module('ProjectSettingsHub', [])
        .controller('ProjectSettingsHubController', ProjectSettingsHubController);
}