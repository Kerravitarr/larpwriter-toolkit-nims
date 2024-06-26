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
 Utils, DBMS, StoryCharacters
 */

//const vis = require('vis');
//require('vis/dist/vis.min.css'); 
const vis = require('../../../../nims-app-core/libs0000/vis-custom.min.js');
require('../../../../nims-app-core/libs0000/vis.min.css');
//const R = require('ramda');

//const Constants = require('dbms/constants');

const PermissionInformer = require('permissionInformer');
const NetworkSubsetsSelector = require('./networkSubsetsSelector');


// ((exports) => {
const state = {};

const STORY_PREFIX = 'St:';
const CHAR_PREFIX = 'Ch:';
const PROFILE_GROUP = 'prof-';
const FILTER_GROUP = 'filter-';

exports.init = () => {
    NetworkSubsetsSelector.init();

    U.listen(U.queryEl('#networkNodeGroupSelector'), 'change', colorNodes);
    U.listen(U.queryEl('#showPlayerNamesCheckbox'), 'change', updateNodeLabels);
    U.listen(U.queryEl('#drawNetworkButton'), 'click', onDrawNetwork);
    $('#nodeFocusSelector').select2().on('change', onNodeFocus);
    U.listen(U.queryEl('#networkSelector'), 'change', onNetworkSelectorChangeDelegate);

    U.queryEls('#activityBlock button').forEach(U.listen(R.__, 'click', event => U.toggleClass(event.target, 'btn-primary')));
    U.queryEls('#relationsBlock button').forEach(U.listen(R.__, 'click', event => U.toggleClass(event.target, 'btn-primary')));

    //        state.network;
    state.highlightActive = false;

    initWarning();
    L10n.onL10nChange(initWarning);

    //    TimelinedNetwork.init();

    exports.content = U.queryEl('#socialNetworkDiv');
};

function initWarning() {
    const warning = U.clearEl(U.queryEl('#socialNetworkWarning'));
    const button = U.addEl(U.makeEl('button'), U.makeText(L10n.getValue('social-network-remove-resources-warning')));
    U.addEls(warning, [U.makeText(L10n.getValue('social-network-require-resources-warning')), button]);
    U.listen(button, 'click', () => U.addClass(warning, 'hidden'));
    U.addClass(warning, 'hidden');
}


exports.refresh = () => {
    let selector = U.fillSelector(U.clearEl(U.queryEl('#networkSelector')), UI.constArr2Select(Constants.networks));
    [selector.value] = Constants.networks;
    onNetworkSelectorChangeDelegate({ target: selector });

    selector = U.clearEl(U.queryEl('#networkNodeGroupSelector'));

    Promise.all([
        PermissionInformer.getEntityNamesArray({ type: 'character', editableOnly: false }), // subset selector
        PermissionInformer.getEntityNamesArray({ type: 'story', editableOnly: false }), // subset selector
        DBMS.getAllProfiles({ type: 'character' }), // node coloring
        DBMS.getAllStories(), // contains most part of SN data
        DBMS.getProfileStructure({ type: 'character' }), // node coloring
        DBMS.getProfileBindings(), // node coloring
        DBMS.getGroupCharacterSets(), // node coloring
        DBMS.getMetaInfo(), // timelined network
        DBMS.getRelations() // relations
    ]).then((results) => {
        const [characterNames,
            storyNames,
            profiles,
            stories,
            profileStructure,
            profileBindings,
            groupCharacterSets,
            metaInfo,
            relations] = results;
        state.Stories = stories;
        state.Characters = profiles;
        state.profileBindings = profileBindings;
        state.groupCharacterSets = groupCharacterSets;
        state.metaInfo = metaInfo;
        state.relations = relations;

        const checkboxes = profileStructure.filter(element => R.equals(element.type, 'checkbox'));
        R.values(profiles).forEach((profile) => {
            checkboxes.map(item => (profile[item.name] = L10n.const(Constants[profile[item.name]])));
        });

        const colorGroups = profileStructure.filter(element => R.contains(element.type, ['enum', 'checkbox']));
        const defaultColorGroup = {
            value: Constants.noGroup,
            name: L10n.const(Constants.noGroup)
        };

        const profileLabel = CU.strFormat(L10n.getValue('social-network-profile-group'));
        const filterLabel = CU.strFormat(L10n.getValue('social-network-filter-group'));

        const profileGroups = colorGroups.map(group => group.name).map(name => ({ value: PROFILE_GROUP + name, name: profileLabel([name]) }));
        const filterGroups = R.keys(groupCharacterSets).map(name => ({ value: FILTER_GROUP + name, name: filterLabel([name]) }));
        U.fillSelector(
            selector,
            [defaultColorGroup].concat(profileGroups).concat(filterGroups)
        );

        initGroupColors(colorGroups);

        NetworkSubsetsSelector.refresh({
            characterNames,
            storyNames,
            Stories: stories
        });
    }).catch(UI.handleError);
};

