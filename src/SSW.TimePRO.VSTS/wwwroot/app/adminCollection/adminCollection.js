var AdminCollection;
(function (AdminCollection) {
    var AdminCollectionController = (function () {
        function AdminCollectionController($http) {
            this.$http = $http;
            this.loginForm = {};
        }
        AdminCollectionController.prototype.login = function () {
            this.$http.get(this.getApiUri("Authorization?email=" + this.loginForm.username + "&password=" + this.loginForm.password))
                .success(function (data) {
                console.log("Success");
                console.log(data);
            })
                .error(function (error) {
                console.log("Error");
                console.log(error);
            });
        };
        AdminCollectionController.prototype.getApiUri = function (relativeUri) {
            return "https://" + this.loginForm.accountName + ".sswtimeprolocal.com/api/" + relativeUri;
        };
        AdminCollectionController.$inject = ['$http'];
        return AdminCollectionController;
    })();
    angular.module('adminCollection', [])
        .controller('AdminCollectionController', AdminCollectionController);
})(AdminCollection || (AdminCollection = {}));
