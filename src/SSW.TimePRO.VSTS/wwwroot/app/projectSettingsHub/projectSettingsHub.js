var ProjectSettingsHub;
(function (ProjectSettingsHub) {
    var ProjectSettingsHubController = (function () {
        function ProjectSettingsHubController($http, $scope, Base64, $timeout) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.$timeout = $timeout;
            this.settingsForm = {};
            this.error = {};
            this.success = {};
            this.mode = {};
            this.projects = [];
            this.loading = {
                page: true
            };
            VSS.init({
                usePlatformScripts: true
            });
            // Wait for the SDK to be initialized
            VSS.ready(function () {
                require(["q", "VSS/Controls", "VSS/Controls/Combos"], function (Q, Controls, Combos) {
                    _this.Q = Q;
                    _this.Controls = Controls;
                    _this.Combos = Combos;
                    _this.Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
                        .spread(function (dataService) {
                        _this.extensionData = dataService;
                        VSS.notifyLoadSucceeded();
                        _this.init(); // Init assumes no scope
                    });
                });
            });
        }
        Object.defineProperty(ProjectSettingsHubController, "API_KEY", {
            get: function () { return "TimePROApiKey"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ProjectSettingsHubController, "ACCOUNT_NAME", {
            get: function () { return "TimePROAccountName"; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ProjectSettingsHubController, "CURRENT_USER_ID", {
            get: function () { return "TimePROCurrentUserId"; },
            enumerable: true,
            configurable: true
        });
        ProjectSettingsHubController.prototype.init = function () {
            var _this = this;
            this.$scope.$apply(function () {
                _this.loading.page = true;
                _this.webContext = VSS.getWebContext();
            });
            this.Q.all([
                this.extensionData.getValue(ProjectSettingsHubController.API_KEY),
                this.extensionData.getValue(ProjectSettingsHubController.ACCOUNT_NAME),
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread(function (apiKey, accountName, projectId) {
                _this.$scope.$apply(function () {
                    _this.apiKey = apiKey;
                    _this.accountName = accountName;
                    _this.settingsForm.projectId = projectId;
                    if (apiKey && accountName) {
                        _this.loggedIn = true;
                        _this.configured = true;
                    }
                    else {
                        _this.loggedIn = false;
                        _this.configured = false;
                    }
                    _this.loading.page = false;
                    var authdata = _this.Base64.encode(_this.apiKey + ':');
                    _this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                    if (projectId) {
                        _this.mode.projectSelected = true;
                    }
                    else {
                        _this.editProject();
                    }
                });
            }, function (error) {
                console.log("Error loading VSTS data");
                console.log(error);
            });
        };
        ProjectSettingsHubController.prototype.selectProject = function (index) {
            console.log(index);
            this.settingsForm.projectId = this.projects[index].ProjectID;
            console.log(this.settingsForm.projectId);
        };
        ProjectSettingsHubController.prototype.editProject = function () {
            this.mode.editProject = true;
            this.getProjects();
        };
        ProjectSettingsHubController.prototype.getProjects = function () {
            //this.projects = JSON.parse('[{ "ProjectID": "Comp", "ClientID": "3OAL23", "ContactID": 565390714, "ProjectName": "Consulting", "StatusPct": null, "EmpID": null, "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "GC", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2003-11-14T14:04:00", "DateUpdated": "2003-11-14T14:04:57", "EmpUpdated": "Tim Fletcher/TimFletcher/CHEETAH", "Note": null, "rowguid": "a7cd2f26-c11e-40bf-9655-99a6dc6a8c66", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "IJSODF", "ClientID": "DONTW", "ContactID": 7899, "ProjectName": "General Consulting", "StatusPct": null, "EmpID": null, "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "GC", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-02-16T10:19:16", "DateUpdated": "2004-02-16T10:19:47", "EmpUpdated": "Peter Huang/PeterHuang/WOMBAT", "Note": null, "rowguid": "9409182d-bf35-49f9-943c-0bf977396d76", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "DOWKD", "ClientID": "GUDCNT", "ContactID": 348648449, "ProjectName": "Proposal", "StatusPct": null, "EmpID": "TF", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": null, "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-02-16T10:13:14", "DateUpdated": "2004-02-16T10:16:14", "EmpUpdated": "Peter Huang/PeterHuang/WOMBAT", "Note": null, "rowguid": "421f304d-b8d9-48f1-ba2f-8a0053c53959", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "SSWA23", "ClientID": "SSW", "ContactID": 1239335681, "ProjectName": "zzSSW ASP NET 2 0 Migration Sprint 003", "StatusPct": null, "EmpID": "PA", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": null, "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": null, "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2006-02-17T18:25:44.193", "DateUpdated": "2012-09-26T11:41:00", "EmpUpdated": "CRM/Ulysses Maclaren", "Note": null, "rowguid": "16e9c00b-d5ae-4b7d-a207-9c444e646e14", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }, { "ProjectID": "retra", "ClientID": "RETRA0", "ContactID": -939413759, "ProjectName": "General", "StatusPct": null, "EmpID": "DH", "QuotedStartDate": null, "QuotedEndDate": null, "ActualStartDate": null, "ActualEndDate": null, "QuotedHrs": null, "QuotedAmt": null, "ActualHrs": null, "ActualAmt": null, "CategoryID": "<ALL>", "Address": null, "Suburb": null, "State": null, "Postcode": null, "Country": null, "Period": null, "DebtorID": null, "DebtorContactID": null, "TypeID": "WEBSQL", "BudgetEng": null, "BudgetDraf": null, "ActualAmtInvoiced": 0.00000, "zzAmtLastInvoiced": null, "zzDateLastInvoiced": null, "ProjectFeeID": null, "DateCreated": "2004-12-10T17:57:51", "DateUpdated": "2004-12-10T18:17:08", "EmpUpdated": "Daniel Hyles/danielhyles/PEACOCK", "Note": null, "rowguid": "184d8c6b-0529-4790-810f-9cdd083f039c", "ProjectCost": null, "ProjectRate": null, "AuthorizedHours": null, "AuthorizedAmt": null, "TFSProjectName": null, "SharePointURL": null, "TFSURL": null, "CRMProjectGUID": null, "ScrumMaster": null, "Technologies": null }]');
            var _this = this;
            this.loading.projects = true;
            this.$http.get(this.getApiUri("Projects"))
                .success(function (data) {
                _this.loading.projects = false;
                _this.$timeout(function () {
                    _this.renderCombo();
                    _this.projects = data;
                    var names = _(_this.projects).map(function (x) { return x.ProjectName; }).value();
                    _this.combo.setSource(names);
                }, 0);
            })
                .error(function (error) {
                console.log("Error");
                console.log(error);
                _this.loading.projects = false;
            });
        };
        ProjectSettingsHubController.prototype.renderCombo = function () {
            var _this = this;
            this.combo = this.Controls.create(this.Combos.Combo, $("#project-combo-container"), {
                id: "project-combo",
                mode: "drop",
                source: [],
                enabled: true,
                allowEdit: true,
                inputCss: 'form-control-vsts',
                indexChanged: function (index) {
                    _this.$scope.$apply(function () {
                        _this.selectProject(index);
                    });
                }
            });
        };
        ProjectSettingsHubController.prototype.save = function () {
            var _this = this;
            this.loading.save = true;
            this.error.save = false;
            this.success.save = false;
            this.$http.get(this.getApiUri("Projects/" + this.settingsForm.projectId))
                .success(function (data) {
                console.log("Success");
                console.log(data);
                _this.extensionData.setValue("ProjectID-" + _this.webContext.project.id, _this.settingsForm.projectId, { scopeType: "User" });
                _this.loading.save = false;
                _this.success.save = true;
                _this.mode.projectSelected = true;
                _this.mode.editProject = false;
            })
                .error(function (error) {
                console.log("Error");
                console.log(error);
                _this.loading.save = false;
                _this.error.save = true;
            });
        };
        ProjectSettingsHubController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.accountName + ".sswtimepro.com/api/" + relativeUri;
        };
        ProjectSettingsHubController.$inject = ['$http', '$scope', 'Base64', '$timeout'];
        return ProjectSettingsHubController;
    })();
    angular.module('ProjectSettingsHub', [])
        .controller('ProjectSettingsHubController', ProjectSettingsHubController);
})(ProjectSettingsHub || (ProjectSettingsHub = {}));