function initGroupColors(colorGroups) {
    state.groupColors = R.clone(Constants.snFixedColors);
    state.groupLists = {};

    colorGroups.forEach((group) => {
        if (group.type === 'enum') {
            state.groupLists[PROFILE_GROUP + group.name] = group.value.split(',').map((subGroupName, i) => {
                state.groupColors[`${PROFILE_GROUP + group.name}.${subGroupName.trim()}`] = Constants.colorPalette[i + 2];
                return `${PROFILE_GROUP + group.name}.${subGroupName.trim()}`;
            });
        } else if (group.type === 'checkbox') {
            const trueName = L10n.const(Constants.true);
            const falseName = L10n.const(Constants.false);
            state.groupColors[`${PROFILE_GROUP + group.name}.${trueName}`] = Constants.colorPalette[group.value ? 0 + 2 : 1 + 2];
            state.groupColors[`${PROFILE_GROUP + group.name}.${falseName}`] = Constants.colorPalette[group.value ? 1 + 2 : 0 + 2];
            state.groupLists[PROFILE_GROUP + group.name] = [`${PROFILE_GROUP + group.name}.${trueName}`, `${PROFILE_GROUP + group.name}.${falseName}`];
        } else {
            throw new Error(`Unexpected profile item type: ${group.type}`);
        }
    });
}

function makeLegendItem(label, color) {
    const colorDiv = U.addEl(U.makeEl('div'), U.makeText(label));
    colorDiv.style.backgroundColor = color.background;
    colorDiv.style.border = `solid 2px ${color.border}`;
    return colorDiv;
}

function refreshLegend(groupName) {
    const colorLegend = U.clearEl(U.queryEl('#colorLegend'));
    let els = [];

    if (groupName === 'noGroup') {
        els.push(makeLegendItem(L10n.const('noGroup'), Constants.snFixedColors.noGroup.color));
    } else if (R.startsWith(PROFILE_GROUP, groupName)) {
        els = els.concat(state.groupLists[groupName].map(value => makeLegendItem(value.substring(PROFILE_GROUP.length), state.groupColors[value].color)));
    } else if (R.startsWith(FILTER_GROUP, groupName)) {
        els.push(makeLegendItem(L10n.const('noGroup'), Constants.snFixedColors.noGroup.color));
        els.push(makeLegendItem(L10n.const('fromGroup'), Constants.snFixedColors.fromGroup.color));
    } else {
        throw new Error(`Unexpected group name/type: ${groupName}`);
    }

    if (['characterPresenceInStory', 'characterActivityInStory'].indexOf(state.selectedNetwork) !== -1) {
        els.push(makeLegendItem(L10n.getValue('social-network-story'), Constants.snFixedColors.storyColor.color));
    }
    U.addEls(colorLegend, els);
}

function colorNodes(event) {
    const groupName = event.target.value;
    refreshLegend(groupName);
    if (state.nodesDataset === undefined) return;

    NetworkSubsetsSelector.getCharacterNames().forEach((characterName) => {
        state.nodesDataset.update({
            id: CHAR_PREFIX + characterName,
            group: getNodeGroup(characterName, groupName)
        });
    });
}

function getNodeGroup(characterName, groupName) {
    if (groupName === 'noGroup') {
        return groupName;
    } if (R.startsWith(PROFILE_GROUP, groupName)) {
        const character = state.Characters[characterName];
        return `${groupName}.${character[groupName.substring(PROFILE_GROUP.length)]}`;
    } if (R.startsWith(FILTER_GROUP, groupName)) {
        return state.groupCharacterSets[groupName.substring(FILTER_GROUP.length)][characterName] ? 'fromGroup' : 'noGroup';
    }
    throw new Error(`Unexpected group name: ${groupName}`);
}

