/// <reference path="../../sdk/scripts/vss.d.ts" />
module AdminCollection {

    interface ILoginForm {
        accountName: string;
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

    class AdminCollectionController {
        public static get API_KEY(): string { return "TimePROApiKey"; }
        public static get ACCOUNT_NAME(): string { return "TimePROAccountName"; }
        private loginForm: ILoginForm;
        private extensionData: IExtensionDataService;
        private loggedIn: boolean;
        private loading: ILoading;
        private error: IError;
        private accountName: string;
        private Q: any;

        static $inject = ['$http', '$scope'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope) {
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
            });
            this.Q.all([
                    this.extensionData.getValue(AdminCollectionController.API_KEY),
                    this.extensionData.getValue(AdminCollectionController.ACCOUNT_NAME)
                ])
                .spread((apiKey, accountName) => {
                    this.$scope.$apply(() => {
                        if (apiKey) {
                            this.loggedIn = true;
                        } else {
                            this.loggedIn = false;
                        }

                        this.accountName = accountName;
                        this.loading.page = false;
                    });
                });
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

                    this.extensionData.setValue(AdminCollectionController.API_KEY, data.CurrentKey);
                    this.extensionData.setValue(AdminCollectionController.ACCOUNT_NAME, data.timeProUrlID);
                    this.accountName = data.timeProUrlID;
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
            //return "https://" + this.loginForm.accountName + ".sswtimepro.com/api/" + relativeUri;
            return "https://" + this.loginForm.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        }

        disconnect() {
            this.loading.disconnect = true;
            this.extensionData.setValue(AdminCollectionController.API_KEY, null).then(() => {
                this.$scope.$apply(() => {
                    this.loading.disconnect = false;
                });

                this.init(); // Init assumes no scope
            });
        }
    }

    angular.module('adminCollection', [])
        .controller('AdminCollectionController', AdminCollectionController);
}