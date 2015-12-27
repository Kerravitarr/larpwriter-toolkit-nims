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
 Utils, DBMS
 */

"use strict";

var CharacterProfile = {};

CharacterProfile.init = function () {
    "use strict";
    var button = document.getElementById("bioEditorSelector");
    button.addEventListener("change", CharacterProfile.showProfileInfoDelegate);

    CharacterProfile.content = document.getElementById("characterProfile");
};

CharacterProfile.refresh = function () {
    "use strict";
    
    PermissionInformer.getCharacterNamesArray(false, function(err, names){
    	if(err) {Utils.handleError(err); return;}
        var selector = document.getElementById("bioEditorSelector");
        Utils.removeChildren(selector);
        names.forEach(function (nameInfo) {
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(nameInfo.displayName));
            option.value = nameInfo.value;
            selector.appendChild(option);
        });
        
        var profileContentDiv = document.getElementById("profileContentDiv");
        Utils.removeChildren(profileContentDiv);
        var table = document.createElement("table");
        var tbody = document.createElement("tbody");
        table.appendChild(tbody);
        addClass(table, "table");
        profileContentDiv.appendChild(table);
        
        CharacterProfile.inputItems = {};
        
        DBMS.getAllProfileSettings(function(err, allProfileSettings){
        	if(err) {Utils.handleError(err); return;}
            allProfileSettings.forEach(function (profileSettings) {
                CharacterProfile.appendInput(tbody, profileSettings);
            });
            
            CharacterProfile.applySettings(names, selector);
        });
    });
};

CharacterProfile.applySettings = function (names, selector) {
    "use strict";
    if (names.length > 0) {
        var name = names[0].value;
        var settings = DBMS.getSettings();
        if(!settings["CharacterProfile"]){
            settings["CharacterProfile"] = {
                characterName : name
            };
        }
        var characterName = settings["CharacterProfile"].characterName;
        if(names.map(function(nameInfo){return nameInfo.value;}).indexOf(characterName) === -1){
            settings["CharacterProfile"].characterName = name;
            characterName = name;
        }
        DBMS.getProfile(characterName, CharacterProfile.showProfileInfoCallback);
        selector.value = characterName;
    }
};

CharacterProfile.appendInput = function (root, profileItemConfig) {
    "use strict";
    var tr = document.createElement("tr");
    var td = document.createElement("td");
    td.appendChild(document.createTextNode(profileItemConfig.name));
    tr.appendChild(td);

    td = document.createElement("td");
    
    var input, values;

    switch (profileItemConfig.type) {
    case "text":
        input = document.createElement("textarea");
        addClass(input, "profileTextInput");
        break;
    case "string":
        input = document.createElement("input");
        addClass(input, "profileStringInput");
        break;
    case "enum":
        input = document.createElement("select");

        values = profileItemConfig.value.split(",");
        values.forEach(function (value) {
            var option = document.createElement("option");
            option.appendChild(document.createTextNode(value));
            input.appendChild(option);
        });
        break;
    case "number":
        input = document.createElement("input");
        input.type = "number";
        break;
    case "checkbox":
        input = document.createElement("input");
        input.type = "checkbox";
        break;
    }
    input.addEventListener("change", CharacterProfile.updateFieldValue(profileItemConfig.type));
    input.selfName = profileItemConfig.name;
    addClass(input,"isEditable");
    td.appendChild(input);
    CharacterProfile.inputItems[profileItemConfig.name] = input;

    tr.appendChild(td);
    root.appendChild(tr);
};

CharacterProfile.updateFieldValue = function(type){
    "use strict";
    return function(event){
        var fieldName = event.target.selfName;
        var characterName = CharacterProfile.name;
        
        var value;
        switch(type){
        case "text":
        case "string":
        case "enum":
            value = event.target.value;
            break;
        case "number":
            if (isNaN(event.target.value)) {
                Utils.alert("Введенное значение не является числом.");
                event.target.value = event.target.oldValue;
                return;
            }
            value = Number(event.target.value);
            break;
        case "checkbox":
            value = event.target.checked;
            break;
        }
        DBMS.updateProfileField(characterName, fieldName, type, value, Utils.processError());
    }
}

CharacterProfile.showProfileInfoDelegate = function (event) {
    "use strict";
    var name = event.target.value.trim();
    DBMS.getProfile(name, CharacterProfile.showProfileInfoCallback);
};

CharacterProfile.showProfileInfoCallback = function (err, profile) {
    "use strict";
    if(err) {Utils.handleError(err); return;}
    var name = profile.name;
    PermissionInformer.isCharacterEditable(name, function(err, isEditable){
    	if(err) {Utils.handleError(err); return;}
    	CharacterProfile.updateSettings(name);
    	
    	CharacterProfile.name = name;
    	var inputItems = CharacterProfile.inputItems;
    	Object.keys(inputItems).forEach(function (inputName) {
    		if (inputItems[inputName].type === "checkbox") {
    			inputItems[inputName].checked = profile[inputName];
    		} else {
    			inputItems[inputName].value = profile[inputName];
    		}
    		inputItems[inputName].oldValue = profile[inputName];
    		Utils.enable(CharacterProfile.content, "isEditable", isEditable);
    	});
    });
};

CharacterProfile.updateSettings = function (name) {
    "use strict";
    var settings = DBMS.getSettings();
    settings["CharacterProfile"].characterName = name;
};
