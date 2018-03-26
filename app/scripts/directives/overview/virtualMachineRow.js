'use strict';

(function () {
  angular.module('openshiftConsole').component('virtualMachineRow', {
    controller: [
      '$scope',
      '$filter',
      '$routeParams',
      'APIService',
      'AuthorizationService',
      'DataService',
      'ListRowUtils',
      'Navigate',
      'ProjectsService',
      VirtualMachineRow,
    ],
    controllerAs: 'row',
    bindings: {
      ovm: '<',
      state: '<'
    },
    templateUrl: 'views/overview/_virtual-machine-row.html'
  })
    .directive('optionalA', ['$parse', '$compile', '$rootScope', function ($parse, $compile, $rootScope) {
      return {
        // (E)lement can't be used because of bug in jQuery URI plugin
        restrict: 'A',
        transclude: true,
        // https://stackoverflow.com/a/33527624/639687
        link: function (scope, el, attrs, ctrl, transcludeFn) {
          if (attrs.href) {
            var template = '<a ng-href="{{ href }}"></a>';
            const localScope = $rootScope.$new(true);
            localScope.href = attrs.href;
            var aElement = $compile(template)(localScope);
            aElement.append(transcludeFn());
            el.replaceWith(aElement);
            return;
          }
          el.replaceWith(transcludeFn());
        }
      }
    }]);

  function VirtualMachineRow($scope, $filter, $routeParams, APIService, AuthorizationService, DataService, ListRowUtils, Navigate, ProjectsService) {
    var row = this;
    row.installType = '';

    _.extend(row, ListRowUtils.ui);


    row.mobileclientVersion = {
      group: "mobile.k8s.io",
      version: "v1alpha1",
      resource: "mobileclients"
    };
    row.actionsDropdownVisible = function () {
      // no actions on those marked for deletion
      if (_.get(row.ovm, 'metadata.deletionTimestamp')) {
        return false;
      }

      // We can delete mobileclients
      return AuthorizationService.canI(row.mobileclientVersion, 'delete');
    };
    row.projectName = $routeParams.project;
    row.browseCatalog = function () {
      Navigate.toProjectCatalog(row.projectName);
    };
  }
})();