function updateNodeLabels() {
    if (state.nodesDataset === undefined) return;
    const showPlayer = U.queryEl('#showPlayerNamesCheckbox').checked;
    const allNodes = state.nodesDataset.get({
        returnType: 'Object'
    });

    R.values(allNodes).filter(node => node.type === 'character').forEach((node) => {
        const label = makeCharacterNodeLabel(showPlayer, node.originName);
        if (node.label !== undefined) {
            node.label = label;
        } else if (node.hiddenLabel !== undefined) {
            node.hiddenLabel = label;
        } else {
            console.log(`Suspicious node: ${JSON.stringify(node)}`);
        }
    });

    state.nodesDataset.update(R.values(allNodes));
}

function onNetworkSelectorChangeDelegate(event) {
    U.hideEl(U.queryEl('#activityBlock'), event.target.value !== 'characterActivityInStory');
    U.queryEls('#activityBlock button').forEach(el => U.addClass(el, 'btn-primary'));
    U.hideEl(U.queryEl('#relationsBlock'), event.target.value !== 'characterRelations');
    U.queryEls('#relationsBlock button').forEach(el => U.addClass(el, 'btn-primary'));
}

function onNodeFocus(event) {
    state.network.focus(event.target.value, Constants.snFocusOptions);
}

function onDrawNetwork() {
    onNetworkSelectorChange(U.queryEl('#networkSelector').value);
    //    TimelinedNetwork.refresh(state.network, state.nodesDataset,
    //            state.edgesDataset, getEventDetails(), state.metaInfo);
}

function onNetworkSelectorChange(selectedNetwork) {
    state.selectedNetwork = selectedNetwork;
    let nodes = [];
    let edges = [];

    switch (selectedNetwork) {
    case 'socialRelations':
        nodes = getCharacterNodes();
        edges = getDetailedEdges();
        break;
    case 'characterPresenceInStory':
        nodes = getCharacterNodes().concat(getStoryNodes());
        edges = getStoryEdges();
        break;
    case 'characterActivityInStory':
        nodes = getCharacterNodes().concat(getStoryNodes());
        edges = getActivityEdges();
        break;
    case 'characterRelations':
        nodes = getCharacterNodes();
        edges = getRelationEdges();
        break;
    default:
        throw new Error(`Unexpected network type: ${selectedNetwork}`);
    }

    refreshLegend(U.queryEl('#networkNodeGroupSelector').value);

    U.clearEl(U.queryEl('#nodeFocusSelector'));
    const nodeSort = CU.charOrdAFactory(a => a.label.toLowerCase());
    nodes.sort(nodeSort);

    const data = UI.getSelect2DataCommon(UI.remapProps(['id', 'text'], ['id', 'originName']), nodes);
    $('#nodeFocusSelector').select2(data);

    state.nodesDataset = new vis.DataSet(nodes);
    state.edgesDataset = new vis.DataSet(edges);

    redrawAll();
}

function makeCharacterNodeLabel(showPlayer, characterName) {
    const label = characterName.split(' ').join('\n');
    if (showPlayer) {
        const player = state.profileBindings[characterName] || '';
        return `${label}/\n${player}`;
    }
    return label;
}

function getCharacterNodes() {
    const groupName = U.queryEl('#networkNodeGroupSelector').value;
    const showPlayer = U.queryEl('#showPlayerNamesCheckbox').checked;
    return NetworkSubsetsSelector.getCharacterNames().map((characterName) => {
        const profile = state.Characters[characterName];
        return {
            id: CHAR_PREFIX + characterName,
            label: makeCharacterNodeLabel(showPlayer, characterName),
            type: 'character',
            originName: characterName,
            group: groupName === 'noGroup' ? L10n.const('noGroup') : `${groupName}.${profile[groupName]}`
        };
    });
}

function getStoryNodes() {
    const nodes = NetworkSubsetsSelector.getStoryNames().map(name => ({
        id: STORY_PREFIX + name,
        label: name.split(' ').join('\n'),
        value: Object.keys(state.Stories[name].characters).length,
        title: Object.keys(state.Stories[name].characters).length,
        group: 'storyColor',
        type: 'story',
        originName: name,
    }));
    return nodes;
}

