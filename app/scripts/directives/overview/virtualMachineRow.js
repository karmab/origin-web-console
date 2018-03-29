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
      'KubevirtVersions',
      VirtualMachineRow,
    ],
    controllerAs: 'row',
    bindings: {
      apiObject: '<',
      state: '<'
    },
    templateUrl: 'views/overview/_virtual-machine-row.html'
  });

  angular.module('openshiftConsole').directive('optionalLink', function () {
    return {
      restrict: 'E',
      scope: {
        link: '@'
      },
      transclude: true,
      template: '<a ng-href="{{link}}" ng-transclude ng-if="link"></a> <span ng-transclude ng-if="!link"></span>'
    }
  });

  angular.module('openshiftConsole').directive('dropdownItem', ['$compile', function ($compile) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        action: '&',
        enabled: '@'
      },
      link: function ($scope, element, attrs, ctrl, transcludeFn) {
        var currentElement = element;

        function onAttrChange() {
          var template = $scope.enabled === 'true'
            ? '<li class="qqq"><a ng-click="action()" ng-transclude></a></li>'
            : '<li class="disabled qqq"><a ng-click="$event.stopPropagation()" ng-transclude></a></li>';
          var newElement = $compile(template, transcludeFn)($scope);
          currentElement.replaceWith(newElement);
          currentElement = newElement;
        }

        $scope.$watch('action', onAttrChange)
        $scope.$watch('enabled', onAttrChange)
      }
    }
  }]);

  angular.module('openshiftConsole').constant('KubevirtVersions', {
    offlineVirtualMachine: {
      resource: "offlinevirtualmachines",
      group: "kubevirt.io",
      version: "v1alpha1"
    },
    virtualMachine: {
      resource: "virtualmachines",
      group: "kubevirt.io",
      version: "v1alpha1"
    }
  });

  angular.module('openshiftConsole').filter('vmState', function() {
    return function(ovm) {
      if (!ovm.spec.running) {
        return "Off";
      }
      var vmPhase = _.get(ovm, '_vm.status.phase')
      if (vmPhase) {
        return vmPhase
      }
      return "Unknown"
    }
  });

  angular.module('openshiftConsole').filter('debug', function() {
    return function(input, param) {
      console.log('debug:', input, param)
      return input
    }
  });

  function VirtualMachineRow(
    $scope,
    $filter,
    $routeParams,
    APIService,
    AuthorizationService,
    DataService,
    ListRowUtils,
    Navigate,
    ProjectsService,
    KubevirtVersions) {
    var row = this;
    row.OfflineVirtualMachineVersion = KubevirtVersions.offlineVirtualMachine;

    _.extend(row, ListRowUtils.ui);
    row.actionsDropdownVisible = function () {
      // no actions on those marked for deletion
      if (_.get(row.apiObject, 'metadata.deletionTimestamp')) {
        return false;
      }

      // We can delete offline virtual machine
      return AuthorizationService.canI(KubevirtVersions.offlineVirtualMachine, 'delete');
    };
    row.projectName = $routeParams.project;

    function isOvmRunning() {
      return row.apiObject.spec.running;
    }

    function createOvmCopy() {
      var copy = angular.copy(row.apiObject);
      delete copy._pod;
      delete copy._vm;
      return copy;
    }

    function setOvmRunning(running) {
      var startedOvm = createOvmCopy();
      startedOvm.spec.running = running;
      return DataService.update(
        KubevirtVersions.offlineVirtualMachine.resource,
        startedOvm.metadata.name,
        startedOvm,
        $scope.$parent.context
      );
    }

    row.startOvm = function () {
      setOvmRunning(true);
    }
    row.stopOvm = function () {
      setOvmRunning(false);
    }
    row.restartOvm = function () {
      return DataService.delete(
        KubevirtVersions.virtualMachine,
        row.apiObject._vm.metadata.name,
        $scope.$parent.context
      );
    }
    row.canStartOvm = function () {
      return !isOvmRunning();
    }
    row.canStopOvm = function () {
      return isOvmRunning();
    }
    row.canRestartOvm = function () {
      return isOvmRunning()
        && row.apiObject._vm
        && _.get(row.apiObject, '_pod.status.phase') === 'Running';
    }
  }
})();
