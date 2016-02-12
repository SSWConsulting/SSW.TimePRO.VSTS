module ProjectSettingsHub {
    declare var _: any;
    
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

        static $inject = ['$http', '$scope', 'Base64', '$timeout'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private Base64: any, private $timeout: angular.ITimeoutService) {
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
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread((apiKey, accountName, projectId) => {

                    this.$scope.$apply(() => {
                        this.apiKey = apiKey;
                        this.accountName = accountName;
                        this.settingsForm.projectId = projectId;

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
            console.log(index);
            this.settingsForm.projectId = this.projects[index].ProjectID;
            console.log(this.settingsForm.projectId);
        }

        editProject() {
            this.mode.editProject = true;

            this.getProjects();
        }

        getProjects() {
            //this.projects = JSON.parse('[{ "ProjectID": "Comp", "ClientID": "3OAL23", "ContactID": 565390714, "ProjectName": "Consulting", "StatusPct": null, "EmpID": null, "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "GC", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2003-11-14T14:04:00", "DateUpdated": "2003-11-14T14:04:57", "EmpUpdated": "Tim Fletcher/TimFletcher/CHEETAH", "Note": null, "rowguid": "a7cd2f26-c11e-40bf-9655-99a6dc6a8c66", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "IJSODF", "ClientID": "DONTW", "ContactID": 7899, "ProjectName": "General Consulting", "StatusPct": null, "EmpID": null, "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "GC", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-02-16T10:19:16", "DateUpdated": "2004-02-16T10:19:47", "EmpUpdated": "Peter Huang/PeterHuang/WOMBAT", "Note": null, "rowguid": "9409182d-bf35-49f9-943c-0bf977396d76", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "DOWKD", "ClientID": "GUDCNT", "ContactID": 348648449, "ProjectName": "Proposal", "StatusPct": null, "EmpID": "TF", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": null, "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-02-16T10:13:14", "DateUpdated": "2004-02-16T10:16:14", "EmpUpdated": "Peter Huang/PeterHuang/WOMBAT", "Note": null, "rowguid": "421f304d-b8d9-48f1-ba2f-8a0053c53959", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "SSWA23", "ClientID": "SSW", "ContactID": 1239335681, "ProjectName": "zzSSW ASP NET 2 0 Migration Sprint 003", "StatusPct": null, "EmpID": "PA", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": null, "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2006-02-17T18:25:44.193", "DateUpdated": "2012-09-26T11:41:00", "EmpUpdated": "CRM/Ulysses Maclaren", "Note": null, "rowguid": "16e9c00b-d5ae-4b7d-a207-9c444e646e14", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "retra", "ClientID": "RETRA0", "ContactID": -939413759, "ProjectName": "General", "StatusPct": null, "EmpID": "DH", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": "<ALL>", "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "WEBSQL", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-12-10T17:57:51", "DateUpdated": "2004-12-10T18:17:08", "EmpUpdated": "Daniel Hyles/danielhyles/PEACOCK", "Note": null, "rowguid": "184d8c6b-0529-4790-810f-9cdd083f039c", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }]');

            this.loading.projects = true;
            this.$http.get(this.getApiUri("Projects"))
                .success((data) => {
                    this.loading.projects = false;

                    this.$timeout(() => {
                        this.renderCombo();
                        this.projects = <IProjectSelect[]>data;
                        var names = _(this.projects).map(x => x.ProjectName).value();
                        this.combo.setSource(names);
                    }, 0);
                })
                .error((error) => {
                    console.log("Error");
                    console.log(error);
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

            this.$http.get(this.getApiUri("Projects/" + this.settingsForm.projectId))
                .success((data) => {
                    console.log("Success");
                    console.log(data);

                    this.extensionData.setValue("ProjectID-" + this.webContext.project.id, this.settingsForm.projectId, { scopeType: "User" });
                    this.loading.save = false;
                    this.success.save = true;
                    this.mode.projectSelected = true;
                    this.mode.editProject = false;
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