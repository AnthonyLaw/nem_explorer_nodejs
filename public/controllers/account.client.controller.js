angular.module("webapp").controller("AccountController", ["$scope", "AccountService", AccountController]);
angular.module("webapp").controller("SearchAccountController", ["$scope", "$timeout", "$location", "AccountService", "NamespaceService", "TXService", SearchAccountController]);

const txListLimit = 50;
const mosaicTXListLimit = 50;

function AccountController($scope, AccountService){
	$scope.page = 1;
	$scope.hideMore = false;
	$scope.getAccountList = function(){
		AccountService.accountList({"page": $scope.page}, function(r_accountList){
			for(let i in r_accountList){
				let account = r_accountList[i];
				account.timeStamp = fmtDate(account.timeStamp);
				account.balance = fixNumber(fmtXEM(account.balance));
				account.importance = fmtPOI(account.importance);
			}
			if($scope.accountList){
				$scope.accountList = $scope.accountList.concat(r_accountList);
			} else {
				$scope.accountList = r_accountList;
			}
			if(r_accountList.length==0 || r_accountList.length<100){
				$scope.hideMore = true;
			}
			$scope.loadingMore = false;
		});
	}
	$scope.loadMore = function(){
		$scope.page++;
		$scope.loadingMore = true;
		$scope.getAccountList();
	};
	$scope.getAccountList();
}

