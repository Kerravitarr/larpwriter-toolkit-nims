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

/*global
Utils, Overview, Profiles, Stories, Adaptations, Briefings, Timeline, SocialNetwork, FileUtils
 */

"use strict";

(function(exports){

    var state = {};
    state.views = {};
    
    var btnOpts = {
        tooltip : true,
        className : 'mainNavButton'
    }
    
    var initPage = function(){
        L10n.localizeStatic();
        L10n.onL10nChange(() => state.currentView.refresh());
        UI.initSelectorFilters();
        UI.initPanelTogglers();
    }
    
    exports.onPlayerPageLoad = function () {
        initPage();
        var LocalDBMS = makeLocalDBMS(false);
        window.DBMS = new LocalDBMS();
        stateInit();
        Utils.addView(state.containers, "profile-editor", ProfileEditor, {mainPage:true});
        addEl(state.navigation, addClass(makeEl("div"), "nav-separator"));
        Utils.addView(state.containers, "about", About);
        addEl(state.navigation, makeL10nButton());
        addEl(state.navigation, makeButton("logoutButton", "logout", postLogout, btnOpts));
    };
    
    exports.onIndexPageLoad = function () {
        initPage();
        var LocalDBMS = makeLocalDBMS(false);
        window.DBMS = new LocalDBMS();
        stateInit();
        addEl(state.navigation, addClass(makeEl("div"), "nav-separator"));
        Utils.addView(state.containers, "enter", Enter, {mainPage:true});
        Utils.addView(state.containers, "register", Register);
        Utils.addView(state.containers, "about", About);
        addEl(state.navigation, makeL10nButton());
    };
    
    exports.onMasterPageLoad = function () {
        initPage();
        var LocalDBMS = makeLocalDBMS(true);
        if(MODE === "Standalone"){
            window.DBMS = new LocalDBMS();
            DBMS.setDatabase(BaseExample.data, function(err){
                if(err) {Utils.handleError(err); return;}
                consistencyCheck(onDatabaseLoad);
            });
        } else if(MODE === "NIMS_Server") {
            var RemoteDBMS = makeRemoteDBMS(LocalDBMS);
            window.DBMS = new RemoteDBMS();
            consistencyCheck(onDatabaseLoad);
        }
    };
    
    var consistencyCheck = function(callback){
        DBMS.getConsistencyCheckResult(function(err, consistencyErrors){
            if(err) {Utils.handleError(err); return;}
            consistencyErrors.forEach(CommonUtils.consoleLog);
            if(consistencyErrors.length > 0){
                Utils.alert(getL10n('overview-consistency-problem-detected'));
            } else {
                console.log('Consistency check didn\'t find errors');
            }
            callback();
        });
    };
    
    var stateInit = function(){
        state.navigation = getEl("navigation");
        state.containers = {
                root: state,
                navigation: state.navigation,
                content: getEl("contentArea")
        };
    };
    
    var onDatabaseLoad = function () {
        PermissionInformer.refresh(function(err){
            if(err) {Utils.handleError(err); return;}
            
            PermissionInformer.isAdmin(function(err, isAdmin){
                if(err) {Utils.handleError(err); return;}
                
                var button;
                stateInit();

                Utils.addView(state.containers, "register", Register, {mainPage:true});
                Utils.addView(state.containers, "enter", Enter);
                Utils.addView(state.containers, "overview", Overview);
                Utils.addView(state.containers, "profiles", Profiles);
                Utils.addView(state.containers, "stories", Stories);
                Utils.addView(state.containers, "adaptations", Adaptations);
                Utils.addView(state.containers, "briefings", Briefings);
    //            Utils.addView(state.containers, "about", About);
                
                addEl(state.navigation, addClass(makeEl("div"), "nav-separator"));
                
                Utils.addView(state.containers, "timeline", Timeline, {id:"timelineButton", tooltip:true});
                Utils.addView(state.containers, "social-network", SocialNetwork, {id:"socialNetworkButton", tooltip:true});
                Utils.addView(state.containers, "profile-filter", ProfileFilter, {id:"filterButton", tooltip:true});
                Utils.addView(state.containers, "groups", Groups, {id:"groupsButton", tooltip:true});
                Utils.addView(state.containers, "textSearch", TextSearch, {id:"textSearchButton", tooltip:true});
                
                addEl(state.navigation, addClass(makeEl("div"), "nav-separator"));
                
                if(isAdmin){
                    var button = makeButton("dataLoadButton", "open-database", null, btnOpts);
                    button.addEventListener('change', FileUtils.readSingleFile, false);
                    
                    var input = makeEl("input");
                    input.type = "file";
                    addClass(input, 'hidden');
                    setAttr(input, 'tabindex', -1);
                    button.appendChild(input);
                    button.addEventListener('click', function(e){
                        input.click();
    //                    e.preventDefault(); // prevent navigation to "#"
                    });
                    addEl(state.navigation, button);
                }
                
                addEl(state.navigation, makeButton("dataSaveButton", "save-database", FileUtils.saveFile, btnOpts));
                if(MODE === "Standalone"){
                    addEl(state.navigation, makeButton("newBaseButton", "create-database", FileUtils.makeNewBase, btnOpts));
                }
                addEl(state.navigation, makeButton("mainHelpButton", "docs", FileUtils.openHelp, btnOpts));
                
                addEl(state.navigation, makeL10nButton());
                
                Utils.addView(state.containers, "logViewer", LogViewer2, {id:"logViewerButton", tooltip:true});
    //            addEl(state.navigation, makeButton("testButton", "test", runTests, btnOpts));
    //            addEl(state.navigation, makeButton("aboutButton", "about", null, btnOpts));
                if(MODE === "NIMS_Server"){
                    Utils.addView(state.containers, "admins", AccessManager, {id:"accessManagerButton", tooltip:true});
    //                Utils.addView(state.containers, "chat", Chat, {id:"chatButton", tooltip:true});
                    addEl(state.navigation, makeButton("logoutButton", "logout", postLogout, btnOpts));
                }
                
                FileUtils.init(function(err){
                    if(err) {Utils.handleError(err); return;}
                    consistencyCheck(state.currentView.refresh);
                });
                
                state.currentView.refresh();
            });
        });
        
    };
    
    var makeL10nButton = function(){
        var l10nBtn = makeButton("toggleL10nButton", "l10n", L10n.toggleL10n, btnOpts);
        var setIcon = function(){
            l10nBtn.style.backgroundImage = strFormat('url("./images/{0}.svg")', [getL10n('header-dictionary-icon')]);
        }
        L10n.onL10nChange(setIcon);
        setIcon();
        return l10nBtn;
    };
    
    var runTests = function(){
    //    window.RunTests();
        consistencyCheck(function(){});
    };
    
    var postLogout = function(){
        document.querySelector('#logoutForm button').click();
    };
    
    var makeButton = function(id, name, callback, opts){
        var button = makeEl("button");
        button.id = id;
        if(opts.tooltip){
            var delegate = function(){
                $(button).attr('data-original-title', L10n.getValue("header-" + name));
            };
            L10n.onL10nChange(delegate);
            $(button).tooltip({
                title : L10n.getValue("header-" + name),
                placement : "bottom"
            });
        }
        addClass(button, "action-button");
        if(opts.className){
            addClass(button, opts.className);
        }
        if(callback){
            listen(button, 'click', callback);
        }
        return button;
    };
    
    window.onbeforeunload = function (evt) {
        var message = getL10n("utils-close-page-warning");
        if (typeof evt == "undefined") {
            evt = window.event;
        }
        if (evt) {
            evt.returnValue = message;
        }
        return message;
    };

})(this['PageManager']={});