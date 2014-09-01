/**
 * Created by Tom on 23/06/14.
 */
//fix viewbox problem
wowcdapp.directive('vbox', function() {
    return {
        link: function(scope, element, attrs) {
            attrs.$observe('vbox', function(value) {
                element.attr('viewBox', value);
            })
        }
    };
});
wowcdapp.directive('ngxlink', function() {
    return {
        link: function(scope, element, attrs) {
            attrs.$observe('ngxlink', function(value) {
                element.attr('xlink:href', value);
            })
        }
    };
});