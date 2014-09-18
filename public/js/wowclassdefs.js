/**
 * Created by Tom on 17/04/14.
 */

var initGarroshHeroic = function(){
    var phases = [];
    var mainPhase = new Phase('Garrosh Heroic',0,true);
    mainPhase.eventList.push(new FightEventSubPhase('Phase 1',0));
    mainPhase.eventList.push(new FightEventSubPhase('Phase 2',0));
    mainPhase.eventList.push(new FightEventSubPhase('Phase 3',0));
    mainPhase.eventList.push(new FightEventSubPhase('Phase 4',0));
    phases.push(mainPhase);
    //phase 1
    var phase = new Phase('Phase 1',70,false);
    phase.eventList.push(new FightEventRecurring("Iron star explosion",40,0,45));
    phases.push(phase);
    //phase 2
    var phase = new Phase('Phase 2',250,false);
    phase.eventList.push(new FightEventRecurring("Whirling Corruption",33,6,50));
    phase.eventList.push(new FightEventSubPhase('Transition Phase 1',10));
    phase.eventList.push(new FightEventSubPhase('Transition Phase 2',170));
    phases.push(phase);
    //transition phase 1
    var phase = new Phase('Transition Phase 1',60,true);
    phase.eventList.push(new FightEventRecurring('Annihilate',25,0,3.6));
    phases.push(phase);
    //transition phase 2
    var phase = new Phase('Transition Phase 2',60,true);
    phase.eventList.push(new FightEventRecurring('Annihilate',25,0,3.6));
    phases.push(phase);
    //phase 3
    var phase = new Phase('Phase 3',80,false);
    phase.eventList.push(new FightEventRecurring("Empowered Whirling Corruption",35,6,50));
    phases.push(phase);
    //phase 4
    var phase = new Phase('Phase 4',170,false);
    phase.eventList.push(new FightEventRecurring("Malice",45,14,30));
    phase.eventList.push(new FightEventRecurring("Bombardment",85,10,50));
    phase.eventList.push(new FightEventRecurring("Iron Star Explosion",105,0,105));
    phases.push(phase);
    return phases;
}

//region Phase Setup Classes
var FightEvent = function(name,time,duration,level){
    this.name = name;
    this.time = time;
    this.duration = duration;
    this.getType = function(){return "f"}
    if(arguments.length === 4){
        this.phaseLevel = level;
    }
};
var FightEventRecurring = function(name,time,duration,period){
    this.name = name;
    this.time = time;
    this.duration = duration;
    this.period = period;
    this.getType = function(){return "r"}
}
var FightEventSubPhase = function(name,time){
    this.name = name;
    this.time = time;
    this.getType = function(){return "p"}
}
var Phase = function(name,duration,fixed){
    var self = this;
    this.name = name;
    var duration = duration;
    var fixed = fixed;
    this.eventList = [];

    this.generateSimplePhase = function(time,dur){
        if(arguments.length === 1)
            dur = duration;
        var culledEventList = [];
        //remove events that dont fit in duration
        for(var i = 0; i < self.eventList.length; i++){
            if(self.eventList[i].time <= dur){
                culledEventList.push(self.eventList[i]);
            }
        }
        var newEventList = [];
        for(var i = 0; i < culledEventList.length;i++){
            var event = culledEventList[i];
            //convert recurring to normal fight events
            if(event.getType() === "r"){
                for(var k = event.time; k <= dur; k += event.period){
                    newEventList.push(new FightEvent(event.name,k,event.duration));
                }
            }else{
                newEventList.push(event);
            }
        }
        newEventList.sort(function(a, b){
            return a.time-b.time
        });
        return new SimplePhaseInfo(this.name,time,dur,newEventList,0);
    }
}
var colors = colorSlicer.getColors(30,180);
var colorIndex = 0;
var SimplePhaseInfo = function(name,time,duration,eventList,phaseLevel,color){
    this.name = name;
    this.time = time ;
    this.duration = duration;
    this.eventList = eventList;
    this.phaseLevel = phaseLevel;
    //this.color = randomColor({luminosity: 'dark'});
    this.color = colors[colorIndex++];
}
var TimelineData = function(phases,mainPhaseStr){
    var self = this;
    var phaseListFull = [];
    var eventListFull = [];
    this.fightLength;

    var recurse = function(phaseInfo,level){
        var pList = [];
        var eList = [];
        var ptime = phaseInfo.time;
        var ftime = phaseInfo.duration;
        for (var i = 0; i < phaseInfo.eventList.length; i++){
            var event = phaseInfo.eventList[i];
            if(event.getType() === "p"){
                var simplePhase = self.getPhaseByName(event.name).generateSimplePhase(ptime+event.time);
                var lists = recurse(simplePhase,level+1);
                ftime += lists[2];
                ptime += lists[2];
                simplePhase.duration = lists[2];
                simplePhase.phaseLevel = level;
                pList.push(simplePhase);
                pList.push.apply(pList,lists[0]);
                eList.push.apply(eList,lists[1]);
            }else{
                eList.push(new FightEvent(event.name,ptime+event.time,event.duration,level));
            }
        }
        return [pList,eList,ftime];
    }
    this.update = function(){
        var time = 0;
        colorIndex = 0;
        var mainPhase = self.getPhaseByName(mainPhaseStr).generateSimplePhase(time);
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
        for(var i = 0; i < phases.length; i++){
            if(phases[i].name === name){
                return phases[i];
            }
        }
        return null;
    }
    this.timeToPhaseName = function(time){
        var str = "";
        if (time < 0)
            return "";
        if (time > self.fightLength)
            return "";
        for(var i = 0;i < phaseListFull.length;i++){
            if ((phaseListFull[i].time < time) && (phaseListFull[i].duration+phaseListFull[i].time > time)){
                str = phaseListFull[i].name;
            }
        }
        return str;
    }
    this.timeToPhaseTime = function(time){
        var s = -1;
        if (time < 0)
            return s;
        if (time > self.fightLength)
            return s;
        for(var i = 0;i < phaseListFull.length;i++){
            if ((phaseListFull[i].time < time) && (phaseListFull[i].duration+phaseListFull[i].time > time)){
                s = time-phaseListFull[i].time;
            }
        }
        return s;
    }

    this.update();
}
//endregion