function SearchAccountController($scope, $timeout, $location, AccountService, NamespaceService, TXService){
	$scope.transactionListPage = 1;
	$scope.addressExist = false;
	$scope.loadingFlag = false;
	$scope.loadingMosaicFlag = false;
	$scope.endFlag = false;
	$scope.endMosaicFlag = false;
	$scope.showTransactionTabIndex = 0; //0-transactions, 1-mosaic transactions
	var absUrl = $location.absUrl();
	if(absUrl==null){
		return;
	}
	var reg = /account=(\w{40}|(\w{6}-\w{6}-\w{6}-\w{6}-\w{6}-\w{6}-\w{4}))/;
	if(absUrl.match(reg) && absUrl.match(reg).length>=2){
		var account = absUrl.match(reg)[1];
		account = account.replace(new RegExp(/(-)/g), '').toUpperCase();
		$scope.searchAccount = account;
		let params = {address: account};
		AccountService.detail(params, function(data) {
			if(!data || !data.address){
				$scope.accountItems = [{label: "Not Found", content: ""}];
				return;
			}
			$scope.addressExist = true;
			//load account detail
			var list = [];
			list.push({label: "Address", content: data.address});
			list.push({label: "Public key", content: data.publicKey});
			list.push({label: "Balance", content: ""+fmtXEM(data.balance)});
			list.push({label: "Vested balance", content: ""+fmtXEM(data.vestedBalance)});
			list.push({label: "Importance", content: fmtPOI(data.importance)});
			if(data.timeStamp!=null){
				list.push({label: "Last timeStamp", content: fmtDate(data.timeStamp)});
			}
			if(data.remark!=null){
				list.push({label: "Info", content: "" + data.remark});
			}
			if(data.cosignatories!=null && data.cosignatories!=""){
				list.push({label: "Multisig account", content: "Yes"});
				list.push({label: "Min signatures", content: ""+data.minCosignatories});
				list.push({label: "Cosignatories", content: data.cosignatories});
			}
			$scope.accountItems = list;
			//load harvest info
			list = [];
			if(data.remoteStatus!=null && data.remoteStatus=="ACTIVE"){
				list.push({label: "Harvest status", content: "enable"});
			} else {
				list.push({label: "Harvest status", content: "disabled"});
			}
			list.push({label: "Harvested blocks (all)", content: "loading ..."});
			list.push({label: "Harvested blocks (1 day)", content: "loading ..."});
			list.push({label: "Harvested blocks (1 month)", content: "loading ..."});
			$scope.harvestItems = list;
			$scope.loadHarvestBlocks();
			// init tabs
			$timeout(function() {
				$('#optionAccountTab a').click(function (e) {
			    	e.preventDefault();
			    	$(this).tab('show');
			  	});
			  	$('#optionTransactionTab a').click(function (e) {
			    	e.preventDefault();
			    	if($(e.target).text()=="Transactions")
			    		$scope.showTransactionTabIndex = 0;
			    	else if($(e.target).text()=="Mosaic Transactions")
			    		$scope.showTransactionTabIndex = 1;
			    	$(this).tab('show');
			  	});
			}, 100);
		});
	}
	//load transaction detail
	$scope.showTx = function(tx, $event){
		$scope.selectedTXHash = tx.hash;
		//just skip the action when click from <a>
		if($event!=null && $event.target!=null && $event.target.className.indexOf("noDetail")!=-1){
			return;
		}
		$("#txDetail").modal("show");
		return showTransaction(tx.height, tx.hash, $scope, TXService, tx.recipient);
	};
	//load transaction detail
	$scope.showMosaicTx = function(tx, $event){
		$scope.selectedMosaicTXNO = tx.no;
		//just skip the action when click from <a>
		if($event!=null && $event.target!=null && $event.target.className.indexOf("noDetail")!=-1){
			return;
		}
		$("#txDetail").modal("show");
		return showTransaction(tx.height, tx.hash, $scope, TXService, tx.recipient);
	};
	//load transactions
	$scope.loadTransactions = function(){
		if($scope.showTransactionTabIndex!=0)
			return;
		if($scope.endFlag)
			return;
		$scope.loadingFlag = true;
		let params = {address: $scope.searchAccount, page: $scope.transactionListPage};
		AccountService.detailTXList(params, function(data) {
			if(!data){
				$scope.loadingFlag = false;
				$scope.endFlag = true;
				return;
			}
			$scope.transactionListPage++;
			for(i in data) {
				let tx = data[i];
				tx.timeStamp = fmtDate(tx.timeStamp);
				tx.amount = tx.amount?fmtXEM(tx.amount):0;
				tx.amount = fixNumber(tx.amount);
				tx.fee = fixNumber(fmtXEM(tx.fee));
				$scope.lastID = tx.id;
				tx.flow = 0; // 0-imcoming, 1-outgoing
				if($scope.searchAccount==tx.sender)
					tx.flow = 1;
			}
			if($scope.txList){
				$scope.txList = $scope.txList.concat(data);
			} else {
				$scope.txList = data;
			}
			if(data.length==0 || data.length<mosaicTXListLimit){
				$scope.endFlag = true;
			}
			$scope.loadingFlag = false;
		});
	};
	//load mosaic transactions
	$scope.loadMosaicTransactions = function(){
		if($scope.showTransactionTabIndex!=1)
			return;
		if($scope.endMosaicFlag)
			return;
		$scope.loadingMosaicFlag = true;
		let params = {address: $scope.searchAccount};
		if($scope.mosaicTXList && $scope.mosaicTXList.length>0)
			params.no = $scope.mosaicTXList[$scope.mosaicTXList.length-1].no;
		AccountService.detailMosaicTXList(params, function(data) {
			if(!data){
				$scope.loadingMosaicFlag = false;
				$scope.endMosaicFlag = true;
				return;
			}
			for(i in data) {
				let tx = data[i];
				tx.timeStamp = fmtDate(tx.timeStamp);
				tx.mosaicName = tx.namespace + ":" + tx.mosaic;
				tx.quantity = fmtMosaic(tx.quantity, tx.div);
				tx.flow = 0; // 0-imcoming, 1-outgoing
				if($scope.searchAccount==tx.sender)
					tx.flow = 1;
			}
			if($scope.mosaicTXList){
				$scope.mosaicTXList = $scope.mosaicTXList.concat(data);
			} else {
				$scope.mosaicTXList = data;
			}
			if(data.length==0 || data.length<mosaicTXListLimit){
				$scope.endMosaicFlag = true;
			}
			$scope.loadingMosaicFlag = false;
		});
	};
	//load harvest info
	$scope.loadHarvestBlocks = function(){
		let params = {address: $scope.searchAccount};
		AccountService.loadHarvestBlocks(params, function(data) {
			let list = $scope.harvestItems;
			let newList = [];
			newList.push(list[0]);
			if(!data){
				newList.push({label: "Harvested blocks (all)", content: "fail to load harvest info..."});
				newList.push({label: "Harvested blocks (1 day)", content: "fail to load harvest info..."});
				newList.push({label: "Harvested blocks (1 month)", content: "fail to load harvest info..."});
				$scope.harvestItems = newList;
				return;
			} else if(data.allBlocks==0){
				$scope.harvestItems = newList;
				return;
			}
			let all = "total blocks: "+data.allBlocks+",  &nbsp;&nbsp;&nbsp;&nbsp;total fee: "+data.allFee+" xem,  &nbsp;&nbsp;&nbsp;&nbsp;avg per block "+data.allBlocksPerFee+" xem ("+data.allBlocksPerFeeInUSD+" usd) ("+data.allBlocksPerFeeInBTC+" btc)";
			let day = "total blocks: "+data.dayBlocks+",  &nbsp;&nbsp;&nbsp;&nbsp;total fee: "+data.dayFee+" xem,  &nbsp;&nbsp;&nbsp;&nbsp;avg per block "+data.dayBlocksPerFee+" xem ("+data.dayBlocksPerFeeInUSD+" usd) ("+data.dayBlocksPerFeeInBTC+" btc)";
			let month = "total blocks: "+data.monthBlocks+",  &nbsp;&nbsp;&nbsp;&nbsp;total fee: "+data.monthFee+" xem,  &nbsp;&nbsp;&nbsp;&nbsp;avg per block "+data.monthBlocksPerFee+" xem ("+data.monthBlocksPerFeeInUSD+" usd) ("+data.monthBlocksPerFeeInBTC+" btc)";
			newList.push({label: "Harvested blocks (all)", content: all});
			newList.push({label: "Harvested blocks (1 day)", content: day});
			newList.push({label: "Harvested blocks (1 month)", content: month});
			$scope.harvestItems = newList;
		});
	};
	//show owned namespace
	$scope.showNamespace = function(){
		let params = {address: $scope.searchAccount};
		NamespaceService.namespaceListByAddress(params, function(data) {
			if(!data || data.length==0){
				return;
			}
			$scope.showNamespaceFlag = true;
			$scope.namespaceList = data;
		});
	};
	//show owned mosaic
	$scope.showMosaic = function(){
		let params = {address: $scope.searchAccount};
		NamespaceService.mosaicListByAddress(params, function(data) {
			if(!data || data.length==0){
				return;
			}
			$scope.showMosaicFlag = true;
			$scope.mosaicList = data;
		});
	};
	$scope.loadTransactions();
	$scope.loadMosaicTransactions();
	$scope.showNamespace();
	$scope.showMosaic();
}