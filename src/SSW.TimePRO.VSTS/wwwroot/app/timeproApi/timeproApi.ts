/// <reference path="../../../typings/angularjs/angular.d.ts" />
module TimeproApi {

    export interface IAuthorizeResponse {
        EmpID: string;
        Surname: string;
        MiddleName: string;
        FirstName: string;
        CurrentKey: string;
        timeProUrlID: string;
    }

    export interface ISaveTimesheetForm {
        TimesheetID: string;
        EmpID: string;
        ProjectID: string;
        Hours: number;
        TimesheetDate: string;
        Notes: string;
        AssociatedItems: ITimesheetAssociation[];
    }

    export interface ITimesheetAssociation {
        Type: number;
        ExternalId: string;
    }

    export interface ITimesheet {
        TimesheetID: string;
        BillableHours: number;
        Note: string;
        TimesheetDate: Date;
        Associations: ITimesheetAssociation[];
    }

    export class timeproApi {
        private apiBaseUri: string = "https://{0}.sswtimepro.com/api/";

        static $inject = ['$http', '$q'];
        constructor(private $http: angular.IHttpService, private $q: angular.IQService) {
        }

        getApiUri(accountName, relativeUri) {
            return this.apiBaseUri.replace("{0}", accountName) + relativeUri;
        }

        authorize(accountName: string, username: string, password: string): IPromise<IAuthorizeResponse> {            
            var requestData = {
                email: username,
                password: password
            };

            return this.defaultHttpPost(accountName, "Authorization", requestData);
        }

        getAllProjects(accountName: string) {
            return this.defaultHttpGet(accountName, "Projects");
        }

        getProject(accountName: string, projectId: string) {
            return this.defaultHttpGet(accountName, "Projects/" + projectId);
        }

        getTimesheet(accountName: string, empId: string, projectId: string, date: string): IPromise<any> {
            return this.defaultHttpGet(accountName, "Timesheets/SingleTimesheet?empId=" + empId + "&projectId=" + projectId + "&timesheetDate=" + date);
        }

        saveTimesheet(accountName: string, postData: ISaveTimesheetForm): IPromise<ITimesheet> {
            return this.defaultHttpPost(accountName, "Timesheets/QuickCreate", postData);
        }

        private defaultHttpGet(accountName, relativeUrl) {
            return this.$q((resolve, reject) => {
                this.$http.get(this.getApiUri(accountName, relativeUrl))
                    .success(data => {
                        this.logSuccess(data);
                        resolve(data);
                    })
                    .error(error => {
                        this.logError(error);
                        reject(error);
                    });
            });
        }

        private defaultHttpPost(accountName, relativeUrl, postData) {
            return this.$q((resolve, reject) => {
                this.$http.post(this.getApiUri(accountName, relativeUrl), postData)
                    .success(data => {
                        this.logSuccess(data);
                        resolve(data);
                    })
                    .error(error => {
                        this.logError(error);
                        reject(error);
                    });
            });
        }

        private logSuccess(data) {
            console.log("API Call Success");
            console.log(data);
        }

        private logError(error) {
            console.log("API Call Error");
            console.log(error);
        }
    }

    angular.module("TimeproApi", [])
        .service("timeproApi", timeproApi);
}