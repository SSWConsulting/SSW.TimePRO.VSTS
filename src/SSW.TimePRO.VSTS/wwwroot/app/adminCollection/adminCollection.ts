module AdminCollection {

    interface ILoginForm {
        accountName: string;
        username: string;
        password: string;
    }

    class AdminCollectionController {
        private test: string;
        private loginForm: ILoginForm;

        static $inject = ['$http'];
        constructor(private $http: angular.IHttpService) {
            this.loginForm = <ILoginForm>{};
        }

        login() {
            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success((data) => {
                    console.log("Success");
                    console.log(data);
                })
                .error((error) => {
                    console.log("Error");
                    console.log(error);
                });
        }

        getApiUri(relativeUri) {
            return "https://" + this.loginForm.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        }
    }

    angular.module('adminCollection', [])
        .controller('AdminCollectionController', AdminCollectionController);
}