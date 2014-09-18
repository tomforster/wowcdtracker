/**
 * Created by Tom on 28/03/14.
 */

var wowcdapp = angular.module('wowcdapp',['mgcrea.ngStrap','ui.router','LocalStorageModule','angular-loading-bar']);

wowcdapp.factory('wowdataloader', function($http,$q,$state,$rootScope,wowdata){
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
            });
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
wowcdapp.service('raiddata',function(wowdata,localStorageService,$rootScope,$timeout){
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
            player.spec = spec;
        }
        player.uid = uid++;
    }
    this.removePlayer = function(index){
        console.log('blah');
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
        abilityEntries[cid] ={pid:pid,cid:cid,ability:cd,time:time};
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
    var getAbilityID = function(){
        return id++;
    }

    var isLevelAvailable = function(level,time,duration){
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
    }
    var populateLevels = function(sortType){
        var timelineLevels = {};
        abilityEntries.sort(function(a,b){return b.ability.duration - a.ability.duration});
        max_level = 7;
        if(sortType === 'c'){
            abilityEntries.sort(function(a,b){return b.pid - a.pid});
            abilityEntries.forEach(function(abilityEntry,cid){
                timelineLevels[abilityEntry.pid] = {
                    uid:abilityEntry.pid,
                    name:raiddata.getPlayerByUID(abilityEntry.pid).name,
                    icon:raiddata.getPlayerByUID(abilityEntry.pid).spec.wowicon,
                    abilityArray:[]
                };
            });
            abilityEntries.forEach(function(abilityEntry,cid){
                timelineLevels[abilityEntry.pid].abilityArray.push(abilityEntry);
            });
            var index = 0;
            for(var key in timelineLevels){
                timelineLevels[key].level = index++;
            };
        }else{
            for(var i = 0; i < max_level; i++){
                timelineLevels.push([]);
            }
            abilityEntries.forEach(function(abilityEntry,cid){
                var level = 0;
                while(level < max_level){
                    if(isLevelAvailable(timelineLevels[level],abilityEntry.time,abilityEntry.ability.duration)){
                        timelineLevels[level].push(cid);
                        break;
                    }
                    level++;
                }
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
                abilityEntries.splice(cid,1);
                console.log("removed orphan ability data");
            }
        });
    }
});
wowcdapp.service('fightdata',function(){
    this.settingsState = -1;
    this.currentfight = {};
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
            templateUrl: "partials/timelineview.html"
        })
        .state('export', {
            url: "/export",
            templateUrl: "partials/exportview.html"
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
    this.fightdata.currentfight = this.fightlist[0];
    this.raid = raiddata;
    $scope.players = this.raid.players;
    this.classid = null;
    this.specid = null;
    this.name = "";
    this.addPlayer = function(){
        self.raid.addPlayer(self.name,wowdata.classes[self.classid], wowdata.getSpecById(wowdata.classes[self.classid].specs[self.specid]));
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
/*wowcdapp.directive('classlist', function(wowdata){
    return {
        restrict: 'E',
        templateUrl: 'partials/class_select.html',
        controllerAs: 'classCtrl',
        controller: function(){
            this.classShowHideArr = new Array(wowdata.classes.length);

            for(var i = 0; i < this.classShowHideArr.length;i++){
                this.classShowHideArr[i] = true;
            }
            this.showSpecEvent = function(cla){
                for(var i = 0; i < this.classShowHideArr.length;i++){
                    if( i === cla){
                        this.classShowHideArr[cla] = !this.classShowHideArr[cla];
                        continue;
                    }
                    this.classShowHideArr[i] = true;
                }
            }
            this.incEvent = function(cla,spec){
                //this.raid.addPlayer(cla,spec);
            }
        }
    }
});*/
wowcdapp.directive('raidlist',function(){
    return {
        restrict: 'E',
        templateUrl: 'partials/raid_display.html'
    }
});