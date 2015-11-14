var App;
(function (App) {
    angular.module('app', ['adminCollection'])
        .directive('loadingButton', [
        '$compile', function ($compile) {
            return {
                restrict: 'A',
                link: function (scope, element, attr) {
                    /* attr.style == "data-style" */
                    if (attr.loadingButtonAnimation && !attr.style) {
                        element.attr("data-style", attr.loadingButtonAnimation);
                    }
                    else if (!attr.loadingButtonAnimation && !attr.style) {
                        element.attr("data-style", "slide-left");
                    }
                    if (!element.hasClass("ladda-button")) {
                        element.addClass("ladda-button");
                    }
                    $(element).ladda();
                    scope.$watch(attr.loadingButton, function (newValue, oldValue) {
                        if (newValue) {
                            $(element).ladda('start');
                        }
                        else {
                            $(element).ladda('stop');
                        }
                    });
                    $compile(element.contents())(scope);
                }
            };
        }
    ]);
})(App || (App = {}));
