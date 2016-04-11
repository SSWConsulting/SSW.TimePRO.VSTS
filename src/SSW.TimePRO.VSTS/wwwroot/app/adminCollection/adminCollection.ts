/// <reference path="../../sdk/scripts/vss.d.ts" />
module AdminCollection {

    declare var appInsights: any;

    interface ILoginForm {
        accountName: string;
        username: string;
        password: string;
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

        static $inject = ['$http', '$scope', 'timeproApi'];
        constructor(private $http: angular.IHttpService, private $scope: angular.IScope, private timeproApi: TimeproApi.timeproApi) {
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

            this.timeproApi.authorize(this.loginForm.accountName, this.loginForm.username, this.loginForm.password)
                .then(data => {
                    appInsights.trackEvent("AdminLoginSuccess", { Account: this.loginForm.accountName, Username: this.loginForm.username });
                    this.extensionData.setValue(AdminCollectionController.API_KEY, data.CurrentKey);
                    this.extensionData.setValue(AdminCollectionController.ACCOUNT_NAME, data.timeProUrlID);
                    this.accountName = data.timeProUrlID;
                    this.loading.login = false;
                    this.loggedIn = true;
                }, error => {
                    appInsights.trackEvent("AdminLoginFailed", { Account: this.loginForm.accountName, Username: this.loginForm.username });
                    this.loading.login = false;
                    this.error.login = true;
                });
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