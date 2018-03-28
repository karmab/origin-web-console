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

  angular.module('openshiftConsole').directive('optionalA', ['$parse', '$compile', '$rootScope', function ($parse, $compile, $rootScope) { // TODO remove $parse
    return {
      // (E)lement can't be used because of bug in jQuery URI plugin
      restrict: 'A',
      transclude: true,
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
        var transcludeContent = transcludeFn();
        console.log('*************************', element[0])

        function onAttrChange() {
          var template = $scope.enabled === 'true'
            ? '<li class="qqq"><a ng-click="action()"></a></li>'
            : '<li class="disabled qqq"><a ng-click="$event.stopPropagation()"></a></li>';
          var newElement = $compile(template)($scope);
          console.log('scope', $scope, $scope.action, $scope.enabled);
          newElement.find('a').append(transcludeContent);
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
    return function(input) {
      console.log('debug:', input)
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
      console.log('start ovm', row.apiObject, $scope.context);
      setOvmRunning(true).then((response) => console.log('vm started', response));
    }
    row.stopOvm = function () {
      console.log('stop ovm', row.apiObject, $scope.context);
      setOvmRunning(false).then((response) => console.log('vm stopped', response));
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
      return isOvmRunning() && row.apiObject._vm && _.get(row.apiObject, '_pod.status.phase') === 'Running'
    }
  }
})();
