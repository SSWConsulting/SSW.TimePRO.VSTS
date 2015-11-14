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
    }

    interface IError {
        login: boolean;
    }

    class TimesheetHubController {
        public static get API_KEY(): string { return "TimePROApiKey"; }
        public static get ACCOUNT_NAME(): string { return "TimePROAccountName"; }
        public static get CURRENT_USER_ID(): string { return "TimePROCurrentUserId"; }

        private accountName: string;
        private loginForm: ILoginForm;
        private loggedIn: boolean;
        private loading: ILoading;
        private error: IError;
        private currentUserId: string;

        private extensionData: IExtensionDataService;

        static $inject = ['$http', '$scope'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope) {
            VSS.init({
                usePlatformScripts: true
            });

            // Wait for the SDK to be initialized
            VSS.ready(() => {
                require(["q"], (Q) => {
                    Q.all([VSS.getService(VSS.ServiceIds.ExtensionData)])
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
            });
            Q.all([
                    this.extensionData.getValue(TimesheetHubController.CURRENT_USER_ID),
                    this.extensionData.getValue(TimesheetHubController.ACCOUNT_NAME)
                ])
                .spread((userId, accountName) => {

                    this.$scope.$apply(() => {
                        this.currentUserId = userId;
                        this.accountName = accountName;

                        if (userId && accountName) {
                            this.loggedIn = true;
                        } else {
                            this.loggedIn = false;
                        }

                        this.loading.page = false;
                    });
                });
        }

        login() {
            this.loading.login = true;
            this.error.login = false;

            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success((data: IAuthorizationResponse) => {
                    console.log("Success");
                    console.log(data);

                    this.extensionData.setValue(TimesheetHubController.CURRENT_USER_ID, data.EmpID);
                    this.loading.login = false;
                    this.loggedIn = true;
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
    }

    angular.module('TimesheetHub', [])
        .controller('TimesheetHubController', TimesheetHubController);
}