/**
 * Created by Tom on 28/03/14.
 */

var wowcdapp = angular.module('wowcdapp',['mgcrea.ngStrap','ui.router','LocalStorageModule','angular-loading-bar']);

wowcdapp.factory('wowdataloader', function($http,$q,$state,$rootScope,wowdata,fightdata){
    return {
        getAbilities: function(){
            $rootScope.loadingView = true;
            //populate required list
            //for each spec in raid
            //request '/abilities/class/spec'
            var promise = $http({method: 'GET',url:('/abilities')}).success(function(data,status,headers,config) {
                wowdata.abilities = angular.fromJson(data);
                for (var i = 0; i < wowdata.abilities.length; i++){
                    wowdata.abilities[i].fullIconPath = "img/cdicons/"+ wowdata.abilities[i].icon;
                }
            });
            return promise;
        },
        getClasses: function(){
            $rootScope.loadingView = true;
            if (wowdata.classes.length > 0) return wowdata.classes;
            var promise = $http({method: 'GET',url:('/classes')}).success(function(data,status,headers,config) {
                wowdata.classes = angular.fromJson(data);
            });
            return promise;
        },
        getSpecs: function(){
            $rootScope.loadingView = true;
            if (wowdata.specs.length > 0) return wowdata.specs;
            var promise = $http({method: 'GET',url:('/specs')}).success(function(data,status,headers,config) {
                wowdata.specs = angular.fromJson(data);
            });
            return promise;
        },
        getFights: function(){
            $rootScope.loadingView = true;
            if (wowdata.fights.length > 0) return wowdata.fights;
            var promise = $http({method: 'GET',url:('/fights')}).success(function(data,status,headers,config) {
                wowdata.fights = angular.fromJson(data);
            })
            return promise;
        },
        getPhases: function(){
            if (fightdata.currentfight.name === undefined) return [];
            var promise = $http({method: 'GET',url:('/phases'),params:{_id:fightdata.currentfight.phases}}).success(function(data,status,headers,config) {
                fightdata.phases = angular.fromJson(data);
            })
            return promise;
        }
    };
});
wowcdapp.factory('wowdata', function(){
    return {
        abilities: [],
        classes: [],
        specs: [],
        fights: [],
        getSpecById: function(spec){
            for(var i = 0; i < this.specs.length; i++){
                if(spec === this.specs[i].id)
                    return this.specs[i]
            }
        },
        getAbilityById: function(id){
            for(var i = 0; i < this.abilities.length; i++){
                if(id === this.abilities[i].id)
                    return this.abilities[i]
            }
        },
        getPlayerAbilities: function(cla,spec){
            var abilityArray = [];
            for(var i = 0; i < cla.abilities.length; i++){
                abilityArray.push(this.getAbilityById(cla.abilities[i]));
            }
            for(var i = 0; i < cla.talents.length; i++){
                abilityArray.push(this.getAbilityById(cla.talents[i]));
            }
            for(var i = 0; i < spec.abilities.length; i++){
                abilityArray.push(this.getAbilityById(spec.abilities[i]));
            }
            return abilityArray;
        }
    }
});
wowcdapp.service('raiddata',function(wowdata,localStorageService){
    var self = this;
    this.players = [];
    this.raidsize = 20;
    var uid = 0;
    var lsString = localStorageService.get('wowbasiccdsraid');
    if(lsString === null){
        console.log('no local storage detected');
    }else{

        this.players = lsString;
        uid = parseInt(localStorageService.get('wowbasiccdsuid'));
    }

    this.saveRaid = function(){
        localStorageService.set('wowbasiccdsraid',angular.toJson(this.players));
        localStorageService.set('wowbasiccdsuid',angular.toJson(uid));
    }

    generateName = function(cla,spec){
        var name_suffix = 1;
        var name_valid = true;
        var name = spec.name + " " + cla.name + " " + name_suffix;
        //check if name exists, if so, increment suffix
        do {
            name_valid = true;
            for (var i = 0; i < self.players.length; i++) {
                if (self.players[i].name === name) {
                    name_valid = false;
                    name = spec.name + " " + cla.name + " " + name_suffix++;
                    break;
                }
            }
        } while (!name_valid);
        return name;
    }

    this.addPlayer = function(name,cla,spec){
        if(this.players.length < this.raidsize){
            if(name === "") {
                var name = generateName(cla,spec);
            }
            this.players[this.players.length] = {uid:uid,name:name,class:cla,spec:spec,abilities:wowdata.getPlayerAbilities(cla,spec)};
            uid++;
        }
    }
    this.specChange = function(index,spec){
    if((index >= 0) && (index < this.raidsize) && (index < this.players.length)){
        var player = this.players[index];
            //is name custom?
            var nameArray = player.name.split(" ");
            if(nameArray.length === 3){
                if((nameArray[0] === player.spec.name) && (nameArray[1] === player.class.name) && (!isNaN(nameArray[2]))){
                    player.spec = spec;
                    player.name = generateName(player.class,player.spec)
                }
            }
            if(nameArray.length === 4){
                //fix for bm hunter
                if((nameArray[0] + " " + nameArray[1] === player.spec.name) && (nameArray[2] === player.class.name) && (!isNaN(nameArray[3]))){
                    player.spec = spec;
                    player.name = generateName(player.class,player.spec)
                }
                //fix for dk
                if((nameArray[0] === player.spec.name) && (nameArray[1]+ " " + nameArray[2] === player.class.name) && (!isNaN(nameArray[3]))){
                    player.spec = spec;
                    player.name = generateName(player.class,player.spec)
                }
            }
            player.spec = spec;
        }
        player.uid = uid++;
    }
    this.removePlayer = function(index){
        if((index >= 0) && (index < this.raidsize) && (index < this.players.length)){
            this.players.splice(index,1);
        }
    }
    this.getAbilities = function(){
        var abilityList = [];
        for(var i = 0; i < this.players.length; i++){
            var abilities = this.players[i].abilities;
            for(var j = 0; j < abilities.length; j++){
                abilityList.push({
                    uid:this.players[i].uid,
                    ability:abilities[j]
                });
            }
        }
        return abilityList;
    }
    this.getPlayerByUID = function(uid){
        for(var i = 0; i  < this.players.length; i++){
            if(uid === this.players[i].uid)
                return this.players[i]
        }
        return null;
    }
});
wowcdapp.service('tracker',function(wowdata,raiddata){
    var id = 0;
    var max_level = 6;
    var abilityEntries = [];

    this.getAvailableAbilities = function(time){
        var abilityBools = [];
        var abilities = raiddata.getAbilities();
        for(var i = 0; i < abilities.length; i++){
            abilityBools[i] = isAbilityAvailable(abilities[i].uid,abilities[i].ability,time);
        }
        return abilityBools;
    }
    var lastCollision = {};
    var isAbilityAvailable = function(uid,cd,time){
        available = true;
        abilityEntries.forEach(function(abilityEntry){
            if((uid === abilityEntry.pid) && (cd == abilityEntry.ability)){
                if(Math.abs(abilityEntry.time - time) < abilityEntry.ability.cooldown){
                    available = false;
                    lastCollision=abilityEntry;
                    return available;
                }
            }
        });
        return available;
    }
    this.addAbility = function(pid,cd,time){
        var cid = getAbilityID();
        abilityEntries.push({pid:pid,cid:cid,ability:cd,time:time});
    }
    this.editAbility = function(handle,dx,dy){
        //check is this a valid position
        //console.log(dx);
        var handle = parseInt(handle);
        for(var i = 0; i < abilityEntries.length; i++){
            if(abilityEntries[i].cid === handle){
                abilityEntries[i].time += dx;
                break;
            }
        }
    }
    this.removeAbility = function(cid){
        abilityEntries.splice(getAbilityEntryIndex(cid),1);
    }
    var getAbilityID = function(){
        return id++;
    }
    var getAbilityEntryIndex = function(cid){
        for(var i = 0; i < abilityEntries.length; i++){
            if (abilityEntries[i].cid === parseInt(cid)){
                return i;
            }
        }
    }

    /*var isLevelAvailable = function(level,time,duration){
        //is there a free spot on this level?
        var abilityLevel = level;
        for(var i = 0; i < abilityLevel.length; i++){
            var t1,t2,d1,d2;
            t1 = abilityEntries[abilityLevel[i]].time;
            d1 = abilityEntries[abilityLevel[i]].ability.duration;
            t2 = time;
            d2 = duration;
            if(!((t2 > (t1+d1) || ((t2+d2) < t1)))){
                return false;
            }
        }
        return true;
    }*/
    var populateLevels = function(sortType){
        var timelineLevels = {};
        //abilityEntries.sort(function(a,b){return b.ability.duration - a.ability.duration});
        abilityEntries.sort(function (a, b) {return a.cid - b.cid});
        if(sortType === 'c'){
            abilityEntries.sort(function(a,b){return a.pid - b.pid});
            for(var i = 0; i < abilityEntries.length; i++){
                var abilityEntry = abilityEntries[i];
                timelineLevels[abilityEntry.pid]= {uid:abilityEntry.pid,
                    name:raiddata.getPlayerByUID(abilityEntry.pid).name,
                    icon:raiddata.getPlayerByUID(abilityEntry.pid).spec.wowicon,
                    abilityArray:{}
                };
            }
            abilityEntries.forEach(function(abilityEntry,ind){
                timelineLevels[abilityEntry.pid].abilityArray[abilityEntry.cid]=abilityEntry;
            });
            level = 0;
            for(entry in timelineLevels){
                timelineLevels[entry].level = level++;
            }
            //timelineLevels.sort(function(a,b){return a.pid - b.pid});
        }else if(sortType === 'a') {
            abilityEntries.forEach(function(abilityEntry,ind){
                timelineLevels[abilityEntry.cid]=abilityEntry;
            });
        }
        return timelineLevels;
    }
    this.getDrawInfo = function(sortType){
        return populateLevels(sortType);
    }
    this.cullRemoved = function(){
        abilityEntries.forEach(function(abilityEntry,cid){
            if(raiddata.getPlayerByUID(abilityEntry.pid) === null){
                abilityEntries.splice(getAbilityEntryIndex(cid),1);
                console.log("removed orphan ability data");
            }
        });
    }
});
wowcdapp.service('fightdata',function(){
    this.settingsState = 0;
    this.currentfight = {};
    this.phases = [];
    var self = this;
    var phaseListFull = [];
    var eventListFull = [];

    var colors = colorSlicer.getColors(30,180);
    var colorIndex = 0;

    this.fightLength;

    var generateSimplePhase = function(phase,time){
        var dur = phase.duration;
        var culledEventList = [];
        //remove events that dont fit in duration
        for(var i = 0; i < phase.events.length; i++){
            if(phase.events[i].time <= dur){
                culledEventList.push(phase.events[i]);
            }
        }
        var newEventList = [];
        for(var i = 0; i < culledEventList.length;i++){
            var event = culledEventList[i];
            //convert recurring to normal fight events
            if(event.type === "r"){
                var index = 1;
                for(var k = event.time; k <= dur; k += event.period){
                    newEventList.push({name:event.name,time:k,duration:event.duration,count:index++});
                }
            }else{
                newEventList.push(event);
            }
        }
        newEventList.sort(function(a, b){
            return a.time-b.time
        });
        return {name:phase.name,time:time,duration:dur,events:newEventList,level:0,color:colors[colorIndex++]};
    }

    var recurse = function(phaseInfo,level){
        var pList = [];
        var eList = [];
        var ptime = phaseInfo.time;
        var ftime = phaseInfo.duration;
        for (var i = 0; i < phaseInfo.events.length; i++){
            var event = phaseInfo.events[i];
            if(event.type === "s"){
                var simplePhase = generateSimplePhase(self.getPhaseByName(event.name),ptime+event.time);
                var lists = recurse(simplePhase,level+1);
                ftime += lists[2];
                ptime += lists[2];
                simplePhase.duration = lists[2];
                simplePhase.phaseLevel = level;
                pList.push(simplePhase);
                pList.push.apply(pList,lists[0]);
                eList.push.apply(eList,lists[1]);
            }else{
                eList.push({name:event.name,time:ptime+event.time,duration:event.duration,phaseLevel:level,phaseName:phaseInfo.name,count:event.count});
            }
        }
        return [pList,eList,ftime];
    }
    this.update = function(){
        if (self.currentfight.name !== undefined) {
            self.settingsState = 1;
        }else{
            return;
        }
        colorIndex = 0;
        var time = 0;
        var mainPhase = generateSimplePhase(self.getPhaseByName(self.currentfight.name+" "+self.currentfight.difficulty),time);
        var lists = recurse(mainPhase,0);
        phaseListFull = lists[0];
        eventListFull = lists[1];
        self.fightLength = lists[2];
    }
    this.getPhaseList = function(){
        return phaseListFull;
    }
    this.getEventList = function(){
        return eventListFull;
    }
    this.getPhaseByName = function(name){
        for(var i = 0; i < self.phases.length; i++){
            if(self.phases[i].name === name){
                return self.phases[i];
            }
        }
        return null;
    }
})
//setup views
wowcdapp.config(function($stateProvider, $urlRouterProvider){
    $urlRouterProvider.otherwise("/settings");
    $stateProvider
        .state('settings', {
            url: "/settings",
            controller: 'userCtrl as user',
            templateUrl: "partials/setupview.html",
            resolve: {
                classes: function(wowdataloader){
                    return wowdataloader.getClasses();
                },
                specs: function(wowdataloader){
                    return wowdataloader.getSpecs();
                },
                fightlist: function(wowdataloader){
                    return wowdataloader.getFights();
                },
                abilities: function(wowdataloader){
                    return wowdataloader.getAbilities();
                }
            }
        })
        .state('timeline', {
            url: "/timeline",
            controller: 'timelineCtrl as timeline',
            templateUrl: "partials/timelineview.html",
            resolve: {
                phases: function(wowdataloader){
                    return wowdataloader.getPhases();
                }
            }
        })
        .state('export', {
            url: "/export",
            templateUrl: "partials/exportview.html",
            controller: 'exportCtrl as export'
        })
});
wowcdapp.run(['$rootScope', function($root) {
    $root.loadingView = true;
    $root.version = 0.9;
}]);
wowcdapp.controller('userCtrl', function ($scope, $rootScope, $window, wowdata, raiddata, fightdata) {
    var self = this;
    $rootScope.loadingView = false;
    this.fightlist = wowdata.fights;
    this.fightdata = fightdata;
    if(this.fightdata.settingsState === 0){
        this.fightdata.currentfight = this.fightlist[0];
    }
    this.raid = raiddata;
    $scope.players = this.raid.players;
    this.classid = null;
    this.specid = null;
    this.name = "";
    this.addPlayer = function(){
        if((this.classid !== null) && (this.specid !== null)) {
            self.raid.addPlayer(self.name, wowdata.classes[self.classid], wowdata.getSpecById(wowdata.classes[self.classid].specs[self.specid]));
        }
    };
    this.classChange = function(index){
        console.log(index);
        if(index !== self.classid){
            this.specid = null;
        }
    }
    this.specChange = function(raidIndex,specId){
        if (self.raid.players[raidIndex].spec.id !== specId) {
            self.raid.specChange(raidIndex, wowdata.getSpecById(specId));
        }
    }
    this.removePlayer = function(index){
        self.raid.removePlayer(index);
    }
    this.classes = wowdata.classes;
    this.getSpecById = function(spec){
        return wowdata.getSpecById(spec);
    }
    this.focus = "";
    $scope.$watch('players',function(){
        self.raid.saveRaid();
    },true);
});
wowcdapp.directive('raidlist',function(){
    return {
        restrict: 'E',
        templateUrl: 'partials/raid_display.html'
    }
});
wowcdapp.controller('exportCtrl', function($scope,wowdata,raiddata,fightdata,tracker){
    //todo: add phase starts
    var phases = fightdata.getPhaseList();
    var events = fightdata.getEventList();
    var abilities = tracker.getDrawInfo('a');
    var processed = {};
    //for each ability
    for(key in abilities){
        //find nearest fight event + distance
        var minEvents = {};
        var minDist = 15;
        var ability = abilities[key].ability;
        var aDur = ability.duration;
        var aTime = abilities[key].time;
        minEvents.player = raiddata.getPlayerByUID(abilities[key].pid);
        minEvents.ability = ability;
        minEvents.eventList = [];
        for(var i = 0; i < events.length;i++){
            var event = events[i];
            //start of ability within event
            if((aTime > event.time)&&(aTime < event.time+event.duration)){
                //console.log(event.name +" "+ event.count);
                minEvents.eventList.push({event:event, dist:0});
            }
            //end of ability within event
            else if((aTime+aDur > event.time)&&(aTime+aDur < event.time+event.duration)){
                //console.log(event.name +" "+ event.count);
                minEvents.eventList.push({event:event, dist:0});
            }
            //start of event within ability
            else if((aTime < event.time)&&(aTime+aDur > event.time)){
                //console.log(event.name +" "+ event.count);
                minEvents.eventList.push({event:event, dist:0});
            }
            //end of event within ability
            else if((aTime < event.time+event.duration)&&(aTime+aDur > event.time+event.duration)){
                //console.log(event.name +" "+ event.count);
                minEvents.eventList.push({event:event, dist:0});
            }else {
                //find overlaps
                var dist = event.time - aTime;
                if ((dist > -minDist) && (dist < minDist)) {
                    minEvents.eventList.push({event: event, dist: dist});
                }
            }
        }
        for(var i = 0; i < phases.length; i++){
            var phase = phases[i];
            //find overlaps
            var dist = phase.time - aTime;
            if ((dist > -minDist) && (dist < minDist)) {
                minEvents.eventList.push({event: phase, dist: dist});
            }
        }
        processed[abilities[key].cid] = minEvents;
    }
    this.opString = "";
    for(key in processed) {
        var entry = processed[key];
        this.opString += (entry.player.name + "'s " + entry.ability.name);
        this.opString += ' ';
        for(var i = 0; i < entry.eventList.length; i++) {
            if(entry.eventList[i].event.count !== undefined) {
                this.opString += (entry.eventList[i].event.name + " " + entry.eventList[i].event.count);
                this.opString += ' ';
            }else{
                this.opString += (entry.eventList[i].event.name);
                this.opString += ' ';
            }
        }
    }

    //write to box
})