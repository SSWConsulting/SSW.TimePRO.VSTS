var ProjectSettingsHub;
(function (ProjectSettingsHub) {
    var ProjectSettingsHubController = (function () {
        function ProjectSettingsHubController($http, $scope, Base64, $timeout, timeproApi) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.$timeout = $timeout;
            this.timeproApi = timeproApi;
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
                this.extensionData.getValue("ProjectID-" + this.webContext.project.id, { scopeType: "User" }),
                this.extensionData.getValue("ProjectName-" + this.webContext.project.id, { scopeType: "User" })
            ])
                .spread(function (apiKey, accountName, projectId, projectName) {
                _this.$scope.$apply(function () {
                    _this.apiKey = apiKey;
                    _this.accountName = accountName;
                    _this.settingsForm.projectId = projectId;
                    _this.settingsForm.projectName = projectName;
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
            this.settingsForm.projectId = this.projects[index].ProjectID;
            this.settingsForm.projectName = this.projects[index].ProjectName;
        };
        ProjectSettingsHubController.prototype.editProject = function () {
            this.mode.editProject = true;
            this.getProjects();
        };
        ProjectSettingsHubController.prototype.getProjects = function () {
            var _this = this;
            this.loading.projects = true;
            this.timeproApi.getAllProjects(this.accountName)
                .then(function (data) {
                _this.loading.projects = false;
                _this.$timeout(function () {
                    _this.renderCombo();
                    _this.projects = data;
                    var names = _(_this.projects).map(function (x) { return x.ProjectName; }).value();
                    _this.combo.setSource(names);
                }, 0);
            }, function (error) {
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
            this.timeproApi.getProject(this.accountName, this.settingsForm.projectId)
                .then(function (data) {
                _this.extensionData.setValue("ProjectID-" + _this.webContext.project.id, _this.settingsForm.projectId, { scopeType: "User" });
                _this.extensionData.setValue("ProjectName-" + _this.webContext.project.id, _this.settingsForm.projectName, { scopeType: "User" });
                _this.loading.save = false;
                _this.success.save = true;
                _this.mode.projectSelected = true;
                _this.mode.editProject = false;
            }, function (error) {
                _this.loading.save = false;
                _this.error.save = true;
            });
        };
        ProjectSettingsHubController.$inject = ['$http', '$scope', 'Base64', '$timeout', 'timeproApi'];
        return ProjectSettingsHubController;
    })();
    angular.module('ProjectSettingsHub', [])
        .controller('ProjectSettingsHubController', ProjectSettingsHubController);
})(ProjectSettingsHub || (ProjectSettingsHub = {}));
