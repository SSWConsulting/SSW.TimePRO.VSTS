module ProjectSettingsHub {
    declare var _: any;
    
    interface ISettingsForm {
        projectId: string;
        projectName: string;
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
        projects: boolean;
    }

    interface IError {
        save: boolean;
    }

    interface ISuccess {
        save: boolean;
    }

    interface IProjectSelect {
        ProjectName: string;
        ProjectID: string;
    }

    interface IMode {
        editProject: boolean;
        projectSelected: boolean;
    }

    class ProjectSettingsHubController {
        public static get API_KEY(): string { return "TimePROApiKey"; }
        public static get ACCOUNT_NAME(): string { return "TimePROAccountName"; }
        public static get CURRENT_USER_ID(): string { return "TimePROCurrentUserId"; }

        private configured: boolean;
        private accountName: string;
        private settingsForm: ISettingsForm = <ISettingsForm>{};
        private loggedIn: boolean;
        private loading: ILoading;
        private error: IError = <IError>{};
        private success: ISuccess = <ISuccess>{};
        private apiKey: string;
        private mode:IMode = <IMode>{};

        private projects: IProjectSelect[] = [];

        private webContext: WebContext;
        private extensionData: IExtensionDataService;
        private Q: any;
        private Controls: any;
        private Combos: any;
        private combo: any;

        static $inject = ['$http', '$scope', 'Base64', '$timeout', 'timeproApi'];
        constructor(
            private $http: angular.IHttpService,
            private $scope: angular.IScope,
            private Base64: any,
            private $timeout: angular.ITimeoutService,
            private timeproApi: TimeproApi.timeproApi) {
            this.loading = <ILoading>{
                page: true
            };

            VSS.init({
                usePlatformScripts: true
            });

            // Wait for the SDK to be initialized
            VSS.ready(() => {
                require(["q", "VSS/Controls", "VSS/Controls/Combos"], (Q, Controls, Combos) => {
                    this.Q = Q;
                    this.Controls = Controls;
                    this.Combos = Combos;
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
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" }),
                this.extensionData.getValue("ProjectName-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread((apiKey, accountName, projectId, projectName) => {

                    this.$scope.$apply(() => {
                        this.apiKey = apiKey;
                        this.accountName = accountName;
                        this.settingsForm.projectId = projectId;
                        this.settingsForm.projectName = projectName;

                        if (apiKey && accountName) {
                            this.loggedIn = true;
                            this.configured = true;
                        } else {
                            this.loggedIn = false;
                            this.configured = false;
                        }

                        this.loading.page = false;

                        var authdata = this.Base64.encode(this.apiKey + ':');
                        this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;

                        if (projectId) {
                            this.mode.projectSelected = true;
                        } else {
                            this.editProject();
                        }
                    });
                }, (error) => {
                    console.log("Error loading VSTS data");
                    console.log(error);
                });
        }

        selectProject(index) {
            this.settingsForm.projectId = this.projects[index].ProjectID;
            this.settingsForm.projectName = this.projects[index].ProjectName;
        }

        editProject() {
            this.mode.editProject = true;
            this.getProjects();
        }

        getProjects() {            
            this.loading.projects = true;
            this.timeproApi.getAllProjects(this.accountName)
                .then(data => {
                    this.loading.projects = false;

                    this.$timeout(() => {
                        this.renderCombo();
                        this.projects = <IProjectSelect[]>data;
                        var names = _(this.projects).map(x => x.ProjectName).value();
                        this.combo.setSource(names);
                    }, 0);
                }, error => {
                    this.loading.projects = false;
                });            
        }

        renderCombo() {
            this.combo = this.Controls.create(this.Combos.Combo, $("#project-combo-container"), {
                id: "project-combo",
                mode: "drop",
                source: [],
                enabled: true,
                allowEdit: true,
                inputCss: 'form-control-vsts',
                indexChanged: (index) => {
                    this.$scope.$apply(() => {
                        this.selectProject(index);
                    });
                }
            });
        }

        save() {
            this.loading.save = true;
            this.error.save = false;
            this.success.save = false;

            this.timeproApi.getProject(this.accountName, this.settingsForm.projectId)
                .then(data => {
                    this.extensionData.setValue("ProjectID-" + this.webContext.project.id, this.settingsForm.projectId, { scopeType: "User" });
                    this.extensionData.setValue("ProjectName-" + this.webContext.project.id, this.settingsForm.projectName, { scopeType: "User" });
                    this.loading.save = false;
                    this.success.save = true;
                    this.mode.projectSelected = true;
                    this.mode.editProject = false;
                }, error => {
                    this.loading.save = false;
                    this.error.save = true;
                });
        }
    }

    angular.module('ProjectSettingsHub', [])
        .controller('ProjectSettingsHubController', ProjectSettingsHubController);
}