function getActivityEdges() {
    const selectedActivities = U.queryEls('#activityBlock button.btn-primary').map(U.getAttr(R.__, 'data-value'));
    const stories = state.Stories;
    return R.flatten(R.keys(stories).map(name => R.keys(stories[name].characters)
        .map(char1 => R.keys(stories[name].characters[char1].activity).filter(R.contains(R.__, selectedActivities))
            .map(activity => ({
                from: STORY_PREFIX + name,
                to: CHAR_PREFIX + char1,
                color: Constants.snActivityColors[activity],
                width: 2,
                hoverWidth: 4
            })))));
}
/**
 * Создаёт ребро в графе
 * @param {string} nameFrom имя того, от кого ребро идёт
 * @param {string} nameTo имя того, к кому ребро идёт
 * @param {string} nodeName имя этого ребра
 * @param {Array} dashes опционально. Описывает пунктирную линию
 * @returns объект, описывающий ребро
 */
function makeRelation(nameFrom, nameTo, nodeName, dashes){
    return {
        from: CHAR_PREFIX + nameFrom,
        to: CHAR_PREFIX + nameTo,
        color: Constants.snRelationColors[nodeName], //Цвет ребра
        width: 2,
        hoverWidth: 4,                                  //Ширина края при наведении, выделение ребра
        title: CU.strFormat(L10n.getValue('briefings-' + nodeName),[nameFrom, nameTo]), //Подпись
        dashes: dashes,                                 //Если true, то будет пунктирная линия
    };
}
/**
 * Создаёт ребро в графе
 * @param {string} nameFrom имя того, от кого ребро идёт
 * @param {string} nameTo имя того, к кому ребро идёт
 * @param {string} nodeName имя этого ребра
 * @param {boolean} isFrom указывает, что ребро будет идти отсюда
 * @param {Array} dashes опционально. Описывает пунктирную линию
 * @returns объект, описывающий ребро
 */
function makeDRelation(nameFrom, nameTo, nodeName, isFrom, dashes){
    let relation = makeRelation(nameFrom, nameTo, nodeName, dashes);
    relation.arrows = isFrom ? 'to' : 'from'; //Стрелка
    return relation;
}

/**
 * Определяет связи графа
 * @returns массив элементов графа. Каждый элемент - откуда, куда, какого цвета, какой толщины и width
 */
function getRelationEdges() {
    const selectedRelations = U.queryEls('#relationsBlock button.btn-primary').map(U.getAttr(R.__, 'data-value'));
    const { relations } = state;
    const checked = R.contains(R.__, selectedRelations);
    return R.flatten(relations.map((rel) => {
        const arr = [];
        const { starter } = rel;
        const { ender } = rel;
        /**Все связи персонажа */
        const essence = rel.essence;
        if (essence.length === 0) {
            if (checked('neutral')){
                let relation = makeRelation(starter,ender,'neutral',[1, 10]);
                relation.physics = false; //Убираем физику, пусть знакомые не тянутся друг к другу
                arr.push(relation);
            }
        } else {
            if (checked('allies') && R.contains('allies', essence)) 
                arr.push(makeRelation(starter,ender,'allies'));
            if (checked('enemy') && R.contains('enemy', essence)) 
                arr.push(makeRelation(starter,ender,'enemy'));
            if (checked('work')){
                if (R.contains('starterToEnder', essence)) 
                    arr.push(makeDRelation(starter,ender,'starterToEnder', true));
                if (R.contains('colleagues', essence)) 
                    arr.push(makeRelation(starter,ender,'colleagues'));
                if (R.contains('enderToStarter', essence)) 
                    arr.push(makeDRelation(starter,ender,'enderToStarter', false));
            }
            if (checked('family')){
                if (R.contains('baby', essence)) 
                    arr.push(makeDRelation(starter,ender,'baby', false));
                if (R.contains('family', essence)) 
                    arr.push(makeRelation(starter,ender,'family'));
                if (R.contains('parent', essence)) 
                    arr.push(makeDRelation(starter,ender,'parent', true));
            }
        }
        return arr;
    }));
}

function getStoryEdges() {
    return R.flatten(R.keys(state.Stories).map(name => R.keys(state.Stories[name].characters).map(char1 => ({
        from: STORY_PREFIX + name,
        to: CHAR_PREFIX + char1,
        color: 'grey'
    }))));
}

