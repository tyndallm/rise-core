require('angular');

angular.module('riseApp').controller('accountController', ['$state','$scope', '$rootScope', '$http', "userService", "$interval", "$timeout", "sendTransactionModal", "secondPassphraseModal", "delegateService", 'viewFactory', 'transactionInfo', 'userInfo', '$filter', 'gettextCatalog', function ($state, $rootScope, $scope, $http, userService, $interval, $timeout, sendTransactionModal, secondPassphraseModal, delegateService, viewFactory, transactionInfo, userInfo, $filter, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading dashboard');
    $scope.view.page = {title: gettextCatalog.getString('Dashboard'), previous: null};
    $scope.view.bar = {};
    $scope.delegate = undefined;
    $scope.address = userService.address;
    $scope.publicKey = userService.publicKey;
    $scope.balance = userService.balance;
    $scope.unconfirmedBalance = userService.unconfirmedBalance;
    $scope.secondPassphrase = userService.secondPassphrase;
    $scope.unconfirmedPassphrase = userService.unconfirmedPassphrase;
    $scope.transactionsLoading = true;
    $scope.allVotes = 100 * 1000 * 1000 * 1000 * 1000 * 100;

    $scope.graphs = {
        risePrice: {
            labels: ['1', '2'],
            series: ['Series B'],
            data: [
                [60,  20]
            ],
            colours: ['#29b6f6'],
            options: {
                scaleShowGridLines: false,
                pointDot: false,
                showTooltips: false,
                scaleShowLabels: false,
                scaleBeginAtZero: true
            }
        }
    };

    $scope.transactionInfo = function (block) {
        $scope.modal = transactionInfo.activate({block: block});
    }

    $scope.userInfo = function (userId) {
        $scope.modal = userInfo.activate({userId: userId});
    }

    $scope.getTransactions = function () {

        $http.get("/api/transactions", {
            params: {
                senderPublicKey: userService.publicKey,
                recipientId: $scope.address,
                limit: 8,
                orderBy: 't_timestamp:desc'
            }
        })
            .then(function (resp) {
                var transactions = resp.data.transactions;

                $http.get('/api/transactions/unconfirmed', {
                    params: {
                        senderPublicKey: userService.publicKey,
                        address: userService.address
                    }
                })
                    .then(function (resp) {
                        var unconfirmedTransactions = resp.data.transactions;

                        $timeout(function () {
                            $scope.transactions = unconfirmedTransactions.concat(transactions).slice(0, 8);

                        });

                    });
            });
    }

    $scope.getAccount = function () {
        $http.get("/api/accounts", {params: {address: userService.address}})
            .then(function (resp) {
                $scope.view.inLoading = false;
                var account = resp.data.account;
                userService.balance = account.balance;
                userService.multisignatures = account.multisignatures;
                userService.u_multisignatures = account.u_multisignatures;
                userService.unconfirmedBalance = account.unconfirmedBalance ;
                userService.secondPassphrase = account.secondSignature || account.unconfirmedSignature;
                userService.unconfirmedPassphrase = account.unconfirmedSignature;
                $scope.balance = userService.balance;
                $scope.unconfirmedBalance = userService.unconfirmedBalance;
                $scope.balanceToShow = $filter('decimalFilter')(userService.unconfirmedBalance);
                if ($scope.balanceToShow[1]) {
                    $scope.balanceToShow[1]='.'+ $scope.balanceToShow[1];
                }
                $scope.secondPassphrase = userService.secondPassphrase;
                $scope.unconfirmedPassphrase = userService.unconfirmedPassphrase;

            });
    }

    $scope.getCandles = function () {
        $http.get("https://explorer.rise.vision/api/candles/getCandles")
            .then(function (response) {
                $scope.graphs.risePrice.data = [
                    response.data.candles.map(
                        function (candle) {
                            return candle.close
                        })
                ];
            });
    }

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.transactions') != -1) {
            $scope.updateAppView();
        }
    });

    $scope.$on('$destroy', function () {
        $interval.cancel($scope.balanceInterval);
        $scope.balanceInterval = null;

        $interval.cancel($scope.transactionsInterval);
        $scope.transactionsInterval = null;
    });

    $scope.addSecondPassphrase = function () {
        $scope.secondPassphraseModal = secondPassphraseModal.activate({
            totalBalance: $scope.unconfirmedBalance,
            destroy: function (r) {
                $scope.updateAppView();
                if (r) {
                    $scope.unconfirmedPassphrase = true;
                }
            }
        });
    }

    $scope.updateAppView = function () {
        $scope.getAccount();
        $scope.getTransactions();
        delegateService.getDelegate($scope.publicKey, function (response) {
            $timeout(function () {
                $scope.delegate = response;

            });
        });
    }

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.dashboard') != -1 && $state.current.name=="main.dashboard") {
            $scope.updateAppView();
        }
    });

    $scope.updateAppView();
    $scope.getCandles();

}]);
