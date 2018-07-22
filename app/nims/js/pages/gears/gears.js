/*Copyright 2015-2018 Timofey Rechkalov <ntsdk@yandex.ru>, Maria Sidekhmenova <matilda_@list.ru>

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

'use strict';

((exports) => {
    const root = '.gears-tab';
    const state = {};
    const l10n = L10n.get('gears');
    state.nodesDataset = new vis.DataSet();
    state.edgesDataset = new vis.DataSet();
    
    exports.init = () => {
        state.addNodeDialog = UI.createModalDialog(root, updateNode, {
            bodySelector: 'add-or-edit-node-body',
            dialogTitle: 'gears-add-node',
            actionButtonTitle: 'common-save',
            onCancel: onNodeCancel
        });
        
        state.editNodeDialog = UI.createModalDialog(root, updateNode, {
            bodySelector: 'add-or-edit-node-body',
            dialogTitle: 'gears-edit-node',
            actionButtonTitle: 'common-save',
            onCancel: onNodeCancel
        });
        
        state.renameEdgeDialog = UI.createModalDialog(root, renameEdge, {
            bodySelector: 'modal-prompt-body',
            dialogTitle: 'gears-rename-edge',
            actionButtonTitle: 'common-save',
        });
        
        const configureNetworkDialog = UI.createModalDialog(root, (dialog) => () => dialog.hideDlg(), {
            bodySelector: 'config-inner-body',
            dialogTitle: 'gears-configure-network',
            actionButtonTitle: 'common-close',
        });
        
        addClass(qee(configureNetworkDialog, '.modal-dialog'), 'gears-config-dialog');
        
        queryEl(`${root} .custom-physics-settings`).value = '';
        
//        document.querySelector('.nodesText').value = charExample;
//        setAttr(document.querySelector('.nodesText'),'rows', charExample.split('\n').length);
//        document.querySelector('.edgesText').value = edgesExample;
//        setAttr(document.querySelector('.edgesText'),'rows', edgesExample.split('\n').length);
        
        listen(qe(`${root} .draw-button`), 'click', exports.refresh);
        listen(qe(`${root} .get-image-button`), 'click', getImage);
        listen(qe(`${root} .download-button`), 'click', downloadCsv);
        listen(qe(`${root} .download-json-button`), 'click', downloadJSON);
        listen(qe(`${root} .download-graphml-button`), 'click', downloadYED);
        listen(qe(`${root} .clear-button`), 'click', clearNetwork);
        
        listen(queryEl(`${root} .physics-settings-button`), 'click', () => configureNetworkDialog.showDlg());
        
        listen(queryEl(`${root} .search-node`), 'change', onNodeFocus);
        
        listen(queryEl(`${root} .custom-physics-settings-button`), 'click', () => {
            const options = queryEl(`${root} .custom-physics-settings`).value;
            if(options.trim() === ''){
                return;
            }
            if(CommonUtils.startsWith(options, 'var options = ')){
                options = options.substring('var options = '.length);
            }
            try{
                options = JSON.parse(options);
            }catch(e){
                console.error(e);
                Utils.alert(l10n('error-on-settings-loading'));
                return;
            }
            state.network.setOptions(options);
        });
        
        queryEl(`${root} .physics-enabled-checkbox`).checked = false;
        listen(queryEl(`${root} .physics-enabled-checkbox`), 'change', (event) => {
            DBMS.setGearsPhysicsEnabled(event.target.checked, (err) => {
                if (err) { Utils.handleError(err); return; }
                state.network.setOptions({
                    "physics": {
                        "enabled": event.target.checked,
                        "minVelocity": 0.75
                    }
                })
            });
        });
        
        queryEl(`${root} .show-notes-checkbox`).checked = false;
        listen(queryEl(`${root} .show-notes-checkbox`), 'change', (event) => {
            DBMS.setGearsShowNotesEnabled(event.target.checked, (err) => {
                if (err) { Utils.handleError(err); return; }
                exports.refresh();
            });
        });
        
        queryEl(`${root} .big-picture-checkbox`).checked = false;
        listen(queryEl(`${root} .big-picture-checkbox`), 'change', (event) => {
            setClassByCondition(queryEl(`${root} .mynetwork > div`),'big-picture',event.target.checked);
        });
        
        state.nodesDataset.on('*', () => {
            fillSearchSelect();
        });
        exports.content = queryEl(root);
    };

    exports.refresh = () => {
        DBMS.getAllGearsData((err, data) => {
            if (err) { Utils.handleError(err); return; }
            queryEl(`${root} .show-notes-checkbox`).checked = data.settings.showNotes;
            queryEl(`${root} .physics-enabled-checkbox`).checked = data.settings.physicsEnabled;
            
            data.nodes.forEach(node => {
                node.label = makeLabel(node.name, node.notes);
            });
            state.nodesDataset.clear();
            state.nodesDataset.add(data.nodes);
            state.edgesDataset.clear();
            state.edgesDataset.add(data.edges);
            drawNetwork();
        });
    };
    
    // create a network
    function drawNetwork() {
      const container = qe(`${root} .mynetwork`);
      clearEl(queryEl(`${root} .configInner`));
      const options = {
        locale: L10n.getLocale(),
        locales: Constants.visLocales,
        manipulation: {
            addNode: function (data, callback) {
                data.label = '';
                data.name = '';
                
                qee(state.addNodeDialog, '.node-id').value = data.id;
                qee(state.addNodeDialog, '.node-name').value = data.name;
                qee(state.addNodeDialog, '.node-group').value = '';
                qee(state.addNodeDialog, '.node-notes').value = '';
                
                state.nodeData = data;
                state.nodeCallback = callback;
                
                state.addNodeDialog.showDlg();
            },
            editNode: function (data, callback) {
                qee(state.editNodeDialog, '.node-id').value = data.id;
                qee(state.editNodeDialog, '.node-name').value = data.name;
                qee(state.editNodeDialog, '.node-group').value = data.group;
                qee(state.editNodeDialog, '.node-notes').value = data.notes;
                
                state.nodeData = data;
                state.nodeCallback = function(data) {
                    callback(data);
                }.bind(this);
                
                state.editNodeDialog.showDlg();
            },
            addEdge: function (data, callback) {
                data.arrows ='to';
                data.label ='';
                if (data.from == data.to) {
                    Utils.confirm(l10n('do-you-want-to-connect-node-to-itself'), () => {
                        callback(data);
                    }, () => callback());
                }
                else {
                  callback(data);
                }
            },
            editEdge:function (data, callback) {
                callback(data);
                storeData();
            },
            deleteNode:function (data, callback) {
                callback(data);
                storeData();
            },
            deleteEdge:function (data, callback) {
                callback(data);
                storeData();
            },
        },
        physics: {
          enabled: queryEl(`${root} .physics-enabled-checkbox`).checked,
          stabilization: false
        },
        "edges": {
          "smooth": {
            "type": "discrete",
            "forceDirection": "none"
          }
        },
        configure: {
          filter:function (option, path) {
            if (path.indexOf('physics') !== -1) {
              return true;
            }
            if (path.indexOf('smooth') !== -1 || option === 'smooth') {
              return true;
            }
            return false;
          },
          container: qe(`${root} .configInner`)
        }
      };
      const data = {
        nodes: state.nodesDataset,
        edges: state.edgesDataset
      };
      state.network = new vis.Network(container, data, options);
      state.network.on('selectEdge', showEdgeLabelEditor);
      state.network.on('dragEnd', (params) => storeData());
      state.network.on('stabilized', (params) => storeData());
    }
    
    function storeData(callback){
        DBMS.setGearsData(exportNetwork(), (err) => {
            if (err) { Utils.handleError(err); return; }
            if(callback) callback();
        });
    }
    
    function exportNetwork() {
        state.network.storePositions();
        const nodePositions = state.network.getPositions();
        
        console.log(nodePositions);
        const nodes = R.clone(state.nodesDataset.get());
        const edges = state.edgesDataset.get();
        nodes.forEach(node => delete node.color);
        return {
            nodes,
            edges
        };
    }
    
    function importNetwork(data) {
        const {nodes, edges} = data;
        state.nodesDataset.clear();
        state.edgesDataset.clear();
        state.nodesDataset.update(nodes);
        state.edgesDataset.update(edges);
    }

    function showEdgeLabelEditor(params) {
        if (params.edges.length !== 0 && params.nodes.length === 0) {
            const edge = state.edgesDataset.get(params.edges[0]);
            qee(state.renameEdgeDialog, '.entity-input').value = edge.label || '';
            state.edgeData = edge;
            state.edgeCallback = (edge) => state.edgesDataset.update(edge);
            state.renameEdgeDialog.showDlg();
        }
    }

    function makeLabel(name, notes){
      let label = prepareStr(name); 
      if(queryEl(`${root} .show-notes-checkbox`).checked){
        label += (notes.trim() !== '' ? ('\n\n' + prepareStr(notes)) : '');
      }
      return label;
    }

    function prepareStr(text) {
        const maxStrLength = 30;
        return text.split('\n').map((str, i, strings) => {
            let counter = 0;
            const words = str.split(' ');
            return words.reduce((acc, word) => {
                if((counter + word.length + 1) <=  maxStrLength) {
                    acc += word + ' ';
                    counter += word.length + 1;
                } else {
                    acc += '\n' + word + ' ';
                    counter = 0;
                }
                return acc;
            }, '');
        }).join('\n');
        
        
//        return text.split('\n').map(R.splitEvery(30)).map(R.join('-\n')).join('\n');
    }


    function getImage(event){
      const canvas = document.querySelector("canvas");
      
      const context = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0,0,w,h);
      
      const img    = canvas.toDataURL("image/png");
      const link = document.querySelector(".link");
      event.target.href = img;
      drawNetwork();
    }

    function clearNetwork(){
        Utils.confirm(l10n('confirm-clearing'), () => {
            state.nodesDataset.clear();
            state.edgesDataset.clear();
            storeData(exports.refresh);
        });
    }

    function updateNodeTextArea(){
      document.querySelector('.nodesText').value = state.nodesDataset.map((node) => [node.name, node.group, node.notes].join('\t')).join('\n');
    }

    function updateEdgeTextArea(){
      document.querySelector('.edgesText').value = state.edgesDataset.map((edge) => [state.nodesDataset.get(edge.from).name, edge.label, 
          state.nodesDataset.get(edge.to).name].join('\t')).join('\n');
    }

    function fillSearchSelect(){
      const arr = state.nodesDataset.map((node) => ({name: node.name, value: node.id}));
      arr.sort(CommonUtils.charOrdAFactory(a => a.name.toLowerCase()));
      fillSelector(clearEl(queryEl('.search-node')), arr);
    }

    function downloadCsv() {
        const arr = state.nodesDataset.map((node) => [node.name, node.group, node.notes]);
        const arr2 = state.edgesDataset.map((edge) => [state.nodesDataset.get(edge.from).name, edge.label, 
          state.nodesDataset.get(edge.to).name]);
          
        FileUtils.arr2d2Csv(arr.concat([['']]).concat(arr2), 'cogs.csv');
    }

    function downloadJSON() {
      const arr = state.nodesDataset.map((node) => [node.name, node.group, node.notes]);
      const arr2 = state.edgesDataset.map((edge) => [state.nodesDataset.get(edge.from).name, edge.label, 
        state.nodesDataset.get(edge.to).name]);
        
      const out = new Blob([JSON.stringify({nodes: arr, edges: arr2}, null, '  ')], {
          type: 'application/json;charset=utf-8;'
      });
      saveAs(out, 'cogs.json');
    }

    function downloadYED() {
      const arr = state.nodesDataset.map((node) => [node.name, node.group, node.notes]);
      const arr2 = state.edgesDataset.map((edge) => [state.nodesDataset.get(edge.from).name, edge.label, 
        state.nodesDataset.get(edge.to).name]);
      
      const groups = {};
      let index = 1;
      state.nodesDataset.map(node => {
        if(groups[node.group] === undefined){
          groups[node.group] = index;
          index++;
        }
      });
        
      const nodes = state.nodesDataset.map(node => {
        const colors = Constants.colorPalette[groups[node.group]-1].color;
        return CommonUtils.strFormat(Constants.yedNodeTmpl, [node.id, node.label, colors.background, colors.border]);
      }).join('\n');
      
      const edges = state.edgesDataset.map(edge => {
        return CommonUtils.strFormat(Constants.yedEdgeTmpl, [edge.id, edge.label || '', edge.from, edge.to]);
      }).join('\n');
      const out = new Blob([CommonUtils.strFormat(Constants.yedGmlBase, [nodes, edges])], {
          type: 'text/xml;charset=utf-8;'
      });
      saveAs(out, 'cogs.graphml');
    }

    function onNodeFocus(event) {
        state.network.focus(event.target.value, Constants.snFocusOptions);
    }

    function renameEdge(dialog) {
        return () => {
            if(state.edgeData){
                const toInput = qee(dialog, '.entity-input');
                const label = toInput.value.trim();
                const edge = state.edgeData;
                edge.label = label;
                toInput.value = '';
                state.edgeCallback(edge);
                state.edgeData = null;
                state.edgeCallback = null;
                storeData();
                dialog.hideDlg();
            }
        }
    }
    
    function updateNode(dialog) {
        return () => {
            if( state.nodeData ){
                let data = state.nodeData;
                data.id = qee(dialog, '.node-id').value;
                data.name = qee(dialog, '.node-name').value;
                data.group = qee(dialog, '.node-group').value;
                data.notes = qee(dialog, '.node-notes').value;
                data.label = makeLabel(data.name, data.notes);
                data.shape = 'box';
                
                const extraFields = R.difference(R.keys(data), Constants.gearsNodeRequiredFields);
                data = R.omit(extraFields, data);
                
                state.nodeCallback(data);
                
                state.nodeData = null;
                state.nodeCallback = null;
                storeData(exports.refresh);
                dialog.hideDlg();
            }
        };
    }
    
    function onNodeCancel() {
        if( state.nodeData ){
            state.nodeCallback(null);
            state.nodeData = null;
            state.nodeCallback = null;
        }
    }
})(this.Gears = {});
