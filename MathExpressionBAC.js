//for development purpose only, comment if you wanna build APK
var parseToLogFile = require(__basedir + '/indexBanca');

var rootScope = {};
function setRootScope(_rootScope) {
    rootScope = _rootScope;
};

function reMappingCode(param, coverageCdList) {
    var manfaatList = param.manfaatList;
    var listMappingCode = rootScope.COVERAGE_TERM;

    mappingCode = {}
    listMappingCode.forEach((code, index) => mappingCode[code.life_asia_cd] = code.coverage_cd);

    var manfaat;
    var newCode;
    var oldCode;
    for (var i = 0; i < manfaatList.length; i++) {
        manfaat = manfaatList[i];
        oldCode = manfaat.code;
        newCode = mappingCode[oldCode];

        param.manfaatList[i].code = newCode == undefined ? oldCode : newCode;
        param.manfaatList[i].oldCode = oldCode;

        // coverageCdList.push("'" + param.manfaatList[i].code + "'");
    }
    return param;
}

var myManfaatList = [];
var isPPHC = false;
var mapChargeRider = {};

function processIlustration(param, DIFFLVPREMI) {
    param = reMappingCode(param);
    var response = {};
    var mapOutputFundList = {};

    var mapOutputFund = {};
    var mapOutputFundAlt = {};
    var mapFundNLG = {};
    var mapFundNLGAlt = {};
    var mapOutput = {};
    var mapOutputMain = {};
    var mapOutputPPHAlt = {};

    var mapHelper = [];
    var mapOutputFundAltLimited = {};
    var mapOutputFundAltWhole = {};

    var tempFundSaverTotal = 0;

     if(param.prodCd.indexOf('L2H') != -1){
         var itemInput = [];
         itemInput.push({
             key : 'PDALLO',
             inputValue : 100,
             inputValueTopup : 100
         });
         var fundList = [];
         fundList.push({
             code : 'PRMF',
             itemInput : itemInput,
             type : 'FUND'
        });
         param.fundList = fundList;
      }

    for (var i = 0; i < param.fundList.length; i++) {
        for (var j = 0; j < param.fundList[i].itemInput.length; j++) {
            if (param.fundList[i].itemInput[j].key == 'PDALLO') {
                tempFundSaverTotal = tempFundSaverTotal + param.fundList[i].itemInput[j].inputValueTopup;
                break;
            }
        }
    }
    if (tempFundSaverTotal < 100
        || ((param.custSaver == undefined || param.custSaver <= 0) && (param.topupList == undefined || param.topupList.length == 0))) {
        for (var i = 0; i < param.fundList.length; i++) {
            for (var j = 0; j < param.fundList[i].itemInput.length; index++) {
                if (param.fundList[i].itemInput[j].key == 'PDALLO') {
                    if (param.fundList[i].itemInput[j].inputValue == 0) {
                        param.fundList.splice(i, 1);
                        i--;
                    } else {
                        param.fundList[i].itemInput[j].inputValueTopup =
                            param.fundList[i].itemInput[j].inputValue;
                    }
                    break;
                }
            }
        }
    }

    for (var i = 0; i < param.manfaatList.length; i++) {
        if (param.manfaatList[i].code.match(/H1Z1.*/) || param.manfaatList[i].code.match(/H1Z5.*/)) {
            param.isPPH = true;
            break;
        }
    }

    param = setParamMainCoverage(param);

    var year = 1;
    var ageCustomer = param.age;
    var setManfaatList = sortingRiderTopupMain(param.manfaatList, param.age);
    myManfaatList = setManfaatList.PHC;
    param.ManfaatListCVCalc = setManfaatList.PHC;
    param.ManfaatListCovCalc = setManfaatList.isPHCExists;

    param.issuedDate = Date.now();

    param.MAXSVROPT = setManfaatList.MAXSVROPT;
    param.CURRSVROPT = setManfaatList.CURRSVROPT;

    if (param.CURRSVROPT == 'Tidak dipilih' || param.CURRSVROPT == 'Tidak Dipilih') {
        param.CURRSVROPT = '0.0';
    }
    if (param.MAXSVROPT == 'Tidak dipilih' || param.MAXSVROPT == 'Tidak Dipilih') {
        param.MAXSVROPT = '0.0';
    }

    for (var i = 0; i < param.fundList.length; i++) {
        param.fundList[i].flagDB = false;
        myManfaatList.push(param.fundList[i]);
    }

    for(var i = 0; i < param.fundList.length; i++){
        var bantu = {
            code : param.fundList[i].code,
            name : param.fundList[i].name,
            checked : param.fundList[i].checked,
            taken : param.fundList[i].taken,
            flagSearch : param.fundList[i].flagSearch,
            itemInput : param.fundList[i].itemInput,
            type : param.fundList[i].type,
            flagDB : true
        }
        myManfaatList.push(bantu);
    }

    if (param.manfaat.rencanaPembayaran == 0) {
        param.manfaat.rencanaPembayaran = param.alternatifRencanaPembayaran;
    }

    var result = processIlustrationClient(ageCustomer, param, year, mapOutputFund, mapOutputFundAlt, mapFundNLG, mapFundNLGAlt, mapOutput, 'CLIENT', DIFFLVPREMI, mapOutputMain, mapHelper);

    if (result != undefined) {
        isPPHC = false;
        if (result.status == '0') {
            if (param.MAXSVROPT != undefined) {
                isPPHC = true;
                processIlustrationAlt(ageCustomer, param, year, mapOutputFundAltLimited, mapOutputFundAltWhole, mapFundNLG, mapFundNLGAlt, mapOutput, 'ALT', DIFFLVPREMI, mapOutputPPHAlt)
            }
            if (isPPHC == true) {
                mapOutputFundList = {
                    mapOutputMain: mapOutputMain,
                    mapOutputPPHAlt: mapOutputPPHAlt,
                };
            } else {
                mapOutputFundList = {
                    mapOutputMain: mapOutputMain,
                };
            }

            response.status = '0';

            if (param.mainCoverage == 'E2ER') {
                response.content = generateOutputUSAVE(param, mapOutputFundList);
            } else if (param.mainCoverage == 'U2LR' || param.mainCoverage == 'U2LD') {
                response.content = generateOutputFIA(param, mapOutputFundList, result);
            } else if (param.mainCoverage == 'U2NR' || param.mainCoverage == 'U2ND' || param.mainCoverage == 'U2KD') {
                response.content = generateOutputBIA(param, mapOutputFundList, result);
            } else if (param.mainCoverage == 'U23R' || param.mainCoverage == 'U23D') {
                response.content = generateOutputPSC(param, mapOutputFundList, result);
            } else if (param.mainCoverage == 'U2Z3' || param.mainCoverage == 'U2Z4') {
                response.content = generateOutputBIAMax(param, mapOutputFundList, result);
            } else if (param.mainCoverage == 'L2HD'){
                response.content = generateOutputPLPL(param, mapOutputFundList, result);
            }
            else {
                response.content = generateOutput(param, mapOutputFundList, result);
            }
        } else {
            response = result;
        }
    } else {
        isPPHC = false;
        if (param.MAXSVROPT != undefined) {
            isPPHC = true;
            processIlustrationAlt(ageCustomer, param, year, mapOutputFundAltLimited, mapOutputFundAltWhole, mapFundNLG, mapFundNLGAlt, mapOutput, 'ALT', DIFFLVPREMI, mapOutputPPHAlt)
        }
        if (isPPHC == true) {
            mapOutputFundList = {
                mapOutputMain: mapOutputMain,
                mapOutputPPHAlt: mapOutputPPHAlt,
            };
        } else {
            mapOutputFundList = {
                mapOutputMain: mapOutputMain,
            };
        }

        response.status = '0';

        if (param.mainCoverage == 'E2ER') {
            response.content = generateOutputUSAVE(param, mapOutputFundList);
        } else if (param.mainCoverage == 'U2LR' || param.mainCoverage == 'U2LD') {
            response.content = generateOutputFIA(param, mapOutputFundList, result);
        } else if (param.mainCoverage == 'U2NR' || param.mainCoverage == 'U2ND' || param.mainCoverage == 'U2KD') {
            response.content = generateOutputBIA(param, mapOutputFundList, result);
        } else if (param.mainCoverage == 'U23R' || param.mainCoverage == 'U23D') {
            response.content = generateOutputPSC(param, mapOutputFundList, result);
        } else if (param.mainCoverage == 'U2Z3' || param.mainCoverage == 'U2Z4' ) {
            response.content = generateOutputBIAMax(param, mapOutputFundList, result);
        }else if(param.mainCoverage == 'L2HD'){
            response.content = generateOutputPLPL(param, mapOutputFundList, result);  
        } else {
            response.content = generateOutput(param, mapOutputFundList, result);
        }
    }
    return response;
}

function setParamMainCoverage(param) {
    if (param.mainCoverage == undefined) {
        for (var i = 0; i < param.manfaatList.length; i++) {
            if (param.manfaatList[i].coverageType == 'main') {
                param.mainCoverage = param.manfaatList[i].code;
                break;
            }
        }
    }
    return param;
}

function sortingRiderTopupMain(tempManfaatList, age) {
    var manfaatList = [];
    for (var i = 0; i < tempManfaatList.length; i++) {
        var tmpManfaat = tempManfaatList[i];
        for (var j = 0; j < tmpManfaat.custList.length; j++) {
            var tmpCustList = tmpManfaat.custList[j];
            var manfaat = {};
            var isInsert = true;

            tmpManfaat.showCode = tmpManfaat.code;
            manfaat.code = tmpManfaat.code;
            manfaat.name = tmpManfaat.name;
            manfaat.disabled = tmpManfaat.disabled;
            manfaat.coverageType = tmpManfaat.coverageType;
            manfaat.type = tmpManfaat.type;
            manfaat.lifeAssureCd = tmpManfaat.lifeAssureCd;

            manfaat.tertanggungName = tmpCustList.name;
            manfaat.tertanggungAge = tmpCustList.anb;
            manfaat.tertanggungAgeNew = tmpCustList.anbNew;
            manfaat.tertanggungKey = tmpCustList.key;
            if (tmpCustList.customerId != undefined) {
                manfaat.tertanggungCustomerId = tmpCustList.customerId;
            } else {
                manfaat.tertanggungCustomerId = tmpCustList.key;
            }
            manfaat.itemInput = tmpCustList.itemInput;
            manfaat.smokerStatus = tmpCustList.smokerStatus;
            manfaat.loadMap = getLoadMapFromCustomer(tmpCustList.loadList);
            manfaat.previousPremi = tmpManfaat.previousPremi;
            manfaat.previousAccm = tmpManfaat.previousAccm;
            manfaat.previousSA = tmpManfaat.previousSA;
            manfaat.previousSaver = tmpManfaat.previousSaver;
            manfaat.isNeedToBeCalculated = tmpManfaat.isNeedToBeCalculated;
            manfaat.alterationDate = tmpManfaat.alterationDate;
            manfaat.clazz = tmpCustList.clazz;
            manfaat.oldCode = tmpManfaat.oldCode;
            manfaat.newRider = tmpManfaat.newRider;
            manfaat.planAlreadyProcessed = tmpManfaat.planAlreadyProcessed;
            manfaat.riderStatus = tmpManfaat.riderStatus;
            manfaat.saOriginal = tmpManfaat.saOriginal;
            manfaat.isGIO = tmpManfaat.isGIO;
            manfaat.isFUW = tmpManfaat.isFUW;
            manfaat.approvalTypeConversion = tmpManfaat.approvalTypeConversion;
            manfaat.planAlreadyProcessed = tmpManfaat.planAlreadyProcessed;

            if (tmpManfaat.coverageType.toLowerCase() == 'main') {
                manfaat.cumulativeCalculateUsingNewRate = tmpManfaat.cumulativeCalculateUsingNewRate;
                manfaat.cumulativeRemainingSA = tmpManfaat.cumulativeRemainingSA;
                manfaat.cumulativePreviousSA = tmpManfaat.cumulativePreviousSA;
                manfaat.cumulativeCurrentResult = tmpManfaat.cumulativeCurrentResult;
                manfaat.cumulativePreviousSumResult = tmpManfaat.cumulativePreviousSumResult;
            }

            if (tmpManfaat.histValue != undefined) {
                manfaat.histValuePlan = tmpManfaat.histValue.PLAN;
                manfaat.histValueSA = tmpManfaat.histValue.SA;
                manfaat.histValueUnit = tmpManfaat.histValue.UNIT;
                manfaat.histValueTerm = tmpManfaat.histValue.TERM;
                manfaat.histValueAccm = tmpManfaat.histValue.ACCM;
            }

            if (tmpManfaat.currValue != undefined) {
                manfaat.currValueSA = tmpManfaat.currValue.SA;
                manfaat.currValueAccm = tmpManfaat.currValue.ACCM;
            }

            if (tmpCustList.age == undefined) {
                manfaat.age = age;
            } else {
                manfaat.age = tmpCustList.age;
            }

            if (tmpCustList.ageNew != undefined) {
                manfaat.ageNew = tmpCustList.ageNew;
            }

            if (tmpManfaat.code.match(/H1Z.*/)) {
                manfaat.isPPH = 'O';
                var coverageItemInput = rootScope.COVERAGE[tmpManfaat.code].ITEM_INPUT;
                var rootItemInput = rootScope.INPUT[coverageItemInput];
                var mapManfaatItemInput = {};
                for (var k = 0; k < manfaat.itemInput.length; k++) {
                    mapManfaatItemInput[manfaat.itemInput[k].key] = manfaat.itemInput[k].inputValue;
                }
                var itemInputCode = coverageItemInput;
                if (manfaat.planAlreadyProcessed == undefined || !manfaat.planAlreadyProcessed) {
                    for (var tempCount = 0; tempCount <= 3; tempCount++) {
                        var itemInput = rootScope.INPUT[itemInputCode];
                        if (itemInput == undefined) {
                            break;
                        }
                        var splitValue = itemInput.value.split('|');
                        var splitValue2;
                        for (var kk = 0; kk < splitValue.length; kk++) {
                            if (splitValue[kk].split(',')[1].indexOf(mapManfaatItemInput[itemInput.key]) != -1) {
                                splitValue2 = splitValue[kk].split(',');
                                itemInputCode = splitValue2[0];
                                break;
                            }
                        }
                        if (itemInput.type == 'advancedoption') {
                            for (var k = 0; k < manfaat.itemInput.length; k++) {
                                if (manfaat.itemInput[k].key == rootItemInput.key) {
                                    tempManfaatList[i].planAlreadyProcessed = true;
                                    manfaat.itemInput[k].inputValue = splitValue2[1].trim();
                                    manfaat.itemInput[k].inputValueForRate = splitValue2[0];
                                    manfaat.itemInput[k].inputAdvance = splitValue[kk];
                                    manfaat.itemInput[k].inputAdvanceFull = itemInput.value;
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
            } else {
                manfaat.isPPH = 'D';
            }

            for (var k = 0; k < manfaat.itemInput.length; k++) {
                if (manfaat.itemInput[k].key == 'PDPLAN' && (manfaat.itemInput[k].inputValue == 'N')) { // || !manfaat.itemInput[k].inputValue || manfaat.itemInput[k].inputValue == '')){
                    isInsert = false;
                } else if (manfaat.itemInput[k].key == 'PDTERM' && (manfaat.itemInput[k].inputValue == 'N')) { // || !manfaat.itemInput[k].inputValue || manfaat.itemInput[k].inputValue == '')){
                    isInsert = false;
                }
            }

            if (isInsert) {
                manfaatList.push(manfaat);
            }

        }
    }

    var tempList_topup = [];
    var tempList_main = [];
    var tempList_h1tr = [];
    var tempList_no_h1tr = [];
    var tempList_phc = [];
    var tempList_phc_max = [];
    var mapAllManfaat = {};
    for (var i = 0; i < manfaatList.length; i++) {
        var coverage = rootScope.COVERAGE[manfaatList[i].code];
        if (coverage.type.toLowerCase().trim() === 'rider') {
            if (manfaatList[i].code.toUpperCase().trim() == 'H2TR') {
                for (jj = 0; jj < manfaatList[i].itemInput.length; jj++) {
                    if (manfaatList[i].itemInput[jj].key == 'PDPLAN') {
                        break;
                    }
                }
                var str = manfaatList[i].itemInput[jj].inputValue;
                var matches = str.match(/\b(\w)/g)[0];
                manfaatList[i].itemInput[jj].inputValue = matches;
                tempList_h1tr.push(manfaatList[i]);
            } else if (manfaatList[i].code.toUpperCase().trim() == 'H1Z1' || manfaatList[i].code.toUpperCase().trim() == 'H1Z5') {
                var tempPPH = JSON.stringify(manfaatList[i]);
                var jj;
                for (jj = 0; jj < manfaatList[i].itemInput.length; jj++) {
                    if (manfaatList[i].itemInput[jj].key == 'PDPLAN') {
                        break;
                    }
                }
                mapAllManfaat.CURRSVROPT = manfaatList[i].itemInput[jj].inputAdvance.split(',')[1].trim();
                tempList_phc.push(manfaatList[i]);

                var maxPlanPHCP = setMaxPlanPHCPValue(tempPPH);
                mapAllManfaat.MAXSVROPT = maxPlanPHCP.itemInput[jj].inputAdvance.split(',')[1].trim();

                tempList_phc_max.push(maxPlanPHCP);
            } else {
                tempList_no_h1tr.push(manfaatList[i]);
            }
        }

        if (coverage.type.toLowerCase().trim() === 'topup') {
            tempList_topup.push(manfaatList[i]);
        }

        if (coverage.type.toLowerCase().trim() === 'main') {
            tempList_main.push(manfaatList[i]);
        }
    }

    mapAllManfaat.PHC = tempList_topup.concat(tempList_phc_max).concat(tempList_phc).concat(tempList_h1tr).concat(tempList_no_h1tr).concat(tempList_main);
    mapAllManfaat.isPHCExists = tempList_topup.concat(tempList_phc).concat(tempList_h1tr).concat(tempList_no_h1tr).concat(tempList_main);

    return mapAllManfaat;
}

function setMaxPlanPHCPValue(strPlan){
    var tempPlan = {};
    var choosedPlan = JSON.parse(strPlan);
    var itemInputProcessed = false;
    for(var key in choosedPlan){
        tempPlan[key] = choosedPlan[key];
        tempPlan.isPPH = 'M';
        if(tempPlan.itemInput && !itemInputProcessed){
            outer:
            for(var i=0; i < tempPlan.itemInput.length; i++){
                if(tempPlan.itemInput[i].key == 'PDPLAN'){
                    var splitValue = tempPlan.itemInput[i].inputAdvanceFull.split('|');
                    for(var ii = 0; ii < splitValue.length; ii++){
                        if(splitValue[ii].indexOf(tempPlan.itemInput[i].inputValue) == -1){
                            var splitValue2 = splitValue[ii].split(',');
                            tempPlan.itemInput[i].inputValue = splitValue2[1].trim();
                            tempPlan.itemInput[i].inputValueForRate = splitValue2[0];
                            tempPlan.itemInput[i].inputAdvance = splitValue[ii];
                            break outer;
                        }
                    }
                }
            }
            itemInputProcessed = true;
        }
    }
    return tempPlan;
}

function getLoadMapFromCustomer(loadList) {
    var tmpLoadList = {};
    if (loadList) {
        for (var v = 0; v < loadList.length; v++) {
            var tmpLod = loadList[v];
            if (tmpLod.selectedValue) {
                tmpLoadList[tmpLod.code] = tmpLod.selectedValue;
                var div = tmpLod.divider;
                tmpLoadList[tmpLod.code] = getResultExpression(tmpLod.selectedValue / div);
            }
        }
    }
    return tmpLoadList;
}

function processIlustrationClient(ageCustomer, param, year, mapOutputFund, mapOutputFundAlt, mapFundNLG, mapFundNLGAlt, mapOutput, type, DIFFLVPREMI, mapOutputMain, mapHelper) {
    // var tempRuleList=[];
    var response = {};

    while (ageCustomer <= param.alternatifRencanaPembayaran) {
        param.year = year;
        param.age = ageCustomer;

        var result;
        result = preparedParameterClient('proses', param, mapOutputFund, mapOutputFundAlt, type, DIFFLVPREMI, mapHelper);
        
        //collapse under 20
        if(param.prodCd == "U2L"){
            if (result.MAPCOV.TOTALCVLOWDISPLAY < 0 && year <= 20) {
                response.status = '1';
                response.content = null;
                return response;
            }
        }else{
            if (result.MAPCOV.TOTALCVLOWFUNDDSPLY < 0 && year <= 20) {
                response.status = '1';
                response.content = null;
                return response;
            }
        }

        if(result.rule != undefined && result.rule.length > 0){
            var res = {};
            res.status = '1';
            res.content = null;
            res.rule = result.rule;
            return res;
        }

        mapOutputFund = result.MAPOUTPUTFUND;
        mapOutputFundAlt = result.MAPOUTPUTFUNDALT;
        var mapFundNLG = result.MAPCOV;
        var mapFundNLGAlt = result.MAPCOVALT;
        var mapOutput = result.MAPOUTPUTFUNDPERTAHUN;
        var mapGIO = result.MAPGIO;
        var isGio = result.isGio;
        mapOutputMain[year] = { year: year, ageCustomer: ageCustomer, mapOutput: mapOutput, mapFundNLG: mapFundNLG,mapFundNLGAlt : mapFundNLGAlt, mapChargeRider: result.CHARGERIDER, mapGIO, isGio };
        
        // if(param.RULEFORFUND.length>0){tempRuleList.push(param.RULEFORFUND);}
        year++;
        ageCustomer++;
    }
    // result.rule = tempRuleList;
    // return result;
}

function processIlustrationAlt(ageCustomer, param, year, mapOutputFundAltLimited, mapOutputFundAltWhole, mapFundNLG, mapFundNLGAlt, mapOutput, type, DIFFLVPREMI, mapOutputPPHAlt) {
    var response = {};
    tmpCurr = param.currCd;
    param['TOTALPREMIUMWITHACCPREMIUMLBDBCLIENT'] = 0;
    param['TOTALPREMIUMWITHACCPREMIUMLBDBALT'] = 0;
    param['TOTALSAWITHACCSACLIENT'] = 0;
    param['TOTALSAWITHACCSAALT'] = 0;

    while (ageCustomer <= param.alternatifRencanaPembayaran) {
        param.year = year;
        param.age = ageCustomer;

        param['TOTALCVLOW' + param.year] = undefined;
        param['TOTALCVLOWALT' + param.year] = undefined;

        param['TOTALCVPREMILOW' + param.year] = undefined;
        param['TOTALCVPREMILOWALT' + param.year] = undefined;

        param['TOTALCVPREMIMED' + param.year] = undefined;
        param['TOTALCVPREMIMEDALT' + param.year] = undefined;

        param['TOTALCVPREMIHIGH' + param.year] = undefined;
        param['TOTALCVPREMIHIGHALT' + param.year] = undefined;

        param['TOTALCVTOPUPLOW' + param.year] = undefined;
        param['TOTALCVTOPUPLOWALT' + param.year] = undefined;

        param['TOTALCVTOPUPMED' + param.year] = undefined;
        param['TOTALCVTOPUPMEDALT' + param.year] = undefined;

        param['TOTALCVTOPUPHIGH' + param.year] = undefined;
        param['TOTALCVTOPUPHIGHALT' + param.year] = undefined;

        param['TOTALCVTOPUPLOWLASTYEAR' + param.year] = undefined;
        param['TOTALCVTOPUPLOWLASTYEARALT' + param.year] = undefined;

        param['TOTALCVTOPUPMEDLASTYEAR' + param.year] = undefined;
        param['TOTALCVTOPUPMEDLASTYEARALT' + param.year] = undefined;

        param['TOTALCVTOPUPHIGHLASTYEAR' + param.year] = undefined;
        param['TOTALCVTOPUPHIGHLASTYEARALT' + param.year] = undefined;

        param['TOTALCVLOWSURRVALUE' + param.year] = undefined;
        param['TOTALCVLOWSURRVALUEALT' + param.year] = undefined;

        param['TOTALCVMEDSURRVALUE' + param.year] = undefined;
        param['TOTALCVMEDSURRVALUEALT' + param.year] = undefined;

        param['TOTALCVHIGHSURRVALUE' + param.year] = undefined;
        param['TOTALCVHIGHSURRVALUEALT' + param.year] = undefined;

        param['TOTALCVTOPUPLOWSURRVALUE' + param.year] = undefined;
        param['TOTALCVTOPUPLOWSURRVALUEALT' + param.year] = undefined;

        param['TOTALCVTOPUPMEDSURRVALUE' + param.year] = undefined;
        param['TOTALCVTOPUPMEDSURRVALUEALT' + param.year] = undefined;

        param['TOTALCVTOPUPHIGHSURRVALUE' + param.year] = undefined;
        param['TOTALCVTOPUPHIGHSURRVALUEALT' + param.year] = undefined;

        param['TOTALLBAVLOWRATE' + param.year] = undefined;
        param['TOTALLBAVMEDRATE' + param.year] = undefined;
        param['TOTALLBAVHIGHRATE' + param.year] = undefined;

        param['TOTALCVPREMILOWLASTYEAR' + param.year] = undefined;
        param['TOTALCVPREMILOWLASTYEARALT' + param.year] = undefined;

        param['TOTALCVPREMIMEDLASTYEAR' + param.year] = undefined;
        param['TOTALCVPREMIMEDLASTYEARALT' + param.year] = undefined;

        param['TOTALCVPREMIHIGHLASTYEAR' + param.year] = undefined;
        param['TOTALCVPREMIHIGHLASTYEARALT' + param.year] = undefined;

        param['CVTOTALLOWLASTYEARSTD_CLIENT' + param.year] = undefined;
        param['CVTOTALLOWLASTYEARSTD_ALT' + param.year] = undefined;

        param['CVTOTALLOWLASTYEAR_CLIENT' + param.year] = undefined;
        param['CVTOTALLOWLASTYEAR_ALT' + param.year] = undefined;

        param['CVTOTALMEDLASTYEAR_CLIENT' + param.year] = undefined;
        param['CVTOTALMEDLASTYEAR_ALT' + param.year] = undefined;

        param['CVTOTALHIGHLASTYEAR_CLIENT' + param.year] = undefined;
        param['CVTOTALHIGHLASTYEAR_ALT' + param.year] = undefined;

        param['TOTALSURRVALUELOWLASTYEAR_CLIENT' + param.year] = undefined;
        param['TOTALSURRVALUELOWLASTYEAR_ALT' + param.year] = undefined;

        param['TOTALSURRVALUEMEDLASTYEAR_CLIENT' + param.year] = undefined;
        param['TOTALSURRVALUEMEDLASTYEAR_ALT' + param.year] = undefined;

        param['TOTALSURRVALUEHIGHLASTYEAR_CLIENT' + param.year] = undefined;
        param['TOTALSURRVALUEHIGHLASTYEAR_ALT' + param.year] = undefined;

        param['CVLOWSURRCHARGES' + param.year] = undefined;
        param['CVLOWSURRCHARGESALT' + param.year] = undefined;

        param['CVMEDSURRCHARGES' + param.year] = undefined;
        param['CVMEDSURRCHARGESALT' + param.year] = undefined;

        param['CVHIGHSURRCHARGES' + param.year] = undefined;
        param['CVHIGHSURRCHARGESALT' + param.year] = undefined;

        var result;
        result = preparedParameterALT('proses', param, mapOutputFundAltLimited, mapOutputFundAltWhole, type, DIFFLVPREMI);

        mapOutputFund = result.MAPOUTPUTFUND;
        mapOutputFundAlt = result.MAPOUTPUTFUNDALT;
        var mapFundNLG = result.MAPCOV;
        var mapFundNLGAlt = result.MAPCOVALT;
        var mapOutput = result.MAPOUTPUTFUNDPERTAHUN;
        var mapGIO = result.MAPGIO;
        var isGio = result.isGio;
        mapOutputPPHAlt[year] = { year: year, ageCustomer: ageCustomer, mapOutput: mapOutput, mapFundNLG: mapFundNLG, mapFundNLGAlt: mapFundNLGAlt, mapGIO, isGio };

        mapOutputFundAltLimited = result.MAPOUTPUTFUNDALT_LIMITED;
        mapOutputFundAltWhole = result.MAPOUTPUTFUNDALT_WHOLE;

        year++;
        ageCustomer++;
    }
}

function preparedParameterClient(type, param, mapOutputFund, mapOutputFundAlt, flagProcess, DIFFLVPREMI, mapHelper) {
    var mapResult = {};
    var mapProperties = {};
    var mapOutputCoverage = {};
    var mapGio = {};
    var mapOutputCoveragePrecalculated = {};
    var manfaatList = [];
    manfaatList = param.ManfaatListCVCalc;
    var newManfaatList = [];
    var tempFundCode = {};  
    var newFundList = [];
    var totalLowRate = 0, totalMedRate = 0, totalHighRate = 0;
    var manfaatListCodeSelected = [];
    var coverageList = [];
    var tmpCoverageGroupList = [];
    var tempData;
    var mymanfaatlistNew = myManfaatList;    

    for (var i = 0; i < manfaatList.length; i++) {
        var data = manfaatList[i];
        if (data.isPPH == 'M') {
            tempData = data;
            continue;
        }
        newManfaatList.push(data);
        if (data.type == 'FUND') {
            if (!(data.code in tempFundCode)) {
                tempFundCode[data.code] = 1;
                newFundList.push(data);
            }
        }
    }

    for (var i = 0; i < newFundList.length; i++) {
        var _fund = newFundList[i];
        var _fundDetail = rootScope.FUND[_fund.code];
        var _fundAlloc = _fund.itemInput[0].inputValue;
        totalLowRate += (_fundDetail.lowRate * _fundAlloc) / 10000;
        totalMedRate += (_fundDetail.mediumRate * _fundAlloc) / 10000;
        totalHighRate += (_fundDetail.highRate * _fundAlloc) / 10000;
    }

    setMapPropertiesOnPreparedParameter(mapProperties, param);

    predefinedCalculation(tempData, newManfaatList, mapProperties, param, mapOutputCoveragePrecalculated, false, flagProcess, mapResult)

    processOnPreparedParameter(newManfaatList, mapProperties, manfaatListCodeSelected, param, flagProcess,
        mapResult, mapOutputFund, mapOutputFundAlt, type, tmpCoverageGroupList, coverageList, mapOutputCoverage,
        totalLowRate, totalMedRate, totalHighRate, null, null, DIFFLVPREMI, mapGio, mapHelper);

    if (type === 'proses') {
        mapResult.rule = getRuleValidationFundAvailable(param.mainCoverage, mapOutputCoverage, coverageList, mymanfaatlistNew, param);
    }

    if (type != 'proses') {
        mapResult.manfaatList = manfaatListCodeSelected;
    }
    param.RULEFORFUND = mapResult.rule;

    // if(mapResult.isGio != undefined){
    //     param.GIOCODE = mapResult.isGio;	
    // }

    return mapResult;
}

function preparedParameterALT(type, param, paramMapOutputFundAltLimited, paramMapOutputFundAltWhole, flagProcess, DIFFLVPREMI) {
    var mapGio = {};
    var mapXLimit = {};
    var mapXWhole = {};
    var mapResult = {};
    var mapProperties = {};

    var mapOutputCoverage = {};
    var mapOutputFund = paramMapOutputFundAltLimited;
    var mapOutputCoveragePrecalculated = {};

    var mapOutputFundAlt = paramMapOutputFundAltWhole;

    var coverageList = [];
    var coverageGroupList = [];
    var tmpCoverageGroupList = [];

    var manfaatListCodeSelected = [];

    var manfaatList = [];
    var totalLowRate = 0, totalMedRate = 0, totalHighRate = 0;

    manfaatList = param.ManfaatListCVCalc;

    var newManfaatList = [];

    var tempFundCode = {}
    var newFundList = [];
    var tempData;
    for (var x = 0; x < manfaatList.length; x++) {
        var data = manfaatList[x];
        if (data.isPPH == 'O') {
            tempData = data;
            continue;
        }

        if (data.type == 'FUND') {
            if (!(data.code in tempFundCode)) {
                tempFundCode[data.code] = 1;
                newFundList.push(data);
            }
        }
        newManfaatList.push(data);
    }

    for (var i = 0; i < newFundList.length; i++) {
        var _fund = newFundList[i];
        var _fundDetail = rootScope.FUND[_fund.code];
        var _fundAlloc = _fund.itemInput[0].inputValue;
        totalLowRate += (_fundDetail.lowRate * _fundAlloc) / 10000;
        totalMedRate += (_fundDetail.mediumRate * _fundAlloc) / 10000;
        totalHighRate += (_fundDetail.highRate * _fundAlloc) / 10000;
    }

    setMapPropertiesOnPreparedParameter(mapProperties, param);

    predefinedCalculation(tempData, newManfaatList, mapProperties, param, mapOutputCoveragePrecalculated, true, flagProcess, mapResult);

    processOnPreparedParameter(newManfaatList, mapProperties, manfaatListCodeSelected, param, flagProcess,
        mapResult, mapOutputFund, mapOutputFundAlt, type, tmpCoverageGroupList, coverageList, mapOutputCoverage,
        totalLowRate, totalMedRate, totalHighRate, mapXLimit, mapXWhole, DIFFLVPREMI, mapGio, null);

    if (type === 'hitung') {
        coverageGroupList = generateCoverageGroup(tmpCoverageGroupList);

        mapResult.rule = getRuleValidation(param.mainCoverage, mapOutputCoverage, coverageList.concat(coverageGroupList), mymanfaatlist, param.process, param.manfaatListObsolete, param);
    }

    if (type != 'proses') {
        mapResult.manfaatList = manfaatListCodeSelected;
    }

    return mapResult;
}

function processOnPreparedParameter(newManfaatList, mapProperties, manfaatListCodeSelected, param, flagProcess,
    mapResult, mapOutputFund, mapOutputFundAlt, type, tmpCoverageGroupList, coverageList, mapOutputCoverage,
    totalLowRate, totalMedRate, totalHighRate, mapXLimit, mapXWhole, DIFFLVPREMI, mapGio, mapHelper) {

    var itemCategory = 'New Business';
    var mapResultCalculateCoverage = {};
    var mapFundPerYear = {};
    var mapOutpunFundPerYear = {};
    var mapOutputCoverageAlt = {};
    var mapFundPerYear = {};
    param.currentYear = 0;
    param.LoopForTP = 0;
    param.LoopForWD = 0;
    if(param.prodCd.toUpperCase() == 'U2Z'){
        param.LoopForFifo = 15;
    }else if(param.prodCd.toUpperCase() == 'U4K'){
        param.LoopForFifo = 10;
    }

    if (flagProcess == 'ALT') {
        var mapOutputFundAltLimited = mapOutputFund;
        var mapOutputFundAltWhole = mapOutputFundAlt;
    }

    for (var i = 0; i < newManfaatList.length; i++) {
        var itemSelected = newManfaatList[i];
        if (itemSelected.smokerStatus != undefined && itemSelected.smokerStatus != null) {
            param.smokerStatus = itemSelected;
        }
        mapProperties['RTPREMI'] = undefined;

        var ITEM;
        var fundAllocationValue;
        var fundAllocationValueTopup;

        if (type != 'proses') {
            manfaatListCodeSelected.push(itemSelected.code);
        }

        if (itemSelected.type === 'COVERAGE') {
            ITEM = rootScope.COVERAGE[itemSelected.code];
            if (type != 'hitung') {
                ITEM.FORMULA_BOTH = ITEM.FORMULA.filter(function (item) { return ((item.category == itemCategory || item.category == 'Both') && (item.groupSequence == null && item.precalculated == null)); });
            } else if (type == 'hitung') {
                ITEM.FORMULA_BOTH = ITEM.FORMULA.filter(function (item) { return ((item.category == itemCategory || item.category == 'Both') && (item.groupSequence == null)); });
            }
        } else if (itemSelected.type === 'FUND') {
            ITEM = rootScope.FUND[itemSelected.code];
            var x = ITEM.FORMULA.filter(function (item) { return (item.category == itemCategory || item.category == 'Both'); });
            ITEM.FORMULA_BASIC = x.filter(function (item) { return (item.target == 'Basic'); });
            ITEM.FORMULA_SAVER = x.filter(function (item) { return (item.target == 'Saver'); });
            ITEM.FORMULA_BOTH = x.filter(function (item) { return (item.target == 'Both'); });
            ITEM.FORMULA_EMPTY = x.filter(function (item) { return (item.target == '' || item.target == null || item.target == 'Summary'); });
            ITEM.flagDB = itemSelected.flagDB;
        }

        var pdselectedKey = "";

        if (itemSelected.tertanggungKey == 2) {
            pdselectedKey = "ML";
        } else if (itemSelected.tertanggungKey == 3) {
            pdselectedKey = "AL2";
        } else if (itemSelected.tertanggungKey == 4) {
            pdselectedKey = "AL3";
        } else if (itemSelected.tertanggungKey == 5) {
            pdselectedKey = "AL4";
        } else if (itemSelected.tertanggungKey == 6) {
            pdselectedKey = "AL5";
        }
        mapProperties['PDSELECTED' + pdselectedKey] = 1;

        // if(param.mainCoverage == 'U2Z3' || param.mainCoverage == 'U2Z4'){
            var tmpTopupMin = null;
            var tmpWithdrawalMin = null;
            var tmpTopupMax = null;            
            for(var d = 0; d < param.topupList.length; d++){
                var tmpTopup = param.topupList[d];

                if (d==0){
                    tmpTopupMin = tmpTopup.amount;
                    tmpTopupMax = tmpTopup.amount;
                }

                if (parseInt(tmpTopup.amount) < parseInt(tmpTopupMin) ){
                    mapProperties['CUSTTOPUP_MIN'] = tmpTopup.amount;
                }else{
                    mapProperties['CUSTTOPUP_MIN'] = tmpTopupMin;
                }

                if (parseInt(tmpTopup.amount) > parseInt(tmpTopupMax) ){
                    mapProperties['CUSTTOPUP_MAX'] = tmpTopup.amount;
                }else{
                    mapProperties['CUSTTOPUP_MAX'] = tmpTopupMax;
                }
                
                if(tmpTopup.year == param.year){
                    mapProperties['CUSTTOPUP'] = tmpTopup.amount;
                    break;
                }
            }
            //CUST WITHDRAWAL PER TAHUN
            for(var d = 0; d < param.withdrawalList.length; d++){
                var tmpWithdrawal = param.withdrawalList[d];

                if (d==0){
                    tmpWithdrawalMin = tmpWithdrawal.amount;                
                }

                if (parseInt(tmpWithdrawal.amount) < parseInt(tmpWithdrawalMin) ){
                    mapProperties['CUSTWITHDRAW_MIN'] = tmpWithdrawal.amount;
                }else{
                    mapProperties['CUSTWITHDRAW_MIN'] = tmpWithdrawalMin;
                }                             
                
                if(tmpWithdrawal.year == param.year){
                    mapProperties['CUSTWITHDRAW'] = tmpWithdrawal.amount;
                }
            }

            mapProperties['CUSTTOPUP_LENGTH'] = param.topupList.length;
            mapProperties['CUSTWITHDRAW_LENGTH'] = param.withdrawalList.length;
     //   }else{
            //CUST TOPUP PER TAHUN
        //     for(var d = 0; d < param.topupList.length; d++){
        //         var tmpTopup = param.topupList[d];
        //         if(tmpTopup.year == param.year){
        //             mapProperties['CUSTTOPUP'] = tmpTopup.amount;
        //             break;
        //         }
        //     }
        //     //CUST WITHDRAWAL PER TAHUN
        //     for(var d = 0; d < param.withdrawalList.length; d++){
        //         var tmpWithdrawal = param.withdrawalList[d];
        //         if(tmpWithdrawal.year == param.year){
        //             mapProperties['CUSTWITHDRAW'] = tmpWithdrawal.amount;
        //             break;
        //         }
        //     }
        // }

        setMapPropertiesToUndefined(mapProperties);

        var itemInputList = itemSelected.itemInput;
        var pdPremiExist = 0;
        var pdSaExist = 0;

        for (var j = 0; j < itemInputList.length; j++) {
            if (itemInputList[j].key === 'PDALLO') {
                fundAllocationValue = itemInputList[j].inputValue;
                fundAllocationValueTopup = itemInputList[j].inputValueTopup;
                mapProperties['PDALLO'] = itemInputList[j].inputValue / 100;
                mapProperties['PDALLO_TOPUP'] = itemInputList[j].inputValueTopup / 100;
                break;
            } else {
                if (!(itemInputList[j].key === 'PDPREMI' && itemSelected.code == mapProperties["PREVIOUSRIDERCODE"] && itemSelected.tertanggungKey == mapProperties["PREVIOUSCUSTOMERKEY"])) {
                    mapProperties[itemInputList[j].key] = itemInputList[j].inputValue;
                }
            }

            if (itemInputList[j].key === 'PDPREMI') {
                pdPremiExist = itemInputList[j].inputValue;
            } else if (itemInputList[j].key === 'PDSA') {
                pdSaExist = itemInputList[j].inputValue;
                mapProperties['PDSA'] = itemInputList[j].inputValue;
            } else if (itemInputList[j].key == 'PDPLAN') {
                mapProperties['PDPLANFORRATE'] = undefined;
                if (itemInputList[j].inputValueForRate != undefined) {
                    mapProperties['PDPLANFORRATE'] = itemInputList[j].inputValueForRate;
                }
            }
        }

        setPremiPrevDecEtc(mapProperties, itemSelected, pdPremiExist, pdSaExist);

        if(flagProcess == 'flagHitung' && (itemSelected.code.match(/H1Z1.*/))){
            getMaxLvlPremiPPH(param, mapProperties, ITEM, itemSelected);
        }

        if (itemSelected.type === 'COVERAGE') {
            var allocationValue = ITEM.ALLOCATION_VALUE[param.year];
            mapProperties['ALLOVALUE'] = allocationValue == null ? 0 : allocationValue;
            var topupAllocationValue = ITEM.TOPUPALLOCATION_VALUE[param.year];
            mapProperties['TOPUPALLOVALUE'] = topupAllocationValue == null ? 0 : topupAllocationValue;
            var bonusAllocationValue = ITEM.BONUSALLOCATION_VALUE[param.year];
            mapProperties['BONUSALLOVALUE'] = bonusAllocationValue == null ? 0 : bonusAllocationValue;

            if (ITEM.SURRENDERALLOCATION_VALUE != undefined) {
                var surrAllocationValue = ITEM.SURRENDERALLOCATION_VALUE[param.year];
                mapProperties['SURRALLOVALUE'] = surrAllocationValue == null ? 0 : surrAllocationValue;
            }

            if (mapProperties['CUSTAGEMONTH'] != undefined) {
                var rtsarannuityValue = getFactorFromAnuityByMonth(mapProperties['CUSTAGEMONTH'], ITEM.ANNUITY);
                mapProperties['RTSARANNUITY'] = rtsarannuityValue == null ? 0 : rtsarannuityValue;
            }

            mapProperties['YEAR'] = param.year;

            var tempListRateCd = ITEM.CHANNEL[param.channelCode];
            setMapCustAgeWhenNotAdditionalLife(mapProperties, itemSelected);
            ITEM.keyTertanggungAge = 'CUSTAGE' + '0' + (itemSelected.tertanggungKey - 1);
            inquireRateValByParameter(tempListRateCd, itemSelected, param, mapProperties, true, false);
        }

        if (itemSelected.type === 'FUND') {
            var lowRate = ITEM.lowRate / 100;
            var mediumRate = ITEM.mediumRate / 100;
            var highRate = ITEM.highRate / 100;

            mapProperties['LOWRATE'] = lowRate;
            mapProperties['MEDRATE'] = mediumRate;
            mapProperties['HIGHRATE'] = highRate;

            if (totalLowRate != undefined && totalLowRate != 0) {
                mapProperties['TOTALLOWRATE'] = totalLowRate;
                mapProperties['TOTALMEDRATE'] = totalMedRate;
                mapProperties['TOTALHIGHRATE'] = totalHighRate;
            }
        }

        var flag = param.year <= param.manfaat.rencanaPembayaran ? true : false;

        var term = getTerm(itemSelected);

        if(flagProcess == 'ALT'){
            mapProperties['CURRSVROPT'] = param.MAXSVROPT;
            mapXWhole['CURRSVROPT'] = param.MAXSVROPT;
            mapXWhole['MAXSVROPT'] = param.MAXSVROPT;
            mapXLimit['CURRSVROPT'] = param.MAXSVROPT;
            mapXLimit['MAXSVROPT'] = param.MAXSVROPT;
            
            if(param.year > param.manfaat.rencanaPembayaran){
                mapXLimit['CURRSVROPT'] = '0.0';
                mapXLimit['MAXSVROPT'] = '0.0';
            }
            mapProperties['mapXWhole'] = mapXWhole;
            mapProperties['mapXLimit'] = mapXLimit;
        }else{
            mapProperties['CURRSVROPT'] = param.CURRSVROPT;
        }
        
        mapProperties['MAXSVROPT'] = param.MAXSVROPT;

        if(flagProcess == 'flagHitung'){
            if(param.isPPH){
                mapResult = getResultFormulaCVPPHClient(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio);
            }else{
                if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
                    mapResult = getResultFormulaVIA(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, newManfaatList, totalLowRate, totalMedRate, totalHighRate, mapGio);
                }else{
                    mapResult = getResultFormula(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio);
                }                  
            }

            mapOutputCoverage = mapResult.MAPOUTPUTCOVERAGE;
            mapOutputFund = mapResult.MAPOUTPUTFUND;
            mapOutputCoverageAlt = mapResult.MAPOUTPUTCOVERAGEALT;
            mapOutputFundAlt = mapResult.MAPOUTPUTFUNDALT;
        } else {
            if (term) {
                if (param.age <= term) {
                    mapFundPerYear = mapOutpunFundPerYear[itemSelected.code];
                    if (flagProcess == 'ALT') {
                        if (param.isPPH) {
                            mapResult = getResultFormulaCVPPHAlternatif(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFundAltLimited, mapOutputFundAltWhole, param, flag, type, DIFFLVPREMI, mapGio)
                        } else {
                            mapResult = getResultFormula(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio);
                        }
                    } else {
                        if (param.isPPH) {
                            mapResult = getResultFormulaCVPPHClient(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio)
                        } else {                 
                            if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
                                mapResult = getResultFormulaVIA(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, newManfaatList, totalLowRate, totalMedRate, totalHighRate, mapGio, mapHelper);
                            }else{
                                mapResult = getResultFormula(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio);
                            }                                                                   
                        }
                    }
                    if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
                        mapHelper = mapResult.MAPHELPER;
                    }
                    mapOutputCoverage = mapResult.MAPOUTPUTCOVERAGE;
                    mapOutputFund = mapResult.MAPOUTPUTFUND;
                    mapOutputCoverageAlt = mapResult.MAPOUTPUTCOVERAGEALT;
                    mapOutputFundAlt = mapResult.MAPOUTPUTFUNDALT;
                    mapOutputFundAltLimited = mapResult.MAPOUTPUTFUNDALT_LIMITED;
                    mapOutputFundAltWhole = mapResult.MAPOUTPUTFUNDALT_WHOLE;
                }
            } else {
                mapFundPerYear = mapOutpunFundPerYear[itemSelected.code];
                if (flagProcess == 'ALT') {
                    if (param.isPPH) {
                        mapResult = getResultFormulaCVPPHAlternatif(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFundAltLimited, mapOutputFundAltWhole, param, flag, type, DIFFLVPREMI, mapGio)
                    } else {
                        mapResult = getResultFormula(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param.year, flag, type, DIFFLVPREMI,  mapGio);
                    }
                } else {
                    if (param.isPPH) {
                        mapResult = getResultFormulaCVPPHClient(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, mapGio)
                    } else {   
                        if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
                            mapResult = getResultFormulaVIA(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI, newManfaatList, totalLowRate, totalMedRate, totalHighRate, mapGio, mapHelper);
                        }else{
                            mapResult = getResultFormula(itemSelected, ITEM, mapProperties, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, param, flag, type, DIFFLVPREMI,mapGio);
                        }                                                                          
                    }
                }
                if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
                    mapHelper = mapResult.MAPHELPER;
                }
                mapOutputCoverage = mapResult.MAPOUTPUTCOVERAGE;
                mapOutputFund = mapResult.MAPOUTPUTFUND;
                mapOutputCoverageAlt = mapResult.MAPOUTPUTCOVERAGEALT;
                mapOutputFundAlt = mapResult.MAPOUTPUTFUNDALT;
                mapOutputFundAltLimited = mapResult.MAPOUTPUTFUNDALT_LIMITED;
                mapOutputFundAltWhole = mapResult.MAPOUTPUTFUNDALT_WHOLE;
            }
        }

        if (mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId] == null) {
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId] = {};
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium = 0;
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeRider = 0;
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance = 0;
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].code = itemSelected.code;
        }
        if (mapResult.riderPremium) {
            if (mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium != null &&
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium != 0) {
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium =
                    mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium + mapResult.riderPremium;
            }
            else {
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].riderPremium = mapResult.riderPremium;
            }
        }
        if (mapResult['CHARGERIDER']) {
            mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeRider = mapResult['CHARGERIDER'];
        }
        if (mapResult['CHARGEINSURANCE']) {
            if (mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance != null &&
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance != 0) {
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance =
                    mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance + mapResult['CHARGEINSURANCE'];
            }
            else {
                mapResultCalculateCoverage[itemSelected.oldCode + '|' + itemSelected.tertanggungCustomerId].chargeInsurance = mapResult['CHARGEINSURANCE'];
            }
        }

        if (itemSelected.type === 'FUND') {
            mapOutpunFundPerYear[itemSelected.code] = mapResult.MAPOUTPUTFUNDPERTAHUN;
            mapOutpunFundPerYear[itemSelected.code].ALLOCATION = fundAllocationValue;
            mapOutpunFundPerYear[itemSelected.code].ALLOCATION_TOPUP = fundAllocationValueTopup;
        }

        var tmpCoverageListMember = {};
        tmpCoverageListMember.itemCd = ITEM.coverageCode;
        tmpCoverageListMember.keyTertanggungAge = ITEM.keyTertanggungAge;
        tmpCoverageListMember.itemType = 'COVERAGE';
        tmpCoverageListMember.properties = Object.assign({}, mapProperties);
        tmpCoverageListMember.mapOutputCoverage = mapOutputCoverage;
        tmpCoverageListMember.mapOutputFund = mapOutputFund;
        tmpCoverageListMember.isNeedToBeCalculated = itemSelected.isNeedToBeCalculated != undefined ? itemSelected.isNeedToBeCalculated : true;
        coverageList.push(tmpCoverageListMember);

        var tmpCoverageGroup = {};
        tmpCoverageGroup.coverageCd = ITEM.coverageCode;
        tmpCoverageGroup.keyTertanggungAge = ITEM.keyTertanggungAge;
        tmpCoverageGroup.coverageGroupCdList = ITEM.COVERAGE_GROUP;
        tmpCoverageGroup.properties = mapProperties;
        tmpCoverageGroup.mapOutputCoverage = mapOutputCoverage;
        tmpCoverageGroup.mapOutputFund = mapOutputFund;
        tmpCoverageGroupList.push(tmpCoverageGroup);

        mapFundPerYear = {};
    }
    if(mapProperties['mainCoverage'] == "U4K" || mapProperties['mainCoverage'] == "U2Z"){
        mapResult.MAPHELPER = mapHelper;
    }    
    mapResult.MAPRESULTCALCULATE = mapResultCalculateCoverage;
    mapResult.MAPOUTPUTFUNDPERTAHUN = mapOutpunFundPerYear;
    mapResult.MAPCOV = mapOutputCoverage;
    mapResult.MAPCOVALT = mapOutputCoverageAlt;
}

function getResultFormula(itemSelected, ITEM, map, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, paramMap, flag, buttonType, DIFFLVPREMI, mapGio) {
    var mapResultFormula = mapResult;
    var tempMapFormulaList = ITEM.FORMULA_BOTH;
    var isFIA = (map.mainCoverage == 'U2L');
    var isBIA = (map.mainCoverage == 'U2N');
    var isVIA = (map.mainCoverage == 'U4K');
    var isBIAMax = (map.mainCoverage == 'U2Z');
    var isPLPL = (map.mainCoverage == 'L2H');
    var isBAA = (map.mainCoverage == 'U2K');

    var sumAssuredFIA = 0;
    var sumAssuredBIA = 0;
    var sumAssuredVIA = 0;
    var sumAssuredBIAMax = 0;
    var mapResultPerYear = {};
    var cvWithdrawValue = 0;
    var TOTALCVLOWFUNDAVAL = 0;

    
    if(ITEM.flagDB == true){
        mapResultPerYear = mapFundPerYear;
    }

    tempMapFormulaList.sort(function (a, b) { return a.sequence - b.sequence; });

    for (var j = 0; j < tempMapFormulaList.length; j++) {
        var tmpFormula = tempMapFormulaList[j];
        var stringFormula = '';
        var stringFormulaAlt = '';
        var stringFormulaOri = '';
        var result = 0;
        var resultAlternativeAsumtion = 0;
        var value;

        if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
            continue;
        }

        var formula = rootScope.FORMULA[tmpFormula.formulaCd];
        if (formula) {
            var isProcess = false
            if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                isProcess = true;
            } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                isProcess = true;
            } else if (itemSelected.type === 'COVERAGE') {
                isProcess = true;
            }

            if (isProcess) {
                var tempFormulaElementList = formula.FORMULA_ELEMENT;

                for (var k = 0; k < tempFormulaElementList.length; k++) {
                    var fe = tempFormulaElementList[k];
                    fe.value = fe.value == "''" ? '' : fe.value.trim();
                    stringFormulaOri += fe.value;

                    if (fe.type.toLowerCase().trim() === "coverage"
                        || fe.type.toLowerCase().trim() === "customer"
                        || fe.type.toLowerCase().trim() === "rate"
                        || fe.type.toLowerCase().trim() === "fund"
                        || fe.type.toLowerCase().trim() === "product"
                        || fe.type.toLowerCase().trim() === "allocation"
                        || fe.type.toLowerCase().trim() === "predefined") {

                        if (fe.value.toUpperCase() == 'PDSA' && isPLPL){
                            stringFormula += paramMap['SA_PLPL'] ? paramMap['SA_PLPL'] : '0.0';
                            stringFormulaAlt += paramMap['SA_PLPL'] ? paramMap['SA_PLPL'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'PDSA' && isFIA) {
                            stringFormula += sumAssuredFIA;
                        } else if (fe.value.toUpperCase() == 'PDSA' && isBIA) {
                            stringFormula += sumAssuredBIA;
                        } else if (fe.value.toUpperCase() == 'PDSA' && isVIA) {
                            stringFormula += sumAssuredVIA;
                        } else if(fe.value.toUpperCase() == 'PDSA' && isBIAMax){
                            stringFormula += sumAssuredBIAMax;
                            stringFormulaAlt += sumAssuredBIAMax;
                        } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALLOW02') {
                            stringFormula += paramMap['WITHDRAWALTOTALLOW02'];
                            stringFormulaAlt += paramMap['WITHDRAWALTOTALLOW02ALT'];
                        } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALMED02') {
                            stringFormula += paramMap['WITHDRAWALTOTALMED02'];
                            stringFormulaAlt += paramMap['WITHDRAWALTOTALMED02ALT'];
                        } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALHIGH02') {
                            stringFormula += paramMap['WITHDRAWALTOTALHIGH02'];
                            stringFormulaAlt += paramMap['WITHDRAWALTOTALHIGH02ALT'];
                        } else {
                            stringFormula += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                            stringFormulaAlt += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "load") {
                        stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                    } else if (fe.type.toLowerCase().trim() === "formula") {
                        if(fe.value.toUpperCase() === 'INCOMECUST'){
                            stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                            stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                        }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                            stringFormula += "\'" + map[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map[fe.value] + "\'";
                        } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                            stringFormula += "" + (DIFFLVPREMI != undefined ? DIFFLVPREMI : 0) + "";
                            stringFormulaAlt += "" + (DIFFLVPREMI != undefined ? DIFFLVPREMI : 0) + "";
                        } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB') {
                            stringFormula += paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBCLIENT'] ? paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBCLIENT'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBALT'] ? paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALSAWITHACCSALINKTERM') {
                            stringFormula += paramMap['TOTALSAWITHACCSALINKTERMCLIENT'] ? paramMap['TOTALSAWITHACCSALINKTERMCLIENT'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALSAWITHACCSALINKTERMALT'] ? paramMap['TOTALSAWITHACCSALINKTERMALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALEXTRAPREMIUM') {
                            stringFormula += paramMap['TOTALEXTRAPREMIUM'] ? paramMap['TOTALEXTRAPREMIUM'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALEXTRAPREMIUM'] ? paramMap['TOTALEXTRAPREMIUM'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'SABASIC') {
                            stringFormula += paramMap['SABASIC'] ? paramMap['SABASIC'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'SA_CCB') {
                            stringFormula += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                            stringFormulaAlt += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALRIDERPREMIUM') {
                            stringFormula += paramMap['TOTALRIDERPREMIUM'] ? paramMap['TOTALRIDERPREMIUM'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALRIDERPREMIUM'] ? paramMap['TOTALRIDERPREMIUM'] : '0.0';
                        }else if (fe.value.toUpperCase() == 'SA_PLPL') {
                            stringFormula += paramMap['SA_PLPL'] ? paramMap['SA_PLPL'] : '0.0';
                            stringFormulaAlt += paramMap['SA_PLPL'] ? paramMap['SA_PLPL'] : '0.0';
                        }else if (fe.value.toUpperCase() == 'OF_MULTIPLIERBENEFIT_L2HD') {
                            stringFormula += paramMap['OF_MULTIPLIERBENEFIT_L2HD'] ? paramMap['OF_MULTIPLIERBENEFIT_L2HD'] : '0.0';
                            stringFormulaAlt += paramMap['OF_MULTIPLIERBENEFIT_L2HD'] ? paramMap['OF_MULTIPLIERBENEFIT_L2HD'] : '0.0';
                            
                        } else {
                            stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                            stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "formulafund") {
                        stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                        stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
                    } else if (fe.type.toLowerCase().trim() === "string") {
                        stringFormula += "\'" + fe.value + "\'";
                        stringFormulaAlt += "\'"+fe.value+"\'";
                    } else {
                        stringFormula += fe.value;
                        stringFormulaAlt += fe.value;
                    }
                }

                if (isValidExpression(stringFormula)) {
                    var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                    result = getResultExpression(tempStringFormula.stringFormula);
                    resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                    var yearC = paramMap.year;
                    if ((formula.formulaTypeCd === 'CHARGERIDER' || formula.formulaTypeCd === 'CHARGEINSURANCE') && yearC == 1
                        && tmpFormula.output === 'TOTALCHARGE') {

                        if (!mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey]) {
                            if (formula.formulaTypeCd === 'CHARGERIDER') {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = ITEM.currencyCd == 'USD' ? parseFloat((result/12).toFixed(2)) : result / 12;
                            } else {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = ITEM.currencyCd == 'USD' ? parseFloat(result.toFixed(2)) : result;
                            }
                        } else {
                            if (formula.formulaTypeCd === 'CHARGERIDER') {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + ITEM.currencyCd == 'USD' ? parseFloat((result/12).toFixed(2)) : result / 12;;
                            } else {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + ITEM.currencyCd == 'USD' ? parseFloat(result.toFixed(2)) : result;
                            }
                        }
                    }

                    result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, isFIA, isBIA, isBIAMax, ITEM);

                    if (!flag && 'TOTALTOPUP' == tmpFormula.output ) {
                        result = mapOutputCoverage['TOTALTOPUP1'];
                    }

                    if(tmpFormula.output == 'SA_U2LR' || tmpFormula.output == 'SA_PSIA' || tmpFormula.output == 'SA_VIAPLUS'){
                        sumAssuredFIA += result; 
                        sumAssuredBIA += result; 
                        sumAssuredVIA += result;
                    }
                    
                    var lifeAsiaCd = ITEM.TERMLIFEASIA;  
                    if(itemSelected.type === 'COVERAGE'){
                        setFUWOrSIOForProduct(paramMap, tmpFormula, ITEM, lifeAsiaCd, map, mapResult, mapGio, result)                        
                    }
                    

                    tempResult = applyRoundingToSomeCasesAll(tmpFormula, result, resultAlternativeAsumtion);
                    result = tempResult.result;
                    resultAlternativeAsumtion = tempResult.resultAlternativeAsumtion;

                    //for development purpose only, comment if you wanna build APK
                    parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                        'in function getResultFormula BOTH', result, resultAlternativeAsumtion, formula, 'nonPph');   

                    setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                    if (tmpFormula.output) {
                        if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                            value = mapOutputCoverage[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                    mapOutputCoverage[tmpFormula.output] = value;
                                }
                                else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + result);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }

                                    mapOutputCoverage[tmpFormula.output] = value;
                                }
                            } else {
                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverage[tmpFormula.output + '_CLIENT'] = result;
                                }
                                else if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                    || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                            }

                            if((tmpFormula.output == 'MONTHLYCHARGE' || tmpFormula.output == 'TOTALCHARGE') && (isFIA || isBIA || isBIAMax)){
                                if(ITEM.currencyCd == 'USD'){
                                    mapOutputCoverage[tmpFormula.output + "_ROUNDED"] = parseFloat(result.toFixed(2));
                                }else{
                                    mapOutputCoverage[tmpFormula.output + "_ROUNDED"] = parseFloat(result.toFixed(0));
                                }
                            }

                            if (tmpFormula.output == 'PREMIUMACCUMULATION') {
                                mapOutputCoverage[tmpFormula.output] = result;
                            }

                            value = mapOutputCoverageAlt[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output] ||
                                    tmpFormula.output == 'CUSTAGEALTER' || tmpFormula.output == 'CUSTAGEALTER01' || tmpFormula.output == 'CUSTAGEALTER02') {
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                } else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverageAlt[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + resultAlternativeAsumtion);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                }
                            } else {
                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09' && tmpFormula.output == 'ALLOCATEDSAVER') {

                                }
                                else if (tmpFormula.formulaCd == 'FRMLALLOPREMI08' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverageAlt[tmpFormula.output + '_ALT'] = resultAlternativeAsumtion;
                                }
                                else if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                    || (tmpFormula.output == 'SABASIC' && mapOutputCoverageAlt['SABASIC'] === undefined)) {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }
                            }

                            if(tmpFormula.output == 'PREMIUMACCUMULATION'){
                                mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;	
                            }

                            if (formula.formulaTypeCd.indexOf('_CLIENT') != -1) {
                                paramMap[tmpFormula.output + 'CLIENT'] = result;
                            }

                            setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion)

                            if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                    map["PDPREMI"] = map["PDPREMI"] + result;
                                } else {
                                    map["PDPREMI"] = result;
                                }
                                map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                mapResultFormula.riderPremium = result;

                                if (ITEM.currencyCd == 'USD') {
                                    result = result.toFixed(0);
                                }
                            }

                            if (true == tmpFormula.forSpecificRider) {
                                mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                mapOutputCoverageAlt[tmpFormula.output + "_" + tmpFormula.coverage] = resultAlternativeAsumtion;
                            }

                            if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                mapResultFormula[formula.formulaTypeCd] = Math.ceil(result / 12);
                            }

                            if(isFIA || isBIA || isBIAMax){
                                // karena PIA tidak ada rider premium, maka PDPREMI ngambil dari SA (dipakai untuk rule)
                                map["PDPREMI"] = map['CUSTPREMI'];							        	
                            }

                        } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                            var itemCd = ITEM.code;

                            value = mapOutputCoverage[formula.formulaTypeCd];
                            if (value) {
                                value = (value + result);
                                mapOutputCoverage[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverage[formula.formulaTypeCd] = result;
                            }

                            value = mapOutputCoverageAlt[formula.formulaTypeCd];
                            if (value) {
                                value = (value + resultAlternativeAsumtion);
                                mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                            }

                            if (mapOutputFund[itemCd] == undefined) {
                                mapOutputFund[itemCd] = {};
                            }
                            mapOutputFund[itemCd][tmpFormula.output] = result;

                            if(mapOutputFundAlt[itemCd] == undefined){
                                mapOutputFundAlt[itemCd] =  {};
                            }
                            mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                        }
                    }
                }
            }
            
            mapResultFormula['CHARGERIDER'] = mapChargeRider;
            mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
            mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
            mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
            mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            mapResultFormula['MAPGIO'] = mapGio;
        }
    }

    var tempMapFormulaListBasic = ITEM.FORMULA_BASIC;
    if (tempMapFormulaListBasic != undefined) {
        for (var j = 0; j < tempMapFormulaListBasic.length; j++) {
            var tmpFormula = tempMapFormulaListBasic[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {
                            
                            stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                            stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                                                    
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else{
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaBasicByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt,
                                paramMap, ITEM, mapOutputFund, mapOutputFundAlt);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'"+fe.value+"\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {
                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, isFIA, isBIA, isBIAMax, ITEM);

                        var yearC = paramMap.year;
                        if ((formula.formulaTypeCd === 'CHARGERIDER' || formula.formulaTypeCd === 'CHARGEINSURANCE') && yearC == 1
                            && tmpFormula.output === 'TOTALCHARGE') {
                            if (!mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey]) {
                                if (formula.formulaTypeCd === 'CHARGERIDER') {
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result / 12;
                                } else {
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result;
                                }
                            } else {
                                if (formula.formulaTypeCd === 'CHARGERIDER') {
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                        mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + result / 12;
                                } else {
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                        mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + result;
                                }
                            }
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                            'in function getResultFormula BASIC', result, resultAlternativeAsumtion, formula, 'nonPph');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                        || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                        mapOutputCoverage[tmpFormula.output] = result;
                                    }
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    } else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if (true == tmpFormula.forSpecificRider) {
                                    mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                }

                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if(mapOutputFundAlt[itemCd] == undefined){
                                    mapOutputFundAlt[itemCd] =  {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }
                
                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    var tempMapFormulaListSaver = ITEM.FORMULA_SAVER;
    if (tempMapFormulaListSaver != undefined) {
        for (var j = 0; j < tempMapFormulaListSaver.length; j++) {
            var tmpFormula = tempMapFormulaListSaver[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                            stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else{
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
                                tmpFormula, ITEM, mapOutputFund, mapOutputFundAlt, null, null, false);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'"+fe.value+"\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    } 

                    if (isValidExpression(stringFormula)) {
                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, isFIA, isBIA, isBIAMax, ITEM);

                        if (tmpFormula.output == 'CVTOPUPLOWTEMP' || tmpFormula.output == 'CVTOPUPMEDTEMP' || tmpFormula.output == 'CVTOPUPHIGHTEMP') {
                            var hasil = result.toFixed();
                            var hasilAlt = resultAlternativeAsumtion.toFixed();

                            result = hasil;
                            resultAlternativeAsumtion = hasilAlt;
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                            'in function getResultFormula SAVER', result, resultAlternativeAsumtion, formula, 'nonPph');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                        || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                        mapOutputCoverage[tmpFormula.output] = result;
                                    }
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    } else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if(mapOutputFundAlt[itemCd] == undefined){
                                    mapOutputFundAlt[itemCd] =  {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }
                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    var tempMapFormulaListEmpty = ITEM.FORMULA_EMPTY;
    if (tempMapFormulaListEmpty != undefined) {
        for (var j = 0; j < tempMapFormulaListEmpty.length; j++) {
            var tmpFormula = tempMapFormulaListEmpty[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (tmpFormula.output == 'FUNDAVAL' && fe.value.toUpperCase() == 'TOTALCVLOW') {
                                stringFormula += mapOutputCoverage['TOTALCVLOW'] ? mapOutputCoverage['TOTALCVLOW'] : '0.0';;
                            } else if (fe.value.toUpperCase() == 'TOTALCVMED' && (isFIA || isBIA || isBIAMax)) {
                                if((formula.formulaTypeCd == "TOTALCVMEDAFTRSURR" || formula.formulaTypeCd == "TOTALCVDBMED") && mapResultPerYear['CVTOTALMEDDISPLAY'] < 0)
                                    stringFormula += paramMap['TOTALCVMED'+ paramMap.year+ ITEM.code] ? paramMap['TOTALCVMED'+ paramMap.year+ ITEM.code] : '0.0';
                                else
                                    stringFormula += mapResultPerYear['CVTOTALMEDDISPLAY'] ? mapResultPerYear['CVTOTALMEDDISPLAY'] : '0.0';
                        //          stringFormulaAlt += mapResultPerYear['CVTOTALMEDDISPLAY'] ? mapResultPerYear['CVTOTALMEDDISPLAY'] : '0.0';
                            } else if (fe.value.toUpperCase() == 'TOTALCVHIGH' && (isFIA || isBIA || isBIAMax)) {
                                if((formula.formulaTypeCd == "TOTALCVHIGHAFTRSURR" || formula.formulaTypeCd == "TOTALCVDBHIGH" || formula.formulaTypeCd == "TOTALCVHIGHDISPLAY") && mapResultPerYear['CVTOTALHIGHDISPLAY'] < 0)
                                    stringFormula += paramMap['TOTALCVHIGH'+ paramMap.year+ ITEM.code] ? paramMap['TOTALCVHIGH'+ paramMap.year+ ITEM.code] : '0.0';
                                else
                                    stringFormula += mapResultPerYear['CVTOTALHIGHDISPLAY'] ? mapResultPerYear['CVTOTALHIGHDISPLAY'] : '0.0';
                        //          stringFormulaAlt += mapResultPerYear['CVTOTALHIGHDISPLAY'] ? mapResultPerYear['CVTOTALHIGHDISPLAY'] : '0.0';
                            }else if (fe.value.toUpperCase() == 'TOTALCVPREMILOW') {
                                stringFormula += paramMap['TOTALCVPREMILOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMED') {
                                stringFormula += paramMap['TOTALCVPREMIMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGH') {
                                stringFormula += paramMap['TOTALCVPREMIHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVLOWSURRCHARGES') {
                                stringFormula += paramMap['CVLOWSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVLOWSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVMEDSURRCHARGES') {
                                stringFormula += paramMap['CVMEDSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVMEDSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVHIGHSURRCHARGES') {
                                stringFormula += paramMap['CVHIGHSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVHIGHSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLOW') {
                                stringFormula += paramMap['TOTALCVTOPUPLOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPLOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPMED') {
                                stringFormula += paramMap['TOTALCVTOPUPMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPHIGH') {
                                stringFormula += paramMap['TOTALCVTOPUPHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPHIGHALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALLOWAFTR') {                                   
                                stringFormula += paramMap['WITHDRAWALTOTALLOWAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALLOWAFTRALT'+(paramMap.year-1)];                                
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALMEDAFTR') {               
                                stringFormula += paramMap['WITHDRAWALTOTALMEDAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALMEDAFTRALT'+(paramMap.year-1)];                                                                                                         
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALHIGHAFTR') {                                
                                stringFormula += paramMap['WITHDRAWALTOTALHIGHAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALHIGHAFTRALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWBASIC') {                                   
                                stringFormula += paramMap['WITHDRAWALLOWBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWBASICALT'+(paramMap.year-1)];                                
                            }  else if (fe.value.toUpperCase() == 'WITHDRAWALMEDBASIC') {               
                                stringFormula += paramMap['WITHDRAWALMEDBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDBASICALT'+(paramMap.year-1)];                                                                                                         
                            }  else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHBASIC') {                                
                                stringFormula += paramMap['WITHDRAWALHIGHBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHBASICALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'CVTOPUPLOWTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPLOWTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year];
                            }  else if (fe.value.toUpperCase() == 'CVTOPUPMEDTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPMEDTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year];
                            }  else if (fe.value.toUpperCase() == 'CVTOPUPHIGHTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPHIGHTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL01') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMILOWLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMILOWLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMEDLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMIMEDLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGHLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMIHIGHLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICLOWLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICLOWLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICLOWLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICMEDLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICMEDLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICMEDLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICHIGHLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                            } else {
                                stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else{
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                            stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {
                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, isFIA, isBIA, isBIAMax, ITEM);

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                            'in function getResultFormula EMPTY', result, resultAlternativeAsumtion, formula, 'nonPph');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);
                        
                        // set value  for validation      
                        if(tmpFormula.output == 'CVWITHDRAW'){
                            cvWithdrawValue = result;
                        }

                        if(tmpFormula.output == 'FUNDAVAL' && cvWithdrawValue > 1){
                            // if(result == '1'){
                                mapOutputCoverage[tmpFormula.output] = result;
                                // break;
                            // }
                        }

                        if(tmpFormula.output == 'CVTOTALHIGHDISPLAY' || tmpFormula.output == 'CVTOTALMEDDISPLAY' || tmpFormula.output == 'CVTOTALLOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUELOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEMEDDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEHIGHDISPLAY'){
                            mapResultPerYear[tmpFormula.output] = result;
                        }

                        if(tmpFormula.output == 'CVTOTALLOWAFTERSURR' || tmpFormula.output == 'CVTOTALMEDAFTERSURR' || tmpFormula.output == 'CVTOTALHIGHAFTERSURR')
                            mapResultPerYear[tmpFormula.output] = result;
                      
                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                        || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                        mapOutputCoverage[tmpFormula.output] = result;
                                    }
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    } else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                                if (true == tmpFormula.forSpecificRider) {
                                    mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                }

                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];

                                if (isFIA || isBIA || isBIAMax || isBAA) {
                                    if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                        && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                        && formula.formulaTypeCd != 'FT_CVWITHDRAWAL'
                                    )) {

                                        if (isBIAMax) {
                                            result = getResultValDisplayBIAMax(result, formula, paramMap, ITEM);
                                        }

                                        if (tmpFormula.output == 'FUNDAVAL') {
                                            result = 0;
                                        }

                                        value = (value + result);
                                        if (isBIAMax) value = setValidationBIAMaxDeathBenefit(value, formula, mapOutputCoverage);
                                        if (isBAA || isFIA) {
                                            if (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALLOW'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVMEDDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALMED'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALHIGH'];
                                            }
                                        }
                                        if ((isBAA || isBIAMax || isFIA) && (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') && (paramMap.fundList[paramMap.fundList.length - 1].code != itemCd)) {
                                            mapOutputCoverage[formula.formulaTypeCd] = value;
                                        } else {
                                            mapOutputCoverage[formula.formulaTypeCd] = value;
                                        }
                                    } else {
                                        if (isBIAMax) {
                                            result = getResultValDisplayBIAMax(result, formula, paramMap, ITEM)
                                        }
                                        if (isBAA || isFIA) {
                                            if (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALLOW'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVMEDDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALMED'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALHIGH'];
                                            }
                                            // mapOutputCoverage[formula.formulaTypeCd] = (result < 0 ? -1 : result);
                                            mapOutputCoverage[formula.formulaTypeCd] = result;
                                        } else {
                                            mapOutputCoverage[formula.formulaTypeCd] = result;
                                        }

                                    }
                                } else {
                                    if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                        && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                        && formula.formulaTypeCd != 'TOTALCVDBLOWDISPLAY'
                                        && formula.formulaTypeCd != 'TOTALCVDBMEDDISPLAY'
                                        && formula.formulaTypeCd != 'TOTALCVDBHIGHDISPLAY'
                                        && formula.formulaTypeCd != 'FT_CVWITHDRAWAL')) {
                                        value = (value + result);
                                        mapOutputCoverage[formula.formulaTypeCd] = value;
                                    } else {
                                        result = setResultToZeroForDisplay(tmpFormula, paramMap, result);
                                        tempResult = applyRoundingToSomeCasesAll(tmpFormula, result, resultAlternativeAsumtion);
                                        result = tempResult.result;
                                        resultAlternativeAsumtion = tempResult.resultAlternativeAsumtion;
                                        mapOutputCoverage[formula.formulaTypeCd] = result;
                                    }
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                    && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                    && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                    && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                    && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                    && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                    && formula.formulaTypeCd != 'TOTALCVDBLOWDISPLAY'
                                    && formula.formulaTypeCd != 'TOTALCVDBMEDDISPLAY'
                                    && formula.formulaTypeCd != 'TOTALCVDBHIGHDISPLAY'
                                    && formula.formulaTypeCd != 'FT_CVWITHDRAWAL')) {
                                    value = (value + resultAlternativeAsumtion);
                                    // mapOutputCoverageAlt[formula.formulaTypeCd] = value;

                                    if(isBAA){
                                        if(formula.formulaTypeCd == 'TOTALCVLOWDISPLAY'){
                                            value = mapOutputCoverageAlt[formula.formulaTypeCd] + mapOutputFundAlt[itemCd]['CVTOTALLOW'];
                                        } else if(formula.formulaTypeCd == 'TOTALCVMEDDISPLAY'){
                                            value = mapOutputCoverageAlt[formula.formulaTypeCd] + mapOutputFundAlt[itemCd]['CVTOTALMED'];
                                        } else if(formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY'){
                                            value = mapOutputCoverageAlt[formula.formulaTypeCd] + mapOutputFundAlt[itemCd]['CVTOTALHIGH'];
                                        }
                                    }                                        
                                    if(isBAA && (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') && (paramMap.fundList[paramMap.fundList.length - 1].code != itemCd)){
                                        mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                    }else{
                                        mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                    }                                     
                                } else {
                                    if(isBAA){
                                        if(formula.formulaTypeCd == 'TOTALCVLOWDISPLAY'){
                                            resultAlternativeAsumtion = mapOutputFundAlt[itemCd]['CVTOTALLOW'];
                                        }else if(formula.formulaTypeCd == 'TOTALCVMEDDISPLAY'){
                                            resultAlternativeAsumtion = mapOutputFundAlt[itemCd]['CVTOTALMED'];
                                        }else if(formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY'){
                                            resultAlternativeAsumtion = mapOutputFundAlt[itemCd]['CVTOTALHIGH'];
                                        }
                                    }  
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }


                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if(mapOutputFundAlt[itemCd] == undefined){
                                    mapOutputFundAlt[itemCd] =  {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }
                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
    mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
    mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
    mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
    mapResultFormula['MAPOUTPUTFUNDPERTAHUN'] = mapResultPerYear;

    return mapResultFormula;
}

function getResultFormulaCVPPHClient(itemSelected, ITEM, map, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, paramMap, flag, buttonType, DIFFLVPREMI, mapGio) {
    var mapResultFormula = mapResult;
    var tempMapFormulaList = ITEM.FORMULA_BOTH;

    tempMapFormulaList.sort(function (a, b) { return a.sequence - b.sequence; });

    paramMap['OF_CUSTAGEPOLICY'] = map['CUSTAGE'];

    var mapResultPerYear = {};

    if (ITEM.flagDB == true) {
        mapResultPerYear = mapFundPerYear;
    }

    for (var j = 0; j < tempMapFormulaList.length; j++) {
        var tmpFormula = tempMapFormulaList[j];
        var stringFormula = '';
        var stringFormulaAlt = '';
        var stringFormulaOri = '';
        var result = 0;
        var resultAlternativeAsumtion = 0;
        var value;

        if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
            continue;
        }

        var formula = rootScope.FORMULA[tmpFormula.formulaCd];
        if (formula) {
            var isProcess = false;
            if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                isProcess = true;
            } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                isProcess = true;
            } else if (itemSelected.type === 'COVERAGE') {
                isProcess = true;
            }

            if (isProcess) {
                var tempFormulaElementList = formula.FORMULA_ELEMENT;

                for (var k = 0; k < tempFormulaElementList.length; k++) {
                    var fe = tempFormulaElementList[k];
                    fe.value = fe.value == "''" ? '' : fe.value.trim();
                    stringFormulaOri += fe.value;

                    if (fe.type.toLowerCase().trim() === "coverage"
                        || fe.type.toLowerCase().trim() === "customer"
                        || fe.type.toLowerCase().trim() === "rate"
                        || fe.type.toLowerCase().trim() === "fund"
                        || fe.type.toLowerCase().trim() === "product"
                        || fe.type.toLowerCase().trim() === "allocation"
                        || fe.type.toLowerCase().trim() === "predefined") {

                        stringFormula += map[fe.value] ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                        stringFormulaAlt += map[fe.value] ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                    } else if (fe.type.toLowerCase().trim() === "load") {
                        stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                    } else if (fe.type.toLowerCase().trim() === "formula") {
                        if(fe.value.toUpperCase() === 'INCOMECUST'){
                            stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                            stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                        }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                            stringFormula += "\'" + map[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map[fe.value] + "\'";
                        } else if (fe.value.toUpperCase() == 'SA_CCB') {
                            stringFormula += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                            stringFormulaAlt += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                        } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                            stringFormula += '0.0';
                            stringFormulaAlt += '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB') {
                            stringFormula += paramMap[fe.value.toUpperCase() + 'CLIENT'] ? paramMap[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                            stringFormulaAlt += paramMap[fe.value.toUpperCase() + 'ALT'] ? paramMap[fe.value.toUpperCase() + 'ALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALSAWITHACCSALINKTERM') {
                            stringFormula += paramMap[fe.value.toUpperCase() + 'CLIENT'] ? paramMap[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                            stringFormulaAlt += paramMap[fe.value.toUpperCase() + 'ALT'] ? paramMap[fe.value.toUpperCase() + 'ALT'] : '0.0';
                        } else {
                            stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                            stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "formulafund") {
                        stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                        stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
                    } else if (fe.type.toLowerCase().trim() === "string") {
                        stringFormula += "\'" + fe.value + "\'";
                        stringFormulaAlt += "\'" + fe.value + "\'";
                    } else {
                        stringFormula += fe.value;
                        stringFormulaAlt += fe.value;
                    }
                }

                if (isValidExpression(stringFormula)) {

                    var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                    result = getResultExpression(tempStringFormula.stringFormula);
                    resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                    var yearC = paramMap.year;
                    if ((formula.formulaTypeCd === 'CHARGERIDER' || formula.formulaTypeCd === 'CHARGEINSURANCE') && yearC == 1) {
                        if (!mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey]) {
                            if (formula.formulaTypeCd === 'CHARGERIDER') {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result / 12;
                            } else {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result;
                            }
                        }
                    }

                    result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                    if (!flag && 'TOTALTOPUP' == tmpFormula.output ) {
                        result = mapOutputCoverage['TOTALTOPUP1'];
                    }

                    if (tmpFormula.output == 'TOTALSAWITHACCSALINKTERM' && paramMap.year == '1') {
                        resultAlternativeAsumtion = result;
                    }

                    mapResult['isGio'] = false;
                    mapGio[ITEM.coverageCode] = ITEM.coverageCode;

                    //for development purpose only, comment if you wanna build APK
                    parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                        'in function getResultFormulaCVPPHClient BOTH', result, resultAlternativeAsumtion, formula, 'pphClient');

                    if (tmpFormula.output) {
                        if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                            value = mapOutputCoverage[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                    mapOutputCoverage[tmpFormula.output] = value;
                                } else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + result);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }

                                    if (tmpFormula.formulaTypeCd == 'ALLOCATEDPREMIUM_ALT') {

                                    }
                                    else {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                }
                            } else {
                                if (tmpFormula.output === 'SABASIC') {
                                    if (!mapOutputCoverage['SABASIC']) {
                                        mapOutputCoverage[tmpFormula.output] = result;
                                    }
                                }
                                else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }
                            }

                            if (tmpFormula.output == 'DIFFLVPREMI') {
                                map['DIFFLVPREMI'] = result;
                            }

                            if (tmpFormula.output == 'DIFFLVPREMI' && itemSelected.isPPH == 'O' && paramMap.year == '1') {
                                paramMap['DIFFLVPREMI_' + itemSelected.isPPH] = result;
                            }

                            value = mapOutputCoverageAlt[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                    mapOutputCoverageAlt[tmpFormula.output] = result;
                                } 
                                
                                else if(tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA'){
                                    mapOutputCoverageAlt[tmpFormula.output] = result;
                                } 
                                
                                else {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                }
                            } else {
                                mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                            }

                            if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                    map["PDPREMI"] = map["PDPREMI"] + result;
                                }
                                else {
                                    map["PDPREMI"] = result;
                                }
                                map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                mapResultFormula.riderPremium = result;
                            }

                            if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                mapResultFormula[formula.formulaTypeCd] = (result / 12);
                            }

                            if (true == tmpFormula.forSpecificRider) {
                                mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                mapOutputCoverageAlt[tmpFormula.output + "_" + tmpFormula.coverage] = resultAlternativeAsumtion;
                            }

                            setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion);
                        } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                            var itemCd = ITEM.code;

                            value = mapOutputCoverage[formula.formulaTypeCd];
                            if (value) {
                                value = (value + result);
                                mapOutputCoverage[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverage[formula.formulaTypeCd] = result;
                            }

                            value = mapOutputCoverageAlt[formula.formulaTypeCd];
                            if (value) {
                                value = (value + resultAlternativeAsumtion);
                                mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                            }

                            if (mapOutputFund[itemCd] == undefined) {
                                mapOutputFund[itemCd] = {};
                            }
                            mapOutputFund[itemCd][tmpFormula.output] = result;

                            if (mapOutputFundAlt[itemCd] == undefined) {
                                mapOutputFundAlt[itemCd] = {};
                            }
                            mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                        }
                    }
                }
            }

            mapResultFormula['CHARGERIDER'] = mapChargeRider;
            mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
            mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
            mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
            mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            mapResultFormula['MAPGIO'] = mapGio;
        }
    }

    var tempMapFormulaListBasic = ITEM.FORMULA_BASIC;
    if (tempMapFormulaListBasic != undefined) {
        for (var j = 0; j < tempMapFormulaListBasic.length; j++) {
            var tmpFormula = tempMapFormulaListBasic[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                            stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaBasicByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt,
                                paramMap, ITEM, mapOutputFund, mapOutputFundAlt);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);
                        
                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (mapOutputCoverage[tmpFormula.output] && tmpFormula.output === 'COVTERM_PPAYOR01') {
                            result = 0;
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHClient BASIC', result, resultAlternativeAsumtion, formula, 'pphClient');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                //CLIENT_PLANNING
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                //ALTERNATIVE
                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                //SET NEW KEY PDPREMI IF FORMULATYPE = 'RIDERPREMIUM' / BIAYA ASURANSI PERTAHUN
                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                //CHARGE / BIAYA ANGSURAN BULANAN
                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                                setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion);
                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAlt[itemCd] == undefined) {
                                    mapOutputFundAlt[itemCd] = {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }

                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    var tempMapFormulaListSaver = ITEM.FORMULA_SAVER;
    if (tempMapFormulaListSaver != undefined) {
        for (var j = 0; j < tempMapFormulaListSaver.length; j++) {
            var tmpFormula = tempMapFormulaListSaver[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                            stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
                                tmpFormula, ITEM, mapOutputFund, mapOutputFundAlt, null, null, false);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (tmpFormula.output == 'TOPUPDEDUCTIONLOW01') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        if (tmpFormula.output == 'TOPUPDEDUCTIONMED01') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        if (tmpFormula.output == 'TOPUPDEDUCTIONHIGH01') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        if (tmpFormula.output == 'TOPUPDEDUCTIONLOW02') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        if (tmpFormula.output == 'TOPUPDEDUCTIONMED02') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        if (tmpFormula.output == 'TOPUPDEDUCTIONHIGH02') {
                            paramMap[tmpFormula.output + 'CLIENT'] = result;
                            paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                        }

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output == 'CVTOPUPLOWTEMP' || tmpFormula.output == 'CVTOPUPMEDTEMP' || tmpFormula.output == 'CVTOPUPHIGHTEMP') {
                            var hasil = result.toFixed();
                            var hasilAlt = resultAlternativeAsumtion.toFixed();

                            result = hasil;
                            resultAlternativeAsumtion = hasilAlt;
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHClient SAVER', result, resultAlternativeAsumtion, formula, 'pphClient');

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output] || "COVTERM_WAIVER01" === tmpFormula.output ||
                                        "COVTERM_WAIVER02" === tmpFormula.output || "COVTERM_PPAYOR01" === tmpFormula.output ||
                                        "COVTERM_PPAYOR02" === tmpFormula.output) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                if ("TOTALPREMIUMWITHACCPREMIUM" === tmpFormula.output) {
                                    mapOutputFund[tmpFormula.output] = result;
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;

                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }


                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if ((tmpFormula.output == 'CVTOPUPLOW' || tmpFormula.output == 'CVTOPUPMED' || tmpFormula.output == 'CVTOPUPHIGH') && isPAA2) {
                                    mapOutputCoverage[tmpFormula.output] = Math.ceil(result);
                                    mapOutputCoverageAlt[tmpFormula.output] = Math.ceil(result);
                                }

                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAlt[itemCd] == undefined) {
                                    mapOutputFundAlt[itemCd] = {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;

                                if (paramMap.year == '20') {
                                    if ("OFF_TOTALPRUBOOSTERLOW" === tmpFormula.output || "OFF_TOTALPRUBOOSTERMED" === tmpFormula.output || "OFF_TOTALPRUBOOSTERHIGH" === tmpFormula.output) {
                                        paramMap[tmpFormula.output] = result;
                                    }
                                }
                            }
                        }
                    }
                }
                
                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    var tempMapFormulaListEmpty = ITEM.FORMULA_EMPTY;
    if (tempMapFormulaListEmpty != undefined) {
        for (var j = 0; j < tempMapFormulaListEmpty.length; j++) {
            var tmpFormula = tempMapFormulaListEmpty[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (fe.value.toUpperCase() == 'TOTALCVPREMILOW') {
                                stringFormula += paramMap['TOTALCVPREMILOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMED') {
                                stringFormula += paramMap['TOTALCVPREMIMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGH') {
                                stringFormula += paramMap['TOTALCVPREMIHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVLOWSURRCHARGES') {
                                stringFormula += paramMap['CVLOWSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVLOWSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVMEDSURRCHARGES') {
                                stringFormula += paramMap['CVMEDSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVMEDSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVHIGHSURRCHARGES') {
                                stringFormula += paramMap['CVHIGHSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVHIGHSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLOW') {
                                stringFormula += paramMap['TOTALCVTOPUPLOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPLOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPMED') {
                                stringFormula += paramMap['TOTALCVTOPUPMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPHIGH') {
                                stringFormula += paramMap['TOTALCVTOPUPHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPHIGHALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL01') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL02ALT'];
                            }  else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICLOWLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICLOWLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICLOWLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICMEDLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICMEDLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICMEDLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICHIGHLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWBASIC') {                                   
                                stringFormula += paramMap['WITHDRAWALLOWBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWBASICALT'+(paramMap.year-1)];                                
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDBASIC') {               
                                stringFormula += paramMap['WITHDRAWALMEDBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDBASICALT'+(paramMap.year-1)];                                                                                                         
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHBASIC') {                                
                                stringFormula += paramMap['WITHDRAWALHIGHBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHBASICALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALLOWAFTR') {                                   
                                stringFormula += paramMap['WITHDRAWALTOTALLOWAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALLOWAFTRALT'+(paramMap.year-1)];                                
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALMEDAFTR') {               
                                stringFormula += paramMap['WITHDRAWALTOTALMEDAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALMEDAFTRALT'+(paramMap.year-1)];                                                                                                         
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALHIGHAFTR') {                                
                                stringFormula += paramMap['WITHDRAWALTOTALHIGHAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALHIGHAFTRALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'CVTOPUPLOWTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPLOWTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVTOPUPMEDTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPMEDTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVTOPUPHIGHTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPHIGHTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year];
                            } else {
                                stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                            stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (mapOutputCoverage[tmpFormula.output] && tmpFormula.output === 'COVTERM_PPAYOR01') {
                            result = 0;
                        }

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHClient EMPTY', result, resultAlternativeAsumtion, formula, 'pphClient');

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }


                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value && formula.formulaTypeCd != 'FT_CVWITHDRAWAL') {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                if (formula.formulaTypeCd == 'TOTALCVLOWFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVMEDFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVHIGHFUNDDSPLY' || formula.formulaTypeCd == 'FT_SURRENDERLOWVALUE' || formula.formulaTypeCd == 'FT_SURRENDERMEDVALUE' || formula.formulaTypeCd == 'FT_SURRENDERHIGHVALU' || formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY') {
                                    result = setResultToZeroForDisplay(tmpFormula, paramMap, result);
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value && formula.formulaTypeCd != 'FT_CVWITHDRAWAL') {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (formula.formulaTypeCd == 'TOTALCVLOWFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVMEDFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVHIGHFUNDDSPLY' || formula.formulaTypeCd == 'FT_SURRENDERLOWVALUE' || formula.formulaTypeCd == 'FT_SURRENDERMEDVALUE' || formula.formulaTypeCd == 'FT_SURRENDERHIGHVALU' || formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY') {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAlt[itemCd] == undefined) {
                                    mapOutputFundAlt[itemCd] = {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;

                                if (tmpFormula.output == 'CVTOTALHIGHDISPLAY' || tmpFormula.output == 'CVTOTALMEDDISPLAY' || tmpFormula.output == 'CVTOTALLOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUELOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEMEDDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEHIGHDISPLAY') {
                                    mapResultPerYear[tmpFormula.output] = result;
                                    mapResultPerYear['ALT' + tmpFormula.output] = resultAlternativeAsumtion;
                                }
                            }
                        }
                    }
                }

                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
    mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
    mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
    mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;

    mapResultFormula['MAPOUTPUTFUNDPERTAHUN'] = mapResultPerYear;
    return mapResultFormula;
}

function getResultFormulaCVPPHAlternatif(itemSelected, ITEM, map, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFundAltLimited, mapOutputFundAltWhole, paramMap, flag, buttonType, DIFFLVPREMI, mapGio) {
    var mapResultFormula = mapResult;
    var tempMapFormulaList = ITEM.FORMULA_BOTH;

    tempMapFormulaList.sort(function (a, b) { return a.sequence - b.sequence; });

    paramMap['OF_CUSTAGEPOLICY'] = map['CUSTAGE'];

    var mapResultPerYear = {};
    var PDALLO = '';

    if (ITEM.flagDB == true) {
        mapResultPerYear = mapFundPerYear;
    }

    for (var j = 0; j < tempMapFormulaList.length; j++) {
        var tmpFormula = tempMapFormulaList[j];
        var stringFormula = '';
        var stringFormulaAlt = '';
        var stringFormulaOri = '';
        var result = 0;
        var resultAlternativeAsumtion = 0;
        var value;

        if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
            continue;
        }

        var formula = rootScope.FORMULA[tmpFormula.formulaCd];
        if (formula) {
            var isProcess = false;
            if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                isProcess = true;
            } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                isProcess = true;
            } else if (itemSelected.type === 'COVERAGE') {
                isProcess = true;
            }

            if (isProcess) {
                var tempFormulaElementList = formula.FORMULA_ELEMENT;

                for (var k = 0; k < tempFormulaElementList.length; k++) {
                    var fe = tempFormulaElementList[k];
                    fe.value = fe.value == "''" ? '' : fe.value.trim();
                    stringFormulaOri += fe.value;

                    if (fe.type.toLowerCase().trim() === "coverage"
                        || fe.type.toLowerCase().trim() === "customer"
                        || fe.type.toLowerCase().trim() === "rate"
                        || fe.type.toLowerCase().trim() === "fund"
                        || fe.type.toLowerCase().trim() === "product"
                        || fe.type.toLowerCase().trim() === "allocation"
                        || fe.type.toLowerCase().trim() === "predefined") {

                        if (fe.value.toUpperCase() === 'CURRSVROPT') {
                            stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                        } else if (fe.value.toUpperCase() === 'MAXSVROPT') {
                            stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                        } else {
                            stringFormula += map[fe.value] ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                            stringFormulaAlt += map[fe.value] ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                        }

                    } else if (fe.type.toLowerCase().trim() === "load") {
                        stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                    } else if (fe.type.toLowerCase().trim() === "formula") {
                        if(fe.value.toUpperCase() === 'INCOMECUST'){
                            stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                            stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                        } else if (fe.value.toUpperCase() == 'SA_CCB') {
                            stringFormula += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                            stringFormulaAlt += paramMap['SA_CCB'] ? paramMap['SA_CCB'] : '0.0';
                        } else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                            stringFormula += "\'" + map[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map[fe.value] + "\'";
                        } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                            stringFormula += paramMap['DIFFLVPREMI_O'] ? paramMap['DIFFLVPREMI_O'] : '0.0';
                            stringFormulaAlt += paramMap['DIFFLVPREMI_O'] ? paramMap['DIFFLVPREMI_O'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB') {
                            stringFormula += paramMap[fe.value.toUpperCase() + 'CLIENT'] ? paramMap[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                            stringFormulaAlt += paramMap[fe.value.toUpperCase() + 'ALT'] ? paramMap[fe.value.toUpperCase() + 'ALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALSAWITHACCSALINKTERM') {
                            stringFormula += paramMap[fe.value.toUpperCase() + 'CLIENT'] ? paramMap[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                            stringFormulaAlt += paramMap[fe.value.toUpperCase() + 'ALT'] ? paramMap[fe.value.toUpperCase() + 'ALT'] : '0.0';
                        } else {
                            stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                            stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "formulafund") {
                        stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFundAltLimited);
                        stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAltWhole);
                    } else if (fe.type.toLowerCase().trim() === "string") {
                        stringFormula += "\'" + fe.value + "\'";
                        stringFormulaAlt += "\'" + fe.value + "\'";
                    } else {
                        stringFormula += fe.value;
                        stringFormulaAlt += fe.value;
                    }
                }

                if (isValidExpression(stringFormula)) {

                    var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                    result = getResultExpression(tempStringFormula.stringFormula);
                    resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                    result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                    if (formula.formulaTypeCd == 'BUFFER' && buttonType != 'hitung') {
                        bufferArr.push(resultAlternativeAsumtion);
                    }

                    if (formula.formulaTypeCd.toUpperCase() == 'SUMMPREM' && isPAA2 && buttonType != 'hitung' && PDALLO != '') {
                        pdAlloArr.push(PDALLO);
                    }

                    if (tmpFormula.output == 'TOTALSAWITHACCSALINKTERM' && paramMap.year == '1') {
                        resultAlternativeAsumtion = result;
                    }

                    mapResult['isGio'] = false;
                    mapGio[ITEM.coverageCode] = ITEM.coverageCode;

                    //for development purpose only, comment if you wanna build APK
                    parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                        'in function getResultFormulaCVPPHAlternatif BOTH', result, resultAlternativeAsumtion, formula, 'pphAlt');

                    if (tmpFormula.output) {
                        if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                            value = mapOutputCoverage[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                    mapOutputCoverage[tmpFormula.output] = value;
                                } else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + result);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }

                                    mapOutputCoverage[tmpFormula.output] = value;
                                }
                            } else {
                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09') {

                                }
                                else if (tmpFormula.formulaCd == 'FRMLALLOPREMI08' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverage[tmpFormula.output + '_ALT'] = result;
                                }
                                else if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                    || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }
                            }

                            setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion);

                            value = mapOutputCoverageAlt[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                } else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverageAlt[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + resultAlternativeAsumtion);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                }
                            } else {

                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09') {

                                }
                                else if (tmpFormula.formulaCd == 'FRMLALLOPREMI08' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverageAlt[tmpFormula.output + '_ALT'] = resultAlternativeAsumtion;
                                }
                                else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }
                            }

                            if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                    map["PDPREMI"] = map["PDPREMI"] + result;
                                }
                                else {
                                    map["PDPREMI"] = result;
                                }
                                map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                mapResultFormula.riderPremium = result;
                            }

                            if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                mapResultFormula[formula.formulaTypeCd] = (result / 12);
                            }

                            if ("TOTALSAWITHACCSALINKTERM" === tmpFormula.output) {
                                mapOutputCoverage[tmpFormula.output + 'CLIENT'] = result;
                                mapOutputCoverage[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
                            }

                            if (true == tmpFormula.forSpecificRider) {
                                mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                mapOutputCoverageAlt[tmpFormula.output + "_" + tmpFormula.coverage] = resultAlternativeAsumtion;
                            }

                        } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                            var itemCd = ITEM.code;

                            value = mapOutputCoverage[formula.formulaTypeCd];
                            if (value) {
                                value = (value + result);
                                mapOutputCoverage[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverage[formula.formulaTypeCd] = result;
                            }

                            value = mapOutputCoverageAlt[formula.formulaTypeCd];
                            if (value) {
                                value = (value + resultAlternativeAsumtion);
                                mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                            }

                            if (mapOutputFundAltLimited[itemCd] == undefined) {
                                mapOutputFundAltLimited[itemCd] = {};
                            }
                            mapOutputFundAltLimited[itemCd][tmpFormula.output] = result;

                            if (mapOutputFundAltWhole[itemCd] == undefined) {
                                mapOutputFundAltWhole[itemCd] = {};
                            }
                            mapOutputFundAltWhole[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                        }
                    }
                }
            }

            mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
            mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;

            mapResultFormula['MAPOUTPUTFUNDALT_LIMITED'] = mapOutputFundAltLimited;
            mapResultFormula['MAPOUTPUTFUNDALT_WHOLE'] = mapOutputFundAltWhole;
            mapResultFormula['MAPGIO'] = mapGio;
        }
    }

    var tempMapFormulaListBasic = ITEM.FORMULA_BASIC;
    if (tempMapFormulaListBasic != undefined) {
        for (var j = 0; j < tempMapFormulaListBasic.length; j++) {
            var tmpFormula = tempMapFormulaListBasic[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'CURRSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'MAXSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else {
                                stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaBasicByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt,
                                paramMap, ITEM, mapOutputFundAltLimited, mapOutputFundAltWhole);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (mapOutputCoverage[tmpFormula.output] && tmpFormula.output === 'COVTERM_PPAYOR01') {
                            result = 0;
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHAlternatif BASIC', result, resultAlternativeAsumtion, formula, 'pphAlt');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                                setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion);
                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFundAltLimited[itemCd] == undefined) {
                                    mapOutputFundAltLimited[itemCd] = {};
                                }
                                mapOutputFundAltLimited[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAltWhole[itemCd] == undefined) {
                                    mapOutputFundAltWhole[itemCd] = {};
                                }
                                mapOutputFundAltWhole[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }

                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;

                mapResultFormula['MAPOUTPUTFUNDALT_LIMITED'] = mapOutputFundAltLimited;
                mapResultFormula['MAPOUTPUTFUNDALT_WHOLE'] = mapOutputFundAltWhole;
            }
        }
    }

    var tempMapFormulaListSaver = ITEM.FORMULA_SAVER;
    if (tempMapFormulaListSaver != undefined) {
        for (var j = 0; j < tempMapFormulaListSaver.length; j++) {
            var tmpFormula = tempMapFormulaListSaver[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'CURRSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'MAXSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else {
                                stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            var tempStringFormula = setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
                                tmpFormula, ITEM, null, null, mapOutputFundAltLimited, mapOutputFundAltWhole, true);
                            stringFormula = tempStringFormula.stringFormula;
                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (mapOutputCoverage[tmpFormula.output] && tmpFormula.output === 'COVTERM_PPAYOR01') {
                            result = 0;
                        }

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        if (tmpFormula.output == 'CVTOPUPLOWTEMP' || tmpFormula.output == 'CVTOPUPMEDTEMP' || tmpFormula.output == 'CVTOPUPHIGHTEMP') {
                            var hasil = result.toFixed();
                            var hasilAlt = resultAlternativeAsumtion.toFixed();

                            result = hasil;
                            resultAlternativeAsumtion = hasilAlt;
                        }

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHAlternatif SAVER', result, resultAlternativeAsumtion, formula, 'pphAlt');

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                if ("TOTALPREMIUMWITHACCPREMIUM" === tmpFormula.output) {
                                    mapOutputFundAltLimited[tmpFormula.output] = result;
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }
                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFundAltLimited[itemCd] == undefined) {
                                    mapOutputFundAltLimited[itemCd] = {};
                                }
                                mapOutputFundAltLimited[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAltWhole[itemCd] == undefined) {
                                    mapOutputFundAltWhole[itemCd] = {};
                                }
                                mapOutputFundAltWhole[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }

                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;

                mapResultFormula['MAPOUTPUTFUNDALT_LIMITED'] = mapOutputFundAltLimited;
                mapResultFormula['MAPOUTPUTFUNDALT_WHOLE'] = mapOutputFundAltWhole;
            }
        }
    }

    var tempMapFormulaListEmpty = ITEM.FORMULA_EMPTY;
    if (tempMapFormulaListEmpty != undefined) {
        for (var j = 0; j < tempMapFormulaListEmpty.length; j++) {
            var tmpFormula = tempMapFormulaListEmpty[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false;
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'CURRSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'MAXSVROPT') {
                                stringFormula += "\'" + map.mapXLimit[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map.mapXWhole[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMILOW') {
                                stringFormula += paramMap['TOTALCVPREMILOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMED') {
                                stringFormula += paramMap['TOTALCVPREMIMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGH') {
                                stringFormula += paramMap['TOTALCVPREMIHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHALT' + paramMap.year];
                            }else if (fe.value.toUpperCase() == 'CVLOWSURRCHARGES') {
                                stringFormula += paramMap['CVLOWSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVLOWSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVMEDSURRCHARGES') {
                                stringFormula += paramMap['CVMEDSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVMEDSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVHIGHSURRCHARGES') {
                                stringFormula += paramMap['CVHIGHSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['CVHIGHSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLOW') {
                                stringFormula += paramMap['TOTALCVTOPUPLOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPLOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPMED') {
                                stringFormula += paramMap['TOTALCVTOPUPMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPHIGH') {
                                stringFormula += paramMap['TOTALCVTOPUPHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPHIGHALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL01') {                                
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code];                                                                                                    
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code];                                 
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL01') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code];                                  
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALLOWTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALMEDTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHTOTAL02') {
                                stringFormula += paramMap['WITHDRAWALHIGHTOTAL02'];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHTOTAL02ALT'];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICLOWLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICLOWLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICLOWLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICMEDLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICMEDLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICMEDLASTYEARALT' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'FT_WITHDRAWALBASICHIGHLASTYEAR' && paramMap.year > 1) {
                                stringFormula += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                                stringFormulaAlt += paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR' + (paramMap.year - 1)];
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALLOWBASIC') {                                   
                                stringFormula += paramMap['WITHDRAWALLOWBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALLOWBASICALT'+(paramMap.year-1)];                                
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALMEDBASIC') {               
                                stringFormula += paramMap['WITHDRAWALMEDBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALMEDBASICALT'+(paramMap.year-1)];                                                                                                         
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALHIGHBASIC') {                                
                                stringFormula += paramMap['WITHDRAWALHIGHBASIC'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALHIGHBASICALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALLOWAFTR') {                                   
                                stringFormula += paramMap['WITHDRAWALTOTALLOWAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALLOWAFTRALT'+(paramMap.year-1)];                                
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALMEDAFTR') {               
                                stringFormula += paramMap['WITHDRAWALTOTALMEDAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALMEDAFTRALT'+(paramMap.year-1)];                                                                                                         
                            } else if (fe.value.toUpperCase() == 'WITHDRAWALTOTALHIGHAFTR') {                                
                                stringFormula += paramMap['WITHDRAWALTOTALHIGHAFTR'+(paramMap.year-1)];
                                stringFormulaAlt += paramMap['WITHDRAWALTOTALHIGHAFTRALT'+(paramMap.year-1)];                                                                                           
                            } else if (fe.value.toUpperCase() == 'CVTOPUPLOWTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPLOWTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVTOPUPMEDTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPMEDTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year];
                            } else if (fe.value.toUpperCase() == 'CVTOPUPHIGHTEMP01') {                                
                                stringFormula += paramMap['CVTOPUPHIGHTEMP01'+paramMap.year];
                                stringFormulaAlt += paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year];
                            } else {
                                stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                                stringFormula += "\'" + map[fe.value] + "\'";
                                stringFormulaAlt += "\'" + map[fe.value] + "\'";
                            } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                                stringFormula += "" + DIFFLVPREMI + "";
                                stringFormulaAlt += "" + DIFFLVPREMI + "";
                            } else {
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }

                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFundAltLimited);
                            stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAltWhole);
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {

                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);

                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, false, false, false, ITEM);

                        if (mapOutputCoverage[tmpFormula.output] && tmpFormula.output === 'COVTERM_PPAYOR01') {
                            result = 0;
                        }

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt,
                            'in function getResultFormulaCVPPHAlternatif EMPTY', result, resultAlternativeAsumtion, formula, 'pphAlt');

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                //CLIENT_PLANNING
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }

                                if ('RIDERPREMIUM' == formula.formulaTypeCd && tmpFormula.output == 'TOTALRIDERPREMIUM') {
                                    if (map["PREVIOUSRIDERCODE"] == itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == itemSelected.tertanggungKey) {
                                        map["PDPREMI"] = map["PDPREMI"] + result;
                                    }
                                    else {
                                        map["PDPREMI"] = result;
                                    }
                                    map["PREVIOUSRIDERCODE"] = itemSelected.code;
                                    map["PREVIOUSCUSTOMERKEY"] = itemSelected.tertanggungKey;
                                    mapResultFormula.riderPremium = result;
                                }

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                                setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion);
                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (value && formula.formulaTypeCd != 'FT_CVWITHDRAWAL') {
                                    value = (value + result);
                                    mapOutputCoverage[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                if (formula.formulaTypeCd == 'TOTALCVLOWFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVMEDFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVHIGHFUNDDSPLY' || formula.formulaTypeCd == 'FT_SURRENDERLOWVALUE' || formula.formulaTypeCd == 'FT_SURRENDERMEDVALUE' || formula.formulaTypeCd == 'FT_SURRENDERHIGHVALU' || formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY') {
                                    result = setResultToZeroForDisplay(tmpFormula, paramMap, result);
                                    mapOutputCoverage[formula.formulaTypeCd] = result;
                                }

                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value && formula.formulaTypeCd != 'FT_CVWITHDRAWAL') {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (formula.formulaTypeCd == 'TOTALCVLOWFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVMEDFUNDDSPLY' || formula.formulaTypeCd == 'TOTALCVHIGHFUNDDSPLY' || formula.formulaTypeCd == 'FT_SURRENDERLOWVALUE' || formula.formulaTypeCd == 'FT_SURRENDERMEDVALUE' || formula.formulaTypeCd == 'FT_SURRENDERHIGHVALU' || formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY') {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }

                                if (mapOutputFundAltLimited[itemCd] == undefined) {
                                    mapOutputFundAltLimited[itemCd] = {};
                                }
                                mapOutputFundAltLimited[itemCd][tmpFormula.output] = result;

                                if (mapOutputFundAltWhole[itemCd] == undefined) {
                                    mapOutputFundAltWhole[itemCd] = {};
                                }
                                mapOutputFundAltWhole[itemCd][tmpFormula.output] = resultAlternativeAsumtion;

                                if (tmpFormula.output == 'CVTOTALHIGHDISPLAY' || tmpFormula.output == 'CVTOTALMEDDISPLAY' || tmpFormula.output == 'CVTOTALLOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUELOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEMEDDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEHIGHDISPLAY') {
                                    mapResultPerYear[tmpFormula.output] = result;
                                    mapResultPerYear['ALT' + tmpFormula.output] = resultAlternativeAsumtion;
                                }
                            }
                        }
                    }
                }

                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT_LIMITED'] = mapOutputFundAltLimited;
                mapResultFormula['MAPOUTPUTFUNDALT_WHOLE'] = mapOutputFundAltWhole;
            }
        }
    }

    mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
    mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
    mapResultFormula['MAPOUTPUTFUNDALT_LIMITED'] = mapOutputFundAltLimited;
    mapResultFormula['MAPOUTPUTFUNDALT_WHOLE'] = mapOutputFundAltWhole;

    mapResultFormula['MAPOUTPUTFUNDPERTAHUN'] = mapResultPerYear;
    return mapResultFormula;
}

function inquireRateValByParameter(tempListRateCd, itemSelected, param, mapProperties, usingParamYear, pphMax) {
    if (tempListRateCd) {
        for (var i = 0; i < tempListRateCd.length; i++) {
            var tertanggungAge;
            var mainLifeAge;

            if (tempListRateCd[i].startsWith('CH')) {
                if (itemSelected.tertanggungAgeNew != undefined) {
                    tertanggungAge = (+itemSelected.tertanggungAgeNew + (param.year - 1));
                } else {
                    tertanggungAge = (+itemSelected.tertanggungAge + (param.year - 1));
                }

                if (itemSelected.ageNew != undefined) {
                    if (param.year != undefined) {
                        mainLifeAge = (+itemSelected.ageNew + (param.year - 1));
                    } else {
                        mainLifeAge = +itemSelected.ageNew;
                    }
                } else {
                    if (param.year != undefined) {
                        mainLifeAge = (+itemSelected.age + (param.year - 1));
                    } else {
                        mainLifeAge = +itemSelected.age;
                    }
                }
            } else {
                tertanggungAge = (+itemSelected.tertanggungAge + (param.year - 1));

                if (param.year != undefined) {
                    mainLifeAge = (+itemSelected.age + (param.year - 1));
                } else {
                    mainLifeAge = +itemSelected.age;
                }
            }

            var benefitTerm;
            if (mapProperties['PDTERM'] > 0) {
                benefitTerm = (mapProperties['PDTERM'] - mainLifeAge);
            }

            if (param.smokerStatus == undefined) {
                param.smokerStatus = itemSelected.smokerStatus;
            }

            if (itemSelected.clazz != undefined && itemSelected.clazz != "") {
                param.clazz = itemSelected.clazz;
            }

            var tmpRate;
            if (pphMax) {
                if (itemSelected.code.match(/H1Z1.*/)) {
                    var maxPlan = undefined;
                    outer:
                    for (var k = 0; k < itemSelected.itemInput.length; k++) {
                        if (itemSelected.itemInput[k].key == 'PDPLAN') {
                            var splitValue = itemSelected.itemInput[k].inputAdvanceFull.split('|');
                            for (var kk = 0; kk < splitValue.length; kk++) {
                                if (splitValue[kk].indexOf(itemSelected.itemInput[k].inputValueForRate) == -1) {
                                    maxPlan = splitValue[kk].slice(0, splitValue[kk].indexOf(','));
                                    break outer;
                                }
                            }
                        }
                    }
                    var tmpRate = getRateVal(maxPlan, param, tertanggungAge, mapProperties['PDTERM'], mapProperties['PDPLAN'], mapProperties['PDPLANFORRATE'], benefitTerm);
                }
            } else {
                if (usingParamYear) {
                    tmpRate = getRateVal(tempListRateCd[i], param, tertanggungAge, mapProperties['PDTERM'], mapProperties['PDPLAN'], mapProperties['PDPLANFORRATE'], benefitTerm);
                } else {
                    tmpRate = getRateVal(tempListRateCd[i], param, tertanggungAge, mapProperties['PDTERM'], mapProperties['PDPLAN'], mapProperties['PDPLANFORRATE'], benefitTerm);
                }
            }

            if (tmpRate) {
                if((param.prodCd == 'U4K' || param.prodCd == 'U2Z') && tmpRate.rate_type_cd == "RTSURRENDERCHARGES"){
                    if(tmpRate.value != 0){                        
                        param[tmpRate.rate_type_cd + param.year] = tmpRate.value;
                    }                      
                    mapProperties[tmpRate.rate_type_cd] = tmpRate.value;                          
                }else{
                    mapProperties[tmpRate.rate_type_cd] = tmpRate.value;
                }                
            }
        }
    }
}

function getRateVal(rate_cd, param, age_life_2, term, plan, planForRate, benefitTerm) {
    var obj;
    var age_life_1 = param.mainCoverage == 'E2ER' ? param.manfaatList[0].custList[0].anb : param.age;
    var gender = param.gender;
    var smoker_status = param.smokerStatus;
    var clazz = param.clazz;
    var year = param.year;
    var premiumPaymentTerm = param.premiumPaymentTerm;
    plan = planForRate != undefined ? planForRate : plan;

    var rate = {};
    rate = rootScope.RATE;
    currentRate = rate[rate_cd];

    if (currentRate) {
        obj = {};
        var rate_detail_component = currentRate.rateDetailComponent.split('|');
        var j = 0;
        var component = '';

        if (rate_detail_component[j] == 'age_life1') {
            component += age_life_1 + '|';
            j++;
        }
        if (rate_detail_component[j] == 'age_life2') {
            component += age_life_2 + '|';
            j++;
        }
        if (rate_detail_component[j] == 'gender') {
            component += gender + '|';
            j++;
        }
        if (rate_detail_component[j] == 'smoker_status') {
            component += smoker_status + '|';
            j++;
        }
        if (rate_detail_component[j] == 'term') {
            component += term + '|';
            j++;
        }
        if (rate_detail_component[j] == 'plan') {
            component += plan + '|';
            j++
        }
        if (rate_detail_component[j] == 'class') {
            component += clazz + '|';
            j++
        }
        if (rate_detail_component[j] == 'benefit_term') {
            component += benefitTerm + '|';
            j++;
        }
        if (rate_detail_component[j] == 'year') {
            component += year + '|';
            j++;
        }
        if (rate_detail_component[j] == 'premium_payment_term') {
            component += premiumPaymentTerm + '|';
            j++;
        }

        component = component.substring(0, component.length - 1);
        obj.rate_type_cd = currentRate.rateTypeCd;

        if (typeof currentRate.rateDetail === 'string') {
            currentRate.rateDetail = JSON.parse(currentRate.rateDetail);
        }

        obj.value = currentRate.rateDetail[component];

        return obj;
    }
}

function setMapPropertiesOnPreparedParameter(mapProperties, param) {
    mapProperties['mainCoverage'] = param.prodCd;
    mapProperties['CUSTAGE'] = param.age;
    mapProperties['CUSTAGEML'] = param.age;
    mapProperties['CUSTAGEDAY'] = param.custAgeDay;
    mapProperties['PDPAYTERM'] = param.premiumPaymentTerm;
    mapProperties['CUSTPREMI'] = param.manfaat.premi;
    mapProperties['CUSTSA'] = param.custSA;
    mapProperties['CHARGE'] = param.adminFee;
    mapProperties['CUSTPREMIPLAN'] = param.manfaat.rencanaPembayaran;
    mapProperties['CUSTPAYTYPE'] = param.paymentFrequency;
    mapProperties['CUSTSAVER'] = param.custSaver;
    mapProperties['CUSTPAYORAGE'] = param.alternatifRencanaPembayaran;
    mapProperties['CUSTINCOME'] = param.custIncome;    
    mapProperties['CUSTOCCUPATIONCLASS'] = param.clazz;
}

function getValueFund(code, output, mapOutputFund) {
    var res = '0.0';

    if (mapOutputFund[code]) {
        var fundCd = mapOutputFund[code];
        if (fundCd[output]) {
            res = fundCd[output];
        }
    }

    return res;
}

function isValidExpression(expression) {
    var result = parseFloat(expression);
    if (result === 'Nan') {
        return false;
    } else {
        return true;
    }
}

function getResultExpression(expression) {
    try {
        var result = eval(expression);
    } catch (e) {
        // writeToConsole(expression);
        // writeToConsole(e.stack);
        if (e instanceof SyntaxError) {
            // writeToConsole("EVAL ERROR : " + e.message);
        }
    }
    return result;
}

function processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt) {
    if(stringFormula.includes("--") || stringFormulaAlt.includes("--")) {
        stringFormula = stringFormula.replace("--","+");
        stringFormulaAlt = stringFormulaAlt.replace("--","+");
    }
    if(stringFormula.match(/\b--/gi)){
        stringFormula = stringFormula.replace(new RegExp("\\b(?:--)\\b","g"), "+");	
    }

    if(stringFormulaAlt.match(/\b--/gi)){
        stringFormulaAlt = stringFormulaAlt.replace(new RegExp("\\b(?:--)\\b","g"), "+");	
    }

    if(stringFormula.indexOf('^') > -1 ){
        var strForml = stringFormula.split('^');

        var frml1 = getResultExpression(strForml[0]);
        var frml2 = getResultExpression(strForml[1]);

        stringFormula = Math.pow(frml1, frml2);
    }

    if(stringFormulaAlt.indexOf('^') > -1 ){
        var strForml = stringFormulaAlt.split('^');

        var frml1 = getResultExpression(strForml[0]);
        var frml2 = getResultExpression(strForml[1]);

        stringFormulaAlt = Math.pow(frml1, frml2);
    }

    return {
        stringFormula: stringFormula,
        stringFormulaAlt: stringFormulaAlt
    };
}

function getTerm(itemSelected) {
    var t;
    for (var i = 0; i < itemSelected.itemInput.length; i++) {
        var is = itemSelected.itemInput[i];
        if (is.key) {
            if (is.key == 'PDTERM') {
                t = is.inputValue;
                break;
            }
        }
    }
    return t;
}

function setMapPropertiesToUndefined(mapProperties) {
    mapProperties['PDPLAN'] = undefined;
    mapProperties['PDSA'] = undefined;
    mapProperties['PDUNIT'] = undefined;
}

function getFactorFromAnuityByMonth(month, annuityList) {
    for (var i = 0; i < annuityList.length; i++) {
        if (annuityList[i].month == month) {
            return annuityList[i].factor;
        }
    }
}

function setMapCustAgeWhenNotAdditionalLife(mapProperties, itemSelected) {
    if (itemSelected.tertanggungKey < 3) {
        mapProperties['CUSTAGE' + '0' + (itemSelected.tertanggungKey - 1)] = itemSelected.tertanggungKey;
    }
}

function generateOutput(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;

    if (param.currCd == 'USD') {
        divider = 1;
    }

    if(isPPHC === true){
        var outPutPPHC = generateOutputPPHAlt(param, mapOutputMain);
    }

    var tmpLowClient;
    var tmpLowClientSurr;

    var tmpDeathClient;

    var tmpMedClient;
    var tmpMedClientSurr;

    var tmpHighClient;
    var tmpHighClientSurr;

    var tmpLowAlt;
    var tmpLowAltSurr;

    var tmpMedAlt;
    var tmpMedAltSurr;

    var tmpHighAlt;
    var tmpHighAltSurr;

    //output tambahan buat 2 fund di U4K
    var tmpLowPayout;
    var tmpMedPayout;
    var tmpHighPayout;

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt

        tmpLowClient = mapFundNLG['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVHIGHFUNDDSPLY'] / divider;
        tmpLowClientSurr = mapFundNLG['FT_SURRENDERLOWVALUE'] / divider;
        tmpMedClientSurr = mapFundNLG['FT_SURRENDERMEDVALUE'] / divider;
        tmpHighClientSurr = mapFundNLG['FT_SURRENDERHIGHVALU'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVHIGHFUNDDSPLY'] / divider;
        tmpLowAltSurr = mapFundNLGAlt['FT_SURRENDERLOWVALUE'] / divider;
        tmpMedAltSurr = mapFundNLGAlt['FT_SURRENDERMEDVALUE'] / divider;
        tmpHighAltSurr = mapFundNLGAlt['FT_SURRENDERHIGHVALU'] / divider;
        tmpLowPayout = mapFundNLG['TOTALCVLOWPAYOUT'] / divider;
        tmpMedPayout = mapFundNLG['TOTALCVMEDPAYOUT'] / divider;
        tmpHighPayout = mapFundNLG['TOTALCVHIGHPAYOUT'] / divider;
        

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowClientSurr = Math.round(tmpLowClientSurr);
            tmpMedClientSurr = Math.round(tmpMedClientSurr);
            tmpHighClientSurr = Math.round(tmpHighClientSurr);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpLowAltSurr = Math.round(tmpLowAltSurr);
            tmpMedAltSurr = Math.round(tmpMedAltSurr);
            tmpHighAltSurr = Math.round(tmpHighAltSurr);
            tmpLowPayout = Math.round(tmpLowPayout);
            tmpMedPayout = Math.round(tmpMedPayout);
            tmpHighPayout = Math.round(tmpHighPayout);
        }

        if(param.prodCd == 'U4K'){
            param.rencanaPembayaran = 1;
        }

        var ObjGabFund = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / divider)) : (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / divider)) : '',
            lowClient: tmpLowClient,
            lowClientSurr: tmpLowClientSurr,
            medClient: tmpMedClient,
            medClientSurr: tmpMedClientSurr,
            highClient: tmpHighClient,
            highClientSurr: tmpHighClientSurr,
            premiAlt: (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM1) / divider)) : (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM1) / divider)),
            lowAlt: tmpLowAlt,
            lowAltSurr: tmpLowAltSurr,
            medAlt: tmpMedAlt,
            medAltSurr: tmpMedAltSurr,
            highAlt: tmpHighAlt,
            highAltSurr: tmpHighAltSurr,
            lowPayout: tmpLowPayout,
            medPayout: tmpMedPayout,
            highPayout: tmpHighPayout
        };        

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }

        tmpLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpDeathClient = mapFundNLG['TOTALDEATHBENEFITPGB']; 

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpDeathClient = Math.round(tmpDeathClient);
        }

        var ObjGabDeath = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? ((param.manfaat.totalPremi) / divider) : '',
            lowClient: tmpLowClient,
            medClient: tmpMedClient,
            highClient: tmpHighClient,
            lowAlt: tmpLowAlt,
            medAlt: tmpMedAlt,
            highAlt: tmpHighAlt,
            premiDeathClient : tmpDeathClient/divider,
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['DEATHBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        }

    }
    // newOutput['RULEFORFUND'] = result.rule[0]?result.rule[0]:[];
    // newOutput['RULEFORFUND'] = param.RULEFORFUND;
    newOutput['CHARGERIDER'] = mapOutput[1].mapChargeRider;
    newOutput['outPutPPHALT'] = outPutPPHC;
    newOutput['isPPH'] = isPPHC;
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    newOutput['isGio'] = mapOutput[1].isGio;
    newOutput['GIOCODE'] = mapOutput[1].mapGIO;

    rootScope.newOutput = newOutput;
    return newOutput;
}

function generateOutputPLPL(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;

    if (param.currCd == 'USD') {
        divider = 1;
    }

   // if(isPPHC === true){
   //     var outPutPPHC = generateOutputPPHAlt(param, mapOutputMain);
    //}

    var tmpBasicPremium; 
    var tmpMultipleBenefit;
    var tmpSA;
    var tmpEstimasiBonus;
    var tmpTotalDeath;
    var tmpTotalIncident;
    var tmpSurrGuarantee;
    var tmpSurrEstimasiBonus;
    var tmpSurrTotalCV;
    var tmpTotalBenefitEnd;
    var tmpMultipleBen; 

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt

        tmpBasicPremium = mapFundNLG['BASICPREMIUM'] / divider;
        tmpMultipleBenefit = mapFundNLG['FT_MULTIPLIERBENEFIT'] / divider;
        tmpSA = mapFundNLG['SA_PLPL'] / divider;
        tmpEstimasiBonus = mapFundNLG['FT_ESTIMASIBONUS_L2HD'] / divider;
        tmpTotalDeath = mapFundNLG['FT_TOTALDEATH'] / divider;
        tmpTotalIncident = mapFundNLG['FT_TOTALKECELAKAAN'] / divider;
        tmpSurrGuarantee = mapFundNLG['FT_SURRGUARANTEE'] / divider;
        tmpSurrEstimasiBonus = mapFundNLG['FT_SURR_RB_TB_L2HD'] / divider;
        tmpSurrTotalCV = mapFundNLG['FT_SURRENDERLOWVALUE'] / divider;
        tmpTotalBenefitEnd = mapFundNLG['FT_TOTAL_MATURITY_L2HD'] / divider; 

        if (param.currCd == 'IDR') {
            tmpBasicPremium = Math.round(tmpBasicPremium);
            tmpMultipleBenefit = Math.round(tmpMultipleBenefit);
            tmpSA = Math.round(tmpSA);
            tmpEstimasiBonus = Math.round(tmpEstimasiBonus);
            tmpTotalDeath = Math.round(tmpTotalDeath);
            tmpTotalIncident = Math.round(tmpTotalIncident);
            tmpTotalBenefitEnd =Math.round(tmpTotalBenefitEnd); 
            tmpSurrGuarantee = Math.round(tmpSurrGuarantee);
            tmpSurrEstimasiBonus = Math.round(tmpSurrEstimasiBonus);
            tmpSurrTotalCV = Math.round(tmpSurrTotalCV);
        }

        var ObjGabFund = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: year == 1 ?(Math.round((tmpBasicPremium) / divider)): '',
            multipleBenefit: tmpMultipleBenefit,
            saPLPL: tmpSA,
            estimationBonus: tmpEstimasiBonus,
            totalDB: tmpTotalDeath,
            totalDBIncident: tmpTotalIncident,
            totalBenefitEnd : tmpTotalBenefitEnd,
            totalCVGuarantee: tmpSurrGuarantee,
            estimationBonusSurrender: tmpSurrEstimasiBonus,
            totalCVSurrender: tmpSurrTotalCV
        };        

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }

    

    }
    // newOutput['RULEFORFUND'] = result.rule[0]?result.rule[0]:[];
    // newOutput['RULEFORFUND'] = param.RULEFORFUND;
    newOutput['CHARGERIDER'] = mapOutput[1].mapChargeRider;
   // newOutput['outPutPPHALT'] = outPutPPHC;
    newOutput['isPPH'] = isPPHC;
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    newOutput['isGio'] = mapOutput[1].isGio;
    newOutput['GIOCODE'] = mapOutput[1].mapGIO;
    newOutput['multipleBenefit'] = tmpMultipleBen;
    rootScope.newOutput = newOutput;
    return newOutput;
}

function generateOutputPPHAlt(param, mapOutputALT) {
    var mapOutput = mapOutputALT.mapOutputPPHAlt;
    var newOutput = {};

    var divider = 1000;

    if (param.currCd == 'USD') {
        divider = 1;
    }
    
    var tmpLowClient;
    var tmpLowClientSurr;

    var tmpDeathClient;

    var tmpMedClient;
    var tmpMedClientSurr;

    var tmpHighClient;
    var tmpHighClientSurr;

    var tmpLowAlt;
    var tmpLowAltSurr;

    var tmpMedAlt;
    var tmpMedAltSurr;

    var tmpHighAlt;
    var tmpHighAltSurr;

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt

        tmpLowClient = mapFundNLG['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVHIGHFUNDDSPLY'] / divider;
        tmpLowClientSurr = mapFundNLG['FT_SURRENDERLOWVALUE'] / divider;
        tmpMedClientSurr = mapFundNLG['FT_SURRENDERMEDVALUE'] / divider;
        tmpHighClientSurr = mapFundNLG['FT_SURRENDERHIGHVALU'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVHIGHFUNDDSPLY'] / divider;
        tmpLowAltSurr = mapFundNLGAlt['FT_SURRENDERLOWVALUE'] / divider;
        tmpMedAltSurr = mapFundNLGAlt['FT_SURRENDERMEDVALUE'] / divider;
        tmpHighAltSurr = mapFundNLGAlt['FT_SURRENDERHIGHVALU'] / divider;

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowClientSurr = Math.round(tmpLowClientSurr);
            tmpMedClientSurr = Math.round(tmpMedClientSurr);
            tmpHighClientSurr = Math.round(tmpHighClientSurr);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpLowAltSurr = Math.round(tmpLowAltSurr);
            tmpMedAltSurr = Math.round(tmpMedAltSurr);
            tmpHighAltSurr = Math.round(tmpHighAltSurr);
        }

        var ObjGabFund = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / 1000)) : (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / 1000)) : '',
            lowClient: tmpLowClient,
            lowClientSurr: tmpLowClientSurr,
            medClient: tmpMedClient,
            medClientSurr: tmpMedClientSurr,
            highClient: tmpHighClient,
            highClientSurr: tmpHighClientSurr,
            premiAlt: (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM1) / 1000)) : (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM1) / 1000)),
            lowAlt: tmpLowAlt,
            lowAltSurr: tmpLowAltSurr,
            medAlt: tmpMedAlt,
            medAltSurr: tmpMedAltSurr,
            highAlt: tmpHighAlt,
            highAltSurr: tmpHighAltSurr,
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }

        tmpLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpDeathClient = mapFundNLG['TOTALDEATHBENEFITPGB']; 

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpDeathClient = Math.round(tmpDeathClient);
        }

        var ObjGabDeath = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? ((param.manfaat.totalPremi) / divider) : '',
            lowClient: tmpLowClient,
            medClient: tmpMedClient,
            highClient: tmpHighClient,
            lowAlt: tmpLowAlt,
            medAlt: tmpMedAlt,
            highAlt: tmpHighAlt,
            premiDeathClient : tmpDeathClient/1000,
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['DEATHBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        }

    }

    newOutput['SARIDER'] = param.SARIDER;
    newOutput['RULEFORFUND'] = param.RULEFORFUND;

    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    return newOutput;
}

function generateOutputUSAVE(param, mapOutputMain) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    newOutput.FUNDMAP = {};

    var divider = 1;

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        if (mapItemCd.year > '10')
            continue;

        var mapFundNLG = mapItemCd.mapFundNLG;

        var objGabFund = {
            year: (year).toString(),
            customerAge: mapItemCd.ageCustomer.toString(),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? ((param.manfaat.totalPremi) / divider).toString() : '',
            manfaatNilaiTunai: parseInt(year) < 10 ? Math.round(mapFundNLG['MANFAATNILAITUNAI_E2ER'] / divider).toString() : '',
            surrenderValue: Math.round(mapFundNLG['FORMULACVSURRENDERE2ER'] / divider).toString(),
            deathBenefit: Math.round(mapFundNLG['DEATHBENEFIT_E2ER'] / divider).toString(),
            deathBenefitUponAccident: Math.round(mapFundNLG['DEATHBENEFIT_E2ER'] / divider).toString(),
            accumulationPremium: parseInt(year) <= parseInt(param.rencanaPembayaran) ? Math.round(mapFundNLG['ACCUMULATIONPREMIE2ER'] / divider).toString() : '',
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(objGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(objGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }
    }
    newOutput['SARIDER'] = param.SARIDER;
    newOutput['RULEFORFUND'] = param.RULEFORFUND;

    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    return newOutput;
}
function getUnappliedPremium(param, flagProcess, DIFFLVPREMI) {
    param = reMappingCode(param);
    mapChargeRider = {};
    param.year = 1;
    tmpCurr = param.currCd;
    param = setParamMainCoverage(param);

    if (param.process == undefined) {
        param.process = 'NB';
    }

    /* start separate obsolete rider */
    var obsoleteRiders = '';
    var coverageList = [];
    var channel = rootScope.CHANNEL ? rootScope.CHANNEL[param.channelCode] : undefined;
    if (channel) {
        var channelProdCat = channel.PRODUCT_CATEGORY;
        for (var i = 0; i < channelProdCat.length; i++) {
            if (channelProdCat[i].code === param.productCdCat) {
                var channelProduct = channelProdCat[i].PRODUCT;
                for (var j = 0; j < channelProduct.length; j++) {
                    if (channelProduct[j].code === param.prodCd) {
                        var channelCurrency = channelProduct[j].CURRENCY;
                        for (var k = 0; k < channelCurrency.length; k++) {
                            if (channelCurrency[k].code === param.currCd) {
                                obsoleteRiders = channelCurrency[k].COVERAGE_BUNDLE == undefined ? '' : channelCurrency[k].COVERAGE_BUNDLE;
                                coverageList = channelCurrency[k].COVERAGE;
                                break;
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }
    }

    var tempManfaatList = [];
    param.manfaatListObsolete = [];

    for (var obs = 0; obs < param.manfaatList.length; obs++) {
        if (param.manfaatList[obs].coverageType === 'rider') {
            var isExistsInCoverageList = false;
            if (obsoleteRiders.indexOf(param.manfaatList[obs].code) !== -1) {
                param.manfaatListObsolete.push(param.manfaatList[obs]);
            } else {
                for (var cl = 0; cl < coverageList.length; cl++) {
                    if (coverageList[cl].coverageCd === param.manfaatList[obs].code) {
                        isExistsInCoverageList = true;
                        break;
                    }
                }

                if (isExistsInCoverageList) {
                    tempManfaatList.push(param.manfaatList[obs]);
                } else {
                    param.manfaatListObsolete.push(param.manfaatList[obs]);
                }
            }
        } else {
            tempManfaatList.push(param.manfaatList[obs]);
        }
    }

    param.manfaatList = tempManfaatList;
    /* end separate obsolete rider */

    setCumulativeAttribute(param.manfaatList);

    // writeStreamBodyA.write(JSON.stringify(param));
    var setManfaatList = sortingRiderTopupMain(param.manfaatList, param.age);

    mymanfaatlist = setManfaatList.PHC;

    param.issuedDate = new Date();

    param.ManfaatListCVCalc = setManfaatList.PHC;
    param.ManfaatListCovCalc = setManfaatList.isPHCExists;

    var map = preparedParameter('hitung', param, {}, {}, flagProcess, 'COVERAGE', null);

    if (!param.DIFFLVPREMI) {
        param.DIFFLVPREMI = DIFFLVPREMI;
    }
    return map;
}

function setCumulativeAttribute(manfaatList) {
    for (var i = 0; i < manfaatList.length; i++) {
        if (manfaatList[i].coverageType.toLowerCase() == 'main') {
            for (var j = 0; j < manfaatList[i].custList[0].itemInput.length; j++) {
                if (manfaatList[i].custList[0].itemInput[j].key == 'PDSA') {
                    manfaatList[i].cumulativeCalculateUsingNewRate = true;
                    manfaatList[i].cumulativeRemainingSA = manfaatList[i].custList[0].itemInput[j].inputValue;
                }
            }
        }
    }
}

function preparedParameter(type, param, paramMapOutputFund, paramMapOutputFundAlt, flagProcess, pphProcess, DIFFLVPREMI) {
    var mapResult = {};
    var mapProperties = {};
    var mapGio = {};

    var mapOutputCoverage = {};
    var mapOutputCoveragePrecalculated = {};
    var mapOutputFund = paramMapOutputFund;
    var mapOutputFundAlt = paramMapOutputFundAlt;

    var mapOutputFundAlt = paramMapOutputFundAlt;

    var coverageList = [];
    var coverageGroupList = [];
    var tmpCoverageGroupList = [];

    var manfaatListCodeSelected = [];

    var manfaatList = [];
    var tempData;

    manfaatList = param.ManfaatListCovCalc;
    var newManfaatList = [];

    newManfaatList = manfaatList;

    setMapPropertiesOnPreparedParameter(mapProperties, param);

    predefinedCalculation(tempData, newManfaatList, mapProperties, param, mapOutputCoveragePrecalculated, 0, flagProcess, mapResult);

    processOnPreparedParameter(newManfaatList, mapProperties, manfaatListCodeSelected, param, flagProcess,
        mapResult, mapOutputFund, mapOutputFundAlt, type, tmpCoverageGroupList, coverageList, mapOutputCoverage,
        undefined, undefined, undefined, null, null, DIFFLVPREMI, mapGio, null);

    if (type === 'hitung') {
        coverageGroupList = generateCoverageGroup(tmpCoverageGroupList);

        mapResult.rule = getRuleValidation(param.mainCoverage, mapOutputCoverage, coverageList.concat(coverageGroupList), mymanfaatlist, param.process, param.manfaatListObsolete, param);
    }

    if (type != 'proses') {
        mapResult.manfaatList = manfaatListCodeSelected;
    }

    return mapResult;
}

function predefinedCalculation(tempData, newManfaatList, mapProperties, param, mapOutputCoveragePrecalculated, isPphAlt, flagProcess, mapResult) {
    var ITEM_PREDEFINED;
    var listItemPredefined = [];
    var itemCategory = 'New Business';

    //temp
    if (tempData !== undefined) {
        ITEM_PREDEFINED = rootScope.COVERAGE[tempData.code];
        var itemSelected = tempData;
        if (ITEM_PREDEFINED != undefined) {
            var predefined;
            if (flagProcess == 'flagHitung') {
                predefined = ITEM_PREDEFINED.FORMULA.filter(function (item) {
                    return (item.category == itemCategory || item.category == 'Both');
                });
            } else {
                predefined = ITEM_PREDEFINED.FORMULA.filter(function (item) {
                    return ((item.category == itemCategory || item.category == 'Both') && item.groupSequence != null);
                });
            }
            if (predefined.length > 0) {
                for (var j = 0; j < predefined.length; j++) {
                    if (predefined[j].formulaCd.indexOf('FRMLRIDERPREMITY09') != -1 &&
                        itemSelected.isPPH != undefined && itemSelected.isPPH != "M") {
                        continue;
                    }
                    var obj = predefined[j];
                    obj.coverage = itemSelected.code;
                    obj.type = 'COVERAGE';
                    obj.ALLOCATION_VALUE = ITEM_PREDEFINED.ALLOCATION_VALUE;
                    obj.CHANNEL = ITEM_PREDEFINED.CHANNEL;
                    obj.itemSelected = itemSelected;

                    listItemPredefined.push(Object.assign({}, obj))
                }
            }
        }
        listItemPredefined.push(Object.assign({}, obj))
    }
    //end temp

    /* bantuan untuk menentukan apakah product sudah pasti fuw */
    for (var j = 0; j < newManfaatList.length; j++) {
        var itemSelected = newManfaatList[j];
        var approvalType = null;
        if (itemSelected.type === 'COVERAGE') {
            if (itemSelected.name.indexOf('PRUsaver') === -1) {
                var ITEM;
                ITEM = rootScope.COVERAGE[itemSelected.code];
                ITEM.FORMULA_BOTH = ITEM.FORMULA.filter(function (item) { return ((item.category == itemCategory || item.category == 'Both') && item.groupSequence == null); });
                var tempMapFormulaList = ITEM.FORMULA_BOTH;
                tempMapFormulaList.sort(function (a, b) { return a.sequence - b.sequence; });

                for (var k = 0; k < tempMapFormulaList.length; k++) {
                    var tmpFormula = tempMapFormulaList[k];
                    if ((tmpFormula.output.match(/CONVPRODUCT.*/) || tmpFormula.output.match(/CONVRIDER.*/)) && param.year == 1) {                        
                        approvalType = 'SIO';                        
                        if((param.prodCd == 'U2V' || param.prodCd == 'U2T') && (ITEM.coverageCode == 'P1RR' || ITEM.coverageCode == 'P1RD')){
                            approvalType = 'FUW';                            
                        }
                        break;
                    } else {
                        approvalType = 'FUW';
                    }
                }                
                if (approvalType == 'FUW') {                    
                    param.isFUW = true;
                    break;
                }
            }
        }
    }

    //ambil total SA dari input awal, bukan di manfaat list yang akan digunakan untuk kalkulasi
    var tempManfaatList = newManfaatList;
    

    for (var i = 0; i < tempManfaatList.length; i++) {
        ITEM_PREDEFINED = rootScope.COVERAGE[tempManfaatList[i].code];        
        var itemSelected = tempManfaatList[i];

        if (itemSelected.itemInput[0].key == 'PDSA') {
            if (!mapProperties['PDSA_' + itemSelected.code]) {
                mapProperties['PDSA_' + itemSelected.code] = itemSelected.itemInput[0].inputValue;
            } else {
                mapProperties['PDSA_' + itemSelected.code] = parseInt(mapProperties['PDSA_' + itemSelected.code]) +
                    parseInt(itemSelected.itemInput[0].inputValue);
            }
        } else if (itemSelected.itemInput[0].key == 'PDPREMI') {
            if (!mapProperties['PDPREMI_' + itemSelected.code]) {
                mapProperties['PDPREMI_' + itemSelected.code] = itemSelected.itemInput[0].inputValue;
            } else {
                mapProperties['PDPREMI_' + itemSelected.code] = parseInt(mapProperties['PDPREMI_' + itemSelected.code]) +
                    parseInt(itemSelected.itemInput[0].inputValue);
            }
        }

        if (ITEM_PREDEFINED != undefined) {
            var predefined;
            if (flagProcess == 'flagHitung') {
                predefined = ITEM_PREDEFINED.FORMULA.filter(function (item) {
                    return (item.category == itemCategory || item.category == 'Both');
                });
            } else {
                predefined = ITEM_PREDEFINED.FORMULA.filter(function (item) {
                    return ((item.category == itemCategory || item.category == 'Both') && (item.groupSequence != null || item.precalculated != null));
                });
            }

            if (predefined.length > 0) {
                for (var j = 0; j < predefined.length; j++) {
                    if (predefined[j].formulaCd.indexOf('FRMLRIDERPREMITY09') != -1 &&
                        newManfaatList[i].isPPH != undefined && newManfaatList[i].isPPH != "M") {
                        continue;
                    }
                    var obj = predefined[j];
                    obj.coverage = newManfaatList[i].code;
                    obj.type = 'COVERAGE';
                    obj.ALLOCATION_VALUE = ITEM_PREDEFINED.ALLOCATION_VALUE;
                    obj.CHANNEL = ITEM_PREDEFINED.CHANNEL;
                    obj.itemSelected = itemSelected;

                    listItemPredefined.push(Object.assign({}, obj))
                }
            }
        }

       
    }
    //end ambil total SA dari input awal, bukan di manfaat list yang akan digunakan untuk kalkulasi

    listItemPredefined.sort(function (a, b) {
        return (parseInt(a.groupSequence) > parseInt(b.groupSequence) ||
            (parseInt(a.groupSequence) == parseInt(b.groupSequence) && parseInt(a.sequence) > parseInt(b.sequence))) ? 1 :
            ((parseInt(b.groupSequence) > parseInt(a.groupSequence) ||
                (parseInt(b.groupSequence) == parseInt(a.groupSequence) && parseInt(b.sequence) > parseInt(a.sequence))) ? -1 : 0);
    });

    setParamToUndefined(param);

    for (var y = 0; y < listItemPredefined.length; y++) {
        var obj = listItemPredefined[y];
        mapProperties['RTPREMI'] = undefined;
        mapProperties['NEEDCALCULATE'] = obj.itemSelected.isNeedToBeCalculated != undefined ? obj.itemSelected.isNeedToBeCalculated : true;

        var itemInputList = obj.itemSelected.itemInput;
        var pdPremiExist = 0;
        var pdSaExist = 0;

        for(var j = 0; j < obj.itemSelected.length; j++){
            if(itemInputList[j].key === 'PDPREMI'){
                pdPremiExist = itemInputList[j].inputValue;
            }
            else if(itemInputList[j].key === 'PDSA'){
                pdSaExist = itemInputList[j].inputValue;
                mapProperties['PDSA'] = itemInputList[j].inputValue; // input PDSA to mapProperties
            }
        }	

        //input previousPremi
        setPremiPrevDecEtc(mapProperties, obj.itemSelected, pdPremiExist, pdSaExist);

        //FROM ITEM INPUT
        var itemInputList = obj.itemSelected.itemInput;

        setMapPropertiesToUndefined(mapProperties);

        for (var j = 0; j < itemInputList.length; j++) {
            if (itemInputList[j].key === 'PDALLO') {
                fundAllocationValue = itemInputList[j].inputValue;
                fundAllocationValueTopup = itemInputList[j].inputValueTopup;
                mapProperties['PDALLO'] = itemInputList[j].inputValue / 100;
                mapProperties['PDALLO_TOPUP'] = itemInputList[j].inputValueTopup / 100;
                break;
            } else {
                mapProperties[itemInputList[j].key] = itemInputList[j].inputValue;
            }

            if (itemInputList[j].key == 'PDPLAN') {
                mapProperties['PDPLANFORRATE'] = undefined;
                if (itemInputList[j].inputValueForRate != undefined) {
                    mapProperties['PDPLANFORRATE'] = itemInputList[j].inputValueForRate;
                }
            }
        }

        if (obj.type === 'COVERAGE') {
            //ALLOCATION VALUE
            var allocationValue = obj.ALLOCATION_VALUE[param.year];
            mapProperties['ALLOVALUE'] = allocationValue == null ? 0 : allocationValue;

            //FROM RATE
            var tempListRateCd = obj.CHANNEL[param.channelCode];
            setMapCustAgeWhenNotAdditionalLife(mapProperties, obj.itemSelected);
            obj.keyTertanggungAge = 'CUSTAGE' + '0' + (obj.itemSelected.tertanggungKey - 1);
            inquireRateValByParameter(tempListRateCd, obj.itemSelected, param, mapProperties);
        }

        if (obj.itemSelected.code == "U1SR") {
            mapProperties["SA_BASIC"] = obj.itemSelected.itemInput[0].inputValue;
            if (param.process == "ALTER") {
                mapProperties["SA_BASIC_NEW"] = obj.itemSelected.currValueSA;
            } else {
                mapProperties["SA_BASIC_NEW"] = mapProperties["SA_BASIC"];
            }
        }

        // ambil topup dan withdrawal
        for (var d = 0; d < param.topupList.length; d++) {
            var tmpTopup = param.topupList[d];
            if (tmpTopup.year == param.year) {
                mapProperties['CUSTTOPUP'] = tmpTopup.amount;          
                break;
            }
        }

        for (var d = 0; d < param.withdrawalList.length; d++) {
            var tmpWithdrawal = param.withdrawalList[d];
            if (tmpWithdrawal.year == param.year) {
                mapProperties['CUSTWITHDRAW'] = tmpWithdrawal.amount;
                break;
            }
        }
        // end

        var term = getTerm(obj.itemSelected);
        if (term) {
            if (param.age <= term) {
                if(isPphAlt){
                    formulaPrecalculateALT(obj, param, mapProperties, mapOutputCoveragePrecalculated);
                }
                else{
                    formulaPrecalculate(obj, param, mapProperties, mapOutputCoveragePrecalculated, mapResult);
                }
            }
        } else {
            if(isPphAlt){
                formulaPrecalculateALT(obj, param, mapProperties, mapOutputCoveragePrecalculated);
            }
            else{
                formulaPrecalculate(obj, param, mapProperties, mapOutputCoveragePrecalculated, mapResult);
            }
        }
    }
}

function setPremiPrevDecEtc(mapProperties, itemSelected, pdPremiExist, pdSaExist) {
    //input previousPremi
    mapProperties['PDPREMIPREVIOUS'] = itemSelected.previousPremi != undefined && itemSelected.previousPremi != null ? itemSelected.previousPremi : '0.0';
    mapProperties['PDPREMIEXIST'] = pdPremiExist;
    mapProperties['PDSAPREVIOUS'] = itemSelected.previousSA != undefined && itemSelected.previousSA != null ? itemSelected.previousSA : '0.0';
    mapProperties['PDSAEXIST'] = pdSaExist;
    if (itemSelected.coverageType != undefined && (itemSelected.coverageType.toLowerCase() == 'topup' || itemSelected.coverageType.toLowerCase() == 'saver')) {
        mapProperties['CUSTSAVERPREVIOUS'] = itemSelected.previousSaver != undefined && itemSelected.previousSaver != null ? itemSelected.previousSaver : '0.0';
    }
    mapProperties['PDSAPREVDEC'] = itemSelected.histValueSA == undefined ? 0 : isNaN(itemSelected.histValueSA) ? "\'" + itemSelected.histValueSA + "\'" : itemSelected.histValueSA;
    mapProperties['PDUNITPREVDEC'] = itemSelected.histValueUnit == undefined ? 0 : isNaN(itemSelected.histValueUnit) ? "\'" + itemSelected.histValueUnit + "\'" : itemSelected.histValueUnit;
    mapProperties['PDPLANPREVDEC'] = itemSelected.histValuePlan == undefined ? (mapProperties['PDPLAN'] == undefined ? '0.0' : (isNaN(mapProperties['PDPLAN']) ? '\'@\'' : '0.0')) : isNaN(itemSelected.histValuePlan) ? "\'" + itemSelected.histValuePlan + "\'" : itemSelected.histValuePlan;
    mapProperties['PDTERMPREVDEC'] = itemSelected.histValueTerm == undefined ? 0 : isNaN(itemSelected.histValueTerm) ? "\'" + itemSelected.histValueTerm + "\'" : itemSelected.histValueTerm;
    mapProperties['PDSASUM'] = itemSelected.currValueSA;
    mapProperties['PDSASUM_' + itemSelected.code] = itemSelected.currValueSA;
    mapProperties['ALTERRIDERADD'] = itemSelected.newRider;
    mapProperties['RIDERSTATUS'] = itemSelected.riderStatus;
    mapProperties['PDSAORIGINAL'] = itemSelected.saOriginal;
    mapProperties['APPROVALTYPE'] = itemSelected.approvalTypeConversion != undefined ? itemSelected.approvalTypeConversion : mapProperties['APPROVALTYPE'];
    mapProperties['CUMULATIVECALCULATEUSINGNEWRATE'] = itemSelected.cumulativeCalculateUsingNewRate ? '1' : '0';
    mapProperties['CUMULATIVECURRENTRESULT'] = itemSelected.cumulativeCurrentResult;
    mapProperties['CUMULATIVEPREVIOUSSA'] = itemSelected.cumulativePreviousSA;
    mapProperties['CUMULATIVEPREVIOUSSUMRESULT'] = itemSelected.cumulativePreviousSumResult;
    mapProperties['ACCMPREVIOUS'] = itemSelected.histValueAccm == undefined ? 0 : itemSelected.histValueAccm;
    mapProperties['ACCMEXIST'] = itemSelected.currValueAccm == undefined ? 0 : isNaN(itemSelected.currValueAccm) ? "\'" + itemSelected.currValueAccm + "\'" : itemSelected.currValueAccm;
    mapProperties['CUMULATIVEREMAININGSA'] = itemSelected.cumulativeRemainingSA;

    if (itemSelected.tertanggungKey == 3) {
        mapProperties['CUSTAGE01'] = itemSelected.tertanggungAge;
    } else {
        mapProperties['CUSTAGE01'] = undefined;
    }

    if (itemSelected.tertanggungKey == 4) {
        mapProperties['CUSTAGE02'] = itemSelected.tertanggungAge;
    } else {
        mapProperties['CUSTAGE02'] = undefined;
    }
}

function generateCoverageGroup(coverageList) {
    var coverageGroupList = [];
    var coverageCount = 0;

    for (var i = 0; i < coverageList.length; i++) {
        if (coverageList[i + 1] != undefined && coverageList[i].coverageCd == coverageList[i + 1].coverageCd &&
            coverageList[i].keyTertanggungAge == coverageList[i + 1].keyTertanggungAge) {
            continue;
        }

        for (var j = 0; j < coverageList[i].coverageGroupCdList.length; j++) {
            var tmpCovGroup = coverageList[i].coverageGroupCdList[j];
            var idx = -1;
            for (var k = 0; k < coverageGroupList.length; k++) {
                if (tmpCovGroup === coverageGroupList[k].itemCd) {
                    idx = k;
                    coverageCount++;
                    break;
                }
            }

            var newProp = {};
            for (var k in coverageList[i].properties) {
                newProp[k] = coverageList[i].properties[k];
            }

            if (idx < 0) {
                newProp['PDSELECTEDMLCOMBINE'] = newProp['PDSELECTEDML'];
                var map = {
                    itemCd: tmpCovGroup,
                    itemType: 'COVERAGE_GROUP',
                    coverageCode: coverageList[i].coverageCd,
                    keyTertanggungAge: coverageList[i].keyTertanggungAge,
                    properties: newProp,
                    mapOutputCoverage: coverageList[i].mapOutputCoverage,
                    mapOutputFund: coverageList[i].mapOutputFund
                };

                coverageGroupList.push(map);
                cacheCov = coverageList[i].coverageCd;
            } else {
                var maps = coverageGroupList[idx];
                maps.properties['PDSA'] = parseInt(maps.properties['PDSA']) + parseInt(newProp['PDSA']);
                if (coverageCount > 0) {
                    if ((maps.coverageCode != coverageList[i].coverageCd) && (maps.keyTertanggungAge == coverageList[i].keyTertanggungAge) ||
                        (maps.coverageCode == coverageList[i].coverageCd) && (maps.keyTertanggungAge == coverageList[i].keyTertanggungAge)) {
                        maps.properties['PDSELECTEDML'] = parseInt(maps.properties['PDSELECTEDML']) + parseInt(newProp['PDSELECTEDML']);
                        maps.properties['PDSELECTEDAL2'] = parseInt(maps.properties['PDSELECTEDAL2']) + parseInt(newProp['PDSELECTEDAL2']);
                        maps.properties['PDSELECTEDAL3'] = parseInt(maps.properties['PDSELECTEDAL3']) + parseInt(newProp['PDSELECTEDAL3']);
                        maps.properties['PDSELECTEDAL4'] = parseInt(maps.properties['PDSELECTEDAL4']) + parseInt(newProp['PDSELECTEDAL4']);
                        maps.properties['PDSELECTEDAL5'] = parseInt(maps.properties['PDSELECTEDAL5']) + parseInt(newProp['PDSELECTEDAL5']);
                    } else {
                        maps.properties['PDSELECTEDML'] = parseInt(newProp['PDSELECTEDML']);
                        maps.properties['PDSELECTEDAL2'] = parseInt(newProp['PDSELECTEDAL2']);
                        maps.properties['PDSELECTEDAL3'] = parseInt(newProp['PDSELECTEDAL3']);
                        maps.properties['PDSELECTEDAL4'] = parseInt(newProp['PDSELECTEDAL4']);
                        maps.properties['PDSELECTEDAL5'] = parseInt(newProp['PDSELECTEDAL5']);

                        if (maps.coverageCode != coverageList[i].coverageCd) {
                            maps.properties['PDSELECTEDMLCOMBINE'] = parseInt(maps.properties['PDSELECTEDMLCOMBINE']) + parseInt(newProp['PDSELECTEDML']);
                        }
                    }
                } else {
                    maps.properties['PDSELECTEDML'] = parseInt(newProp['PDSELECTEDML']);
                    maps.properties['PDSELECTEDAL2'] = parseInt(newProp['PDSELECTEDAL2']);
                    maps.properties['PDSELECTEDAL3'] = parseInt(newProp['PDSELECTEDAL3']);
                    maps.properties['PDSELECTEDAL4'] = parseInt(newProp['PDSELECTEDAL4']);
                    maps.properties['PDSELECTEDAL5'] = parseInt(newProp['PDSELECTEDAL5']);
                }

                maps.properties['PDPREMI'] = parseInt(maps.properties['PDPREMI']) + parseInt(newProp['PDPREMI']);
            }
        }
        coverageCount++;
    }
    return coverageGroupList;
}

 function getRuleValidation(mainCoverage, mapOutputCoverage, itemList, manfaatList, isAlterProcess, manfaatListObsolete, param) {
    var itemCategory = 'New Business';
    var objRMINPLAN = {
        "1000000": "FRML_MAX_PLAN_01",
        "1500000": "FRML_MAX_PLAN_02",
        "2000000": "FRML_MAX_PLAN_03",
        "4000000": "FRML_MAX_PLAN_04",
        "6000000": "FRML_MAX_PLAN_05",
        "8000000": "FRML_MAX_PLAN_06"
    };
    var ruleList = [];
    var keyTertanggungAge;
    var isCoverageGroup = false;
    for (var i = 0; i < itemList.length; i++) {
        var itemRuleList = [];
        
        if (itemList[i].itemType === 'COVERAGE_GROUP' ||
            itemList[i].itemType === 'Coverage Group' ||
            itemList[i].itemType === 'Coverage_Group') {
            itemRuleList = rootScope.COVERAGE_GROUP[itemList[i].itemCd].RULE;
            itemRuleList = itemRuleList.filter(function (item) {
                return (item.category == itemCategory || item.category == 'Both');
            });
            isCoverageGroup = true;
        } else {
            itemRuleList = rootScope.COVERAGE[itemList[i].itemCd].RULE;
            itemRuleList = itemRuleList.filter(function (item) {
                return (item.category == itemCategory || item.category == 'Both');
            });
            isCoverageGroup = false;
        }
        
        var negateNextRulePerSequence = false;
        itemRuleList.sort(function (a, b) {
            return a.sequence - b.sequence;
        });
        for (var j = 0; j < itemRuleList.length; j++) {
            var itemRule = itemRuleList[j];
            var exec = false;
            var cov;
            var mainCov;
        
            mainCov = itemRule.mainCoverage;
            cov = itemRule.itemCd;

            var arrMainCov = [];
            var toSplitMainCov = itemRule.mainCoverage ? itemRule.mainCoverage : "";
            arrMainCov = toSplitMainCov.split(',');

            //trim string array
            arrMainCov = arrMainCov.map(function (el) {
                return el.trim();
            });

            var mainCovSplit;

            if (itemRule != undefined && itemRule.ruleCd == 'MAXMINLIFE_GIO') {
                itemRule.errorType = 'WARNING';
            }

            if (arrMainCov.length != 0) {
                for (var mc in arrMainCov) {
                    if (arrMainCov[mc] == mainCoverage) {
                        mainCovSplit = arrMainCov[mc];
                        break;
                    }
                }
            }

            if (mainCovSplit == mainCoverage) { }

            if (isCoverageGroup) {
                if (itemRule.mainCoverage) {
                    if ((itemRule.mainCoverage == '' && itemRule.itemCd == mainCoverage) || itemRule.mainCoverage.indexOf(mainCoverage) !== -1) {
                        exec = true;
                    }
                } else {
                    if (itemRule.itemCd == mainCoverage) {
                        exec = true;
                    }

                }
                mainCovSplit = null;
                arrMainCov = null;
            } else {
                if (itemRule.mainCoverage) {
                    if ((mainCov == '' && cov == mainCoverage) || mainCovSplit == mainCoverage) {
                        exec = true;
                    }
                } else {
                    if (itemRule.itemCd == mainCoverage) {
                        exec = true;
                    }

                }
                mainCovSplit = null;
                arrMainCov = null;
            }

            if (exec) {
                var isCusAge = false;
                //writeToConsole('___________________________RULE PROCESS______________________________________');
                keyTertanggungAge = itemList[i].keyTertanggungAge;
                var tmpRule = rootScope.RULE[itemRule.ruleCd + '|' + cov];
                if (tmpRule) {
                    var mapProperties = itemList[i].properties;
                    var keyValue = tmpRule.keyType.toLowerCase().trim();
                    var keyCode = tmpRule.code;
                    var key = tmpRule.key; //+'0'+keyTertanggung;
                    var inputValue = 0;
                    var valueRMinPlan = 0;
                    var frmlRMinPlan;

                    if (keyValue === "customer" || keyValue === "coverage") {
                        if (key == 'CUSTAGE') {
                            inputValue = mapProperties[keyTertanggungAge] ? mapProperties[keyTertanggungAge] : 0;
                            isCusAge = true;
                        } else {
                            if (itemRule.itemCd.match(/H1X.*/) && itemRule.ruleCd.match(/R_MIN_PLAN.*/)) {
                                valueRMinPlan = Number(mapProperties[key]).toFixed(0);
                                frmlRMinPlan = valueRMinPlan ? objRMINPLAN[valueRMinPlan] : 0;
                                if (itemRule.value != frmlRMinPlan) {
                                    continue;
                                }
                            }
                            if (key === 'PDSA' || key === 'PDSASUM') {
                                if (!mapProperties[key + '_' + itemList[i].itemCd]) {
                                    inputValue = mapProperties[key] ? mapProperties[key] : 0;
                                } else {
                                    inputValue = mapProperties[key + '_' + itemList[i].itemCd] ? mapProperties[key + '_' + itemList[i].itemCd] : 0;
                                }

                            } else if (key === 'PDPREMI') {
                                if (!mapProperties[key + '_' + itemList[i].itemCd]) {
                                    // key = 'CUSTSAVER';
                                    inputValue = mapProperties[key] ? mapProperties[key] : 0;
                                } else {
                                    inputValue = mapProperties[key + '_' + itemList[i].itemCd] ? mapProperties[key + '_' + itemList[i].itemCd] : 0;
                                }
                            } else if(key === 'CUSTTOPUP'){
                                if(keyCode == 'MAXTOPUP'){
                                    inputValue = mapProperties['CUSTTOPUP_MAX'];
                                }else if(keyCode == 'MINTOPUP'){
                                    inputValue = mapProperties['CUSTTOPUP_MIN'];
                                }else{
                                    inputValue = mapProperties['CUSTTOPUP_MIN'];
                                }
                            } else if(key === 'CUSTWITHDRAW'){
                                inputValue = mapProperties['CUSTWITHDRAW_MIN'];
                            } else {
                                inputValue = mapProperties[key] ? mapProperties[key] : 0;
                            }
                        }

                    } else if (keyValue === "formula") {
                        if (mapOutputCoverage[key + "_" + itemList[i].itemCd] != undefined) {
                            inputValue = mapOutputCoverage[key + "_" + itemList[i].itemCd] ? mapOutputCoverage[key + "_" + itemList[i].itemCd] : 0;                           
                        } else {
                            inputValue = mapOutputCoverage[key] ? mapOutputCoverage[key] : 0;
                        }
                    }

                    var value2;
                    if (itemRule.type.toLowerCase() === 'logic') {
                        value2 = formulaRule(itemList[i].itemCd, itemRule.value, mapProperties, mapOutputCoverage, param);
                    } else if (itemRule.type.toLowerCase() === 'obsolete') {

                        if (manfaatListObsolete.length > 0) {
                            for (var obs = 0; obs < manfaatListObsolete.length; obs++) {
                                if (itemRule.value.indexOf(manfaatListObsolete[obs].code) !== -1) {
                                    value2 = 1;
                                    break;
                                } else {
                                    value2 = 0;
                                }
                            }
                        } else {
                            value2 = 0;
                        }

                        inputValue = 1;

                    } else {
                        value2 = itemRule.value;
                    }

                    var ruleValue;

                    if (itemRule.itemCd == 'H1VR' || itemRule.ruleCd == 'MINSA') {
                        ruleValue = Math.floor(value2);
                    } else if (itemRule.itemCd.match(/H1X.*/) && itemRule.ruleCd.match(/R_MIN_PLAN.*/)) {
                        if (Math.floor(value2) <= 0) {
                            continue;
                        }
                    } else {
                        ruleValue = value2;
                    }
                    var roundFixInput = Number(inputValue).toFixed(2);
                    var inputValue2 = tmpCurr == "IDR" ? Math.round(roundFixInput) : parseFloat(roundFixInput);
                    var comparisson = getComparissonValue(inputValue2, tmpRule.operator, ruleValue);

                    if (inputValue >= 10 && itemRule.ruleCd == 'R_PLAN') {
                        comparisson = false;
                    }

                    var comparisson = getComparissonValue(inputValue2, tmpRule.operator, ruleValue);

                    if ((tmpRule.ruleTypeCd == 'ADDLIFE1AGE' && keyTertanggungAge == 'CUSTAGE03') ||
                        (tmpRule.ruleTypeCd == 'ADDLIFE2AGE' && keyTertanggungAge == 'CUSTAGE02') ||
                        (key == 'COVTERM_WAIVER01' && tmpRule.keyTertanggungAge == 'CUSTAGE03') ||
                        (key == 'COVTERM_WAIVER02' && tmpRule.keyTertanggungAge == 'CUSTAGE02')) {
                    } else {
                        if (comparisson == true) {
                            var resultMap = {
                                coverageCd: itemRule.itemCd,
                                ruleCd: tmpRule.code,
                                ruleTypeCd: tmpRule.ruleTypeCd,
                                key: tmpRule.key,
                                keyType: tmpRule.keyType,
                                operator: tmpRule.operator,
                                type: itemRule.type,
                                value: ruleValue,
                                isCoverageGroup: isCoverageGroup,
                                sequence: parseInt(itemRule.sequence),
                                errorType: itemRule.errorType,
                                errorMessageInd: itemRule.errorMessageInd,
                                errorMessageEng: itemRule.errorMessageEng,
                                sumAssured: itemList[i].properties['PDSA'],
                                comparisson: comparisson,
                                ruleShowType: tmpRule.ruleShowType
                            };
                            ruleList.push(resultMap);
                        }
                    }
                }
                tmpRule = null;
            }
            keyTertanggungAge = null;
            if (itemRule.negateNextRule != undefined && itemRule.negateNextRule && comparisson) {
                if (itemRuleList[j + 1] != undefined && itemRuleList[j + 1].sequence == itemRule.sequence) {
                    negateNextRulePerSequence = true;
                } else {
                    break;
                }
            } else if (negateNextRulePerSequence && itemRuleList[j + 1] != undefined && itemRuleList[j + 1].sequence != itemRule.sequence) {
                break;
            }
        }
    }
    return ruleList.filter(function (a) {
        var key = a.ruleCd;
        var cvrgCd = a.coverageCd;
        var type = a.type;
        if (!this[key + cvrgCd + type]) {
            this[key + cvrgCd + type] = true;
            return true;
        }
    }, Object.create(null));
}

function getRateFromDB(coverageCdList, _callback) {
    rootScope.RATE = rootScope.RATEDETAIL;
    _callback();
}

function formulaPrecalculate(obj, param, map, mapOutputCoverage, mapResultFormula) {
    var frml = rootScope.FORMULA[obj.formulaCd];
    var stringFormula = '';
    var stringFormulaAlt = '';
    var stringFormulaOri = '';
    var result = 0;
    var resultAlternativeAsumtion = 0;
    var value;

    if (frml) {
        var forElmList = frml.FORMULA_ELEMENT;
        for (var i = 0; i < forElmList.length; i++) {
            var fe = forElmList[i];
            stringFormulaOri += fe.value;
            if (fe.type.toLowerCase().trim() === "customer" ||
                fe.type.toLowerCase().trim() === "coverage" ||
                fe.type.toLowerCase().trim() === "rate" ||
                fe.type.toLowerCase().trim() === "fund" ||
                fe.type.toLowerCase().trim() === "product" ||
                fe.type.toLowerCase().trim() === "allocation") {
                stringFormula += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
            } else if (fe.type.toLowerCase().trim() === "load") {
                stringFormula += obj.itemSelected.loadMap[fe.value] ? obj.itemSelected.loadMap[fe.value] : '0.0';
            } else if (fe.type.toLowerCase().trim() === "formula") {
                if(fe.value.toUpperCase() === 'INCOMECUST'){
                    stringFormula += "\'" + mapOutputCoverage[fe.value] + "\'";
                    // stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_CLIENT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                    stringFormula += param[fe.value.toUpperCase() + 'CLIENT'] ? param[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                    // stringFormulaAlt += param[fe.value.toUpperCase() + 'CLIENT'] ? param[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_ALT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                    stringFormula += param[fe.value.toUpperCase() + 'ALT'] ? param[fe.value.toUpperCase() + 'ALT'] : '0.0';
                    // stringFormulaAlt += param[fe.value.toUpperCase() + 'ALT'] ? param[fe.value.toUpperCase() + 'ALT'] : '0.0';
                } else {
                    stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                }
            } else if (fe.type.toLowerCase().trim() === "string") {
                stringFormula += "\'" + fe.value + "\'";
            } else {
                stringFormula += fe.value;
            }
        }

        if (isValidExpression(stringFormula)) {
            result = getResultExpression(stringFormula);
            resultAlternativeAsumtion = getResultExpression(stringFormulaAlt);

            //for development purpose only, comment if you wanna build APK
            parseToLogFile.parseToLogFile(param, obj, obj, stringFormulaOri, stringFormula, stringFormulaAlt, 
                'in function FORMULA PRECALCULATE', result, resultAlternativeAsumtion, obj, 'nonPph');
            
            if ('RIDERPREMIUM' == frml.formulaTypeCd && obj.output == 'TOTALRIDERPREMIUM') {
                if (map["PREVIOUSRIDERCODE"] == obj.itemSelected.code && map["PREVIOUSCUSTOMERKEY"] == obj.itemSelected.tertanggungKey) {
                    map["PDPREMI"] = map["PDPREMI"] + result;
                } else {
                    map["PDPREMI"] = result;
                }
                map["PREVIOUSRIDERCODE"] = obj.itemSelected.code;
                map["PREVIOUSCUSTOMERKEY"] = obj.itemSelected.tertanggungKey;
                mapResultFormula.riderPremium = result;
            }

            if (obj.output) {
                value = mapOutputCoverage[obj.output];
                if (value) {
                    value = (value + result);
                    mapOutputCoverage[obj.output] = value;
                    param[obj.output] = value;
                } else {
                    mapOutputCoverage[obj.output] = result;
                    param[obj.output] = result;
                }
            }

            if(obj.output == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_CLIENT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')){
                param[obj.output+'CLIENT'] = result;
            }

            if(obj.output == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_ALT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')){
                param[obj.output+'ALT'] = result;
            }

            // if(obj.output){						
            //     value = mapOutputCoverage[obj.output];
            //     if(value){
            //         value = (value + result) ;
            //         mapOutputCoverage[obj.output] = value;
            //     }else{
            //         mapOutputCoverage[obj.output] = result;
            //     }	
            // }
        }
    }
}

function formulaPrecalculateALT(obj, param, map, mapOutputCoverage) {
    var frml = rootScope.FORMULA[obj.formulaCd];
    var stringFormula = '';
    var stringFormulaAlt = '';
    var stringFormulaOri = '';
    var result = 0;
    var resultAlternativeAsumtion = 0;
    var value;
    if (frml) {
        var forElmList = frml.FORMULA_ELEMENT;

        for (var i = 0; i < forElmList.length; i++) {
            var fe = forElmList[i];
            stringFormulaOri += fe.value;
            if (fe.type.toLowerCase().trim() === "customer"
                || fe.type.toLowerCase().trim() === "coverage"
                || fe.type.toLowerCase().trim() === "rate"
                || fe.type.toLowerCase().trim() === "load"
                || fe.type.toLowerCase().trim() === "fund"
                || fe.type.toLowerCase().trim() === "product"
                || fe.type.toLowerCase().trim() === "allocation") {

                    stringFormula += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                    stringFormulaAlt += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
            } else if (fe.type.toLowerCase().trim() === "formula") {
                if(fe.value.toUpperCase() === 'INCOMECUST'){
                    stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                    stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                    stringFormula += "\'" + map[fe.value] + "\'";
                    stringFormulaAlt += "\'" + map[fe.value] + "\'";
                } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                    stringFormula += param['DIFFLVPREMI_O'] ? param['DIFFLVPREMI_O'] : '0.0';
                    stringFormulaAlt += param['DIFFLVPREMI_O'] ? param['DIFFLVPREMI_O'] : '0.0';
                } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_CLIENT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                    stringFormula += param[fe.value.toUpperCase() + 'CLIENT'] ? param[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                    stringFormulaAlt += param[fe.value.toUpperCase() + 'CLIENT'] ? param[fe.value.toUpperCase() + 'CLIENT'] : '0.0';
                } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_ALT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                    stringFormula += param[fe.value.toUpperCase() + 'ALT'] ? param[fe.value.toUpperCase() + 'ALT'] : '0.0';
                    stringFormulaAlt += param[fe.value.toUpperCase() + 'ALT'] ? param[fe.value.toUpperCase() + 'ALT'] : '0.0';
                } else {
                    stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                    stringFormulaAlt += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                }

            } else if (fe.type.toLowerCase().trim() === "string") {
                stringFormula += "\'" + fe.value + "\'";
                stringFormulaAlt += "\'" + fe.value + "\'";
            } else {
                stringFormula += fe.value;
                stringFormulaAlt += fe.value;
            }
        }

        if (isValidExpression(stringFormula)) {
            result = getResultExpression(stringFormula);
            resultAlternativeAsumtion = getResultExpression(stringFormulaAlt);

            if (obj.output == 'MAXLVPREMI') {
                map['MAXLVPREMI'] = result;
            }

            //for development purpose only, comment if you wanna build APK
            parseToLogFile.parseToLogFile(param, obj, obj, stringFormulaOri, stringFormula, stringFormulaAlt, 
                'in function FORMULA formulaPrecalculateALT', result, resultAlternativeAsumtion, obj, 'nonPph');

            if (obj.output == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_CLIENT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                param[obj.output + 'CLIENT'] = result;
            }

            if (obj.output == 'TOTALPREMIUMWITHACCPREMIUMLBDB' && (obj.formulaCd == 'FRML_TOT_PREMIUM_LB_ALT_PRECALCULATED' || obj.formulaCd == 'FRML_TOT_PREMIUM_PRECALCULATED')) {
                param[obj.output + 'ALT'] = result;

            }

            if (obj.output) {
                value = mapOutputCoverage[obj.output];
                if (value) {
                    value = (value + result);
                    mapOutputCoverage[obj.output] = value;
                } else {
                    mapOutputCoverage[obj.output] = result;
                }
            }

        }
    }

}

function generateOutputFIA(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;
    var tmpListOutput = [];

    if (param.currCd == 'USD') {
        divider = 1;
    }

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        var tmpTopupList = 0;
        var tmpWithdrawalList = 0;
      
        for (var d = 0; d < param.topupList.length; d++) {
            var tmpTopup = param.topupList[d];
            if (tmpTopup.year == year) {
                tmpTopupList = tmpTopup.amount;
                break;
            }
        }
    
        for (var d = 0; d < param.withdrawalList.length; d++) {
            var tmpWithdrawal = param.withdrawalList[d];
            if (tmpWithdrawal.year == year) {
                tmpWithdrawalList = tmpWithdrawal.amount;
                break;
            }
        }
    
        var mapFundNLG = mapItemCd.mapFundNLG;
    
        //ASUMTION CLIENT TOTAL FUND
        var tmpCVLowClient = mapFundNLG['TOTALCVLOWDISPLAY'] / divider;
        var tmpCVMedClient = mapFundNLG['TOTALCVMEDDISPLAY'] / divider;
        var tmpCVHighClient = mapFundNLG['TOTALCVHIGHDISPLAY'] / divider;
    
        //ASUMTION CLIENT TOTAL DEATH BENEFIT
        tmpDBLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY']/ divider;
        tmpDBMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY']/ divider;
        tmpDBHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY']/ divider;
        
        tmpTotalDB = mapFundNLG['TOTALDEATHBENEFIT'];    

        if (param.currCd == 'IDR') {
            tmpCVLowClient = Math.round(tmpCVLowClient).toFixed(0);;
            tmpCVMedClient = Math.round(tmpCVMedClient).toFixed(0);;
            tmpCVHighClient = Math.round(tmpCVHighClient).toFixed(0);;
            tmpDBLowClient = (tmpCVLowClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVLowClient)+(tmpTotalDB/divider))).toFixed(0);
            tmpDBMedClient = (tmpCVMedClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVMedClient)+(tmpTotalDB/divider))).toFixed(0);
            tmpDBHighClient = (tmpCVHighClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVHighClient)+(tmpTotalDB/divider))).toFixed(0);
        } else{
            tmpCVLowClient = parseFloat(tmpCVLowClient).toFixed(2);
            tmpCVMedClient = parseFloat(tmpCVMedClient).toFixed(2);
            tmpCVHighClient = parseFloat(tmpCVHighClient).toFixed(2);
            tmpDBLowClient = (tmpCVLowClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVLowClient)+(tmpTotalDB/divider))).toFixed(2);
            tmpDBMedClient = (tmpCVMedClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVMedClient)+(tmpTotalDB/divider))).toFixed(2);
            tmpDBHighClient = (tmpCVHighClient <= 0 ? 0 : parseFloat(parseFloat(tmpCVHighClient)+(tmpTotalDB/divider))).toFixed(2);
        }
    
        var objGabFundAndDeathBenefit = {
            year: (year).toString(),
            customerAge: (mapItemCd.ageCustomer).toString(),
            cvLowClient: tmpCVLowClient,
            cvMedClient: tmpCVMedClient,
            cvHighClient: tmpCVHighClient,
            dbLowClient: tmpDBLowClient,
            dbMedClient: tmpDBMedClient,
            dbHighClient: tmpDBHighClient,
            topup: tmpTopupList ? parseInt(tmpTopupList) : 0,
            withdrawal: tmpWithdrawalList ? parseInt(tmpWithdrawalList) : 0
        };

        tmpListOutput.push(objGabFundAndDeathBenefit);
    
        // tmpListOutput = [];
        // tmpListOutput = newOutput['CASHVALUE'];
        // if (tmpListOutput && year <= 40 && year >=1) {
        //     tmpListOutput.push(objGabFundAndDeathBenefit);
        //     newOutput['CASHVALUE'] = tmpListOutput;
        // } else if (year <= 40 && year >=1){
        //     tmpListOutput = [];
        //     tmpListOutput.push(objGabFundAndDeathBenefit);
        //     newOutput['CASHVALUE'] = tmpListOutput;
        // }
    }

    newOutput['CASHVALUE'] = tmpListOutput;
    newOutput['SARIDER'] = param.SARIDER;
    // newOutput.RULEFORFUND = result.rule[0]?result.rule[0]:[];
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;
    newOutput['isGio'] = mapOutput[1].isGio;
    newOutput['GIOCODE'] = mapOutput[1].mapGIO;    
    return newOutput;
}

function getComparissonValue(value1, operator, value2) {
    var isValidation = false;
    switch (operator) {
        case "<":
            isValidation = value1 < value2;
            break;
        case ">":
            isValidation = value1 > value2;
            break;
        case "==":
            isValidation = value1 == value2;
            break;
        case "!=":
            isValidation = value1 != value2;
            break;
        case "<=":
            isValidation: value1 <= value2;
            break;
        case ">=":
            isValidation = value1 >= value2;
            break;
        case "=":
            isValidation = value1 == value2;
            break;
        default:
            isValidation = false;
            break;
    }
    return isValidation;
}

function formulaRule(itemCd, formulaCd, map, mapOutputCoverage, paramMap) {
    var frml = rootScope.FORMULA[formulaCd];
    var stringFormula = '';
    var stringFormulaOri = '';
    var result = 0;

    if (frml) {
        var forElmList = frml.FORMULA_ELEMENT;
        for (var i = 0; i < forElmList.length; i++) {
            var fe = forElmList[i];
            stringFormulaOri += fe.value;
            if (fe.type.toLowerCase().trim() === "customer" ||
                fe.type.toLowerCase().trim() === "coverage" ||
                fe.type.toLowerCase().trim() === "rate" ||
                fe.type.toLowerCase().trim() === "load" ||
                fe.type.toLowerCase().trim() === "fund" ||
                fe.type.toLowerCase().trim() === "product" ||
                fe.type.toLowerCase().trim() === "allocation") {
                if(fe.value.toUpperCase() === 'CUSTTOPUP'){
                    stringFormula += map['CUSTTOPUP_MIN'] ? map['CUSTTOPUP_MIN'] : '0.0';
                }else if(fe.value.toUpperCase() === 'CUSTWITHDRAW'){
                    stringFormula += map['CUSTWITHDRAW_MIN'] ? map['CUSTWITHDRAW_MIN'] : '0.0';
                }else{
                    stringFormula += map[fe.value] ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                }                
            } else if (fe.type.toLowerCase().trim() === "formula") {
                if(fe.value.toUpperCase() === 'INCOMECUST'){
                    stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";                    
                }else if (fe.value.toUpperCase() == 'TOTALEXTRAPREMIUM') {
                    stringFormula += paramMap['TOTALEXTRAPREMIUM'] ? paramMap['TOTALEXTRAPREMIUM'] : '0.0';
                }else{
                    stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                }
            } else if (fe.type.toLowerCase().trim() === "string") {
                stringFormula += "\'" + fe.value + "\'";
            } else {
                stringFormula += fe.value;
            }
        }

        if (isValidExpression(stringFormula)) {
            result = getResultExpression(stringFormula);
        }
    }
    return result;
}

function getRuleValidationFundAvailable(mainCoverage, mapOutputCoverage, itemList, manfaatList, param) {
    var ruleList = [];
    var keyTertanggungAge;
    var resultMap = {};
    var tempRuleList = [];

    itemList = itemList.filter(function(item) {
        return (item.itemCd != undefined);
    });

    for (var i = 0; i < itemList.length; i++) {
        var itemRuleList = [];

        itemRuleList = rootScope.COVERAGE[itemList[i].itemCd].RULE;

        for (var j = 0; j < itemRuleList.length; j++) {
            var itemRule = itemRuleList[j];
            var exec = false;

            if (itemRule.mainCoverage) {
                if ((itemRule.mainCoverage == '' && itemRule.itemCd == mainCoverage) || itemRule.mainCoverage.indexOf(mainCoverage) !== -1) {
                    exec = true;
                }
            } else {
                if (itemRule.itemCd == mainCoverage) {
                    exec = true;
                }

            }

            if (exec) {
                keyTertanggungAge = itemList[i].keyTertanggungAge;
                var tmpRule = rootScope.RULE[itemRule.ruleCd + '|' + itemRule.itemCd];
                if (tmpRule.key == 'FUNDAVAL' || tmpRule.key == 'WDPLAN' || tmpRule.key == 'TOPUPPLAN') {
                    tmpRule.keyTertanggungAge = keyTertanggungAge;
                    var mapProperties = itemList[i].properties;
                    var keyValue = tmpRule.keyType.toLowerCase().trim();
                    var key = tmpRule.key; //+'0'+keyTertanggung;
                    var inputValue = 0;
                    var custKey;
                    if (keyValue === "customer" || keyValue === "coverage") {
                        if (key == 'CUSTAGE') {
                            inputValue = mapProperties[keyTertanggungAge] ? mapProperties[keyTertanggungAge] : 0;
                        } else {
                            inputValue = mapProperties[key] ? mapProperties[key] : 0;
                        }

                    } else if (keyValue === "formula") {
                        inputValue = mapOutputCoverage[key] ? mapOutputCoverage[key] : 0;
                    } else if (keyValue === "formulafund") {
                        inputValue = mapOutputCoverage[key] ? mapOutputCoverage[key] : 0;
                        
                    }

                    var value2 = itemRule.type.toLowerCase() === 'logic' ? formulaRule(itemList[i].itemCd, itemRule.value, mapProperties, mapOutputCoverage, param) : itemRule.value;
                    var ruleValue;
                    if (itemRule.itemCd == 'H1VR') {
                        ruleValue = Math.floor(value2);
                    } else {
                        ruleValue = value2;
                    }
                    var roundFixInput = Number(inputValue).toFixed(2);
                    var inputValue2 = Math.round(roundFixInput);
                    ruleValue = Math.round(Number(ruleValue).toFixed(2));
                    var comparisson = getComparissonValue(inputValue2, tmpRule.operator, ruleValue);
                    if (comparisson == true) {
                        resultMap = {
                            ruleCd: tmpRule.code,
                            ruleTypeCd: tmpRule.ruleTypeCd,
                            key: tmpRule.key,
                            keyType: tmpRule.keyType,
                            operator: tmpRule.operator,
                            type: itemRule.type,
                            value: ruleValue,
                            errorType: itemRule.errorType,
                            errorMessageInd: itemRule.errorMessageInd,
                            errorMessageEng: itemRule.errorMessageEng,
                            sumAssured: itemList[i].properties['PDSA'],
                            comparisson: comparisson
                        };
                        tempRuleList.push(resultMap);
                    }
                    
                }
            }
        }
    }
    ruleList = tempRuleList;
    return ruleList;
}

function generateOutputBIAMax(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;	

    if (param.currCd == 'USD') {
        divider = 1;
    }

    if(isPPHC === true){
        var outPutPPHC = generateOutputPPHAlt(param, mapOutputMain);
    }

    var tmpLowClient;
    var tmpLowClientSurrCharge;
    var tmpLowClientSurr;

    var tmpDeathClient;

    var tmpMedClient;
    var tmpMedClientSurrCharge;
    var tmpMedClientSurr;

    var tmpHighClient;
    var tmpHighClientSurrCharge;
    var tmpHighClientSurr;

    var tmpLowAlt;
    var tmpLowAltSurr;

    var tmpMedAlt;
    var tmpMedAltSurr;

    var tmpHighAlt;
    var tmpHighAltSurr;

    for (var year in mapOutput) {
        var tmpListOutput = [];
        var tmpTopupList = 0;
        var tmpWithdrawalList = 0;
      
        for (var d = 0; d < param.topupList.length; d++) {
            var tmpTopup = param.topupList[d];
            if (tmpTopup.year == year) {
                tmpTopupList = tmpTopup.amount;
                break;
            }
        }
    
        for (var d = 0; d < param.withdrawalList.length; d++) {
            var tmpWithdrawal = param.withdrawalList[d];
            if (tmpWithdrawal.year == year) {
                tmpWithdrawalList = tmpWithdrawal.amount;
                break;
            }
        }
     
        
        var mapItemCd = mapOutput[year];
        
        var totalPremiumWithAccPremium = param.manfaat.totalPremi != undefined ? param.manfaat.totalPremi : 0;        
        
        var mapItemCd = mapOutput[year];
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt;

        tmpLowClient = mapFundNLG['TOTALCVLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVHIGHDISPLAY'] / divider;

        tmpLowClientSurrCharge = mapFundNLG['CVLOWSURRCHARGES'] / divider;
        tmpMedClientSurrCharge = mapFundNLG['CVMEDSURRCHARGES'] / divider;
        tmpHighClientSurrCharge = mapFundNLG['CVHIGHSURRCHARGES'] / divider;

        tmpLowClientSurr = mapFundNLG['TOTALCVLOWAFTRSURR'] / divider;
        tmpMedClientSurr = mapFundNLG['TOTALCVMEDAFTRSURR'] / divider;
        tmpHighClientSurr = mapFundNLG['TOTALCVHIGHAFTRSURR'] / divider;
        tmpTopupList = Math.round(tmpTopupList)/ divider; 
        tmpWithdrawalList = Math.round(tmpWithdrawalList)/ divider;  


        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowClientSurr = Math.round(tmpLowClientSurr);
            tmpMedClientSurr = Math.round(tmpMedClientSurr);
            tmpHighClientSurr = Math.round(tmpHighClientSurr);
            tmpLowClientSurrCharge = Math.round(tmpLowClientSurrCharge);
            tmpMedClientSurrCharge = Math.round(tmpMedClientSurrCharge);
            tmpHighClientSurrCharge = Math.round(tmpHighClientSurrCharge);
            tmpTopupList = Math.round(tmpTopupList);
            tmpWithdrawalList = Math.round(tmpWithdrawalList);  
        }
        else
        {
            tmpLowClient = tmpLowClient.toFixed(2);
            tmpMedClient = tmpMedClient.toFixed(2);
            tmpHighClient = tmpHighClient.toFixed(2);
            tmpLowClientSurr = tmpLowClientSurr.toFixed(2);
            tmpMedClientSurr = tmpMedClientSurr.toFixed(2);
            tmpHighClientSurr = tmpHighClientSurr.toFixed(2);
            tmpLowClientSurrCharge = tmpLowClientSurrCharge.toFixed(2);
            tmpMedClientSurrCharge = tmpMedClientSurrCharge.toFixed(2);
            tmpHighClientSurrCharge = tmpHighClientSurrCharge.toFixed(2);
            tmpTopupList = tmpTopupList.toFixed(2);
            tmpWithdrawalList = tmpWithdrawalList.toFixed(2);  
        }

        var ObjGabFund = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient : year == 1 ? ((param.manfaat.totalPremi)/divider).toString() : '0',
            lowClient: tmpLowClient,
            lowClientSurrCharge : tmpLowClientSurrCharge,
            lowClientSurr: tmpLowClientSurr,
            medClient: tmpMedClient,
            medClientSurrCharge : tmpMedClientSurrCharge,
            medClientSurr: tmpMedClientSurr,
            highClient: tmpHighClient,
            highClientSurrCharge : tmpHighClientSurrCharge,  
            highClientSurr: tmpHighClientSurr,     
            topup: tmpTopupList,
            withdrawal: tmpWithdrawalList
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }

        tmpLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVDBHIGHDISPLAY'] / divider;
     //   tmpDeathClient = mapFundNLG['TOTALDEATHBENEFITPGB']; 

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
     //       tmpDeathClient = Math.round(tmpDeathClient);
        }
        else
        {
            tmpLowClient = tmpLowClient.toFixed(2);
            tmpMedClient = tmpMedClient.toFixed(2);
            tmpHighClient = tmpHighClient.toFixed(2);
            tmpLowAlt = tmpLowAlt.toFixed(2);
            tmpMedAlt = tmpMedAlt.toFixed(2);
            tmpHighAlt = tmpHighAlt.toFixed(2);
      //      tmpDeathClient = tmpDeathClient.toFixed(2);  
        }

        var ObjGabDeath = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: year == 1 ? ((param.manfaat.totalPremi)/divider).toString() : '',
            lowClient: tmpLowClient,
            medClient: tmpMedClient,
            highClient: tmpHighClient,
            premiAlt : year == 1 ? ((param.manfaat.totalPremi)/divider).toString() : '',
            topup: tmpTopupList ? parseInt(tmpTopupList) : 0,
            withdrawal: tmpWithdrawalList ? parseInt(tmpWithdrawalList) : 0
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['DEATHBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        }

    }
 
    newOutput['CHARGERIDER'] = mapOutput[1].mapChargeRider;
    newOutput['outPutPPHALT'] = outPutPPHC;
    newOutput['isPPH'] = isPPHC;
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    newOutput['isGio'] = mapOutput[1].isGio;
    newOutput['GIOCODE'] = mapOutput[1].mapGIO;

    rootScope.newOutput = newOutput;
    return newOutput;
}

function generateOutputBIA(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;
    var tmpListOutput = [];
    

    if (param.currCd == 'USD') {
        divider = 1;
    }

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        
        var tmpTopupList = 0;
        var tmpWithdrawalList = 0;
      
        for (var d = 0; d < param.topupList.length; d++) {
            var tmpTopup = param.topupList[d];
            if (tmpTopup.year == year) {
                tmpTopupList = tmpTopup.amount;
                break;
            }
        }
    
        for (var d = 0; d < param.withdrawalList.length; d++) {
            var tmpWithdrawal = param.withdrawalList[d];
            if (tmpWithdrawal.year == year) {
                tmpWithdrawalList = tmpWithdrawal.amount;
                break;
            }
        }
    
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt;
    
        //ASUMTION CLIENT TOTAL FUND
        var tmpCVLowClient = mapFundNLG['TOTALCVLOWDISPLAY'] / divider;
        var tmpCVMedClient = mapFundNLG['TOTALCVMEDDISPLAY'] / divider;
        var tmpCVHighClient = mapFundNLG['TOTALCVHIGHDISPLAY'] / divider;
        var tmpCVLowClientAlt = mapFundNLGAlt['TOTALCVLOWDISPLAY'] / divider;
        var tmpCVMedClientAlt = mapFundNLGAlt['TOTALCVMEDDISPLAY'] / divider;
        var tmpCVHighClientAlt = mapFundNLGAlt['TOTALCVHIGHDISPLAY'] / divider;
    
        //ASUMTION CLIENT TOTAL DEATH BENEFIT
        var tmpDBLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY']/ divider;
        var tmpDBMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY']/ divider;
        var tmpDBHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY']/ divider;
        var tmpDBLowClientAlt = mapFundNLGAlt['TOTALCVDBLOWDISPLAY'] / divider;
        var tmpDBMedClientAlt = mapFundNLGAlt['TOTALCVDBMEDDISPLAY'] / divider;
        var tmpDBHighClientAlt = mapFundNLGAlt['TOTALCVDBHIGHDISPLAY'] / divider;
    
        if (param.currCd == 'IDR') {
            tmpCVLowClient = Math.round(tmpCVLowClient).toFixed(0);        
            tmpCVMedClient = Math.round(tmpCVMedClient).toFixed(0);            
            tmpCVHighClient = Math.round(tmpCVHighClient).toFixed(0);
            tmpCVLowClientAlt = Math.round(tmpCVLowClientAlt).toFixed(0);
            tmpCVMedClientAlt = Math.round(tmpCVMedClientAlt).toFixed(0);
            tmpCVHighClientAlt = Math.round(tmpCVHighClientAlt).toFixed(0);
            tmpDBLowClient = (parseFloat(tmpCVLowClient)+(parseFloat(tmpCVLowClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);            
            tmpDBMedClient = (parseFloat(tmpCVMedClient)+(parseFloat(tmpCVMedClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);        
            tmpDBHighClient = (parseFloat(tmpCVHighClient)+(parseFloat(tmpCVHighClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);
            tmpDBLowClientAlt = (parseFloat(tmpCVLowClientAlt)+(parseFloat(tmpCVLowClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);
            tmpDBMedClientAlt = (parseFloat(tmpCVMedClientAlt)+(parseFloat(tmpCVMedClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);
            tmpDBHighClientAlt = (parseFloat(tmpCVHighClientAlt)+(parseFloat(tmpCVHighClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(0);
        } else{
            tmpCVLowClient = Math.round(tmpCVLowClient).toFixed(2);        
            tmpCVMedClient = Math.round(tmpCVMedClient).toFixed(2);            
            tmpCVHighClient = Math.round(tmpCVHighClient).toFixed(2);
            tmpCVLowClientAlt = Math.round(tmpCVLowClientAlt).toFixed(2);
            tmpCVMedClientAlt = Math.round(tmpCVMedClientAlt).toFixed(2);
            tmpCVHighClientAlt = Math.round(tmpCVHighClientAlt).toFixed(2);
            tmpDBLowClient = (parseFloat(tmpCVLowClient)+(parseFloat(tmpCVLowClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);            
            tmpDBMedClient = (parseFloat(tmpCVMedClient)+(parseFloat(tmpCVMedClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);        
            tmpDBHighClient = (parseFloat(tmpCVHighClient)+(parseFloat(tmpCVHighClient) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);
            tmpDBLowClientAlt = (parseFloat(tmpCVLowClientAlt)+(parseFloat(tmpCVLowClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);
            tmpDBMedClientAlt = (parseFloat(tmpCVMedClientAlt)+(parseFloat(tmpCVMedClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);
            tmpDBHighClientAlt = (parseFloat(tmpCVHighClientAlt)+(parseFloat(tmpCVHighClientAlt) <= 0 ? 0 : mapFundNLG['TOTALDEATHBENEFIT'])/divider).toFixed(2);
        }
    
        var objGabFundAndDeathBenefit = null;
        if(param.mainCoverage == "U2KR" || param.mainCoverage == "U2KD")
        {
        
            objGabFundAndDeathBenefit = {
                year: (year).toString(),
                customerAge: (mapItemCd.ageCustomer).toString(),
                cvLowClient: tmpCVLowClient,
                cvMedClient: tmpCVMedClient,
                cvHighClient: tmpCVHighClient, 
                cvLowAlt: tmpCVLowClientAlt,
                cvMedAlt: tmpCVMedClientAlt,
                cvHighAlt: tmpCVHighClientAlt,
                dbLowClient: tmpDBLowClient,
                dbMedClient: tmpDBMedClient,
                dbHighClient: tmpDBHighClient,
                dbLowAlt: tmpDBLowClientAlt,
                dbMedAlt: tmpDBMedClientAlt,
                dbHighAlt: tmpDBHighClientAlt,
                topup: tmpTopupList ? parseInt(tmpTopupList) : 0,
                withdrawal: tmpWithdrawalList ? parseInt(tmpWithdrawalList) : 0
            };
        }
        else
        {
            objGabFundAndDeathBenefit = {
                year: (year).toString(),
                customerAge: (mapItemCd.ageCustomer).toString(),
                cvLowClient: tmpCVLowClient,
                cvMedClient: tmpCVMedClient,
                cvHighClient: tmpCVHighClient, 
                dbLowClient: tmpDBLowClient,
                dbMedClient: tmpDBMedClient,
                dbHighClient: tmpDBHighClient,
                topup: tmpTopupList ? parseInt(tmpTopupList) : 0,
                withdrawal: tmpWithdrawalList ? parseInt(tmpWithdrawalList) : 0
            };   
        }

        tmpListOutput.push(objGabFundAndDeathBenefit);
    
        // tmpListOutput = [];
        // tmpListOutput = newOutput['CASHVALUE'];
        // if (tmpListOutput && year <= 40 && year >=1) {
        //     tmpListOutput.push(objGabFundAndDeathBenefit);
        //     newOutput['CASHVALUE'] = tmpListOutput;
        // } else if (year <= 40 && year >=1){
        //     tmpListOutput = [];
        //     tmpListOutput.push(objGabFundAndDeathBenefit);
        //     newOutput['CASHVALUE'] = tmpListOutput;
        // }
    }

    newOutput['CASHVALUE'] = tmpListOutput;
    newOutput['SARIDER'] = param.SARIDER;
    newOutput['isGio'] = mapOutput[1].isGio;
    newOutput['GIOCODE'] = mapOutput[1].mapGIO;
    // newOutput.RULEFORFUND = result.rule[0]?result.rule[0]:[];
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    return newOutput;
}

function getMaxLvlPremiPPH(param, mapProperties, ITEM, itemSelected) {
    var tempListRateCd = ITEM.CHANNEL[param.channelCode];
    setMapCustAgeWhenNotAdditionalLife(mapProperties, itemSelected);
    ITEM.keyTertanggungAge = 'CUSTAGE' + '0' + (itemSelected.tertanggungKey-1);
    inquireRateValByParameter(tempListRateCd, itemSelected, param, mapProperties, false, true);
}

function setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, isFIA, isBIA, isBIAMax, ITEM) {
    if ('ALLOCATEDPREMIUM' == formula.formulaTypeCd && (isFIA || isBIA || isBIAMax) && paramMap.year > 1) {
        result = 0;
    } else if (!flag && 'ALLOCATEDPREMIUM' == formula.formulaTypeCd) {
        result = 0;
    } else if ((paramMap.year == 11 || paramMap.year == 16) && 'WITHDRAWALLOWTOTAL' == formula.formulaTypeCd) {
        paramMap['WITHDRAWALLOWTOTAL'+ITEM.code] = 0;
        paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code] = 0;
    } else if ((paramMap.year == 11 || paramMap.year == 16) && 'WITHDRAWALMEDTOTAL' == formula.formulaTypeCd) {
        paramMap['WITHDRAWALMEDTOTAL'+ITEM.code] = 0;
        paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code] = 0;
    } else if ((paramMap.year == 11 || paramMap.year == 16) && 'WITHDRAWALHIGHTOTAL' == formula.formulaTypeCd) {
        paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code] = 0;
        paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code] = 0;
    }

    return result;
}

function setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion) {
    if (formula.formulaTypeCd.indexOf('_CLIENT') != -1) {
        paramMap[tmpFormula.output + 'CLIENT'] = result;
    } else if (formula.formulaTypeCd.indexOf('_ALT') != -1){
        paramMap[tmpFormula.output + 'ALT'] = resultAlternativeAsumtion;
    }
}

function setStringFormulaForFormulaBasicByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt,
    paramMap, ITEM, mapOutputFund, mapOutputFundAlt) {

    if(paramMap.prodCd.toUpperCase() == 'U4K' || paramMap.prodCd.toUpperCase() == 'U2Z'){
        if(mapOutputFund[ITEM.code] != undefined && mapOutputFund[ITEM.code][fe.value + ITEM.code] != undefined){
            stringFormula += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFund);
            stringFormulaAlt += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFundAlt);
        }else{
            stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
            stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);    
        }        
    }else{
        stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
        stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
    }    

    return {
        stringFormula: stringFormula,
        stringFormulaAlt: stringFormulaAlt
    };
}

function generateOutputPSC(param, mapOutputMain, result) {
    var mapOutput = mapOutputMain.mapOutputMain;
    var newOutput = {};
    var divider = 1000;

    if (param.currCd == 'USD') {
        divider = 1;
    }

    // if(isPPHC === true){
    //     var outPutPPHC = generateOutputPPHAlt(param, mapOutputMain);
    // }

    var tmpLowClient;
    var tmpLowClientSurr;

    var tmpDeathClient;

    var tmpMedClient;
    var tmpMedClientSurr;

    var tmpHighClient;
    var tmpHighClientSurr;

    var tmpLowAlt;
    var tmpLowAltSurr;

    var tmpMedAlt;
    var tmpMedAltSurr;

    var tmpHighAlt;
    var tmpHighAltSurr;

    for (var year in mapOutput) {
        var mapItemCd = mapOutput[year];
        var mapFundNLG = mapItemCd.mapFundNLG;
        var mapFundNLGAlt = mapItemCd.mapFundNLGAlt

        tmpLowClient = mapFundNLG['TOTALCVLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVHIGHDISPLAY'] / divider;
        tmpLowClientSurr = mapFundNLG['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedClientSurr = mapFundNLG['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighClientSurr = mapFundNLG['TOTALCVHIGHFUNDDSPLY'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVLOWDISPLAY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVMEDDISPLAY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVHIGHDISPLAY'] / divider;
        tmpLowAltSurr = mapFundNLGAlt['TOTALCVLOWFUNDDSPLY'] / divider;
        tmpMedAltSurr = mapFundNLGAlt['TOTALCVMEDFUNDDSPLY'] / divider;
        tmpHighAltSurr = mapFundNLGAlt['TOTALCVHIGHFUNDDSPLY'] / divider;

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowClientSurr = Math.round(tmpLowClientSurr);
            tmpMedClientSurr = Math.round(tmpMedClientSurr);
            tmpHighClientSurr = Math.round(tmpHighClientSurr);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpLowAltSurr = Math.round(tmpLowAltSurr);
            tmpMedAltSurr = Math.round(tmpMedAltSurr);
            tmpHighAltSurr = Math.round(tmpHighAltSurr);
        }

        var ObjGabFund = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / 1000)) : (Math.round((mapItemCd.mapFundNLG.BASICPREMIUM1) / 1000)) : '',
            lowClient: tmpLowClient,
            lowClientSurr: tmpLowClientSurr,
            medClient: tmpMedClient,
            medClientSurr: tmpMedClientSurr,
            highClient: tmpHighClient,
            highClientSurr: tmpHighClientSurr,
            premiAlt: (isPPHC == false) ? (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM1) / 1000)) : (Math.round((mapItemCd.mapFundNLGAlt.BASICPREMIUM2) / 1000)),
            lowAlt: tmpLowAlt,
            lowAltSurr: tmpLowAltSurr,
            medAlt: tmpMedAlt,
            medAltSurr: tmpMedAltSurr,
            highAlt: tmpHighAlt,
            highAltSurr: tmpHighAltSurr,
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['FUNDBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabFund);
            newOutput['FUNDBENEFIT'] = tmpListOutput;
        }

        tmpLowClient = mapFundNLG['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedClient = mapFundNLG['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighClient = mapFundNLG['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpLowAlt = mapFundNLGAlt['TOTALCVDBLOWDISPLAY'] / divider;
        tmpMedAlt = mapFundNLGAlt['TOTALCVDBMEDDISPLAY'] / divider;
        tmpHighAlt = mapFundNLGAlt['TOTALCVDBHIGHDISPLAY'] / divider;
        tmpDeathClient = mapFundNLG['TOTALDEATHBENEFITPGB']; 

        if (param.currCd == 'IDR') {
            tmpLowClient = Math.round(tmpLowClient);
            tmpMedClient = Math.round(tmpMedClient);
            tmpHighClient = Math.round(tmpHighClient);
            tmpLowAlt = Math.round(tmpLowAlt);
            tmpMedAlt = Math.round(tmpMedAlt);
            tmpHighAlt = Math.round(tmpHighAlt);
            tmpDeathClient = Math.round(tmpDeathClient);
        }

        var ObjGabDeath = {
            year: (year),
            customerAge: (mapItemCd.ageCustomer),
            premiClient: parseInt(year) <= parseInt(param.rencanaPembayaran) ? ((param.manfaat.totalPremi) / divider) : '',
            lowClient: tmpLowClient,
            medClient: tmpMedClient,
            highClient: tmpHighClient,
            lowAlt: tmpLowAlt,
            medAlt: tmpMedAlt,
            highAlt: tmpHighAlt,
            premiDeathClient : tmpDeathClient/1000,
        };

        tmpListOutput = [];
        tmpListOutput = newOutput['DEATHBENEFIT'];
        if (tmpListOutput) {
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        } else {
            tmpListOutput = [];
            tmpListOutput.push(ObjGabDeath);
            newOutput['DEATHBENEFIT'] = tmpListOutput;
        }

    }
    newOutput['RULEFORFUND'] = result.rule[0]?result.rule[0]:[];
    // newOutput['RULEFORFUND'] = param.RULEFORFUND;
    newOutput['CHARGERIDER'] = mapOutput[1].mapChargeRider;
    // newOutput['outPutPPHALT'] = outPutPPHC;
    newOutput['isPPH'] = isPPHC;
    newOutput.paymentFrequency = param.paymentFrequency;
    newOutput.premi = param.manfaat.premi;

    rootScope.newOutput = newOutput;
    return newOutput;
}

function setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM){
    if (formula.formulaTypeCd == 'TOTALCVDBLOW') {	   
        paramMap['TOTALCVDBLOW' + paramMap.year] = (result == undefined) ? 0 : result;	
        paramMap['TOTALCVDBLOWALT' + paramMap.year] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVDBMED') {	   
        paramMap['TOTALCVDBMED' + paramMap.year] = (result == undefined) ? 0 : result;	
        paramMap['TOTALCVDBMEDALT' + paramMap.year] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVDBHIGH') {	   
        paramMap['TOTALCVDBHIGH' + paramMap.year] = (result == undefined) ? 0 : result;	
        paramMap['TOTALCVDBHIGHALT' + paramMap.year] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVHIGH') {	   
        paramMap['TOTALCVHIGH' + + paramMap.year + ITEM.code] = (result == undefined) ? 0 : result;	
        paramMap['TOTALCVHIGHALT' + + paramMap.year + ITEM.code] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVMED') {	   
        paramMap['TOTALCVMED' + paramMap.year + ITEM.code] = (result == undefined) ? 0 : result;
        paramMap['TOTALCVMEDALT' + paramMap.year + ITEM.code] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVLOW') {	   
        paramMap['TOTALCVLOW' +  paramMap.year + ITEM.code] = (result == undefined) ? 0 : result;	
        paramMap['TOTALCVLOWALT' +  paramMap.year + ITEM.code] = (resultAlternativeAsumtion) == undefined ? 0 : resultAlternativeAsumtion;     
    } else if (formula.formulaTypeCd == 'TOTALCVPREMILOW') {	
        paramMap['TOTALCVPREMILOW' + paramMap.year] = (paramMap['TOTALCVPREMILOW' + paramMap.year] == undefined ? 0 : paramMap['TOTALCVPREMILOW' + paramMap.year]) + result;	
        paramMap['TOTALCVPREMILOWALT' + paramMap.year] = (paramMap['TOTALCVPREMILOWALT' + paramMap.year] == undefined ? 0 : paramMap['TOTALCVPREMILOWALT' + paramMap.year]) + resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'TOTALCVPREMIMED') {
        paramMap['TOTALCVPREMIMED'+paramMap.year] = (paramMap['TOTALCVPREMIMED'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMED'+paramMap.year])+result;
        paramMap['TOTALCVPREMIMEDALT'+paramMap.year] = (paramMap['TOTALCVPREMIMEDALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'TOTALCVPREMIHIGH') {
        paramMap['TOTALCVPREMIHIGH'+paramMap.year] = (paramMap['TOTALCVPREMIHIGH'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGH'+paramMap.year])+result;
        paramMap['TOTALCVPREMIHIGHALT'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    } 

    else if (formula.formulaTypeCd == 'TOTALCVPREMILOW_PAYOUT') {	
        paramMap['TOTALCVPREMILOW_PAYOUT' + paramMap.year] = (paramMap['TOTALCVPREMILOW_PAYOUT' + paramMap.year] == undefined ? 0 : paramMap['TOTALCVPREMILOW_PAYOUT' + paramMap.year]) + result;	
        
    } 
    
    // else if (formula.formulaTypeCd == 'TOTALCVPREMIMED') {
    //     paramMap['TOTALCVPREMIMED'+paramMap.year] = (paramMap['TOTALCVPREMIMED'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMED'+paramMap.year])+result;
    //     paramMap['TOTALCVPREMIMEDALT'+paramMap.year] = (paramMap['TOTALCVPREMIMEDALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDALT'+paramMap.year])+resultAlternativeAsumtion;
    // } else if (formula.formulaTypeCd == 'TOTALCVPREMIHIGH') {
    //     paramMap['TOTALCVPREMIHIGH'+paramMap.year] = (paramMap['TOTALCVPREMIHIGH'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGH'+paramMap.year])+result;
    //     paramMap['TOTALCVPREMIHIGHALT'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    // } 
    
    else if (formula.formulaTypeCd == 'CVLOWSURRCHARGES' && tmpFormula.output == 'OFF_CVLOWSURRCHARGES') {
        paramMap['OFF_CVLOWSURRCHARGES'+paramMap.year] = (paramMap['OFF_CVLOWSURRCHARGES'+paramMap.year]==undefined?0:paramMap['OFF_CVLOWSURRCHARGES'+paramMap.year])+result;
        paramMap['OFF_CVLOWSURRCHARGESALT'+paramMap.year] = (paramMap['OFF_CVLOWSURRCHARGESALT'+paramMap.year]==undefined?0:paramMap['OFF_CVLOWSURRCHARGESALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'CVMEDSURRCHARGES' && tmpFormula.output == 'OFF_CVMEDSURRCHARGES') {
        paramMap['OFF_CVMEDSURRCHARGES'+paramMap.year] = (paramMap['OFF_CVMEDSURRCHARGES'+paramMap.year]==undefined?0:paramMap['OFF_CVMEDSURRCHARGES'+paramMap.year])+result;
        paramMap['OFF_CVMEDSURRCHARGESALT'+paramMap.year] = (paramMap['OFF_CVMEDSURRCHARGESALT'+paramMap.year]==undefined?0:paramMap['OFF_CVMEDSURRCHARGESALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'CVHIGHSURRCHARGES' && tmpFormula.output == 'OFF_CVHIGHSURRCHARGES') {
        paramMap['OFF_CVHIGHSURRCHARGES'+paramMap.year] = (paramMap['OFF_CVHIGHSURRCHARGES'+paramMap.year]==undefined?0:paramMap['OFF_CVHIGHSURRCHARGES'+paramMap.year])+result;
        paramMap['OFF_CVHIGHSURRCHARGESALT'+paramMap.year] = (paramMap['OFF_CVHIGHSURRCHARGESALT'+paramMap.year]==undefined?0:paramMap['OFF_CVHIGHSURRCHARGESALT'+paramMap.year])+resultAlternativeAsumtion;
    }else if (formula.formulaTypeCd == 'FIFO_SURRENDER_U2Z_LOW' && tmpFormula.output == 'CVLOWSURRCHARGES') {
        paramMap['CVLOWSURRCHARGES'+paramMap.year + ITEM.code] = (paramMap['CVLOWSURRCHARGES'+paramMap.year + ITEM.code]==undefined?0:paramMap['CVLOWSURRCHARGES'+paramMap.year + ITEM.code])+result;        
    }else if (formula.formulaTypeCd == 'FIFO_SURRENDER_U2Z_MED' && tmpFormula.output == 'CVMEDSURRCHARGES') {
        paramMap['CVMEDSURRCHARGES'+paramMap.year + ITEM.code] = (paramMap['CVMEDSURRCHARGES'+paramMap.year + ITEM.code]==undefined?0:paramMap['CVMEDSURRCHARGES'+paramMap.year + ITEM.code])+result;        
    }else if (formula.formulaTypeCd == 'FIFO_SURRENDER_U2Z_HIGH' && tmpFormula.output == 'CVHIGHSURRCHARGES') {
        paramMap['CVHIGHSURRCHARGES'+paramMap.year + ITEM.code] = (paramMap['CVHIGHSURRCHARGES'+paramMap.year + ITEM.code]==undefined?0:paramMap['CVHIGHSURRCHARGES'+paramMap.year + ITEM.code])+result;        
    }else if (formula.formulaTypeCd == 'CVLOWSURRCHARGES') {	        
        paramMap['CVLOWSURRCHARGES' + paramMap.year] = (paramMap['CVLOWSURRCHARGES' + paramMap.year] == undefined ? 0 : paramMap['CVLOWSURRCHARGES' + paramMap.year]) + result;	
        paramMap['CVLOWSURRCHARGESALT' + paramMap.year] = (paramMap['CVLOWSURRCHARGESALT' + paramMap.year] == undefined ? 0 : paramMap['CVLOWSURRCHARGESALT' + paramMap.year]) + resultAlternativeAsumtion;	    
    } else if (formula.formulaTypeCd == 'CVMEDSURRCHARGES') {	
        paramMap['CVMEDSURRCHARGES' + paramMap.year] = (paramMap['CVMEDSURRCHARGES' + paramMap.year] == undefined ? 0 : paramMap['CVMEDSURRCHARGES' + paramMap.year]) + result;	
        paramMap['CVMEDSURRCHARGESALT' + paramMap.year] = (paramMap['CVMEDSURRCHARGESALT' + paramMap.year] == undefined ? 0 : paramMap['CVMEDSURRCHARGESALT' + paramMap.year]) + resultAlternativeAsumtion;	        
    } else if (formula.formulaTypeCd == 'CVHIGHSURRCHARGES') {	                	
        paramMap['CVHIGHSURRCHARGES' + paramMap.year] = (paramMap['CVHIGHSURRCHARGES' + paramMap.year] == undefined ? 0 : paramMap['CVHIGHSURRCHARGES' + paramMap.year]) + result;	
        paramMap['CVHIGHSURRCHARGESALT' + paramMap.year] = (paramMap['CVHIGHSURRCHARGESALT' + paramMap.year] == undefined ? 0 : paramMap['CVHIGHSURRCHARGESALT' + paramMap.year]) + resultAlternativeAsumtion;	        
    }else if(formula.formulaTypeCd == 'CVTOPUPLOW' && tmpFormula.output == 'CVTOPUPLOW'){
        paramMap['TOTALCVTOPUPLOW'+paramMap.year] = (paramMap['TOTALCVTOPUPLOW'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLOW'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPLOWALT'+paramMap.year] = (paramMap['TOTALCVTOPUPLOWALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLOWALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'CVTOPUPMED' && tmpFormula.output == 'CVTOPUPMED'){
        paramMap['TOTALCVTOPUPMED'+paramMap.year] = (paramMap['TOTALCVTOPUPMED'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPMED'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPMEDALT'+paramMap.year] = (paramMap['TOTALCVTOPUPMEDALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPMEDALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'CVTOPUPHIGH' && tmpFormula.output == 'CVTOPUPHIGH'){
        paramMap['TOTALCVTOPUPHIGH'+paramMap.year] = (paramMap['TOTALCVTOPUPHIGH'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPHIGH'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year] = (paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    }  else if(formula.formulaTypeCd == 'TOTALCVTOPUPLOW' && tmpFormula.output == 'CVTOPUPLOW'){
        paramMap['TOTALCVTOPUPLOW'+paramMap.year] = (paramMap['TOTALCVTOPUPLOW'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLOW'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPLOWALT'+paramMap.year] = (paramMap['TOTALCVTOPUPLOWALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLOWALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'TOTALCVTOPUPMED' && tmpFormula.output == 'CVTOPUPMED'){
        paramMap['TOTALCVTOPUPMED'+paramMap.year] = (paramMap['TOTALCVTOPUPMED'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPMED'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPMEDALT'+paramMap.year] = (paramMap['TOTALCVTOPUPMEDALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPMEDALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'TOTALCVTOPUPHIGH' && tmpFormula.output == 'CVTOPUPHIGH'){
        paramMap['TOTALCVTOPUPHIGH'+paramMap.year] = (paramMap['TOTALCVTOPUPHIGH'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPHIGH'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year] = (paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPHIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'WITHDRAWALLOWTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALLOW') {       
        paramMap['WITHDRAWALLOWTOTAL'+ITEM.code] = paramMap['WITHDRAWALLOWTOTAL'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTAL'+ITEM.code] + result;
        paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code] = (paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTALALT'+ITEM.code]) + resultAlternativeAsumtion;              
    } else if (formula.formulaTypeCd == 'WITHDRAWALMEDTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALMED') {
        paramMap['WITHDRAWALMEDTOTAL'+ITEM.code] = paramMap['WITHDRAWALMEDTOTAL'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTAL'+ITEM.code] + result;
        paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code] = (paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTALALT'+ITEM.code]) + resultAlternativeAsumtion;                      
    } else if (formula.formulaTypeCd == 'WITHDRAWALHIGHTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALHIGH') {
        paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code] = paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTAL'+ITEM.code] + result;
        paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code] = (paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTALALT'+ITEM.code]) + resultAlternativeAsumtion;              
    } 
    
    else if (formula.formulaTypeCd == 'WITHDRAWALLOWTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALLOW02') {       
        paramMap['WITHDRAWALTOTALLOW02'] = paramMap['WITHDRAWALTOTALLOW02'] == undefined ? 0 : paramMap['WITHDRAWALTOTALLOW02'] + result;
        paramMap['WITHDRAWALTOTALLOW02ALT'] = (paramMap['WITHDRAWALTOTALLOW02ALT'] == undefined ? 0 : paramMap['WITHDRAWALTOTALLOW02ALT']) + resultAlternativeAsumtion;                  
    }
    
    else if (formula.formulaTypeCd == 'WITHDRAWALMEDTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALMED02') {
        paramMap['WITHDRAWALTOTALMED02'] = paramMap['WITHDRAWALTOTALMED02'] == undefined ? 0 : paramMap['WITHDRAWALTOTALMED02'] + result;
        paramMap['WITHDRAWALTOTALMED02ALT'] = (paramMap['WITHDRAWALTOTALMED02ALT'] == undefined ? 0 : paramMap['WITHDRAWALTOTALMED02ALT']) + resultAlternativeAsumtion;                  
    } else if (formula.formulaTypeCd == 'WITHDRAWALHIGHTOTAL' && tmpFormula.output == 'WITHDRAWALTOTALHIGH02') {
        paramMap['WITHDRAWALTOTALHIGH02'] = paramMap['WITHDRAWALTOTALHIGH02'] == undefined ? 0 : paramMap['WITHDRAWALTOTALHIGH02'] + result;
        paramMap['WITHDRAWALTOTALHIGH02ALT'] = (paramMap['WITHDRAWALTOTALHIGH02ALT'] == undefined ? 0 : paramMap['WITHDRAWALTOTALHIGH02ALT']) + resultAlternativeAsumtion;                  
    } 
        
    else if (formula.formulaTypeCd == 'WITHDRAWALLOWTOTAL01' && tmpFormula.output == 'WITHDRAWALTOTALLOW') {       
        paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code] = (paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTAL01'+ITEM.code]) + result;
        paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code] = (paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTAL01ALT'+ITEM.code]) + resultAlternativeAsumtion;              
    } else if (formula.formulaTypeCd == 'WITHDRAWALMEDTOTAL01' && tmpFormula.output == 'WITHDRAWALTOTALMED') {
        paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code] = (paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTAL01'+ITEM.code]) + result;    
        paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code] = (paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTAL01ALT'+ITEM.code]) + resultAlternativeAsumtion;                      
    } else if (formula.formulaTypeCd == 'WITHDRAWALHIGHTOTAL01' && tmpFormula.output == 'WITHDRAWALTOTALHIGH') {
        paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code] = (paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTAL01'+ITEM.code]) + result;
        paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code] = (paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTAL01ALT'+ITEM.code]) + resultAlternativeAsumtion;              
    } else if(formula.formulaTypeCd == 'WITHDRAWALTOTALLOWAFTR' && tmpFormula.output == 'WITHDRAWALTOTALLOWAFT') {        
        paramMap['WITHDRAWALTOTALLOWAFTR'+paramMap.year] = (paramMap['WITHDRAWALTOTALLOWAFTR'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALLOWAFTR'+paramMap.year]) + result;
        paramMap['WITHDRAWALTOTALLOWAFTRALT'+paramMap.year] = (paramMap['WITHDRAWALTOTALLOWAFTRALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALLOWAFTRALT'+paramMap.year]) + resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'WITHDRAWALTOTALMEDAFTR' && tmpFormula.output == 'WITHDRAWALTOTALMEDAFT') {
        paramMap['WITHDRAWALTOTALMEDAFTR'+paramMap.year] = (paramMap['WITHDRAWALTOTALMEDAFTR'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALMEDAFTR'+paramMap.year]) + result;
        paramMap['WITHDRAWALTOTALMEDAFTRALT'+paramMap.year] = (paramMap['WITHDRAWALTOTALMEDAFTRALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALMEDAFTRALT'+paramMap.year]) + resultAlternativeAsumtion;        
    } else if(formula.formulaTypeCd == 'WITHDRAWALTOTALHIGHAFTR' && tmpFormula.output == 'WITHDRAWALTOTALHIGHAFT') {
        paramMap['WITHDRAWALTOTALHIGHAFTR'+paramMap.year] = (paramMap['WITHDRAWALTOTALHIGHAFTR'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALHIGHAFTR'+paramMap.year]) + result;
        paramMap['WITHDRAWALTOTALHIGHAFTRALT'+paramMap.year] = (paramMap['WITHDRAWALTOTALHIGHAFTRALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALTOTALHIGHAFTRALT'+paramMap.year]) + resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'WITHDRAWALLOWTOTAL02' && tmpFormula.output == 'WITHDRAWALTOTALLOW01') {               
        paramMap['WITHDRAWALLOWTOTAL02'] = (paramMap['WITHDRAWALLOWTOTAL02'] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTAL02']) + result;
        paramMap['WITHDRAWALLOWTOTAL02ALT'] = (paramMap['WITHDRAWALLOWTOTAL02ALT'] == undefined ? 0 : paramMap['WITHDRAWALLOWTOTAL02ALT']) + resultAlternativeAsumtion;                          
    } else if (formula.formulaTypeCd == 'WITHDRAWALMEDTOTAL02' && tmpFormula.output == 'WITHDRAWALTOTALMED01') {        
        paramMap['WITHDRAWALMEDTOTAL02'] = (paramMap['WITHDRAWALMEDTOTAL02'] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTAL02']) + result;
        paramMap['WITHDRAWALMEDTOTAL02ALT'] = (paramMap['WITHDRAWALMEDTOTAL02ALT'] == undefined ? 0 : paramMap['WITHDRAWALMEDTOTAL02ALT']) + resultAlternativeAsumtion;                      
    } else if (formula.formulaTypeCd == 'WITHDRAWALHIGHTOTAL02' && tmpFormula.output == 'WITHDRAWALTOTALHIGH01') {        
        paramMap['WITHDRAWALHIGHTOTAL02'] = (paramMap['WITHDRAWALHIGHTOTAL02'] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTAL02']) + result;
        paramMap['WITHDRAWALHIGHTOTAL02ALT'] = (paramMap['WITHDRAWALHIGHTOTAL02ALT'] == undefined ? 0 : paramMap['WITHDRAWALHIGHTOTAL02ALT']) + resultAlternativeAsumtion;                      
    } else if(formula.formulaTypeCd == 'FT_WITHDRAWALBASICLOWLASTYEAR' && tmpFormula.output == 'WITHDRAWALTOTALLOWLASTYEAR'){        
        paramMap['FT_WITHDRAWALBASICLOWLASTYEAR'+paramMap.year] = result;
        paramMap['FT_WITHDRAWALBASICLOWLASTYEARALT'+paramMap.year] = resultAlternativeAsumtion;         
    } else if(formula.formulaTypeCd == 'FT_WITHDRAWALBASICMEDLASTYEAR' && tmpFormula.output == 'WITHDRAWALTOTALMEDLASTYEAR'){        
        paramMap['FT_WITHDRAWALBASICMEDLASTYEAR'+paramMap.year] = result;
        paramMap['FT_WITHDRAWALBASICMEDLASTYEARALT'+paramMap.year] = resultAlternativeAsumtion;        
    } else if(formula.formulaTypeCd == 'FT_WITHDRAWALBASICHIGHLASTYEAR' && tmpFormula.output == 'WITHDRAWALTOTALHIGHLASTYEAR'){        
        paramMap['FT_WITHDRAWALBASICHIGHLASTYEAR'+paramMap.year] = result;
        paramMap['FT_WITHDRAWALBASICHIGHLASTYEARALT'+paramMap.year] = resultAlternativeAsumtion;        
    } else if(formula.formulaTypeCd == 'WITHDRAWALLOWBASIC' && tmpFormula.output == 'WITHDRAWBASICLOW02') {        
        paramMap['WITHDRAWALLOWBASIC'+paramMap.year] = (paramMap['WITHDRAWALLOWBASIC'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALLOWBASIC'+paramMap.year]) + result;
        paramMap['WITHDRAWALLOWBASICALT'+paramMap.year] = (paramMap['WITHDRAWALLOWBASICALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALLOWBASICALT'+paramMap.year]) + resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'WITHDRAWALMEDBASIC' && tmpFormula.output == 'WITHDRAWBASICMED02') {
        paramMap['WITHDRAWALMEDBASIC'+paramMap.year] = (paramMap['WITHDRAWALMEDBASIC'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALMEDBASIC'+paramMap.year]) + result;
        paramMap['WITHDRAWALMEDBASICALT'+paramMap.year] = (paramMap['WITHDRAWALMEDBASICALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALMEDBASICALT'+paramMap.year]) + resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'WITHDRAWALHIGHBASIC' && tmpFormula.output == 'WITHDRAWBASICHIGH02') {
        paramMap['WITHDRAWALHIGHBASIC'+paramMap.year] = (paramMap['WITHDRAWALHIGHBASIC'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALHIGHBASIC'+paramMap.year]) + result;
        paramMap['WITHDRAWALHIGHBASICALT'+paramMap.year] = (paramMap['WITHDRAWALHIGHBASICALT'+paramMap.year] == undefined ? 0 : paramMap['WITHDRAWALHIGHBASICALT'+paramMap.year]) + resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'CVTOPUPLOWTEMP01' && tmpFormula.output == 'CVTOPUPLOWTEMP'){           
        paramMap['CVTOPUPLOWTEMP01'+paramMap.year] = (paramMap['CVTOPUPLOWTEMP01'+paramMap.year]==undefined?0:paramMap['CVTOPUPLOWTEMP01'+paramMap.year])+result;
        paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year] = (paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year]==undefined?0:paramMap['CVTOPUPLOWTEMP01ALT'+paramMap.year])+resultAlternativeAsumtion;                      
    } else if(formula.formulaTypeCd == 'CVTOPUPMEDTEMP01' && tmpFormula.output == 'CVTOPUPMEDTEMP'){           
        paramMap['CVTOPUPMEDTEMP01'+paramMap.year] = (paramMap['CVTOPUPMEDTEMP01'+paramMap.year]==undefined?0:paramMap['CVTOPUPMEDTEMP01'+paramMap.year])+result;
        paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year] = (paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year]==undefined?0:paramMap['CVTOPUPMEDTEMP01ALT'+paramMap.year])+resultAlternativeAsumtion;                      
    } else if(formula.formulaTypeCd == 'CVTOPUPHIGHTEMP01' && tmpFormula.output == 'CVTOPUPHIGHTEMP'){           
        paramMap['CVTOPUPHIGHTEMP01'+paramMap.year] = (paramMap['CVTOPUPHIGHTEMP01'+paramMap.year]==undefined?0:paramMap['CVTOPUPHIGHTEMP01'+paramMap.year])+result;
        paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year] = (paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year]==undefined?0:paramMap['CVTOPUPHIGHTEMP01ALT'+paramMap.year])+resultAlternativeAsumtion;                      
    } else if (formula.formulaTypeCd == 'TOTALLOYALTYBONUSLOW' && tmpFormula.output == 'TOTALCVPREMILOWLB'){
        paramMap['TOTALCVPREMILOWLB'] = (paramMap['TOTALCVPREMILOWLB']==undefined?0:paramMap['TOTALCVPREMILOWLB'])+result;
        paramMap['TOTALCVPREMILOWLBALT'] = (paramMap['TOTALCVPREMILOWLBALT']==undefined?0:paramMap['TOTALCVPREMILOWLBALT'])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'TOTALLOYALTYBONUSLOW' && tmpFormula.output == 'TOTALCVPREMIMEDLB'){
        paramMap['TOTALCVPREMIMEDLB'] = (paramMap['TOTALCVPREMIMEDLB']==undefined?0:paramMap['TOTALCVPREMIMEDLB'])+result;
        paramMap['TOTALCVPREMIMEDLBALT'] = (paramMap['TOTALCVPREMIMEDLBALT']==undefined?0:paramMap['TOTALCVPREMIMEDLBALT'])+resultAlternativeAsumtion;
    } else if (formula.formulaTypeCd == 'TOTALLOYALTYBONUSLOW' && tmpFormula.output == 'TOTALCVPREMIHIGHLB'){
        paramMap['TOTALCVPREMIHIGHLB'] = (paramMap['TOTALCVPREMIHIGHLB']==undefined?0:paramMap['TOTALCVPREMIHIGHLB'])+result;
        paramMap['TOTALCVPREMIHIGHLBALT'] = (paramMap['TOTALCVPREMIHIGHLBALT']==undefined?0:paramMap['TOTALCVPREMIHIGHLBALT'])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALLOYALTYBONUSLOWLASTYEAR' && tmpFormula.output == 'TOTALCVPREMILOWLBLASTYEAR'){
        paramMap['TOTALCVPREMILOWLBLASTYEAR'+paramMap.year] = (paramMap['TOTALCVPREMILOWLBLASTYEAR'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMILOWLBLASTYEAR'+paramMap.year])+result;
        paramMap['TOTALCVPREMILOWLBLASTYEARALT'+paramMap.year] = (paramMap['TOTALCVPREMILOWLBLASTYEARALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMILOWLBLASTYEARALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALLOYALTYBONUSLOWLASTYEAR' && tmpFormula.output == 'TOTALCVPREMIMEDLBLASTYEAR'){
        paramMap['TOTALCVPREMIMEDLBLASTYEAR'+paramMap.year] = (paramMap['TOTALCVPREMIMEDLBLASTYEAR'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDLBLASTYEAR'+paramMap.year])+result;
        paramMap['TOTALCVPREMIMEDLBLASTYEARALT'+paramMap.year] = (paramMap['TOTALCVPREMIMEDLBLASTYEARALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDLBLASTYEARALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALLOYALTYBONUSLOWLASTYEAR' && tmpFormula.output == 'TOTALCVPREMIHIGHLBLASTYEAR'){
        paramMap['TOTALCVPREMIHIGHLBLASTYEAR'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHLBLASTYEAR'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHLBLASTYEAR'+paramMap.year])+result;
        paramMap['TOTALCVPREMIHIGHLBLASTYEARALT'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHLBLASTYEARALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHLBLASTYEARALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALWITHDRAWALLOWBASIC' && tmpFormula.output == 'OFF_TOTALCVBEFWDBASIC'){
        paramMap['OFF_TOTALCVBEFWDBASIC'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASIC'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASIC'+paramMap.year])+result;
        paramMap['OFF_TOTALCVBEFWDBASICALT'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASICALT'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASICALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALWITHDRAWALLOWBASIC' && tmpFormula.output == 'OFF_TOTALCVBEFWDBASICMED'){
        paramMap['OFF_TOTALCVBEFWDBASICMED'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASICMED'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASICMED'+paramMap.year])+result;
        paramMap['OFF_TOTALCVBEFWDBASICMEDALT'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASICMEDALT'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASICMEDALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALWITHDRAWALLOWBASIC' && tmpFormula.output == 'OFF_TOTALCVBEFWDBASICHIGH'){
        paramMap['OFF_TOTALCVBEFWDBASICHIGH'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASICHIGH'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASICHIGH'+paramMap.year])+result;
        paramMap['OFF_TOTALCVBEFWDBASICHIGHALT'+paramMap.year] = (paramMap['OFF_TOTALCVBEFWDBASICHIGHALT'+paramMap.year]==undefined?0:paramMap['OFF_TOTALCVBEFWDBASICHIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    }else if(formula.formulaTypeCd == 'FT_TOTALCVTOPUPLASTYEAR' && tmpFormula.output == 'TOTALCVTOPUPLASTYEAR'){
        paramMap['TOTALCVTOPUPLASTYEAR'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEAR'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEAR'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPLASTYEARALT'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEARALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEARALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALCVTOPUPLASTYEAR_MED' && tmpFormula.output == 'TOTALCVTOPUPLASTYEAR_MED'){
        paramMap['TOTALCVTOPUPLASTYEAR_MED'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEAR_MED'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEAR_MED'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPLASTYEAR_MEDALT'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEAR_MEDALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEAR_MEDALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'FT_TOTALCVTOPUPLASTYEAR_HIGH' && tmpFormula.output == 'TOTALCVTOPUPLASTYEAR_HIGH'){
        paramMap['TOTALCVTOPUPLASTYEAR_HIGH'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEAR_HIGH'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEAR_HIGH'+paramMap.year])+result;
        paramMap['TOTALCVTOPUPLASTYEAR_HIGHALT'+paramMap.year] = (paramMap['TOTALCVTOPUPLASTYEAR_HIGHALT'+paramMap.year]==undefined?0:paramMap['TOTALCVTOPUPLASTYEAR_HIGHALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'TOTALLOYALTYBONUSLOW' && tmpFormula.output == 'TOTALCVPREMILOWLB_DB'){
        paramMap['TOTALCVPREMILOWLB_DB'+paramMap.year] = (paramMap['TOTALCVPREMILOWLB_DB'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMILOWLB_DB'+paramMap.year])+result;
        paramMap['TOTALCVPREMILOWLB_DBALT'+paramMap.year] = (paramMap['TOTALCVPREMILOWLB_DBALT'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMILOWLB_DBALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'TOTALLOYALTYBONUSMED' && tmpFormula.output == 'TOTALCVPREMIMEDLB_DB'){
        paramMap['TOTALCVPREMIMEDLB_DB'+paramMap.year] = (paramMap['TOTALCVPREMIMEDLB_DB'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDLB_DB'+paramMap.year])+result;
        paramMap['TOTALCVPREMIMEDLB_DBALT'+paramMap.year] = (paramMap['TOTALCVPREMIMEDLB_DB'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIMEDLB_DBALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if(formula.formulaTypeCd == 'TOTALLOYALTYBONUSHIGH' && tmpFormula.output == 'TOTALCVPREMIHIGHLB_DB'){
        paramMap['TOTALCVPREMIHIGHLB_DB'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHLB_DB'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHLB_DB'+paramMap.year])+result;
        paramMap['TOTALCVPREMIHIGHLB_DBALT'+paramMap.year] = (paramMap['TOTALCVPREMIHIGHLB_DB'+paramMap.year]==undefined?0:paramMap['TOTALCVPREMIHIGHLB_DBALT'+paramMap.year])+resultAlternativeAsumtion;
    } else if (tmpFormula.output == 'TOTALCVLOWDISPLAY') {	
        if (paramMap['TOTALCVLOWDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVLOWDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVLOWDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'TOTALCVMEDDISPLAY') {	
        if (paramMap['TOTALCVMEDDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVMEDDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVMEDDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'TOTALCVHIGHDISPLAY') {	
        if (paramMap['TOTALCVHIGHDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVHIGHDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVHIGHDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'CVTOTALLOWAFTERSURRDISPLAY') {	
        if (paramMap['CVTOTALLOWAFTERSURRDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['CVTOTALLOWAFTERSURRDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['CVTOTALLOWAFTERSURRDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'CVTOTALMEDAFTERSURRDISPLAY') {	
        if (paramMap['CVTOTALMEDAFTERSURRDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['CVTOTALMEDAFTERSURRDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['CVTOTALMEDAFTERSURRDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'CVTOTALHIGHAFTERSURRDISPLAY') {	
        if (paramMap['CVTOTALHIGHAFTERSURRDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['CVTOTALHIGHAFTERSURRDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['CVTOTALHIGHAFTERSURRDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'TOTALCVDBLOWDISPLAY') {	
        if (paramMap['TOTALCVDBLOWDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVDBLOWDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVDBLOWDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'TOTALCVDBMEDDISPLAY') {	
        if (paramMap['TOTALCVDBMEDDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVDBMEDDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVDBMEDDISPLAY' + paramMap.year] = result;	
        }	
    } else if (tmpFormula.output == 'TOTALCVDBHIGHDISPLAY') {	
        if (paramMap['TOTALCVDBHIGHDISPLAY' + (paramMap.year - 1)] < 0 && paramMap.year > 1) {	
            paramMap['TOTALCVDBHIGHDISPLAY' + paramMap.year] = -1;	
        } else {	
            paramMap['TOTALCVDBHIGHDISPLAY' + paramMap.year] = result;	
        }	
    } else if(formula.formulaTypeCd == 'WITHDRAWALLOWBASIC' && tmpFormula.output == 'OFF_TOTALWDBASICLOW'){
        paramMap['OFF_TOTALWDBASICLOW'+paramMap.year] = (paramMap['OFF_TOTALWDBASICLOW'+paramMap.year]==undefined?0:paramMap['OFF_TOTALWDBASICLOW'+paramMap.year])+result;        
    } else if(formula.formulaTypeCd == 'WITHDRAWALMEDBASIC' && tmpFormula.output == 'OFF_TOTALWDBASICMED'){
        paramMap['OFF_TOTALWDBASICMED'+paramMap.year] = (paramMap['OFF_TOTALWDBASICMED'+paramMap.year]==undefined?0:paramMap['OFF_TOTALWDBASICMED'+paramMap.year])+result;        
    } else if(formula.formulaTypeCd == 'WITHDRAWALHIGHBASIC' && tmpFormula.output == 'OFF_TOTALWDBASICHIGH'){
        paramMap['OFF_TOTALWDBASICHIGH'+paramMap.year] = (paramMap['OFF_TOTALWDBASICHIGH'+paramMap.year]==undefined?0:paramMap['OFF_TOTALWDBASICHIGH'+paramMap.year])+result;        
    } else if(formula.formulaTypeCd == 'SUMASSURED' && tmpFormula.output == 'SA_PLPL'){
        paramMap['SA_PLPL'] =  result;        
    } else if(formula.formulaTypeCd == 'FT_MULTIPLIERBENEFIT' && tmpFormula.output == 'OF_MULTIPLIERBENEFIT_L2HD'){
        paramMap['OF_MULTIPLIERBENEFIT_L2HD'] =  result;        
    } else if(formula.formulaTypeCd == 'FT_TOPUP_FIFO' && tmpFormula.output == 'CASHPAYOUTLOW'){
        paramMap['TOTALCASHPAYOUTLOW'+paramMap.year] = (paramMap['TOTALCASHPAYOUTLOW'+paramMap.year]==undefined?0:paramMap['TOTALCASHPAYOUTLOW'+paramMap.year])+result;        
    } else if(formula.formulaTypeCd == 'FT_TOPUP_FIFO_MED' && tmpFormula.output == 'CASHPAYOUTMED'){
        paramMap['TOTALCASHPAYOUTMED'+paramMap.year] = (paramMap['TOTALCASHPAYOUTMED'+paramMap.year]==undefined?0:paramMap['TOTALCASHPAYOUTMED'+paramMap.year])+result;        
    } else if(formula.formulaTypeCd == 'FT_TOPUP_FIFO_HIGH' && tmpFormula.output == 'CASHPAYOUTHIGH'){
        paramMap['TOTALCASHPAYOUTHIGH'+paramMap.year] = (paramMap['TOTALCASHPAYOUTHIGH'+paramMap.year]==undefined?0:paramMap['TOTALCASHPAYOUTHIGH'+paramMap.year])+result;        
    } 

}

function setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
    tmpFormula, ITEM, mapOutputFund, mapOutputFundAlt, mapOutputFundAltLimited, mapOutputFundAltWhole, isPphAlt) {
    if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONLOW01') {
        stringFormula += paramMap['TOPUPDEDUCTIONLOW01CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONLOW01ALT'];
    } else if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONMED01') {
        stringFormula += paramMap['TOPUPDEDUCTIONMED01CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONMED01ALT'];
    } else if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONHIGH01') {
        stringFormula += paramMap['TOPUPDEDUCTIONHIGH01CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONHIGH01ALT'];
    } else if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONLOW02') {
        stringFormula += paramMap['TOPUPDEDUCTIONLOW02CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONLOW02ALT'];
    } else if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONMED02') {
        stringFormula += paramMap['TOPUPDEDUCTIONMED02CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONMED02ALT'];
    } else if (fe.value.toUpperCase() == 'TOPUPDEDUCTIONHIGH02') {
        stringFormula += paramMap['TOPUPDEDUCTIONHIGH02CLIENT'];
        stringFormulaAlt += paramMap['TOPUPDEDUCTIONHIGH02ALT'];
    } else if (fe.value.toUpperCase() === 'TOTALCVTOPUPLOWLASTYEAR' && paramMap.year > 1) {
        stringFormula += paramMap['TOTALCVTOPUPLOWLASTYEAR' + (paramMap.year - 1)];
        stringFormulaAlt += paramMap['TOTALCVTOPUPLOWLASTYEARALT' + (paramMap.year - 1)];
    } else if (fe.value.toUpperCase() === 'TOTALCVTOPUPMEDLASTYEAR' && paramMap.year > 1) {
        stringFormula += paramMap['TOTALCVTOPUPMEDLASTYEAR' + (paramMap.year - 1)];
        stringFormulaAlt += paramMap['TOTALCVTOPUPMEDLASTYEARALT' + (paramMap.year - 1)];
    } else if (fe.value.toUpperCase() === 'TOTALCVTOPUPHIGHLASTYEAR' && paramMap.year > 1) {
        stringFormula += paramMap['TOTALCVTOPUPHIGHLASTYEAR' + (paramMap.year - 1)];
        stringFormulaAlt += paramMap['TOTALCVTOPUPHIGHLASTYEARALT' + (paramMap.year - 1)];
    } else if (fe.value.toUpperCase() == 'CVTOPUPLOW' && tmpFormula.output == 'CVTOPUPLOWSURRVALUE') {
        if (isPphAlt) {
            stringFormula += getValueFund(ITEM.code, 'CVTOPUPLOWTEMP', mapOutputFundAltLimited);
            stringFormulaAlt += getValueFund(ITEM.code, 'CVTOPUPLOWTEMP', mapOutputFundAltWhole);
        }
        else {
            stringFormula += getValueFund(ITEM.code, 'CVTOPUPLOWTEMP', mapOutputFund);
            stringFormulaAlt += getValueFund(ITEM.code, 'CVTOPUPLOWTEMP', mapOutputFund);
        }
    } else if ((fe.value.toUpperCase() == 'OFF_WITHDRAWALBASICLOWLASTYEAR' || fe.value.toUpperCase() == 'OFF_WITHDRAWALBASICMEDLASTYEAR'
        || fe.value.toUpperCase() == 'OFF_WITHDRAWALBASICHIGHLASTYEAR' || fe.value.toUpperCase() == 'OFF_WITHDRAWALSAVERLOWLASTYEAR'
        || fe.value.toUpperCase() == 'OFF_WITHDRAWALSAVERMEDLASTYEAR' || fe.value.toUpperCase() == 'OFF_WITHDRAWALSAVERHIGHLASTYEAR') && paramMap.year > 1) {
        stringFormula += paramMap[fe.value.toUpperCase() + '_CLIENT' + (paramMap.year - 1)];
        stringFormulaAlt += paramMap[fe.value.toUpperCase() + '_ALT' + (paramMap.year - 1)];
    } else {
        if (isPphAlt) {
            stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFundAltLimited);
            stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAltWhole);
        }
        else {
            if(paramMap.prodCd.toUpperCase() == 'U4K' || paramMap.prodCd.toUpperCase() == 'U2Z'){
                if(mapOutputFund[ITEM.code] != undefined && mapOutputFund[ITEM.code][fe.value + ITEM.code] != undefined){
                    stringFormula += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFund);
                    stringFormulaAlt += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFundAlt);
                }else{
                    stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                    stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);    
                }        
            }else{
                stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                stringFormulaAlt += getValueFund(ITEM.code, fe.value, mapOutputFundAlt);
            }                        
        }
    }

    return {
        stringFormula: stringFormula,
        stringFormulaAlt: stringFormulaAlt
    };
}

function applyRoundingToSomeCasesAll(tmpFormula, result, resultAlternativeAsumtion){
    if(tmpFormula.roundingType != 'NoRounding'){
        if(tmpFormula.roundingType == 'HalfUp'){
            result = result.toFixed(tmpFormula.roundingDigit);
            resultAlternativeAsumtion = resultAlternativeAsumtion.toFixed(tmpFormula.roundingDigit);
            parseFloat(result);
            parseFloat(resultAlternativeAsumtion)
        }
        else if(tmpFormula.roundingType == 'Down'){
            result = Math.floor(result);
            resultAlternativeAsumtion = Math.floor(resultAlternativeAsumtion);
        }
        else if(tmpFormula.roundingType == 'Up'){
            result = Math.ceil(result);
            resultAlternativeAsumtion = Math.ceil(resultAlternativeAsumtion);
        }
    }
    else if(tmpFormula.roundingNearestType != 'NoRounding'){
        if(tmpFormula.roundingNearestType == 'HalfUp'){
            result = Math.round(result/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
            resultAlternativeAsumtion = Math.round(resultAlternativeAsumtion/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
        }
        else if(tmpFormula.roundingNearestType == 'Down'){
            result = Math.floor(result/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
            resultAlternativeAsumtion = Math.floor(resultAlternativeAsumtion/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
        }
        else if(tmpFormula.roundingNearestType == 'Up'){
            result = Math.ceil(result/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
            resultAlternativeAsumtion = Math.ceil(resultAlternativeAsumtion/tmpFormula.roundingNearestNumber)*tmpFormula.roundingNearestNumber;
        }
    }
    
    return {
        result : result,
        resultAlternativeAsumtion : resultAlternativeAsumtion
    };
}

function setResultToZeroForDisplay(tmpFormula, paramMap, result) {	
    if (tmpFormula.output == 'TOTALCVLOWDISPLAY') {	
        result = paramMap['TOTALCVLOWDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'TOTALCVMEDDISPLAY') {	
        result = paramMap['TOTALCVMEDDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'TOTALCVHIGHDISPLAY') {	
        result = paramMap['TOTALCVHIGHDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'CVTOTALLOWAFTERSURRDISPLAY') {	
        result = paramMap['CVTOTALLOWAFTERSURRDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'CVTOTALMEDAFTERSURRDISPLAY') {	
        result = paramMap['CVTOTALMEDAFTERSURRDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'CVTOTALHIGHAFTERSURRDISPLAY') {	
        result = paramMap['CVTOTALHIGHAFTERSURRDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'TOTALCVDBLOWDISPLAY') {	
        result = paramMap['TOTALCVDBLOWDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'TOTALCVDBMEDDISPLAY') {	
        result = paramMap['TOTALCVDBMEDDISPLAY' + paramMap.year];	
    } else if (tmpFormula.output == 'TOTALCVDBHIGHDISPLAY') {	
        result = paramMap['TOTALCVDBHIGHDISPLAY' + paramMap.year];	
    } else {	
        result;	
    }	
    return result;	
}

function getResultValDisplayBIAMax(result, formula, paramMap, ITEM) {
    
    var resultLocal = result;
    if(formula.formulaTypeCd == 'TOTALCVLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' 
            || formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY')
    {
                                            
        if(resultLocal < 0)
        {   
                                                    
            if(formula.formulaTypeCd == 'TOTALCVLOWDISPLAY') 
                resultLocal = paramMap['TOTALCVLOW' + paramMap.year + ITEM.code];
            else if(formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' )  
                resultLocal = paramMap['TOTALCVMED' + paramMap.year + ITEM.code];
            else if(formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY' )  
                resultLocal = paramMap['TOTALCVHIGH' + paramMap.year + ITEM.code];
            else if(formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY') 
                resultLocal = paramMap['TOTALCVDBLOW' + paramMap.year];
            else if(formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' )  
                resultLocal = paramMap['TOTALCVDBMED' + paramMap.year];
            else if(formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY' )  
                resultLocal = paramMap['TOTALCVDBHIGH' + paramMap.year];    
                                                    
        }
                                    
                                            
    }

    return resultLocal;
  
}

function setValidationBIAMaxDeathBenefit(value, formula, mapOutputCoverage)
{
    var valueLocal = value;
    if(formula.formulaTypeCd == 'TOTALCVDBLOWDISPLAY')
    { 
        valueLocal = mapOutputCoverage["TOTALCVLOWDISPLAY"] < 0?-1:valueLocal;

    }    
    else if(formula.formulaTypeCd == 'TOTALCVDBMEDDISPLAY' )  
    {
        valueLocal = mapOutputCoverage["TOTALCVMEDDISPLAY"] < 0?-1:valueLocal;
    } 
    else if(formula.formulaTypeCd == 'TOTALCVDBHIGHDISPLAY' )  
    {
        valueLocal = mapOutputCoverage["TOTALCVHIGHDISPLAY"] < 0?-1:valueLocal;
    }

    return valueLocal;
}

function getKeyByValue(object) {
    return Object.values(object)[0] == Object.values(object)[1];
}

function getResultFormulaVIA(itemSelected, ITEM, map, mapResult, mapFundPerYear, mapOutputCoverage, mapOutputCoverageAlt, mapOutputFund, mapOutputFundAlt, paramMap, flag, buttonType, DIFFLVPREMI, newManfaatListBa, totalLowRate, totalMedRate, totalHighRate, mapGio, mapHelper) {
    var mapResultFormula = mapResult;
    var tempMapFormulaList = ITEM.FORMULA_BOTH;    
    var isVIA = (map.mainCoverage == 'U4K');        
    var isBIAMax = (map.mainCoverage == 'U2Z');
    var sumAssuredVIA = 0;    
    var mapResultPerYear = {};
    var cvWithdrawValue = 0;
    var TOTALCVLOWFUNDAVAL = 0;

    if(ITEM.flagDB == true){
        mapResultPerYear = mapFundPerYear;
    }

    tempMapFormulaList.sort(function (a, b) { return a.sequence - b.sequence; });

    for (var j = 0; j < tempMapFormulaList.length; j++) {
        var tmpFormula = tempMapFormulaList[j];
        var stringFormula = '';
        var stringFormulaAlt = '';
        var stringFormulaOri = '';
        var result = 0;
        var resultAlternativeAsumtion = 0;
        var value;

        if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
            continue;
        }

        var formula = rootScope.FORMULA[tmpFormula.formulaCd];
        if (formula) {
            var isProcess = false
            if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                isProcess = true;
            } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                isProcess = true;
            } else if (itemSelected.type === 'COVERAGE') {
                isProcess = true;
            }

            if (isProcess) {
                var tempFormulaElementList = formula.FORMULA_ELEMENT;

                for (var k = 0; k < tempFormulaElementList.length; k++) {
                    var fe = tempFormulaElementList[k];
                    fe.value = fe.value == "''" ? '' : fe.value.trim();
                    stringFormulaOri += fe.value;

                    if (fe.type.toLowerCase().trim() === "coverage"
                        || fe.type.toLowerCase().trim() === "customer"
                        || fe.type.toLowerCase().trim() === "rate"
                        || fe.type.toLowerCase().trim() === "fund"
                        || fe.type.toLowerCase().trim() === "product"
                        || fe.type.toLowerCase().trim() === "allocation"
                        || fe.type.toLowerCase().trim() === "predefined") {

                        if (fe.value.toUpperCase() == 'PDSA' && isVIA) {
                            stringFormula += (paramMap['SA_U4K1'] != undefined ? paramMap['SA_U4K1'] : paramMap['SA_U4K2']);                        
                        } else {
                            stringFormula += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                            stringFormulaAlt += map[fe.value] && map[fe.value].toString().trim() != '' ? (isNaN(map[fe.value]) ? (map[fe.value].charAt(0) == "'" ? map[fe.value] : "\'" + map[fe.value] + "\'") : map[fe.value]) : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "load") {
                        stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                    } else if (fe.type.toLowerCase().trim() === "formula") {
                        if(fe.value.toUpperCase() === 'INCOMECUST'){
                            stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                            stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                        }else if (fe.value.toUpperCase() === 'MAXLVPREMI') {
                            stringFormula += "\'" + map[fe.value] + "\'";
                            stringFormulaAlt += "\'" + map[fe.value] + "\'";
                        } else if (fe.value.toUpperCase() === 'DIFFLVPREMI') {
                            stringFormula += "" + (DIFFLVPREMI != undefined ? DIFFLVPREMI : 0) + "";
                            stringFormulaAlt += "" + (DIFFLVPREMI != undefined ? DIFFLVPREMI : 0) + "";
                        } else if (fe.value.toUpperCase() == 'TOTALPREMIUMWITHACCPREMIUMLBDB') {
                            stringFormula += paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBCLIENT'] ? paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBCLIENT'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBALT'] ? paramMap['TOTALPREMIUMWITHACCPREMIUMLBDBALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALSAWITHACCSALINKTERM') {
                            stringFormula += paramMap['TOTALSAWITHACCSALINKTERMCLIENT'] ? paramMap['TOTALSAWITHACCSALINKTERMCLIENT'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALSAWITHACCSALINKTERMALT'] ? paramMap['TOTALSAWITHACCSALINKTERMALT'] : '0.0';
                        } else if (fe.value.toUpperCase() == 'TOTALEXTRAPREMIUM') {
                            stringFormula += paramMap['TOTALEXTRAPREMIUM'] ? paramMap['TOTALEXTRAPREMIUM'] : '0.0';
                            stringFormulaAlt += paramMap['TOTALEXTRAPREMIUM'] ? paramMap['TOTALEXTRAPREMIUM'] : '0.0';
                        } else {
                            stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                            stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                        }
                    } else if (fe.type.toLowerCase().trim() === "formulafund") {
                        stringFormula += getValueFund(ITEM.code, fe.value + itemCd, mapOutputFund);
                        stringFormulaAlt += getValueFund(ITEM.code, fe.value + itemCd, mapOutputFundAlt);
                    } else if (fe.type.toLowerCase().trim() === "string") {
                        stringFormula += "\'" + fe.value + "\'";
                        stringFormulaAlt += "\'"+fe.value+"\'";
                    } else {
                        stringFormula += fe.value;
                        stringFormulaAlt += fe.value;
                    }
                }

                if (isValidExpression(stringFormula)) {
                    var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                    result = getResultExpression(tempStringFormula.stringFormula);
                    resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                    var yearC = paramMap.year;
                    if ((formula.formulaTypeCd === 'CHARGERIDER' || formula.formulaTypeCd === 'CHARGEINSURANCE') && yearC == 1
                        && tmpFormula.output === 'TOTALCHARGE') {
                        if (!mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey]) {
                            if (formula.formulaTypeCd === 'CHARGERIDER') {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result / 12;
                            } else {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] = result;
                            }
                        } else {
                            if (formula.formulaTypeCd === 'CHARGERIDER') {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + result / 12;
                            } else {
                                mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] =
                                    mapChargeRider[ITEM.coverageCode + itemSelected.tertanggungKey] + result;
                            }
                        }
                    }

                    result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, null, null, null, ITEM);

                    if (!flag && 'TOTALTOPUP' == tmpFormula.output) {
                        result = mapOutputCoverage['TOTALTOPUP1'];
                    }

                    if(tmpFormula.output == 'SA_U4K1' || tmpFormula.output == 'SA_U4K2'){
                        sumAssuredVIA += result;
                    }    

                    var lifeAsiaCd = ITEM.TERMLIFEASIA;  
                    if(itemSelected.type === 'COVERAGE'){
                        setFUWOrSIOForProduct(paramMap, tmpFormula, ITEM, lifeAsiaCd, map, mapResult, mapGio, result)                        
                    }

                    tempResult = applyRoundingToSomeCasesAll(tmpFormula, result, resultAlternativeAsumtion);
                    result = tempResult.result;
                    resultAlternativeAsumtion = tempResult.resultAlternativeAsumtion;

                    //for development purpose only, comment if you wanna build APK
                    parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                        'in function getResultFormula BOTH', result, resultAlternativeAsumtion, formula, 'nonPph');   

                    setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion);

                    if (tmpFormula.output) {
                        if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                            value = mapOutputCoverage[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                    mapOutputCoverage[tmpFormula.output] = value;
                                }
                                else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + result);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }

                                    mapOutputCoverage[tmpFormula.output] = value;
                                }
                            } else {
                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverage[tmpFormula.output + '_CLIENT'] = result;
                                }
                                else if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                    || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                    mapOutputCoverage[tmpFormula.output] = result;
                                }

                            }

                            if((tmpFormula.output == 'MONTHLYCHARGE' || tmpFormula.output == 'TOTALCHARGE') && isVIA){
                                if(ITEM.currencyCd == 'USD'){
                                    mapOutputCoverage[tmpFormula.output + "_ROUNDED"] = parseFloat(result.toFixed(2));
                                }else{
                                    mapOutputCoverage[tmpFormula.output + "_ROUNDED"] = parseFloat(result.toFixed(0));
                                }
                            }

                            if (tmpFormula.output == 'PREMIUMACCUMULATION') {
                                mapOutputCoverage[tmpFormula.output] = result;
                            }

                            value = mapOutputCoverageAlt[tmpFormula.output];
                            if (value) {
                                if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output] ||
                                    tmpFormula.output == 'CUSTAGEALTER' || tmpFormula.output == 'CUSTAGEALTER01' || tmpFormula.output == 'CUSTAGEALTER02') {
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                } else if (tmpFormula.output == 'PDSACHARGE' || tmpFormula.output == 'TOTALMAINSA') {
                                    mapOutputCoverageAlt[tmpFormula.output] = result;
                                } else {
                                    if (tmpFormula.output != 'SABASIC' && tmpFormula.output != 'SA_LINKTERM') {
                                        value = (value + resultAlternativeAsumtion);
                                    }
                                    else if (tmpFormula.output == 'SA_LINKTERM') {
                                        value = result;
                                    }
                                    mapOutputCoverageAlt[tmpFormula.output] = value;
                                }
                            } else {
                                if (tmpFormula.formulaCd == 'FRMLALLOPREMI09' && tmpFormula.output == 'ALLOCATEDSAVER') {

                                }
                                else if (tmpFormula.formulaCd == 'FRMLALLOPREMI08' && tmpFormula.output == 'ALLOCATEDSAVER') {
                                    mapOutputCoverageAlt[tmpFormula.output + '_ALT'] = resultAlternativeAsumtion;
                                }
                                else if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                    || (tmpFormula.output == 'SABASIC' && mapOutputCoverageAlt['SABASIC'] === undefined)) {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }
                            }

                            if(tmpFormula.output == 'PREMIUMACCUMULATION'){
                                mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;	
                            }

                            if (formula.formulaTypeCd.indexOf('_CLIENT') != -1) {
                                paramMap[tmpFormula.output + 'CLIENT'] = result;
                            }

                            setParamMapByFormulaOutputAndFormulaTypeCd(tmpFormula, formula, paramMap, result, resultAlternativeAsumtion)                           

                            if (true == tmpFormula.forSpecificRider) {
                                mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                mapOutputCoverageAlt[tmpFormula.output + "_" + tmpFormula.coverage] = resultAlternativeAsumtion;
                            }

                            if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                mapResultFormula[formula.formulaTypeCd] = Math.ceil(result / 12);
                            }

                            if(isVIA){
                                // karena PIA tidak ada rider premium, maka PDPREMI ngambil dari SA (dipakai untuk rule)
                                map["PDPREMI"] = map['CUSTPREMI'];							        	
                            }

                        } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                            var itemCd = ITEM.code;

                            value = mapOutputCoverage[formula.formulaTypeCd];
                            if (value) {
                                value = (value + result);
                                mapOutputCoverage[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverage[formula.formulaTypeCd] = result;
                            }

                            value = mapOutputCoverageAlt[formula.formulaTypeCd];
                            if (value) {
                                value = (value + resultAlternativeAsumtion);
                                mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                            } else {
                                mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                            }

                            if (mapOutputFund[itemCd] == undefined) {
                                mapOutputFund[itemCd] = {};
                            }
                            mapOutputFund[itemCd][tmpFormula.output] = result;

                            if(mapOutputFundAlt[itemCd] == undefined){
                                mapOutputFundAlt[itemCd] =  {};
                            }
                            mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                        }
                    }
                }
            }
            
            mapResultFormula['CHARGERIDER'] = mapChargeRider;
            mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
            mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
            mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
            mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            mapResultFormula['MAPGIO'] = mapGio;
        }
    }

    var tempMapFormulaListBasic = ITEM.FORMULA_BASIC;
    if (tempMapFormulaListBasic != undefined) {
        if(paramMap.year != paramMap.currentYear){
            paramMap.currentYear = paramMap.year;
            var itemCategory = 'New Business';
            for(var prec = 0; prec<2; prec++){ 
                //prec == 1 for execute OFF_WDBASIC & TOTALWDBASIC           
                for (var iBa = 0; iBa < newManfaatListBa.length; iBa++) {
                    var itemSelectedBa = newManfaatListBa[iBa];        
                    if(itemSelectedBa.type == 'FUND'){ 
                        var ITEMBa;
                        var fundAllocationValue;
                        var fundAllocationValueTopup;
                                        
                        ITEMBa = rootScope.FUND[itemSelectedBa.code];
                        var x = ITEMBa.FORMULA.filter(function (item) { return (item.category == itemCategory || item.category == 'Both'); });
                        ITEMBa.FORMULA_BASIC = x.filter(function (item) { return (item.target == 'Basic'); });        
                        ITEMBa.flagDB = itemSelectedBa.flagDB;
                                                                               
                        var itemInputList = itemSelectedBa.itemInput;                                
                        for (var jBa = 0; jBa < itemInputList.length; jBa++) {
                            if (itemInputList[jBa].key === 'PDALLO') {
                                fundAllocationValue = itemInputList[jBa].inputValue;
                                fundAllocationValueTopup = itemInputList[jBa].inputValueTopup;
                                map['PDALLO' + itemSelectedBa.code] = itemInputList[jBa].inputValue / 100;
                                map['PDALLO_TOPUP' + itemSelectedBa.code] = itemInputList[jBa].inputValueTopup / 100;
                                break;
                            } else {
                                if (!(itemInputList[jBa].key === 'PDPREMI' && itemSelectedBa.code == mapProperties["PREVIOUSRIDERCODE"] && itemSelectedBa.tertanggungKey == mapProperties["PREVIOUSCUSTOMERKEY"])) {
                                    map[itemInputList[jBa].key] = itemInputList[jBa].inputValue;
                                }
                            }
                
                            if (itemInputList[jBa].key === 'PDPREMI') {
                                pdPremiExist = itemInputList[jBa].inputValue;
                            } else if (itemInputList[jBa].key === 'PDSA') {
                                pdSaExist = itemInputList[jBa].inputValue;
                                map['PDSA'] = itemInputList[jBa].inputValue;
                            } else if (itemInputList[jBa].key == 'PDPLAN') {
                                map['PDPLANFORRATE'] = undefined;
                                if (itemInputList[jBa].inputValueForRate != undefined) {
                                    map['PDPLANFORRATE'] = itemInputList[jBa].inputValueForRate;
                                }
                            }
                        }                                    
                                        
                        var lowRate = ITEMBa.lowRate / 100;
                        var mediumRate = ITEMBa.mediumRate / 100;
                        var highRate = ITEMBa.highRate / 100;
            
                        map['LOWRATE' + itemSelectedBa.code] = lowRate;
                        map['MEDRATE' + itemSelectedBa.code] = mediumRate;
                        map['HIGHRATE' + itemSelectedBa.code] = highRate;
            
                        if (totalLowRate != undefined && totalLowRate != 0) {
                            map['TOTALLOWRATE' + itemSelectedBa.code] = totalLowRate;
                            map['TOTALMEDRATE' + itemSelectedBa.code] = totalMedRate;
                            map['TOTALHIGHRATE' + itemSelectedBa.code] = totalHighRate;
                        }                                      
                
                        var tempMapFormulaListBasic = ITEMBa.FORMULA_BASIC;                            
                        for (var jBa = 0; jBa < tempMapFormulaListBasic.length; jBa++) {
                            var tmpFormula = tempMapFormulaListBasic[jBa];
                            var stringFormula = '';
                            var stringFormulaAlt = '';
                            var stringFormulaOri = '';
                            var result = 0;
                            var resultAlternativeAsumtion = 0;
                            var value;
            
                            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) continue;
                            if (prec == 0 && (tmpFormula.precalculated != null || tmpFormula.precalculated != undefined)) continue;
                            else if (prec == 1 && (tmpFormula.precalculated == null || tmpFormula.precalculated == undefined)) continue;
            
                            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
                            if (formula) {
                                var isProcess = false
                                if (ITEMBa.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                                    isProcess = true;
                                } else if (ITEMBa.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                                    isProcess = true;
                                } else if (itemSelectedBa.type === 'COVERAGE') {
                                    isProcess = true;
                                }
            
                                if (isProcess) {
                                    var tempFormulaElementList = formula.FORMULA_ELEMENT;
                                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                                        var fe = tempFormulaElementList[k];
                                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                                        stringFormulaOri += fe.value;
            
                                        if (fe.type.toLowerCase().trim() === "coverage"
                                            || fe.type.toLowerCase().trim() === "customer"
                                            || fe.type.toLowerCase().trim() === "rate"
                                            || fe.type.toLowerCase().trim() === "fund"
                                            || fe.type.toLowerCase().trim() === "product"
                                            || fe.type.toLowerCase().trim() === "allocation"
                                            || fe.type.toLowerCase().trim() === "predefined") {
                                            if (fe.value.toUpperCase() == 'TOTALCVPREMILOWLBLASTYEAR' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVPREMILOWLBLASTYEAR'+(paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVPREMILOWLBLASTYEARALT'+(paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMEDLBLASTYEAR' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVPREMIMEDLBLASTYEAR' + (paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDLBLASTYEARALT' + (paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGHLBLASTYEAR' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVPREMIHIGHLBLASTYEAR' + (paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHLBLASTYEARALT' + (paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLASTYEAR' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVTOPUPLASTYEAR' + (paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVTOPUPLASTYEARALT' + (paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLASTYEAR_MED' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVTOPUPLASTYEAR_MED' + (paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVTOPUPLASTYEAR_MEDALT' + (paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLASTYEAR_HIGH' && paramMap['year'] > 1) {
                                                stringFormula += paramMap['TOTALCVTOPUPLASTYEAR_HIGH' + (paramMap.year - 1)];
                                                stringFormulaAlt += paramMap['TOTALCVTOPUPLASTYEAR_HIGHALT' + (paramMap.year - 1)];
                                            } else if (fe.value.toUpperCase() == 'OFF_TOTALCVBEFWDBASIC') {
                                                stringFormula += paramMap['OFF_TOTALCVBEFWDBASIC'+paramMap.year];
                                                stringFormulaAlt += paramMap['OFF_TOTALCVBEFWDBASICALT'+paramMap.year];
                                            } else if (fe.value.toUpperCase() == 'OFF_TOTALCVBEFWDBASICMED') {
                                                stringFormula += paramMap['OFF_TOTALCVBEFWDBASICMED'+paramMap.year];
                                                stringFormulaAlt += paramMap['OFF_TOTALCVBEFWDBASICMEDALT'+paramMap.year];
                                            } else if (fe.value.toUpperCase() == 'OFF_TOTALCVBEFWDBASICHIGH') {
                                                stringFormula += paramMap['OFF_TOTALCVBEFWDBASICHIGH'+paramMap.year];
                                                stringFormulaAlt += paramMap['OFF_TOTALCVBEFWDBASICHIGHALT'+paramMap.year];
                                            } else{
                                                if(map[fe.value + itemSelectedBa.code] != undefined){
                                                    stringFormula += map[fe.value + itemSelectedBa.code] ? map[fe.value + itemSelectedBa.code] : '0.0';
                                                    stringFormulaAlt += map[fe.value + itemSelectedBa.code] ? map[fe.value + itemSelectedBa.code] : '0.0';
                                                }else{
                                                    stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                                    stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                                                }                                             
                                            }                            
                                        } else if (fe.type.toLowerCase().trim() === "load") {
                                            stringFormula += itemSelectedBa.loadMap[fe.value] ? itemSelectedBa.loadMap[fe.value] : '0.0';
                                            stringFormulaAlt += itemSelectedBa.loadMap[fe.value] ? itemSelectedBa.loadMap[fe.value] : '0.0';
                                        } else if (fe.type.toLowerCase().trim() === "formula") {
                                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                                            }else{
                                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                                            }
                                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                                            var tempStringFormula = setStringFormulaForFormulaBasicByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt,
                                                paramMap, ITEMBa, mapOutputFund, mapOutputFundAlt);
                                            stringFormula = tempStringFormula.stringFormula;
                                            stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                                        } else if (fe.type.toLowerCase().trim() === "string") {
                                            stringFormula += "\'" + fe.value + "\'";
                                            stringFormulaAlt += "\'"+fe.value+"\'";
                                        } else {
                                            stringFormula += fe.value;
                                            stringFormulaAlt += fe.value;
                                        }
                                    }
            
                                    if (isValidExpression(stringFormula)) {
                                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                                        result = getResultExpression(tempStringFormula.stringFormula);
                                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);
            
                                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, null, null, null, ITEM);
            
                                        var yearC = paramMap.year;                            
            
                                        //for development purpose only, comment if you wanna build APK
                                        parseToLogFile.parseToLogFile(paramMap, ITEMBa, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                                            'in function getResultFormula BASIC', result, resultAlternativeAsumtion, formula, 'nonPph');
            
                                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion);
            
                                        if (tmpFormula.output) {
                                            if ('FUND' === tmpFormula.itemType.toUpperCase()) {        
                                                var itemCd = ITEMBa.code;
                                                value = mapOutputCoverage[formula.formulaTypeCd + itemCd];
                                                if (value) {
                                                    value = (value + result);
                                                    mapOutputCoverage[formula.formulaTypeCd + itemCd] = value;
                                                } else {
                                                    mapOutputCoverage[formula.formulaTypeCd + itemCd] = result;
                                                }
            
                                                value = mapOutputCoverageAlt[formula.formulaTypeCd + itemCd];
                                                if (value) {
                                                    value = (value + resultAlternativeAsumtion);
                                                    mapOutputCoverageAlt[formula.formulaTypeCd + itemCd] = value;
                                                } else {
                                                    mapOutputCoverageAlt[formula.formulaTypeCd + itemCd] = resultAlternativeAsumtion;
                                                }
            
                                                if (mapOutputFund[itemCd] == undefined) {
                                                    mapOutputFund[itemCd] = {};
                                                }
                                                mapOutputFund[itemCd][tmpFormula.output] = result;
            
                                                if(mapOutputFundAlt[itemCd] == undefined){
                                                    mapOutputFundAlt[itemCd] =  {};
                                                }
                                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                                            }
                                        }
                                    }
                                }
                                
                                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
                            }
                        }                
                    }    
                }
            }
            ITEM.flagDB = false;
        }
    }

    //Looping for topup only (WDTOPUP)
    var tempMapFormulaListSaver = ITEM.FORMULA_SAVER;
    if (tempMapFormulaListSaver != undefined) {  
        if(paramMap.year != paramMap.LoopForTP){
            paramMap.LoopForTP = paramMap.year;
            var itemCategory = 'New Business';  
            for(var prec = 0; prec<2; prec++){               
                for (var iBa = 0; iBa < newManfaatListBa.length; iBa++) {
                    var itemSelectedBa = newManfaatListBa[iBa];        
                    if(itemSelectedBa.type == 'FUND'){ 
                        var ITEMBa;
                        var fundAllocationValue;
                        var fundAllocationValueTopup;
                                        
                        ITEMBa = rootScope.FUND[itemSelectedBa.code];
                        var x = ITEMBa.FORMULA.filter(function (item) { return (item.category == itemCategory || item.category == 'Both'); });
                        ITEMBa.FORMULA_SAVER = x.filter(function (item) { return (item.target == 'Saver'); });                                
                        ITEMBa.flagDB = itemSelectedBa.flagDB;                        
                        
                        var itemInputList = itemSelectedBa.itemInput;                                
                        for (var jBa = 0; jBa < itemInputList.length; jBa++) {
                            if (itemInputList[jBa].key === 'PDALLO') {
                                fundAllocationValue = itemInputList[jBa].inputValue;
                                fundAllocationValueTopup = itemInputList[jBa].inputValueTopup;
                                map['PDALLO' + itemSelectedBa.code] = itemInputList[jBa].inputValue / 100;
                                map['PDALLO_TOPUP' + itemSelectedBa.code] = itemInputList[jBa].inputValueTopup / 100;
                                break;
                            } else {
                                if (!(itemInputList[jBa].key === 'PDPREMI' && itemSelectedBa.code == mapProperties["PREVIOUSRIDERCODE"] && itemSelectedBa.tertanggungKey == mapProperties["PREVIOUSCUSTOMERKEY"])) {
                                    map[itemInputList[jBa].key] = itemInputList[jBa].inputValue;
                                }
                            }
                
                            if (itemInputList[jBa].key === 'PDPREMI') {
                                pdPremiExist = itemInputList[jBa].inputValue;
                            } else if (itemInputList[jBa].key === 'PDSA') {
                                pdSaExist = itemInputList[jBa].inputValue;
                                map['PDSA'] = itemInputList[jBa].inputValue;
                            } else if (itemInputList[jBa].key == 'PDPLAN') {
                                map['PDPLANFORRATE'] = undefined;
                                if (itemInputList[jBa].inputValueForRate != undefined) {
                                    map['PDPLANFORRATE'] = itemInputList[jBa].inputValueForRate;
                                }
                            }
                        }                                        
                                        
                        var lowRate = ITEMBa.lowRate / 100;
                        var mediumRate = ITEMBa.mediumRate / 100;
                        var highRate = ITEMBa.highRate / 100;
            
                        map['LOWRATE' + itemSelectedBa.code] = lowRate;
                        map['MEDRATE' + itemSelectedBa.code] = mediumRate;
                        map['HIGHRATE' + itemSelectedBa.code] = highRate;
            
                        if (totalLowRate != undefined && totalLowRate != 0) {
                            map['TOTALLOWRATE' + itemSelectedBa.code] = totalLowRate;
                            map['TOTALMEDRATE' + itemSelectedBa.code] = totalMedRate;
                            map['TOTALHIGHRATE' + itemSelectedBa.code] = totalHighRate;
                        }                                      
                            
                        var loopForFifo = paramMap.year;
                        if(loopForFifo > paramMap.LoopForFifo){
                            loopForFifo = paramMap.LoopForFifo;
                        }
                        
                        for(var f = 0; f<loopForFifo; f++){      
                            mapHelper[f] = (mapHelper[f] == undefined ? {} : mapHelper[f]);
                            var mapHelperIndex = mapHelper[f];                     
                            for (var j = 0; j < tempMapFormulaListSaver.length; j++) {                   
                                var tmpFormula = tempMapFormulaListSaver[j];
                                var stringFormula = '';
                                var stringFormulaAlt = '';
                                var stringFormulaOri = '';
                                var result = 0;
                                var resultAlternativeAsumtion = 0;
                                var value;
                            
                                if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                                    continue;
                                }  
                                                                
                                if (tmpFormula.precalculated != null || tmpFormula.precalculated != undefined) continue;
                                else if (prec == 1 && (tmpFormula.precalculated == null || tmpFormula.precalculated == undefined)) continue;

                                if(mapHelperIndex[tmpFormula.output+ITEMBa.code] == tmpFormula.output) continue;

                                var formula = rootScope.FORMULA[tmpFormula.formulaCd];
                                if (formula) {
                                    var isProcess = false
                                    if (ITEMBa.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                                        isProcess = true;
                                    } else if (ITEMBa.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                                        isProcess = true;
                                    } else if (itemSelected.type === 'COVERAGE') {
                                        isProcess = true;
                                    }

                                    if (isProcess) {                        
                                        var tempFormulaElementList = formula.FORMULA_ELEMENT;
                                        for (var k = 0; k < tempFormulaElementList.length; k++) {                            
                                            var fe = tempFormulaElementList[k];
                                            fe.value = fe.value == "''" ? '' : fe.value.trim();
                                            stringFormulaOri += fe.value;

                                            if (fe.type.toLowerCase().trim() === "coverage"
                                                || fe.type.toLowerCase().trim() === "customer"
                                                || fe.type.toLowerCase().trim() === "rate"
                                                || fe.type.toLowerCase().trim() === "fund"
                                                || fe.type.toLowerCase().trim() === "product"
                                                || fe.type.toLowerCase().trim() === "allocation"
                                                || fe.type.toLowerCase().trim() === "predefined") {
                                                    if(fe.value.toUpperCase() == "SISADANALASTYEAR" || fe.value.toUpperCase() == "SISADANALASTYEAR_MED" || fe.value.toUpperCase() == "SISADANALASTYEAR_HIGH"){
                                                        if(formula.formulaTypeCd.toUpperCase().match(/_PAYOUT/g)){
                                                            stringFormula += mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd.replace("_PAYOUT", "")+ ITEMBa.code+(paramMap.year-1)] ? mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd.replace("_PAYOUT", "")+ ITEMBa.code+(paramMap.year-1)] : '0.0';
                                                        }else{
                                                            stringFormula += mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ ITEMBa.code+(paramMap.year-1)] ? mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ ITEMBa.code+(paramMap.year-1)] : '0.0';
                                                        }
                                                    }else if((fe.value.toUpperCase() == "TOTALSISADANALASTYEAR" || fe.value.toUpperCase() == "TOTALSISADANALASTYEAR_MED" || fe.value.toUpperCase() == "TOTALSISADANALASTYEAR_HIGH") && (paramMap.year > 1)){
                                                        if(formula.formulaTypeCd.toUpperCase().match(/_PAYOUT/g)){
                                                            stringFormula += mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd.replace("_PAYOUT", "")+(paramMap.year-1)] ? mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd.replace("_PAYOUT", "")+(paramMap.year-1)] : '0.0';
                                                        }else{
                                                            stringFormula += mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+(paramMap.year-1)] ? mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+(paramMap.year-1)] : '0.0';
                                                        }                                                        
                                                    }else if((fe.value.toUpperCase() == "TOTALSISADANA" || fe.value.toUpperCase() == "TOTALSISADANA_MED" || fe.value.toUpperCase() == "TOTALSISADANA_HIGH") && (paramMap.year > 1)){
                                                        stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 1);
                                                    }else if(fe.value.toUpperCase() == "WDLASTYEAR_LOW" || fe.value.toUpperCase() == "WDLASTYEAR_MED" || fe.value.toUpperCase() == "WDLASTYEAR_HIGH"){
                                                        stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 2);
                                                    }else if((fe.value.toUpperCase() == "TOTALWD_LOW" || fe.value.toUpperCase() == "TOTALWD_MED" || fe.value.toUpperCase() == "TOTALWD_HIGH") && (paramMap.year > 1)){
                                                        stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 3);
                                                    }else if((fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_LOW" || fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_MED" || fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_HIGH") && (paramMap.year > 1)){
                                                        stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 4);
                                                    }else if((fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_LOWMINUS" || fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_MEDMINUS" || fe.value.toUpperCase() == "OFF_TOTALTOPUPYEAR_HIGHMINUS") && (paramMap.year > 1)){
                                                        stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 5);
                                                    }else if(fe.value.toUpperCase() == "SISADANA_LOW" || fe.value.toUpperCase() == "SISADANA_MED" || fe.value.toUpperCase() == "SISADANA_HIGH"){
                                                        stringFormula += mapHelperIndex['SISADANA'+formula.formulaTypeCd+ ITEMBa.code] ? mapHelperIndex['SISADANA'+formula.formulaTypeCd + ITEMBa.code] : '0.0';
                                                    }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICLOW') {
                                                        stringFormula += paramMap['OFF_TOTALWDBASICLOW' + paramMap.year];                                                    
                                                    }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICMED') {
                                                        stringFormula += paramMap['OFF_TOTALWDBASICMED' + paramMap.year];                                                    
                                                    }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICHIGH') {
                                                        stringFormula += paramMap['OFF_TOTALWDBASICHIGH' + paramMap.year];                                                    
                                                    }else if(fe.value.toUpperCase() == 'OFF_TOTALTOPUP_FIFO'){
                                                        stringFormula += getTopUpAtYear(paramMap, f+1);
                                                    }else{
                                                        if(map[fe.value + ITEMBa.code] != undefined){
                                                            stringFormula += map[fe.value + ITEMBa.code] ? map[fe.value + ITEMBa.code] : '0.0';
                                                            stringFormulaAlt += map[fe.value + ITEMBa.code] ? map[fe.value + ITEMBa.code] : '0.0';
                                                        }else{
                                                            stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                                            stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                                                        }                            
                                                }                                
                                            } else if (fe.type.toLowerCase().trim() === "load") {
                                                stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                                                stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                                            } else if (fe.type.toLowerCase().trim() === "formula") {
                                                if(fe.value.toUpperCase() === 'INCOMECUST'){
                                                    stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                                    stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                                                }else{
                                                    stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                                    stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                                                }
                                            } else if (fe.type.toLowerCase().trim() === "formulafund") {                                
                                                var tempStringFormula = setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
                                                    tmpFormula, ITEMBa, mapOutputFund, mapOutputFundAlt, null, null, false);
                                                stringFormula = tempStringFormula.stringFormula;
                                                stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                                            } else if (fe.type.toLowerCase().trim() === "string") {
                                                stringFormula += "\'" + fe.value + "\'";
                                                stringFormulaAlt += "\'"+fe.value+"\'";
                                            } else {
                                                stringFormula += fe.value;
                                                stringFormulaAlt += fe.value;
                                            }
                                        } 

                                        if (isValidExpression(stringFormula)) {
                                            var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                                            result = getResultExpression(tempStringFormula.stringFormula);
                                            resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                                            result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, null, null, null, ITEMBa);

                                            //for development purpose only, comment if you wanna build APK
                                            parseToLogFile.parseToLogFile(paramMap, ITEMBa, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                                                'in function getResultFormula SAVER', result, resultAlternativeAsumtion, formula, 'nonPph');

                                            setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion);

                                            if (tmpFormula.output) {
                                                if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                                    if(tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPLOW1' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPMED1' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPHIGH1' ||
                                                       tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPLOW1_PAYOUT' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPMED1_PAYOUT' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPHIGH1_PAYOUT'){
                                                        mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] = result;                                        
                                                        mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;
                                                        mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) + result;
                                                        mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year]) + result;
                                                        mapHelperIndex[tmpFormula.output+ITEMBa.code] = tmpFormula.output;
                                                        mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] = paramMap.year;
                                                    }else if(mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] != paramMap.year && 
                                                            (tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPLOW2' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPMED2' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPHIGH2' ||
                                                             tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPLOW2_PAYOUT' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPMED2_PAYOUT' || tmpFormula.output.toUpperCase() == 'OFF_CVWDTOPUPHIGH2_PAYOUT')){
                                                        if(result < 0 || isNaN(result)) {
                                                            result = 0;                                                         
                                                        }
                                                        mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] = result;        
                                                        mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;                                
                                                        mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) + result;
                                                        mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year]) + result;
                                                    } else if(tmpFormula.output == 'CVTOPUP'){
                                                        if (mapOutputFund[ITEMBa.code] == undefined) {
                                                            mapOutputFund[ITEMBa.code] = {};
                                                        }
                                                       mapOutputFund[ITEMBa.code][tmpFormula.output] = result;
                                                    }                                                                                                   
                                                }
                                            }
                                        }
                                    }
                                    mapResultFormula['MAPHELPER'] = mapHelper; 
                                    mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                                    mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                                    mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                                    mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
                                }
                            }
                        }                                      
                    }    
                }
            }
            ITEM.flagDB = false;
        }
    }

    //Looping for withdrawal only (OFF_CVWD & CVSURRENDERCHARGE)
    var tempMapFormulaListSaver = ITEM.FORMULA_SAVER;
    if (tempMapFormulaListSaver != undefined) {  
        if(paramMap.year != paramMap.LoopForWD){
            paramMap.LoopForWD = paramMap.year;
            var itemCategory = 'New Business';                                                                                                                        
            var loopForFifo = paramMap.year;
            if(loopForFifo > paramMap.LoopForFifo){
                loopForFifo = paramMap.LoopForFifo;
            }

            for(var f = 0; f<loopForFifo; f++){      
                mapHelper[f] = (mapHelper[f] == undefined ? {} : mapHelper[f]);
                var mapHelperIndex = mapHelper[f];                  
                for (var iBa = 0; iBa < newManfaatListBa.length; iBa++) {
                    var itemSelectedBa = newManfaatListBa[iBa];        
                    if(itemSelectedBa.type == 'FUND'){ 
                        var ITEMBa;                                    
                        ITEMBa = rootScope.FUND[itemSelectedBa.code];
                        var x = ITEMBa.FORMULA.filter(function (item) { return (item.category == itemCategory || item.category == 'Both'); });
                        ITEMBa.FORMULA_SAVER = x.filter(function (item) { return (item.target == 'Saver'); });                                
                        ITEMBa.flagDB = itemSelectedBa.flagDB;                        
                        
                        for (var j = 0; j < tempMapFormulaListSaver.length; j++) {                   
                            var tmpFormula = tempMapFormulaListSaver[j];
                            var stringFormula = '';
                            var stringFormulaAlt = '';
                            var stringFormulaOri = '';
                            var result = 0;
                            var resultAlternativeAsumtion = 0;
                            var value;
                        
                            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                                continue;
                            }  
                            
                            if(tmpFormula.precalculated == null || tmpFormula.precalculated == undefined) continue;
                            if(mapHelperIndex[tmpFormula.output+ITEMBa.code] == tmpFormula.output) continue;
        
                            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
                            if (formula) {
                                var isProcess = false
                                if (ITEMBa.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                                    isProcess = true;
                                } else if (ITEMBa.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                                    isProcess = true;
                                } else if (itemSelected.type === 'COVERAGE') {
                                    isProcess = true;
                                }
        
                                if (isProcess) {                        
                                    var tempFormulaElementList = formula.FORMULA_ELEMENT;
                                    for (var k = 0; k < tempFormulaElementList.length; k++) {                            
                                        var fe = tempFormulaElementList[k];
                                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                                        stringFormulaOri += fe.value;
        
                                        if (fe.type.toLowerCase().trim() === "coverage"
                                            || fe.type.toLowerCase().trim() === "customer"
                                            || fe.type.toLowerCase().trim() === "rate"
                                            || fe.type.toLowerCase().trim() === "fund"
                                            || fe.type.toLowerCase().trim() === "product"
                                            || fe.type.toLowerCase().trim() === "allocation"
                                            || fe.type.toLowerCase().trim() === "predefined") {
                                            if(fe.value.toUpperCase() == "SISADANALASTYEAR" || fe.value.toUpperCase() == "SISADANALASTYEAR_MED" || fe.value.toUpperCase() == "SISADANALASTYEAR_HIGH"){
                                                stringFormula += mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ ITEMBa.code+(paramMap.year-1)] ? mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ ITEMBa.code+(paramMap.year-1)] : '0.0';
                                            }else if((fe.value.toUpperCase() == "TOTALSISADANALASTYEAR" || fe.value.toUpperCase() == "TOTALSISADANALASTYEAR_MED" || fe.value.toUpperCase() == "TOTALSISADANALASTYEAR_HIGH") && (paramMap.year > 1)){
                                                stringFormula += mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+(paramMap.year-1)] ? mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+(paramMap.year-1)] : '0.0';
                                            }else if((fe.value.toUpperCase() == "TOTALSISADANA" || fe.value.toUpperCase() == "TOTALSISADANA_MED" || fe.value.toUpperCase() == "TOTALSISADANA_HIGH") && (paramMap.year > 1)){
                                                stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 1);
                                            }else if(fe.value.toUpperCase() == "WDLASTYEAR_LOW" || fe.value.toUpperCase() == "WDLASTYEAR_MED" || fe.value.toUpperCase() == "WDLASTYEAR_HIGH"){
                                                stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 2);
                                            }else if((fe.value.toUpperCase() == "TOTALWD_LOW" || fe.value.toUpperCase() == "TOTALWD_MED" || fe.value.toUpperCase() == "TOTALWD_HIGH") && (paramMap.year > 1)){
                                                stringFormula += getValueMapHelper(ITEMBa.code, paramMap, mapHelper, f, formula, 3);
                                            }else if(fe.value.toUpperCase() == "SISADANA_LOW" || fe.value.toUpperCase() == "SISADANA_MED" || fe.value.toUpperCase() == "SISADANA_HIGH"){
                                                stringFormula += mapHelperIndex['SISADANA'+formula.formulaTypeCd+ ITEMBa.code] ? mapHelperIndex['SISADANA'+formula.formulaTypeCd + ITEMBa.code] : '0.0';
                                            }else if(fe.value.toUpperCase() == "OFF_TOTALTOPUPTHISYEAR_LOW" || fe.value.toUpperCase() == "OFF_TOTALTOPUPTHISYEAR_MED" || fe.value.toUpperCase() == "OFF_TOTALTOPUPTHISYEAR_HIGH"){
                                                stringFormula += mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] ? mapHelperIndex['TOTALSISADANABEFWD'+formula.formulaTypeCd+paramMap.year] : '0.0';0                                                
                                            }else if((fe.value.toUpperCase() == "OFF_WDTYOTHERKANTONG_LOW" || fe.value.toUpperCase() == "OFF_WDTYOTHERKANTONG_MED" || fe.value.toUpperCase() == "OFF_WDTYOTHERKANTONG_HIGH") && paramMap.year > 1 && f > 0){
                                                stringFormula += mapHelper[f-1]['SISADANA'+formula.formulaTypeCd+ITEMBa.code];                                                
                                            }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICLOW') {
                                                stringFormula += paramMap['OFF_TOTALWDBASICLOW' + paramMap.year].toFixed(2);;                                                    
                                            }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICMED') {
                                                stringFormula += paramMap['OFF_TOTALWDBASICMED' + paramMap.year].toFixed(2);;                                                    
                                            }else if (fe.value.toUpperCase() == 'OFF_TOTALWDBASICHIGH') {
                                                stringFormula += paramMap['OFF_TOTALWDBASICHIGH' + paramMap.year].toFixed(2);
                                            }else if(fe.value.toUpperCase() == 'OFF_TOTALTOPUP_FIFO'){
                                                stringFormula += getTopUpAtYear(paramMap, f+1);
                                            }else if(fe.value.toUpperCase() == 'OFF_TOTALWD_FIFO'){
                                                stringFormula += getWithdrawalAtYear(paramMap, (mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code] == undefined ? paramMap.year : (mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code] + 1)));
                                            }else if(fe.value.toUpperCase() == 'RTSURRENDERCHARGES' && 
                                                (tmpFormula.output == 'SURRENDERU2Z_LOW2' || tmpFormula.output == 'SURRENDERU2Z_MED2' || tmpFormula.output == 'SURRENDERU2Z_HIGH2')
                                            ){
                                                stringFormula += (mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] == undefined ? paramMap[fe.value+1] : '0.0' );
                                            } else if(fe.value.toUpperCase() == 'RTSURRENDERCHARGES' && 
                                                (tmpFormula.output == 'CVLOWSURRCHARGES2' || tmpFormula.output == 'CVMEDSURRCHARGES2' || tmpFormula.output == 'CVHIGHSURRCHARGES2' || 
                                                tmpFormula.output == 'SURRENDERU2Z_LY2_LOW' || tmpFormula.output == 'SURRENDERU2Z_LY2_MED' || tmpFormula.output == 'SURRENDERU2Z_LY2_HIGH')
                                            ){
                                                stringFormula += paramMap[fe.value+mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code]] ? paramMap[fe.value+mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code]] : '0.0';
                                            }else if((fe.value.toUpperCase() == 'FT_FIFO_SURR_U2Z' || fe.value.toUpperCase() == 'FT_FIFO_SURR_U2Z_MED' || fe.value.toUpperCase() == 'FT_FIFO_SURR_U2Z_MED') && (paramMap.year > 1)){
                                                stringFormula += mapHelperIndex['FT_FIFO_SURR_U2Z'+formula.formulaTypeCd+ITEMBa.code+(paramMap.year - 1)] 
                                            }
                                            else{ 
                                                if(map[fe.value + ITEMBa.code] != undefined){
                                                    stringFormula += map[fe.value + ITEMBa.code] ? map[fe.value + ITEMBa.code] : '0.0';
                                                    stringFormulaAlt += map[fe.value + ITEMBa.code] ? map[fe.value + ITEMBa.code] : '0.0';
                                                }else{
                                                    stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                                    stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                                                }                            
                                            }                                
                                        } else if (fe.type.toLowerCase().trim() === "load") {
                                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                                        } else if (fe.type.toLowerCase().trim() === "formula") {
                                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                                            }else{
                                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                                            }
                                        } else if (fe.type.toLowerCase().trim() === "formulafund") {    
                                            if(fe.value.toUpperCase() == 'SURRENDERU2Z_LOW' || fe.value.toUpperCase() == 'SURRENDERU2Z_LY_LOW' || fe.value.toUpperCase() == 'SURRENDERU2Z_MED' || fe.value.toUpperCase() == 'SURRENDERU2Z_LY_MED' || fe.value.toUpperCase() == 'SURRENDERU2Z_HIGH' || fe.value.toUpperCase() == 'SURRENDERU2Z_LY_HIGH'){
                                                stringFormula += mapHelperIndex['FT_FIFO_SURR_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] 
                                            }else{
                                                var tempStringFormula = setStringFormulaForFormulaSaverByFormulaElementTypeIsFormulaFund(fe, stringFormula, stringFormulaAlt, paramMap,
                                                    tmpFormula, ITEMBa, mapOutputFund, mapOutputFundAlt, null, null, false);
                                                stringFormula = tempStringFormula.stringFormula;
                                                stringFormulaAlt = tempStringFormula.stringFormulaAlt;
                                            }                                                                        
                                        } else if (fe.type.toLowerCase().trim() === "string") {
                                            stringFormula += "\'" + fe.value + "\'";
                                            stringFormulaAlt += "\'"+fe.value+"\'";
                                        } else {
                                            stringFormula += fe.value;
                                            stringFormulaAlt += fe.value;
                                        }
                                    } 
        
                                    if (isValidExpression(stringFormula)) {
                                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                                        result = getResultExpression(tempStringFormula.stringFormula);
                                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);
        
                                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, null, null, null, ITEMBa);    
        
                                        //for development purpose only, comment if you wanna build APK
                                        parseToLogFile.parseToLogFile(paramMap, ITEMBa, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                                            'in function getResultFormula SAVER', result, resultAlternativeAsumtion, formula, 'nonPph');
        
                                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion);
        
                                        if (tmpFormula.output) {
                                            if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                                if(tmpFormula.output.toUpperCase() == 'OFF_CVWDLOW1' || tmpFormula.output.toUpperCase() == 'OFF_CVWDMED1' || tmpFormula.output.toUpperCase() == 'OFF_CVWDHIGH1'){
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }
                                                    var TOTALWD = applyRoundingToSomeCasesAll(tmpFormula, result, 0);                                                    
                                                    mapHelperIndex['WD'+formula.formulaTypeCd+ITEMBa.code] = result;                                        
                                                    mapHelperIndex['WDLASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;
                                                    mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year]) + parseFloat(TOTALWD.result);
                                                    mapHelperIndex[tmpFormula.output+ITEMBa.code] = tmpFormula.output;
                                                    mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] = paramMap.year;                                                      
                                                    mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code] = paramMap.year;     
                                                    mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] = 1;                                                                                                        
                                                    //SISADANA - WD
                                                    mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) - mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code];
                                                    mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] = mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] - result;
                                                    mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] - result;
                                                    mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) + mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code];                                                                                                        
                                                }else if(mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] != paramMap.year && (tmpFormula.output.toUpperCase() == 'OFF_CVWDLOW2' || tmpFormula.output.toUpperCase() == 'OFF_CVWDMED2' || tmpFormula.output.toUpperCase() == 'OFF_CVWDHIGH2')){
                                                    //NEED PRECALCULATED ON DB
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }
                                                    var TOTALWD = applyRoundingToSomeCasesAll(tmpFormula, result, 0);                                                    
                                                    mapHelperIndex['WD'+formula.formulaTypeCd+ITEMBa.code] = result;        
                                                    mapHelperIndex['WDLASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;                                
                                                    mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALWD'+formula.formulaTypeCd+paramMap.year]) + parseFloat(TOTALWD.result);
                                                    mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code] = (mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code] == undefined ? 0 : mapHelperIndex['FLAGWD'+formula.formulaTypeCd+ITEMBa.code]) + 1;  
                                                    mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] = mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] + 1;                                                    
                                                    //SISADANA - WD
                                                    mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) - mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code];
                                                    mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] = mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code] - result;
                                                    mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = mapHelperIndex['SISADANALASTYEAR'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] - result;
                                                    mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] = (mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year] == undefined ? 0 : mapHelperIndex['TOTALSISADANA'+formula.formulaTypeCd+paramMap.year]) + mapHelperIndex['SISADANA'+formula.formulaTypeCd+ITEMBa.code];                                                    
                                                } else if(tmpFormula.output.toUpperCase() == 'CVLOWSURRCHARGES2' || tmpFormula.output.toUpperCase() == 'CVMEDSURRCHARGES2' || tmpFormula.output.toUpperCase() == 'CVHIGHSURRCHARGES2'){
                                                    //NEED PRECALCULATED ON DB
                                                    mapHelperIndex['SURRCHARGE'+formula.formulaTypeCd+ITEMBa.code] = result;
                                                } else if(tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LOW' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_MED' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_HIGH'){
                                                    //SURRENDERU2ZFIFO
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }
                                                    mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] = paramMap.year;
                                                    mapHelperIndex['FT_FIFO_SURR_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;                                                    
                                                    mapHelperIndex[tmpFormula.output+ITEMBa.code] = tmpFormula.output;                                                    
                                                }  else if(tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LOW2' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_MED2' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_HIGH2'){
                                                    //SURRENDERU2ZFIFO
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }                                                    
                                                    mapHelperIndex['FT_FIFO_SURR_TOTAL_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;
                                                    mapHelperIndex[tmpFormula.output+ITEMBa.code] = tmpFormula.output;
                                                    mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] = paramMap.year;
                                                    mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] = 2;
                                                } else if(mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] != paramMap.year && (tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY_LOW' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY_MED' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY_HIGH')){
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }                                                    
                                                    mapHelperIndex['FT_FIFO_SURR_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = result;
                                                } else if(mapHelperIndex['YEAR'+formula.formulaTypeCd+ITEMBa.code] != paramMap.year && (tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY2_LOW' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY2_MED' || tmpFormula.output.toUpperCase() == 'SURRENDERU2Z_LY2_HIGH')){
                                                    if(result < 0 || isNaN(result)) {
                                                        result = 0;                                                         
                                                    }                                                    
                                                    mapHelperIndex['FT_FIFO_SURR_TOTAL_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] = (mapHelperIndex['FT_FIFO_SURR_TOTAL_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year] == undefined ? 0 : mapHelperIndex['FT_FIFO_SURR_TOTAL_U2Z'+formula.formulaTypeCd+ITEMBa.code+paramMap.year]) + result;
                                                    mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] = mapHelperIndex['SURRCHARGEYEAR'+formula.formulaTypeCd+ITEMBa.code] + 1;
                                                }
                                            }
                                        }
                                    }
                                }
                                mapResultFormula['MAPHELPER'] = mapHelper; 
                                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
                            }
                        }
                        
                    }    
                }
                
            }              
            ITEM.flagDB = false;
        }
    }

    var tempMapFormulaListEmpty = ITEM.FORMULA_EMPTY;
    if (tempMapFormulaListEmpty != undefined) {
        for (var j = 0; j < tempMapFormulaListEmpty.length; j++) {
            var tmpFormula = tempMapFormulaListEmpty[j];
            var stringFormula = '';
            var stringFormulaAlt = '';
            var stringFormulaOri = '';
            var result = 0;
            var resultAlternativeAsumtion = 0;
            var value;

            if (tmpFormula.itemType.toLowerCase() == 'fund' && tmpFormula.itemGroupProductCd.indexOf(map.mainCoverage) == -1) {
                continue;
            }

            var formula = rootScope.FORMULA[tmpFormula.formulaCd];
            if (formula) {
                var isProcess = false
                if (ITEM.flagDB == true && (formula.formulaTypeCd.indexOf('TOTALCVDB') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') !== -1 || formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') !== -1)) {
                    isProcess = true;
                } else if (ITEM.flagDB == false && (formula.formulaTypeCd.indexOf('TOTALCVDB') === -1 && formula.formulaTypeCd.indexOf('TOTALCVLOWDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVMEDDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVHIGHDISPLAY') === -1 && formula.formulaTypeCd.indexOf('TOTALCVTOPUPLOWDISPLAY') === -1)) {
                    isProcess = true;
                } else if (itemSelected.type === 'COVERAGE') {
                    isProcess = true;
                }

                if (isProcess) {
                    var tempFormulaElementList = formula.FORMULA_ELEMENT;

                    for (var k = 0; k < tempFormulaElementList.length; k++) {
                        var fe = tempFormulaElementList[k];
                        fe.value = fe.value == "''" ? '' : fe.value.trim();
                        stringFormulaOri += fe.value;

                        if (fe.type.toLowerCase().trim() === "coverage"
                            || fe.type.toLowerCase().trim() === "customer"
                            || fe.type.toLowerCase().trim() === "rate"
                            || fe.type.toLowerCase().trim() === "fund"
                            || fe.type.toLowerCase().trim() === "product"
                            || fe.type.toLowerCase().trim() === "allocation"
                            || fe.type.toLowerCase().trim() === "predefined") {

                            if (tmpFormula.output == 'FUNDAVAL' && fe.value.toUpperCase() == 'TOTALCVLOW') {
                                stringFormula += mapOutputCoverage['TOTALCVLOW'] ? mapOutputCoverage['TOTALCVLOW'] : '0.0';;
                            } else if (fe.value.toUpperCase() == 'TOTALCVLOW' && (isVIA || isBIAMax)) {
                                stringFormula += mapResultPerYear['CVTOTALLOWDISPLAY'] ? mapResultPerYear['CVTOTALLOWDISPLAY'] : '0.0';
                       //         stringFormulaAlt += mapResultPerYear['CVTOTALLOWDISPLAY'] ? mapResultPerYear['CVTOTALLOWDISPLAY'] : '0.0';
                            } else if (fe.value.toUpperCase() == 'TOTALCVMED' && (isVIA || isBIAMax)) {
                                stringFormula += mapResultPerYear['CVTOTALMEDDISPLAY'] ? mapResultPerYear['CVTOTALMEDDISPLAY'] : '0.0';
                      //          stringFormulaAlt += mapResultPerYear['CVTOTALMEDDISPLAY'] ? mapResultPerYear['CVTOTALMEDDISPLAY'] : '0.0';
                            } else if (fe.value.toUpperCase() == 'TOTALCVHIGH' && (isVIA || isBIAMax)) {
                                stringFormula += mapResultPerYear['CVTOTALHIGHDISPLAY'] ? mapResultPerYear['CVTOTALHIGHDISPLAY'] : '0.0';
                      //          stringFormulaAlt += mapResultPerYear['CVTOTALHIGHDISPLAY'] ? mapResultPerYear['CVTOTALHIGHDISPLAY'] : '0.0';
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMILOW') {
                                stringFormula += paramMap['TOTALCVPREMILOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMED') {
                                stringFormula += paramMap['TOTALCVPREMIMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGH') {
                                stringFormula += paramMap['TOTALCVPREMIHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHALT' + paramMap.year];
                            }                                                         
                                                        
                            else if((fe.value.toUpperCase() == "TOTALWD_LOW" || fe.value.toUpperCase() == "TOTALWD_MED" || fe.value.toUpperCase() == "TOTALWD_HIGH") && (paramMap.year > 1)){
                                stringFormula += getValueMapHelper(ITEM.code, paramMap, mapHelper, (paramMap.year > 10 ? 10 : paramMap.year), formula, 3);
                            }

                            else if (fe.value.toUpperCase() == 'TOTALCASHPAYOUTLOW') {
                                stringFormula += paramMap['TOTALCASHPAYOUTLOW' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCASHPAYOUTMED') {
                                stringFormula += paramMap['TOTALCASHPAYOUTMED' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCASHPAYOUTHIGH') {
                                stringFormula += paramMap['TOTALCASHPAYOUTHIGH' + paramMap.year];
                            }
                            
                            else if (fe.value.toUpperCase() == 'CVLOWSURRCHARGES') {
                                if(paramMap.prodCd.toUpperCase() == 'U2Z'){
                                    stringFormula += paramMap['CVLOWSURRCHARGES' + paramMap.year + ITEM.code];                                    
                                }else{
                                    stringFormula += paramMap['CVLOWSURRCHARGES' + paramMap.year];
                                    stringFormulaAlt += paramMap['CVLOWSURRCHARGESALT' + paramMap.year];
                                }                                
                            } else if (fe.value.toUpperCase() == 'CVMEDSURRCHARGES') {
                                if(paramMap.prodCd.toUpperCase() == 'U2Z'){
                                    stringFormula += paramMap['CVMEDSURRCHARGES' + paramMap.year + ITEM.code];                                    
                                }else{
                                    stringFormula += paramMap['CVMEDSURRCHARGES' + paramMap.year];
                                    stringFormulaAlt += paramMap['CVMEDSURRCHARGESALT' + paramMap.year];
                                }
                            } else if (fe.value.toUpperCase() == 'CVHIGHSURRCHARGES') {
                                if(paramMap.prodCd.toUpperCase() == 'U2Z'){
                                    stringFormula += paramMap['CVHIGHSURRCHARGES' + paramMap.year + ITEM.code];                                    
                                }else{
                                    stringFormula += paramMap['CVHIGHSURRCHARGES' + paramMap.year];
                                    stringFormulaAlt += paramMap['CVHIGHSURRCHARGESALT' + paramMap.year];
                                }
                            } else if (fe.value.toUpperCase() == 'OFF_CVLOWSURRCHARGES') {
                                stringFormula += paramMap['OFF_CVLOWSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['OFF_CVLOWSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'OFF_CVMEDSURRCHARGES') {
                                stringFormula += paramMap['OFF_CVMEDSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['OFF_CVMEDSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'OFF_CVHIGHSURRCHARGES') {
                                stringFormula += paramMap['OFF_CVHIGHSURRCHARGES' + paramMap.year];
                                stringFormulaAlt += paramMap['OFF_CVHIGHSURRCHARGESALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMILOWLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMILOWLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMILOWLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIMEDLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMIMEDLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIMEDLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVPREMIHIGHLB_DB') {
                                stringFormula += paramMap['TOTALCVPREMIHIGHLB_DB' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVPREMIHIGHLB_DBALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPLOW') {
                                stringFormula += paramMap['TOTALCVTOPUPLOW' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPLOWALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPMED') {
                                stringFormula += paramMap['TOTALCVTOPUPMED' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPMEDALT' + paramMap.year];
                            } else if (fe.value.toUpperCase() == 'TOTALCVTOPUPHIGH') {
                                stringFormula += paramMap['TOTALCVTOPUPHIGH' + paramMap.year];
                                stringFormulaAlt += paramMap['TOTALCVTOPUPHIGHALT' + paramMap.year];
                            } else if(fe.value.toUpperCase() == 'FT_FIFO_SURR_TOTAL_U2Z'){
                                stringFormula += getValueMapHelper(ITEM.code, paramMap, mapHelper, null, formula, 3);
                            }
                            else {
                                if(map[fe.value + ITEM.code] != undefined){
                                    stringFormula += map[fe.value + ITEM.code] ? map[fe.value + ITEM.code] : '0.0';
                                    stringFormulaAlt += map[fe.value + ITEM.code] ? map[fe.value + ITEM.code] : '0.0';
                                }else{
                                    stringFormula += map[fe.value] ? map[fe.value] : '0.0';
                                    stringFormulaAlt += map[fe.value] ? map[fe.value] : '0.0';
                                }                                  
                            }
                        } else if (fe.type.toLowerCase().trim() === "load") {
                            stringFormula += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                            stringFormulaAlt += itemSelected.loadMap[fe.value] ? itemSelected.loadMap[fe.value] : '0.0';
                        } else if (fe.type.toLowerCase().trim() === "formula") {
                            if(fe.value.toUpperCase() === 'INCOMECUST'){
                                stringFormula += "\'" + mapOutputCoverage[fe.value] +"\'";
                                stringFormulaAlt += "\'" + mapOutputCoverageAlt[fe.value] +"\'";
                            }else{
                                stringFormula += mapOutputCoverage[fe.value] ? mapOutputCoverage[fe.value] : '0.0';
                                stringFormulaAlt += mapOutputCoverageAlt[fe.value] ? mapOutputCoverageAlt[fe.value] : '0.0';
                            }
                        } else if (fe.type.toLowerCase().trim() === "formulafund") {
                            if((fe.value.toUpperCase() === 'OFF_CVWDTOPUPLOW1' && tmpFormula.output == 'OFF_CVWDTOPUPLOW') ||
                               (fe.value.toUpperCase() === 'OFF_CVWDTOPUPMED1' && tmpFormula.output == 'OFF_CVWDTOPUPMED') ||
                               (fe.value.toUpperCase() === 'OFF_CVWDTOPUPHIGH1' && tmpFormula.output == 'OFF_CVWDTOPUPHIGH')
                            ){
                                stringFormula += getValueMapHelper(ITEM.code, paramMap, mapHelper, null, formula, 1);
                            }else if((fe.value.toUpperCase() === 'CVLOWSURRCHARGES2' && tmpFormula.output == 'CVLOWSURRCHARGES') ||
                                (fe.value.toUpperCase() === 'CVMEDSURRCHARGES2' && tmpFormula.output == 'CVMEDSURRCHARGES') || 
                                (fe.value.toUpperCase() === 'CVHIGHSURRCHARGES2' && tmpFormula.output == 'CVHIGHSURRCHARGES')
                            ){
                                stringFormula += getValueMapHelper(ITEM.code, paramMap, mapHelper, null, formula, 2);
                            }else if((fe.value.toUpperCase() === 'OFF_CVWDTOPUPLOW1_PAYOUT' && tmpFormula.output == 'OFF_CVWDTOPUPLOW_PAYOUT') ||
                                (fe.value.toUpperCase() === 'OFF_CVWDTOPUPMED1_PAYOUT' && tmpFormula.output == 'OFF_CVWDTOPUPMED_PAYOUT') || 
                                (fe.value.toUpperCase() === 'OFF_CVWDTOPUPHIGH1_PAYOUT' && tmpFormula.output == 'OFF_CVWDTOPUPHIGH_PAYOUT')
                            ){
                                stringFormula += getValueMapHelper(ITEM.code, paramMap, mapHelper, null, formula, 1);
                            }else{
                                if(mapOutputFund[ITEM.code] != undefined && mapOutputFund[ITEM.code][fe.value + ITEM.code] != undefined){
                                    stringFormula += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFund);
                                    stringFormulaAlt += getValueFund(ITEM.code, fe.value + ITEM.code, mapOutputFundAlt);    
                                }else{
                                    stringFormula += getValueFund(ITEM.code, fe.value, mapOutputFund);
                                    stringFormulaAlt += getValueFund(ITEM.code, fe.value,mapOutputFundAlt);
                                }                            
                            }                             
                        } else if (fe.type.toLowerCase().trim() === "string") {
                            stringFormula += "\'" + fe.value + "\'";
                            stringFormulaAlt += "\'" + fe.value + "\'";
                        } else {
                            stringFormula += fe.value;
                            stringFormulaAlt += fe.value;
                        }
                    }

                    if (isValidExpression(stringFormula)) {
                        var tempStringFormula = processPowAndMinusNegativeOnFormula(stringFormula, stringFormulaAlt);
                        result = getResultExpression(tempStringFormula.stringFormula);
                        resultAlternativeAsumtion = getResultExpression(tempStringFormula.stringFormulaAlt);

                        result = setResultToZeroBySomeCases(flag, tmpFormula, formula, paramMap, result, null, null, null, ITEM);

                        //for development purpose only, comment if you wanna build APK
                        parseToLogFile.parseToLogFile(paramMap, ITEM, tmpFormula, stringFormulaOri, stringFormula, stringFormulaAlt, 
                            'in function getResultFormula EMPTY', result, resultAlternativeAsumtion, formula, 'nonPph');

                        setParamMapByResultAndResultAltBasedOnFormulaTypeCd(formula, tmpFormula, paramMap, result, resultAlternativeAsumtion, ITEM);
                        
                        // set value  for validation      
                        if(tmpFormula.output == 'CVWITHDRAW'){
                            cvWithdrawValue = result;
                        }

                        
                        if(tmpFormula.output == 'FUNDAVAL' && cvWithdrawValue > 1){
                            // if(result == '1'){
                                mapOutputCoverage[tmpFormula.output] = result;
                                // break;
                            // }
                        }

                        if(tmpFormula.output == 'CVTOTALHIGHDISPLAY' || tmpFormula.output == 'CVTOTALMEDDISPLAY' || tmpFormula.output == 'CVTOTALLOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUELOWDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEMEDDISPLAY' || tmpFormula.output == 'TOTALSURRVALUEHIGHDISPLAY'){
                            mapResultPerYear[tmpFormula.output] = result;
                        }

                        if(tmpFormula.output == 'CVTOTALLOWAFTERSURR' || tmpFormula.output == 'CVTOTALMEDAFTERSURR' || tmpFormula.output == 'CVTOTALHIGHAFTERSURR')
                            mapResultPerYear[tmpFormula.output] = result;
                      

                        if (tmpFormula.output) {
                            if ('COVERAGE' === tmpFormula.itemType.toUpperCase()) {
                                value = mapOutputCoverage[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverage[tmpFormula.output]) {
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    } else {
                                        value = (value + result);
                                        mapOutputCoverage[tmpFormula.output] = value;
                                    }
                                } else {
                                    if ((tmpFormula.output != 'SABASIC' && formula.formulaTypeCd != 'FT_PRECALC')
                                        || (tmpFormula.output == 'SABASIC' && mapOutputCoverage['SABASIC'] === undefined)) {
                                        mapOutputCoverage[tmpFormula.output] = result;
                                    }
                                }

                                value = mapOutputCoverageAlt[tmpFormula.output];
                                if (value) {
                                    if ("ADMINCHARGE" === mapOutputCoverageAlt[tmpFormula.output]) {
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    } else {
                                        value = (value + resultAlternativeAsumtion);
                                        mapOutputCoverageAlt[tmpFormula.output] = value;
                                    }
                                } else {
                                    mapOutputCoverageAlt[tmpFormula.output] = resultAlternativeAsumtion;
                                }                                

                                if ('CHARGERIDER' == formula.formulaTypeCd || 'CHARGEINSURANCE' == formula.formulaTypeCd) {
                                    mapResultFormula[formula.formulaTypeCd] = (result / 12);
                                }

                                if (true == tmpFormula.forSpecificRider) {
                                    mapOutputCoverage[tmpFormula.output + "_" + tmpFormula.coverage] = result;
                                }

                            } else if ('FUND' === tmpFormula.itemType.toUpperCase()) {
                                var itemCd = ITEM.code;

                                value = mapOutputCoverage[formula.formulaTypeCd];
                                if (isBIAMax) {
                                    if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                        && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                        && formula.formulaTypeCd != 'FT_CVWITHDRAWAL'
                                    )) {

                                        if (isBIAMax) {
                                            result = getResultValDisplayBIAMax(result, formula, paramMap, ITEM);
                                        }

                                        if (tmpFormula.output == 'FUNDAVAL') {
                                            result = 0;
                                        }

                                        value = (value + result);
                                        if (isBIAMax) value = setValidationBIAMaxDeathBenefit(value, formula, mapOutputCoverage);                                        
                                        if (isBIAMax) {
                                            if (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALLOW'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVMEDDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALMED'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') {
                                                value = mapOutputCoverage[formula.formulaTypeCd] + mapOutputFund[itemCd]['CVTOTALHIGH'];
                                            }
                                        }
                                        if (isBIAMax && (
                                            formula.formulaTypeCd == 'TOTALCVLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY' ||
                                            formula.formulaTypeCd == 'TOTALCVLOWAFTRSURR' || formula.formulaTypeCd == 'TOTALCVMEDAFTRSURR' || formula.formulaTypeCd == 'TOTALCVHIGHAFTRSURR'
                                            ) && (paramMap.fundList[paramMap.fundList.length - 1].code != itemCd)) {
                                            // mapOutputCoverage[formula.formulaTypeCd] = (value < 0 ? -1 : value);
                                            mapOutputCoverage[formula.formulaTypeCd] = value;
                                        } else {
                                            // mapOutputCoverage[formula.formulaTypeCd] = value;
                                            mapOutputCoverage[formula.formulaTypeCd] = (value < 0 ? -1 : value);
                                        }
                                    } else {
                                        if (isBIAMax) {
                                            result = getResultValDisplayBIAMax(result, formula, paramMap, ITEM)
                                        }
                                        if (isBIAMax) {
                                            if (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALLOW'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVMEDDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALMED'];
                                            } else if (formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') {
                                                result = mapOutputFund[itemCd]['CVTOTALHIGH'];
                                            }
                                            if (isBIAMax && (formula.formulaTypeCd == 'TOTALCVLOWDISPLAY' || formula.formulaTypeCd == 'TOTALCVMEDDISPLAY' || formula.formulaTypeCd == 'TOTALCVHIGHDISPLAY') && (paramMap.fundList[paramMap.fundList.length - 1].code != itemCd)) {
                                                // mapOutputCoverage[formula.formulaTypeCd] = (result < 0 ? -1 : result);
                                                mapOutputCoverage[formula.formulaTypeCd] = result;
                                            } else {
                                                mapOutputCoverage[formula.formulaTypeCd] = result;
                                                // mapOutputCoverage[formula.formulaTypeCd] = (result < 0 ? -1 : result);
                                            }                                            
                                        } else {
                                            mapOutputCoverage[formula.formulaTypeCd] = result;
                                        }

                                    }
                                } else {
                                    if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                        && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                        && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                        && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                        && formula.formulaTypeCd != 'TOTALCVDBLOWDISPLAY'
                                        && formula.formulaTypeCd != 'TOTALCVDBMEDDISPLAY'
                                        && formula.formulaTypeCd != 'TOTALCVDBHIGHDISPLAY'
                                        && formula.formulaTypeCd != 'FT_CVWITHDRAWAL'
                                        && formula.formulaTypeCd != 'TOTALCVLOWPAYOUT'
                                        && formula.formulaTypeCd != 'TOTALCVMEDPAYOUT'
                                        && formula.formulaTypeCd != 'TOTALCVHIGHPAYOUT')) {
                                        value = (value + result);
                                        mapOutputCoverage[formula.formulaTypeCd] = value;
                                    } else {
                                        result = setResultToZeroForDisplay(tmpFormula, paramMap, result);
                                        mapOutputCoverage[formula.formulaTypeCd] = result;
                                    }
                                }
                                
                                value = mapOutputCoverageAlt[formula.formulaTypeCd];
                                if (value && (formula.formulaTypeCd != 'TOTALCVLOWFUNDDSPLY'
                                    && formula.formulaTypeCd != 'TOTALCVMEDFUNDDSPLY'
                                    && formula.formulaTypeCd != 'TOTALCVHIGHFUNDDSPLY'
                                    && formula.formulaTypeCd != 'FT_SURRENDERLOWVALUE'
                                    && formula.formulaTypeCd != 'FT_SURRENDERMEDVALUE'
                                    && formula.formulaTypeCd != 'FT_SURRENDERHIGHVALU'
                                    && formula.formulaTypeCd != 'TOTALCVDBLOWDISPLAY'
                                    && formula.formulaTypeCd != 'TOTALCVDBMEDDISPLAY'
                                    && formula.formulaTypeCd != 'TOTALCVDBHIGHDISPLAY'
                                    && formula.formulaTypeCd != 'FT_CVWITHDRAWAL'
                                    && formula.formulaTypeCd != 'TOTALCVLOWPAYOUT'
                                    && formula.formulaTypeCd != 'TOTALCVMEDPAYOUT'
                                    && formula.formulaTypeCd != 'TOTALCVHIGHPAYOUT')) {
                                    value = (value + resultAlternativeAsumtion);
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = value;
                                } else {
                                    mapOutputCoverageAlt[formula.formulaTypeCd] = resultAlternativeAsumtion;
                                }


                                if (mapOutputFund[itemCd] == undefined) {
                                    mapOutputFund[itemCd] = {};
                                }
                                mapOutputFund[itemCd][tmpFormula.output] = result;

                                if(mapOutputFundAlt[itemCd] == undefined){
                                    mapOutputFundAlt[itemCd] =  {};
                                }
                                mapOutputFundAlt[itemCd][tmpFormula.output] = resultAlternativeAsumtion;
                            }
                        }
                    }
                }
                mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
                mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
                mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
                mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
            }
        }
    }

    if(paramMap.prodCd.toUpperCase() == 'U4K' || paramMap.prodCd.toUpperCase() == 'U2Z'){
        mapResultFormula['MAPHELPER'] = mapHelper;    
    }
    mapResultFormula['MAPOUTPUTCOVERAGE'] = mapOutputCoverage;
    mapResultFormula['MAPOUTPUTFUND'] = mapOutputFund;
    mapResultFormula['MAPOUTPUTCOVERAGEALT'] = mapOutputCoverageAlt;
    mapResultFormula['MAPOUTPUTFUNDALT'] = mapOutputFundAlt;
    mapResultFormula['MAPOUTPUTFUNDPERTAHUN'] = mapResultPerYear;

    return mapResultFormula;
}

function setParamToUndefined(param) {
    param['SA_CCB'] = undefined;
}

function getTopUpAtYear(param, year){
    var listopup = param.topupList;
    var result = 0;
    for(var i=0; i<listopup.length; i++){
        if(parseInt(listopup[i].year) == year){
            result = listopup[i].amount;
            break;
        }        
    }    
    return parseFloat(result);
}

function getWithdrawalAtYear(param, year){
    var listwd = param.withdrawalList;
    var result = 0;
    for(var i=0; i<listwd.length; i++){
        if(parseInt(listwd[i].year) == year){
            result = listwd[i].amount;
            break;
        }        
    }    
    return parseFloat(result);
}

function getValueMapHelper(code, param, mapHelper, totalSisaDanaBeforeI, formula, flag){
    var result = 0 ;
    var lengthAll = mapHelper.length;
    if(totalSisaDanaBeforeI!=null){
        lengthAll = totalSisaDanaBeforeI;
    }
    for(var f=0; f<lengthAll; f++){
        var index = mapHelper[f];
        if(totalSisaDanaBeforeI!=null){
            if(flag == 1){
                result += index['SISADANA'+formula.formulaTypeCd+code];
            }else if(flag == 2){
                result += index['WD'+formula.formulaTypeCd+code];
            }else if(flag == 3){
                result += index['TOTALWD'+formula.formulaTypeCd+param.year];
            }else if(flag == 4){
                if(formula.formulaTypeCd.toUpperCase().match(/_PAYOUT/g)){
                    result += index['SISADANALASTYEAR'+formula.formulaTypeCd.replace("_PAYOUT", "")+code+(param.year-1)];
                }else {
                    result += index['SISADANALASTYEAR'+formula.formulaTypeCd+code+(param.year-1)];
                }                
            }else if(flag == 5){
                if(result == 0)  result = index['SISADANALASTYEAR'+formula.formulaTypeCd+code+(param.year-1)];
                else result -= index['SISADANALASTYEAR'+formula.formulaTypeCd+code+(param.year-1)];
            }
        }else{
            if(flag == 1){
                result += index['SISADANA'+formula.formulaTypeCd+code];
            }else if(flag == 2){
                result += index['SURRCHARGE'+formula.formulaTypeCd+code];
            }else if(flag == 3){
                result += index['FT_FIFO_SURR_TOTAL_U2Z'+formula.formulaTypeCd+code+param.year];
            }
        }        
    }
    return result;
}

function setFUWOrSIOForProduct(param, formula, ITEM, lifeAsiaCd, map, mapResult, mapGio, result){
    if (param.isFUW != true) {
        if ((formula.output.match(/CONVPRODUCT.*/) || formula.output.match(/CONVRIDER.*/)) && param.year == 1){                                                                                                                                                                     
            if (ITEM.coverageCode != result) {                                
                mapResult['isGio'] = true;                                
                if(lifeAsiaCd.hasOwnProperty(map.PDTERM)){
                    if(getKeyByValue(lifeAsiaCd)){
                        mapGio[ITEM.coverageCode] = result;                                        
                    }else{
                        var resultEnd = lifeAsiaCd[map.PDTERM]
                        if(ITEM.coverageCode.charAt(0).toUpperCase() == 'S'){
                            if(ITEM.currencyCd == "IDR") {
                                resultEnd = resultEnd.replace("R", "1"); 
                            } else {
                                resultEnd = resultEnd.replace("D", "2"); 
                            }
                        }else{
                            resultEnd = resultEnd.replace('1', '2'); 
                        }
                        if (mapGio[ITEM.coverageCode]) {
                            mapGio[ITEM.coverageCode+-2] = resultEnd;
                        } else {
                            mapGio[ITEM.coverageCode] = resultEnd;
                        }                                    
                    }                                    
                }else{
                    mapGio[ITEM.coverageCode] = result;                                    
                }                                    
            } else {
                mapResult['isGio'] = false;
                if(lifeAsiaCd.hasOwnProperty(map.PDTERM)){  
                    if (mapGio[ITEM.coverageCode]) {
                        mapGio[ITEM.coverageCode+-2] = lifeAsiaCd[map.PDTERM];;
                    } else {
                        mapGio[ITEM.coverageCode] = lifeAsiaCd[map.PDTERM];;
                    }                                                                                             
                }else{                                       
                    mapGio[ITEM.coverageCode] = result;                   
                }                                    
            }                            
        }
    } else {
        if (ITEM.shortDescription.indexOf('PRUsaver') === -1) {            
            if(lifeAsiaCd.hasOwnProperty(map.PDTERM)){                                                                          
                if (mapGio[ITEM.coverageCode] && (
                    ITEM.coverageCode == 'W3AR' || ITEM.coverageCode == 'W3AD' ||
                    ITEM.coverageCode == 'W1XR' || ITEM.coverageCode == 'W1XD'
                )) {
                    mapGio[ITEM.coverageCode+-2] = lifeAsiaCd[map.PDTERM];;
                } else {
                    mapGio[ITEM.coverageCode] = lifeAsiaCd[map.PDTERM];;
                }    
            }else{                    
                mapGio[ITEM.coverageCode] = ITEM.coverageCode;                              
            }                                         
        }        
    }
}

exports.getUnappliedPremium = getUnappliedPremium
exports.processIlustration = processIlustration
exports.reMappingCode = reMappingCode
exports.setRootScope = setRootScope