/// <reference path="../../../typings/angularjs/angular.d.ts" />
var TimeproApi;
(function (TimeproApi) {
    var timeproApi = (function () {
        function timeproApi($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.apiBaseUri = "https://{0}.sswtimeprolocal.com/api/";
        }
        timeproApi.prototype.getApiUri = function (accountName, relativeUri) {
            return this.apiBaseUri.replace("{0}", accountName) + relativeUri;
        };
        timeproApi.prototype.authorize = function (accountName, username, password) {
            var requestData = {
                email: username,
                password: password
            };
            return this.defaultHttpPost(accountName, "Authorization", requestData);
        };
        timeproApi.prototype.getAllProjects = function (accountName) {
            return this.defaultHttpGet(accountName, "Projects");
        };
        timeproApi.prototype.getProject = function (accountName, projectId) {
            return this.defaultHttpGet(accountName, "Projects/" + projectId);
        };
        timeproApi.prototype.getTimesheet = function (accountName, empId, projectId, date) {
            return this.defaultHttpGet(accountName, "Timesheets/SingleTimesheet?empId=" + empId + "&projectId=" + projectId + "&timesheetDate=" + date);
        };
        timeproApi.prototype.saveTimesheet = function (accountName, postData) {
            return this.defaultHttpPost(accountName, "Timesheets/QuickCreate", postData);
        };
        timeproApi.prototype.defaultHttpGet = function (accountName, relativeUrl) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.$http.get(_this.getApiUri(accountName, relativeUrl))
                    .success(function (data) {
                    _this.logSuccess(data);
                    resolve(data);
                })
                    .error(function (error) {
                    _this.logError(error);
                    reject(error);
                });
            });
        };
        timeproApi.prototype.defaultHttpPost = function (accountName, relativeUrl, postData) {
            var _this = this;
            return this.$q(function (resolve, reject) {
                _this.$http.post(_this.getApiUri(accountName, relativeUrl), postData)
                    .success(function (data) {
                    _this.logSuccess(data);
                    resolve(data);
                })
                    .error(function (error) {
                    _this.logError(error);
                    reject(error);
                });
            });
        };
        timeproApi.prototype.logSuccess = function (data) {
            console.log("API Call Success");
            console.log(data);
        };
        timeproApi.prototype.logError = function (error) {
            console.log("API Call Error");
            console.log(error);
        };
        timeproApi.$inject = ['$http', '$q'];
        return timeproApi;
    })();
    TimeproApi.timeproApi = timeproApi;
    angular.module("TimeproApi", [])
        .service("timeproApi", timeproApi);
})(TimeproApi || (TimeproApi = {}));
