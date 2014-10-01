/**
 * Created by Tom on 14/05/14.
 */
wowcdapp.directive('timeline', function(){
    return {
        restrict: 'E',
        templateUrl: 'partials/timeline.html',
        link: function(scope, element, attrs) {
            element.on("click", function(event){
                //console.log("clicked timeline");
                var svg = document.querySelector('#tl');
                var pt = svg.createSVGPoint()
                pt.x = event.clientX;
                pt.y = event.clientY;
                var p = pt.matrixTransform(svg.getScreenCTM().inverse())
                event.offsetX= p.x;
                event.offsetY= p.y;
                scope.open(event.offsetX);
            })
        }
    };
});
wowcdapp.directive('draggable', function($document){
    return {
        restrict: 'A',
        link: function(scope,element,attrs){
            var start = {x:0,y:0};
            var mousemoved = false;
            var svg = document.querySelector('#tln');
            var pt = svg.createSVGPoint()

            //capture clicks
            element.on("click", function(event){
                //console.log('clicked draggable');
                if(mousemoved){
                    scope.$emit("undrag",dx,dy);
                }
                mousemoved = false;
                event.preventDefault();
                event.stopPropagation();
                $document.unbind("mousemove");
                $document.unbind("click");
            })
            element.on("mousedown",function(event){
                scope.setFocus(attrs.handle);
                event.preventDefault();
                event.stopPropagation();

                pt.x = event.clientX;
                pt.y = event.clientY;
                var p = pt.matrixTransform(svg.getScreenCTM().inverse())
                event.offsetX= p.x;
                event.offsetY= p.y;

                start.x = event.offsetX;
                start.y = event.offsetY;
                //setfocus, or toggle
                $document.on("mousemove",function(event){
                    pt.x = event.clientX;
                    pt.y = event.clientY;
                    var p = pt.matrixTransform(svg.getScreenCTM().inverse())
                    event.offsetX= p.x;
                    event.offsetY= p.y;

                    mousemoved = true;
                    event.preventDefault();
                    event.stopPropagation();
                    dx = event.offsetX - start.x;
                    dy = event.offsetY - start.y;
                    start.x = event.offsetX;
                    start.y = event.offsetY;
                    //console.log("start: "+start.x+" offset: "+event.offsetX+" dx: "+dx);
                    scope.$emit("drag",attrs.handle,dx,dy);
                })
                $document.on("click",function(event){
                    mousemoved = false;
                    event.preventDefault();
                    event.stopPropagation();
                    scope.$emit("undrag",dx,dy);
                    //console.log('unbound draggable');
                    $document.unbind("mousemove");
                    $document.unbind("click");
                })
            })
        }
    }
});
wowcdapp.directive('timelinenav', function(){
    return {
        restrict: 'E',
        templateUrl: 'partials/timelinenav.html',
        link: function(scope, element, attrs) {
            var svg = document.querySelector('#tln');
            var pt = svg.createSVGPoint()

            element.on("click", function(event){
                pt.x = event.clientX;
                pt.y = event.clientY;
                var p = pt.matrixTransform(svg.getScreenCTM().inverse())
                event.offsetX= p.x;
                event.offsetY= p.y;
                scope.setWindow(event.offsetX);
            })
            element.on("mousemove", function(event){
                pt.x = event.clientX;
                pt.y = event.clientY;
                var p = pt.matrixTransform(svg.getScreenCTM().inverse())
                event.offsetX= p.x;
                event.offsetY= p.y;
                scope.setGhost(event.offsetX);
            })
        }
    };
});
wowcdapp.controller('timelineCtrl', function($scope, $rootScope, $modal, $window, $timeout, wowdata, raiddata, tracker, fightdata){
    var self = this;
    $rootScope.loadingView = false;
    this.fightname = "No fight loaded";
    fightdata.update();
    this.settingsState = fightdata.settingsState;
    if (this.settingsState) {
        this.fightname = fightdata.currentfight.name + " " + fightdata.currentfight.difficulty;
        this.timelineData = fightdata;
        //dimension data
        this.timelineView = {
            width:window.innerWidth-40,
            height:500,
            startS:0,
            lengthS:(5*60/1024)*(window.innerWidth-40),
            x:0,
            axisPositionPx:13,
            labelPositionPx:11,
            tickLengthS:30,
            levelheightPx:22,
            gapsize:5,
            corner:5,
            phaseLabelHeightPx: 7,
            phaseLabelTextSize: 14,
            widthNamesAreaPx: 24,
            sToPx:function(s){return s*(self.timelineView.width/(self.timelineView.lengthS));},
            pxToS:function(px){return px*(self.timelineView.lengthS/self.timelineView.width)}
        };
        this.timelineNavView = {
            navx:0,
            gnavx:0,
            width:window.innerWidth-40,
            height:30,
            axisPositionPx:15,
            phaseLabelHeightPx: 4,
            sToPx:function(s){return s*(self.timelineNavView.width/(self.timelineData.fightLength));},
            pxToS:function(px){return px*(self.timelineData.fightLength/self.timelineNavView.width);}
        };
        //cull orphans from tracker
        tracker.cullRemoved();

        $scope.drag = false;
        $scope.$on('drag',function(event,handle,dx,dy){
            tracker.editAbility(handle,self.timelineView.pxToS(dx),0);
            $scope.drag = true;
            $scope.$apply();
        });
        $scope.$on('undrag',function(){
            $scope.drag = false;
        });
        $scope.setWindow = function(offsetX){
            var newTime = self.timelineNavView.pxToS(offsetX)-self.timelineView.lengthS/2;
            newTime = Math.min(newTime,self.timelineData.fightLength-self.timelineView.lengthS);
            newTime = Math.max(newTime,0);
            self.timelineView.x = self.timelineView.sToPx(newTime);
            self.update();
            $scope.$apply();
        }
        $scope.setGhost = function(offsetX){
            var newTime = self.timelineNavView.pxToS(offsetX)-self.timelineView.lengthS/2;
            newTime = Math.min(newTime,self.timelineData.fightLength-self.timelineView.lengthS);
            newTime = Math.max(newTime,0);
            self.timelineNavView.gnavx = self.timelineNavView.sToPx(newTime);
            $scope.$apply();
        }
        $scope.setFocus = function(cid){
            if(self.focus === cid){
                if(self.doubleclicked){
                    //delete it
                    tracker.removeAbility(self.focus);
                    self.update();
                    self.doubleclicked = false;
                }
                self.focus = -1;
            }else{
                self.focus = cid;
                self.doubleclicked = true;
                $timeout(function(){
                    self.doubleclicked = false;
                },250);
            }
            $scope.$apply();
        }

        this.focus = -1;
        this.doubleclicked = false;
        var modalboxPhases = $modal({scope: $scope, template: 'partials/modalphases.html', show: false});
        var modalboxAbilities = $modal({scope: $scope, template: 'partials/modalcds.html', show: false});
        this.modalAbilities = [];
        $scope.selectCooldown = function(player,ability){
            if(!ability.isready)
                return
            tracker.addAbility(player.uid,ability.ability,self.time);
            modalboxAbilities.hide();
            self.update();
        }
        $scope.open = function(time) {
            //console.log("opening ability pane")
            if($scope.drag){
                //console.log("cancel due to drag")
                return;
            }
            self.modalAbilities = [];
            var playerAbilities = {};
            self.time = self.timelineView.pxToS(time+self.timelineView.x-self.timelineView.widthNamesAreaPx);
            var raidAbilities = raiddata.getAbilities();
            var availableAbilities = tracker.getAvailableAbilities(self.time);
            var lastUID = -1;
            for(var i = 0; i < raidAbilities.length;i++){
                if(lastUID === -1){
                    playerAbilities = {};
                    playerAbilities.abilities = [];
                    playerAbilities.player = raiddata.getPlayerByUID(raidAbilities[i].uid);
                }
                else if(raidAbilities[i].uid != lastUID){
                    self.modalAbilities.push(playerAbilities);
                    playerAbilities = {};
                    playerAbilities.abilities = [];
                    playerAbilities.player = raiddata.getPlayerByUID(raidAbilities[i].uid);
                }
                playerAbilities.abilities.push({
                    ability:raidAbilities[i].ability,
                    isready:availableAbilities[i]
                });
                lastUID = raidAbilities[i].uid;
            }
            self.modalAbilities.push(playerAbilities);
            modalboxAbilities.$promise.then(modalboxAbilities.show);
        }
        $scope.openPhases = function(){
            modalboxPhases.$promise.then(modalboxPhases.show);
        }

        this.time = 0;

        this.update = function(){
            var numTicks = this.timelineData.fightLength/self.timelineView.tickLengthS;

            this.tickLengthPx = self.timelineView.sToPx(self.timelineView.tickLengthS);
            self.ticks = [];
            var time = new Date(0,0,0,0,0,0);
            for(var i = 0; i < numTicks; i++){
                self.ticks.push(time.getMinutes()+":"+(time.getSeconds()+ "0").slice(0,2));
                time.setTime(time.getTime()+1000*self.timelineView.tickLengthS);
            }
            this.phases = this.timelineData.getPhaseList();
            this.events = this.timelineData.getEventList();
            this.abilities = tracker.getDrawInfo('c');
        }
        this.update();
    }
    

    window.onresize = function(event) {
        self.timelineView.width = window.innerWidth-40;
        self.timelineNavView.width = window.innerWidth-40;
        var lengthS = 5*60/1024*self.timelineView.width;
        if(lengthS < self.timelineData.fightLength){
            self.timelineView.lengthS = 5*60/1024*self.timelineView.width;
        }
        else{
            self.timelineView.lengthS = self.timelineData.fightLength;
        }

        self.update();
        $scope.$apply();
    };
    if(this.settingsState){
        var lengthS = 5*60/1024*self.timelineView.width;
        if(lengthS < self.timelineData.fightLength){
            self.timelineView.lengthS = 5*60/1024*self.timelineView.width;
        }
        else{
            self.timelineView.lengthS = self.timelineData.fightLength;
        }
    }
});

//region To Be Refactored
        //check is this a valid position
        /*if(!isAbilityAvailable(self.abilities[attr].pid,self.abilities[attr].ability,self.abilities[attr].time,false))
        {
            //if no, reinstate either starting or last valid position
            //todo:bounds check
            if(self.abilities[attr].time < lastCollision.time)
                self.abilities[attr].time = lastCollision.time - lastCollision.ability.cooldown;
            else
                self.abilities[attr].time = lastCollision.time + lastCollision.ability.cooldown;
            //if time in bounds?
        }
        if((self.abilities[attr].time < 0) ||(self.abilities[attr].time > timelineView.fightLength)){
            self.abilities[attr].time = startTime;
        }*/
//endregion