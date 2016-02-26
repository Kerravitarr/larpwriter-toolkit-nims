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
 jQuery, DBMS
 */

"use strict";

var statisticKeys = [
  'storyNumber',
  'characterNumber',
  'eventsNumber',
  'userNumber',
  'textCharacterNumber',
  'lastEvent',
  'firstEvent',
  'generalCompleteness',
  'storyCompleteness',
]; 
  
var Overview = {};

Overview.Charts = {};

Overview.init = function () {
    "use strict";
    Overview.name = document.getElementById("gameNameInput");
    Overview.name.addEventListener("change", Overview.updateName);

    Overview.date = document.getElementById("gameDatePicker");

    var opts = {
        lang : "ru",
        mask : true,
        onChangeDateTime : Overview.updateTime
    };

    jQuery(Overview.date).datetimepicker(opts);

    Overview.preDate = document.getElementById("preGameDatePicker");

    opts = {
        lang : "ru",
        mask : true,
        onChangeDateTime : Overview.updatePreGameDate
    };

    jQuery(Overview.preDate).datetimepicker(opts);

    Overview.descr = document.getElementById("gameDescription");
    Overview.descr.addEventListener("change", Overview.updateDescr);
    
    UI.initTabPanel("overviewInfoButton", "overviewContainer");
    
    Overview.content = document.getElementById("overviewDiv");
};

Overview.makeChart = function(id, canvas, data){
  "use strict";
  if(Overview.Charts[id]){
    Overview.Charts[id].destroy();
  }
  
  data.forEach(function(value, i){
    if(Constants.colorPalette[i]){
        value.color = Constants.colorPalette[i].color.background;
        value.highlight = Constants.colorPalette[i].color.hover.background;
    }
  });
  
  var ctx = canvas.getContext("2d");
//  Overview[id] = new Chart(ctx).Pie(data,{});
  Overview.Charts[id] = new Chart(ctx).Doughnut(data,{animateRotate : false, tooltipTemplate: "<%if (label){%><%=label%><%}%>",});
};

Overview.makeHistogram = function(place, data){
  "use strict";

  var min = null, max = null;
  data.forEach(function(barData){
    if(barData){
      if(max === null || barData.value > max){
        max = barData.value;
      }
    }
  });
  data.forEach(function(barData){
    if(barData){
//      barData.normValue = (barData.value - min)/(max-min);
//      barData.normValue = (barData.value - 0)/(max-0);
      barData.normValue = (barData.value - 0)/(max-0)*0.9+0.1;
    }
  });
  
  var div;
  data.forEach(function(barData){
    div = barData === null ? makeEl('div') : addEl(makeEl('div'), makeText(barData.value));
    addClass(div, "bar");
    if(barData){
      div.style.height = (barData.normValue*100) + '%';
      $(div).tooltip({
        title : barData.tip,
      });
    }
    
    addEl(place, div);
  });
};


Overview.refresh = function () {
    "use strict";
    
    PermissionInformer.isAdmin(function(err, isAdmin){
      if(err) {Utils.handleError(err); return;}
      Utils.enable(Overview.content, "adminOnly", isAdmin);
    });

    DBMS.getMetaInfo(function(err, info){
      if(err) {Utils.handleError(err); return;}
      DBMS.getStatistics(function(err, statistics){
        if(err) {Utils.handleError(err); return;}
        Overview.name.value = info.name;
        Overview.date.value = info.date;
        Overview.preDate.value = info.preGameDate;
        Overview.descr.value = info.description;
        statistics['lastEvent'] = statistics['lastEvent'] !== "" ? new Date(statistics['lastEvent']).format("yyyy/mm/dd h:MM") : "";
        statistics['firstEvent'] = statistics['firstEvent'] !== "" ? new Date(statistics['firstEvent']).format("yyyy/mm/dd h:MM") : "";
        
        statisticKeys.forEach(function(key){
          Overview.updateStatisticValue(statistics, key);
        });
        Overview.makeHistogram(clearEl(getEl("storyEventsHist")), statistics.storyEventsHist);
        Overview.makeHistogram(clearEl(getEl("storyCharactersHist")), statistics.storyCharactersHist);
        Overview.makeHistogram(clearEl(getEl("eventCompletenessHist")), statistics.eventCompletenessHist);
        Overview.makeChart("characterChart", getEl("characterChart"), statistics.characterChartData);
        Overview.makeChart("storyChart", getEl("storyChart"), statistics.storyChartData);
        var barData;
        var profileDiagrams = clearEl(getEl('profileDiagrams')), barDiv, bar;
        for ( var name in statistics.profileCharts) {
            barData = statistics.profileCharts[name];
            barDiv = makeEl('div');
            addEl(barDiv, addEl(makeEl('h4'),makeText(name)));
            if(barData.chart){
                bar = setAttr(setAttr(makeEl('canvas'), "width", "300"), "height", "100");
                Overview.makeChart(name, bar, barData.chart);
            } else {
                bar = makeEl('div');
                addClass(bar,"overviewHist");
                Overview.makeHistogram(bar, barData.hist);
            }
            addEl(profileDiagrams, addEl(barDiv, bar));
        }
        
      });
    });
};

Overview.updateStatisticValue = function (statistics, key) {
  "use strict";
  addEl(clearEl(getEl(key)), makeText(statistics[key]))
};

Overview.updateName = function (event) {
    "use strict";
    DBMS.setMetaInfo("name", event.target.value, Utils.processError());
};
Overview.updateTime = function (dp, input) {
    "use strict";
    DBMS.setMetaInfo("date", input.val(), Utils.processError());
};
Overview.updatePreGameDate = function (dp, input) {
    "use strict";
    DBMS.setMetaInfo("preGameDate", input.val(), Utils.processError());
};
Overview.updateDescr = function (event) {
    "use strict";
    DBMS.setMetaInfo("description", event.target.value, Utils.processError());
};