/*global
 Utils, PageManager, Database, saveAs, FileReader, Blob
 */

"use strict";

var FileUtils = {};

FileUtils.init = function () {
    "use strict";
    document.getElementById('dataLoadButton').addEventListener('change', FileUtils.readSingleFile, false);

    var button = document.getElementById('dataSaveButton');
    button.addEventListener('click', FileUtils.saveFile);
};

FileUtils.readSingleFile = function (evt) {
    "use strict";
    // Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];

    if (f) {
        var r = new FileReader();
        r.onload = function (e) {
            var contents = e.target.result;
            // Utils.alert("Got the file.n" + "name: " + f.name + "n" + "type: "
            // + f.type + "n" + "size: " + f.size + " bytesn"
            // + JSON.parse(contents)
            // // + "starts with: " + contents.substr(1, contents.indexOf("n"))
            // );
            Database = JSON.parse(contents);
            PageManager.currentView.refresh();
            // onLoad();
        };
        r.readAsText(f);
    } else {
        Utils.alert("Failed to load file");
    }
};

FileUtils.saveFile = function () {
    "use strict";
    var blob = new Blob([ JSON.stringify(Database, null, '  ') ], {
        type : "text/plain;charset=utf-8"
    });
    saveAs(blob, "database.json");
    // window.open("data:application/json;charset=utf-8," +
    // encodeURIComponent(JSON.stringify(Database, null, ' ')) );
};