function getEventDetails() {
    return R.flatten(R.values(state.Stories).map(story => story.events.map(event => ({
        eventName: event.name,
        storyName: story.name,
        time: event.time,
        characters: R.keys(event.characters)
    }))));
}

function getDetailedEdges() {
    const edgesCheck = {};
    R.values(state.Stories).forEach((story) => {
        story.events.forEach((event) => {
            const charNames = R.keys(event.characters).sort();
            charNames.forEach((char1, i) => {
                charNames.forEach((char2, j) => {
                    if (i <= j) {
                        return;
                    }
                    const key = char1 + char2;
                    if (!edgesCheck[key]) {
                        edgesCheck[key] = {
                            from: CHAR_PREFIX + char1,
                            to: CHAR_PREFIX + char2,
                            title: {},
                        };
                    }
                    edgesCheck[key].title[story.name] = true;
                });
            });
        });
    });

    return R.values(edgesCheck).map((edgeInfo) => {
        const title = R.keys(edgeInfo.title).sort().join(', ');
        const value = R.keys(edgeInfo.title).length;
        return {
            from: edgeInfo.from,
            to: edgeInfo.to,
            title: `${value}: ${title}`,
            value,
            color: 'grey'
        };
    });
}

function redrawAll() {
    const container = U.queryEl('#socialNetworkContainer');

    const data = {
        nodes: state.nodesDataset,
        edges: state.edgesDataset
    }; // Note: data is coming from ./datasources/WorldCup2014.js

    if (state.network) {
        state.network.destroy();
    }

    const opts = R.clone(Constants.socialNetworkOpts);
    opts.groups = state.groupColors;

    state.network = new vis.Network(container, data, opts);

    state.network.on('click', neighbourhoodHighlight);
}

function hideLabel(node) {
    if (node.hiddenLabel === undefined) {
        node.hiddenLabel = node.label;
        node.label = undefined;
    }
}
function showLabel(node) {
    if (node.hiddenLabel !== undefined) {
        node.label = node.hiddenLabel;
        node.hiddenLabel = undefined;
    }
}

function highlightNodes(network, allNodes, zeroDegreeNodes, firstDegreeNodes) {
    // get the second degree nodes
    const secondDegreeNodes = R.uniq(R.flatten(firstDegreeNodes.map(id => network.getConnectedNodes(id))));
    // mark all nodes as hard to read.
    R.values(allNodes).forEach((node) => {
        node.color = 'rgba(200,200,200,0.5)';
        hideLabel(node);
    });
    // all second degree nodes get a different color and their label back
    secondDegreeNodes.map(id => allNodes[id]).forEach((node) => {
        node.color = 'rgba(150,150,150,0.75)';
        showLabel(node);
    });
    // all first degree nodes get their own color and their label back
    firstDegreeNodes.map(id => allNodes[id]).forEach((node) => {
        node.color = undefined;
        showLabel(node);
    });
    // the main node gets its own color and its label back.
    zeroDegreeNodes.map(id => allNodes[id]).forEach((node) => {
        node.color = undefined;
        showLabel(node);
    });
}

function neighbourhoodHighlight(params) {
    // get a JSON object
    const allNodes = state.nodesDataset.get({
        returnType: 'Object'
    });

    const { network } = state;
    if (params.nodes.length > 0) {
        state.highlightActive = true;
        const selectedNode = params.nodes[0];
        const zeroDegreeNodes = [selectedNode];
        const firstDegreeNodes = network.getConnectedNodes(selectedNode);
        highlightNodes(network, allNodes, zeroDegreeNodes, firstDegreeNodes);
    } else if (params.edges.length > 0) {
        state.highlightActive = true;
        const selectedEdge = params.edges[0];
        const firstDegreeNodes = network.getConnectedNodes(selectedEdge);
        highlightNodes(network, allNodes, [], firstDegreeNodes);
    } else if (state.highlightActive === true) {
        // reset all nodes
        R.values(allNodes).forEach((node) => {
            node.color = undefined;
            showLabel(node);
        });
        state.highlightActive = false;
    }

    // transform the object into an array
    state.nodesDataset.update(R.values(allNodes));
}
// })(window.SocialNetwork = {});
