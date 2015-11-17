var ProjectSettingsHub;
(function (ProjectSettingsHub) {
    var ProjectSettingsHubController = (function () {
        function ProjectSettingsHubController($http, $scope, Base64) {
            var _this = this;
            this.$http = $http;
            this.$scope = $scope;
            this.Base64 = Base64;
            this.settingsForm = {};
            this.loading = {
                page: true
            };
            this.error = {};
            this.success = {};
            VSS.init({
                usePlatformScripts: true
            });
            // Wait for the SDK to be initialized
            VSS.ready(function () {
                require(["q"], function (Q) {
                    _this.Q = Q;
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
                    }
                    else {
                        _this.loggedIn = false;
                    }
                    if (!apiKey) {
                        _this.configured = false;
                    }
                    else {
                        _this.configured = true;
                    }
                    _this.loading.page = false;
                    var authdata = _this.Base64.encode(_this.apiKey + ':');
                    _this.$http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                });
            }, function (error) {
                console.log("Error loading VSTS data");
                console.log(error);
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
        ProjectSettingsHubController.$inject = ['$http', '$scope', 'Base64'];
        return ProjectSettingsHubController;
    })();
    angular.module('ProjectSettingsHub', [])
        .controller('ProjectSettingsHubController', ProjectSettingsHubController);
})(ProjectSettingsHub || (ProjectSettingsHub = {}));
