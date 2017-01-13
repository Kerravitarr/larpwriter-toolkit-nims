/*Copyright 2015 Timofey Rechkalov <ntsdk@yandex.ru>, Maria Sidekhmenova <matilda_@list.ru>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
   limitations under the License. */

"use strict";

(function(callback){

    function storyAdaptationsAPI(LocalDBMS, opts) {
        
        var R             = opts.R           ;
        var CommonUtils   = opts.CommonUtils ;
        var dbmsUtils     = opts.dbmsUtils   ;
        
        //events
        LocalDBMS.prototype.getFilteredStoryNames = function (showOnlyUnfinishedStories, callback){
            "use strict";
            var storyArray = Object.keys(this.database.Stories).sort(CommonUtils.charOrdA);
            var that = this;
            storyArray = storyArray.map(function(elem){
                return {
                    storyName: elem,
                    isFinished: _isStoryFinished(that.database, elem),
                    isEmpty: _isStoryEmpty(that.database, elem)
                }
            });
            
            if(showOnlyUnfinishedStories){
                storyArray = storyArray.filter(function(elem){
                    return !elem.isFinished || elem.isEmpty;
                });
            }
            callback(null, storyArray);
        };
    
        var _isStoryEmpty = function (database, storyName) {
            return database.Stories[storyName].events.length == 0;
        };
        
        dbmsUtils._isStoryEmpty = _isStoryEmpty;
        
        var _isStoryFinished = function (database, storyName) {
            return database.Stories[storyName].events.every(event => !R.isEmpty(event.characters) && R.values(event.characters).every(adaptation => adaptation.ready));
        };
        
        dbmsUtils._isStoryFinished = _isStoryFinished;
    
        //events
        LocalDBMS.prototype.getStory = function(storyName, callback){
            callback(null, CommonUtils.clone(this.database.Stories[storyName]));
        };
        
        LocalDBMS.prototype.setEventAdaptationTime = function(storyName, eventIndex, characterName, time, callback){
            "use strict";
            var event = this.database.Stories[storyName].events[eventIndex];
            event.characters[characterName].time = time;
            callback();
        };
    
        // preview, events
        LocalDBMS.prototype.setOriginEventText = function(storyName, eventIndex, text, callback){
            var event = this.database.Stories[storyName].events[eventIndex];
            event.text = text;
            callback();
        };
        
        // preview, events
        LocalDBMS.prototype.setAdaptationEventText = function(storyName, eventIndex, characterName, text, callback){
            var event = this.database.Stories[storyName].events[eventIndex];
            event.characters[characterName].text = text;
            callback();
        };
    
        // events
        LocalDBMS.prototype.changeAdaptationReadyStatus = function(storyName, eventIndex, characterName, value, callback){
            "use strict";
            var event = this.database.Stories[storyName].events[eventIndex];
            event.characters[characterName].ready = value;
            callback();
        };
    };
    callback(storyAdaptationsAPI);

})(function(api){
    typeof exports === 'undefined'? this['storyAdaptationsAPI'] = api: module.exports = api;
}.bind(this));